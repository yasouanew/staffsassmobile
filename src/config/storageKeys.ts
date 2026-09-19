/**
 * Single source of truth for AsyncStorage keys.
 *
 * Keys are namespaced and versioned so a future breaking change to a persisted
 * payload shape can be rolled out by bumping the suffix instead of crashing on
 * stale data.
 */
export const STORAGE_KEYS = {
    /** Sanctum personal access token (`{ token, tokenType, expiresAt }`). */
    authToken: '@staffsaas/auth.token.v1',
    /** Cached `UserResource` from `auth/me` used to restore the session offline. */
    authUser: '@staffsaas/auth.user.v1',
    /** Device-local preferences (theme, push opt-in). */
    preferences: '@staffsaas/preferences.v1',
    /** Last FCM token registered with the backend, used to unregister on logout. */
    fcmToken: '@staffsaas/fcm.token.v1',
    /**
     * Locally persisted notification inbox (`PersistedInbox`), written by the push
     * handlers so notifications survive app restarts and remain readable offline.
     */
    notificationInbox: '@staffsaas/notifications.inbox.v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
