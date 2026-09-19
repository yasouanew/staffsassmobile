import { STORAGE_KEYS } from '../config/storageKeys';
import { getItem, removeItem, setItem } from '../utils/storage';

/**
 * Sanctum personal access token storage.
 *
 * Kept deliberately separate from the Zustand session store so the axios
 * interceptors can read the token **without** importing application state. This
 * avoids a circular dependency (`store → api → store`) and guarantees the token is
 * available on the very first request after a cold start, before React has
 * rendered anything.
 *
 * The token is held in a module-level variable and mirrored to AsyncStorage. The
 * in-memory copy serves request-time reads synchronously; AsyncStorage provides the
 * cold-start restore handled by [`loadToken`](src/api/tokenStore.ts:1).
 */

export type StoredToken = {
    /** Raw Sanctum plain-text token (`"1|abc..."`). */
    token: string;
    /** Always `"Bearer"` for Sanctum, stored so the header is not hardcoded. */
    tokenType: string;
    /**
     * ISO timestamp after which the token is considered invalid.
     *
     * Sanctum expiry is server-computed (`config('sanctum.expiration', 1440)` minutes)
     * and is **not** returned in the login response (spec API 1), so the app cannot
     * know the real expiry. This field is only populated if a future backend response
     * includes it; `null` means "unknown" and the app relies on server 401s instead.
     */
    expiresAt: string | null;
};

let currentToken: StoredToken | null = null;

/** Synchronous read for the request interceptor. */
export function getToken(): StoredToken | null {
    return currentToken;
}

/** True when a token is present. Used by session restore, not for authorization. */
export function hasToken(): boolean {
    return currentToken !== null;
}

/** Restores the persisted token into memory. Call once during app bootstrap. */
export async function loadToken(): Promise<StoredToken | null> {
    const stored = await getItem<StoredToken>(STORAGE_KEYS.authToken);

    if (stored === null || typeof stored.token !== 'string' || stored.token.length === 0) {
        currentToken = null;

        return null;
    }

    currentToken = stored;

    return stored;
}

/** Persists a token issued by `POST /auth/login`. */
export async function saveToken(token: Omit<StoredToken, 'expiresAt'> & { expiresAt?: string | null }): Promise<void> {
    const stored: StoredToken = {
        token: token.token,
        tokenType: token.tokenType || 'Bearer',
        expiresAt: token.expiresAt ?? null,
    };

    currentToken = stored;

    await setItem(STORAGE_KEYS.authToken, stored);
}

/** Clears the token from memory and storage (sign-out, logout-all, 401). */
export async function clearToken(): Promise<void> {
    currentToken = null;

    await removeItem(STORAGE_KEYS.authToken);
}

/**
 * Builds the `Authorization` header value. Returns `null` when there is no token so
 * the interceptor can skip the header entirely on public endpoints.
 */
export function buildAuthorizationHeader(): string | null {
    if (currentToken === null) {
        return null;
    }

    return `${currentToken.tokenType || 'Bearer'} ${currentToken.token}`;
}
