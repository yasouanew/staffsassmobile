import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { saveToken } from '../../../api/tokenStore';
import { STORAGE_KEYS } from '../../../config/storageKeys';
import type { AppError } from '../../../types/appError';
import { getString } from '../../../utils/storage';
import { authApi } from '../api';
import { useSessionStore } from '../store/sessionStore';
import type { LoginPayload, LoginResponseData } from '../types';
import { buildLoginDeviceMetadata } from '../utils';

/**
 * `POST /auth/login`.
 *
 * Why a mutation and not a query: logging in is a side effect, not a cacheable
 * read. The result is deliberately **not** written into the query cache for
 * `/auth/me` — instead the session store is updated and the caller invalidates,
 * because the store is what the navigator reads to decide which stack to show.
 *
 * Token persistence happens here rather than inside the store so that the order is
 * explicit and crash-safe: the token hits disk *before* the session is marked
 * authenticated, so a process death immediately after login restores correctly.
 *
 * ## Device metadata
 *
 * The screen supplies only `email`/`password`; everything else is attached here so
 * that *every* caller of this hook produces an identifiable session (spec Screen 1
 * API 1). This was previously missing, which meant the backend saw a bare token with
 * no device label, platform or app version — making the Sanctum token list useless for
 * support and session management.
 *
 * `fcm_token` is read from storage rather than requested here: the push service owns
 * FCM registration (`services/push/pushService.ts`), and asking for a token at login
 * time would couple the auth flow to a Firebase permission prompt. When a token is
 * already known from a previous session it is sent along, so the backend can upsert it
 * in the same request; otherwise push is registered afterwards via
 * `POST /device-tokens` (spec Screen 1 §7 — "if omitted login still succeeds").
 *
 * A failure to read the stored token must never fail the login, so the lookup is
 * guarded and degrades to "no push token".
 */

/** Reads the last FCM token known to this device, if any. Never throws. */
async function readStoredFcmToken(): Promise<string | undefined> {
    try {
        const token = await getString(STORAGE_KEYS.fcmToken);

        return token !== null && token.length > 0 ? token : undefined;
    } catch {
        return undefined;
    }
}

export function useLogin(): UseMutationResult<LoginResponseData, AppError, LoginPayload> {
    const setSession = useSessionStore(state => state.setSession);

    return useMutation<LoginResponseData, AppError, LoginPayload>({
        mutationFn: async payload => {
            /**
             * `null` is a meaningful caller value for `fcm_token` — it means "this
             * device definitely has no push token, do not upsert one" (spec Screen 1
             * §7). A `??` chain would collapse `null` and `undefined` together and
             * silently substitute the stored token, so the distinction is made
             * explicitly: only `undefined` triggers the storage lookup.
             */
            const fcmToken =
                payload.fcm_token !== undefined ? payload.fcm_token : await readStoredFcmToken();

            const enriched: LoginPayload = {
                ...buildLoginDeviceMetadata(),
                ...payload,
                ...(fcmToken === undefined ? {} : { fcm_token: fcmToken }),
            };

            return authApi.login(enriched);
        },
        onSuccess: async data => {
            await saveToken({ token: data.token, tokenType: data.token_type });
            await setSession(data.user);
        },
    });
}
