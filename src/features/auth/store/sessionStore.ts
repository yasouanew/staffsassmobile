import { create } from 'zustand';

import { clearToken, loadToken } from '../../../api/tokenStore';
import { STORAGE_KEYS } from '../../../config/storageKeys';
import { useNotificationInboxStore } from '../../notifications/store';
import type { AppError } from '../../../types/appError';
import { clearAppStorage, getItem, setItem } from '../../../utils/storage';
import { authApi } from '../api';
import type { AuthUser, LogoutPayload } from '../types';

/**
 * Session state.
 *
 * This is the single source of truth for "is the user signed in, and who are
 * they". It lives in Zustand rather than React context because non-React code
 * (the axios 401 handler, the FCM token refresh listener, background notification
 * handling) must be able to read and clear the session without a React tree.
 *
 * The token itself is **not** kept here — it is owned by `api/tokenStore` so the
 * request interceptor can read it synchronously. This store mirrors only the
 * derived session facts and keeps the two in lockstep.
 *
 * Deliberately excluded from this store: server data (profile, permissions
 * freshness). `GET /auth/me` is owned by TanStack Query — see `hooks/useSession`.
 */

export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

type SessionState = {
    /** `unknown` until the cold-start restore finishes; drives the splash gate. */
    status: SessionStatus;
    user: AuthUser | null;
    /** Populated only when the restore failed for an unexpected reason. */
    restoreError: AppError | null;

    /** Swaps the session in after a successful login or profile update. */
    setSession: (user: AuthUser) => Promise<void>;
    /** Replaces the cached user without touching the token (e.g. after `/auth/me`). */
    setUser: (user: AuthUser) => Promise<void>;
    /** Clears everything locally. Does not call the API — see `signOut`. */
    clearSession: () => Promise<void>;
    /**
     * Restores a persisted session on cold start.
     *
     * The token is treated as a hint, not as proof of authentication: it must be
     * validated with `GET /auth/me`, because the account may have been deactivated
     * (`account.active`) or the token revoked server-side.
     */
    restoreSession: () => Promise<void>;
    /** Revokes the current token server-side, then clears locally regardless. */
    signOut: (payload?: LogoutPayload) => Promise<void>;
    /** Revokes every token for the user, then clears locally regardless. */
    signOutEverywhere: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
    status: 'unknown',
    user: null,
    restoreError: null,

    setSession: async (user) => {
        set({ status: 'authenticated', user, restoreError: null });
        await setItem(STORAGE_KEYS.authUser, user);
    },

    setUser: async (user) => {
        // Only meaningful while authenticated; a late `/auth/me` response must not
        // resurrect a session that was signed out in the meantime.
        if (get().status !== 'authenticated') {
            return;
        }
        set({ user });
        await setItem(STORAGE_KEYS.authUser, user);
    },

    clearSession: async () => {
        set({ status: 'unauthenticated', user: null, restoreError: null });

        // The notification inbox is dropped *in memory* as well as on disk. Clearing
        // only storage would leave the previous user's shift changes readable in the
        // store until the process is killed, and devices are shared in this domain.
        await useNotificationInboxStore.getState().reset();

        await clearToken();
        await clearAppStorage();
    },

    restoreSession: async () => {
        const persistedToken = await loadToken();

        if (persistedToken === null) {
            set({ status: 'unauthenticated', user: null, restoreError: null });
            return;
        }

        // Show the cached user immediately so the UI has something to render while
        // `/auth/me` revalidates. It is replaced below in all branches.
        const cachedUser = await getItem<AuthUser>(STORAGE_KEYS.authUser);

        if (cachedUser) {
            set({ status: 'authenticated', user: cachedUser, restoreError: null });
        }

        try {
            const user = await authApi.me();
            await get().setSession(user);
        } catch (error) {
            const appError = error as AppError;

            // A 401 means the token is dead — the only correct response is to sign out.
            // Anything else (offline, 500, timeout) must NOT destroy a valid session:
            // fall back to the cached user so the app stays usable offline.
            if (appError?.kind === 'unauthorized') {
                await get().clearSession();
                return;
            }

            if (cachedUser) {
                set({ status: 'authenticated', restoreError: appError ?? null });
                return;
            }

            // No cache and the server is unreachable: the token may well be valid,
            // but nothing can be rendered. Keep it and let the UI retry.
            set({ status: 'authenticated', user: null, restoreError: appError ?? null });
        }
    },

    signOut: async (payload) => {
        try {
            await authApi.logout(payload);
        } catch {
            // The local session must be cleared even if revoking the token fails —
            // otherwise a user cannot sign out while offline.
        }
        await get().clearSession();
    },

    signOutEverywhere: async () => {
        try {
            await authApi.logoutAll();
        } catch {
            // Same reasoning as `signOut`.
        }
        await get().clearSession();
    },
}));

/**
 * Non-React accessors for the axios 401 handler and the push service.
 * Screens should use the `useSessionStore` hook instead.
 */
export const sessionActions = {
    getState: () => useSessionStore.getState(),
    clearSession: () => useSessionStore.getState().clearSession(),
    setSession: (user: AuthUser) => useSessionStore.getState().setSession(user),
    setUser: (user: AuthUser) => useSessionStore.getState().setUser(user),
};
