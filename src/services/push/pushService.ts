import { Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
    deleteToken,
    getInitialNotification,
    getMessaging,
    getToken,
    isDeviceRegisteredForRemoteMessages,
    onMessage,
    onNotificationOpenedApp,
    onTokenRefresh,
    registerDeviceForRemoteMessages,
    requestPermission,
    setBackgroundMessageHandler,
    type RemoteMessage,
} from '@react-native-firebase/messaging';

import { env } from '../../config/env';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { deviceTokenApi } from '../../features/notifications/api';
import { useNotificationInboxStore } from '../../features/notifications/store';
import { useSessionStore } from '../../features/auth/store/sessionStore';
import { usePreferencesStore } from '../../features/settings/store/preferencesStore';
import type { DevicePlatform } from '../../types/api';
import { getString, setString, removeItem } from '../../utils/storage';
import { logger } from '../../utils/logger';

/**
 * Push notification service.
 *
 * Every entry point short-circuits on `env.fcm.enabled`, which is `false` unless a
 * Firebase config file is present (see `google-services.json` / `GoogleService-Info.plist`).
 * That keeps a build without credentials from hitting a native "default app has not
 * been initialized" crash while still shipping the real integration.
 *
 * Responsibilities, and deliberately nothing else:
 * - obtain and register the device token with the backend,
 * - unregister it on sign-out or opt-out,
 * - persist incoming messages into the local notification inbox,
 * - hand incoming messages to a caller-supplied handler.
 *
 * Navigation and query invalidation are **not** done here: the service must not
 * import the navigator, or it would invert the dependency direction and make the
 * service untestable. Persisting into the inbox *is* done here, because it has to
 * work in a headless background launch where no screen or query client exists.
 */

/** Callbacks the app supplies; keeps this module free of navigation/UI imports. */
export type PushHandlers = {
    /** A notification arrived while the app was foregrounded. */
    onForegroundMessage?: (message: RemoteMessage) => void;
    /** The user tapped a notification and the app was backgrounded. */
    onNotificationOpened?: (message: RemoteMessage) => void;
};

let handlers: PushHandlers = {};
const unsubscribers: Array<() => void> = [];
let initialized = false;

/**
 * Derives a stable local identity for a message that the backend has not yet assigned
 * a notification id to.
 *
 * The backend's FCM payload carries the *business* key (`type` plus `shift_id` and
 * friends), not the `notifications` uuid — see
 * [`FcmMessage`](../staff-sass-last17/app/Notifications/Messages/FcmMessage.php:1).
 * Reusing that business key as the local id means a redelivered message updates one
 * row instead of stacking duplicates, and a later server sync can correlate the two
 * through `type` + `data` in
 * [`isSameNotification`](../../features/notifications/utils/inboxMerge.ts:1).
 */
function localIdForMessage(message: RemoteMessage): string {
    if (typeof message.messageId === 'string' && message.messageId.length > 0) {
        return `push:${message.messageId}`;
    }

    const data = message.data ?? {};
    const parts = Object.keys(data)
        .sort()
        .map(key => `${key}=${String(data[key])}`);

    return `push:${parts.join('&')}`;
}

/** Builds the `{ title, body, ...businessFields }` bag the inbox expects. */
function inboxPayloadForMessage(message: RemoteMessage): Record<string, unknown> {
    const data: Record<string, unknown> = { ...(message.data ?? {}) };

    // Prefer an explicit data title/body; fall back to the notification block, which
    // is what the OS renders but is absent on data-only messages.
    if (typeof data.title !== 'string' && message.notification?.title !== undefined) {
        data.title = message.notification.title;
    }

    if (typeof data.body !== 'string' && message.notification?.body !== undefined) {
        data.body = message.notification.body;
    }

    return data;
}

/**
 * Writes a delivered message into the persistent inbox.
 *
 * Deliberately tolerant: a failure to persist must not prevent the OS from showing the
 * notification or the app from opening. Called from the background handler, where the
 * process may be torn down moments later, so it is awaited rather than fired and
 * forgotten.
 */
async function persistToInbox(message: RemoteMessage): Promise<void> {
    try {
        await useNotificationInboxStore
            .getState()
            .receivePush(inboxPayloadForMessage(message), localIdForMessage(message));
    } catch (error) {
        logger.warn('[push] Failed to persist notification into the local inbox', error);
    }
}

/** True when FCM is configured *and* the device is allowed to receive push. */
function isPushAvailable(): boolean {
    return env.fcm.enabled;
}

/**
 * The `fcm:` prefix matches what the backend stores and what `LoginAction` upserts
 * (spec Screen 1 API 1 — `fcm_token` max 500). Sending the bare token would create a
 * second, unrelated row in `device_tokens`.
 */
function toStoredTokenFormat(rawToken: string): string {
    return rawToken.startsWith('fcm:') ? rawToken : `fcm:${rawToken}`;
}

function currentPlatform(): DevicePlatform {
    return Platform.OS === 'ios' ? 'ios' : 'android';
}

/**
 * Creates the Android notification channel FCM posts into.
 *
 * A channel declared only via the `default_notification_channel_id` manifest
 * meta-data is never actually registered with the OS — the meta-data merely names the
 * channel the SDK *should* use. Android 8+ drops notifications aimed at a channel that
 * does not exist, so it has to be created imperatively through the native module.
 *
 * The id is taken from `env.fcm.androidChannelId`, which is also what
 * `res/values/strings.xml` reproduces for the manifest meta-data; both must agree.
 */
async function ensureAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        // Required lazily: `@react-native-firebase/messaging` pulls in a native module
        // that is unavailable in a plain Jest environment, and this helper is only
        // reached once push is known to be configured.
        const { default: notifee } = await import('@notifee/react-native');

        await notifee.createChannel({
            id: env.fcm.androidChannelId,
            name: 'StaffSaaS',
            importance: 4,
        });
    } catch (error) {
        logger.warn('[push] Failed to create Android notification channel', error);
    }
}

/**
 * Registers this device with the backend.
 *
 * Called after login, on token refresh, and when push is re-enabled. It is safe to
 * call repeatedly because the backend upserts on `token`.
 *
 * The last registered token is persisted so sign-out can unregister it even if FCM
 * is unreachable at that moment.
 */
export async function registerDevice(): Promise<void> {
    if (!isPushAvailable()) {
        return;
    }

    const sessionStatus = useSessionStore.getState().status;

    // Never register a device anonymously — the backend ties the token to the user
    // and an unauthenticated call would be rejected (and would leak a 401 handling
    // path into the login screen).
    if (sessionStatus !== 'authenticated') {
        return;
    }

    if (!usePreferencesStore.getState().pushEnabled) {
        return;
    }

    try {
        const messaging = getMessaging(getApp());
        const authorized = await requestPermission(messaging);

        if (!authorized) {
            // OS-level denial is authoritative; nothing to report to the backend.
            return;
        }

        // iOS requires explicit registration before `getToken()` returns anything.
        if (!(await isDeviceRegisteredForRemoteMessages(messaging))) {
            await registerDeviceForRemoteMessages(messaging);
        }

        const rawToken = await getToken(messaging);
        const token = toStoredTokenFormat(rawToken);

        await deviceTokenApi.register({
            token,
            platform: currentPlatform(),
            device_name: undefined,
        });

        await setString(STORAGE_KEYS.fcmToken, token);
    } catch (error) {
        // Push is a non-essential enhancement: a failure here must never block login
        // or surface an error the user cannot act on.
        logger.warn('[push] Failed to register device for push notifications', error);
    }
}

/** Unregisters this device. Called on sign-out and when push is disabled. */
export async function unregisterDevice(): Promise<void> {
    if (!isPushAvailable()) {
        return;
    }

    const token = await getString(STORAGE_KEYS.fcmToken);

    if (token === null) {
        return;
    }

    try {
        await deviceTokenApi.unregister(token);
    } catch (error) {
        // The server token is not important enough to block sign-out; it expires with
        // the session's personal access token anyway.
        logger.warn('[push] Failed to unregister device token', error);
    } finally {
        await removeItem(STORAGE_KEYS.fcmToken);
    }

    try {
        // Also drop the local FCM token so a shared device cannot receive the previous
        // user's notifications after sign-out.
        await deleteToken(getMessaging(getApp()));
    } catch (error) {
        logger.warn('[push] Failed to delete local FCM token', error);
    }
}

/**
 * Sets up listeners and requests permission.
 *
 * Returns a cleanup function. Handlers are registered once per app launch; repeated
 * calls are ignored so a Fast Refresh cannot stack duplicate listeners.
 */
export async function initializePushService(nextHandlers: PushHandlers = {}): Promise<() => void> {
    handlers = nextHandlers;

    if (initialized || !isPushAvailable()) {
        return () => undefined;
    }

    initialized = true;

    try {
        await ensureAndroidNotificationChannel();

        const messaging = getMessaging(getApp());

        unsubscribers.push(
            onMessage(messaging, message => {
                // Foreground messages are never shown by the OS on Android, so the
                // inbox is the only durable record of them.
                void persistToInbox(message);
                handlers.onForegroundMessage?.(message);
            }),
        );

        unsubscribers.push(
            onNotificationOpenedApp(messaging, message => {
                // A tap is proof the user saw the notification; recording it also
                // guarantees the row exists offline, since a tray notification from a
                // backgrounded app may never have been materialised locally.
                void persistToInbox(message);
                handlers.onNotificationOpened?.(message);
            }),
        );

        unsubscribers.push(
            onTokenRefresh(messaging, async rawToken => {
                const token = toStoredTokenFormat(rawToken);

                if (useSessionStore.getState().status !== 'authenticated') {
                    return;
                }

                try {
                    await deviceTokenApi.register({ token, platform: currentPlatform() });
                    await setString(STORAGE_KEYS.fcmToken, token);
                } catch (error) {
                    logger.warn('[push] Failed to sync refreshed device token', error);
                }
            }),
        );

        // A tap that launched a cold start never fires `onNotificationOpenedApp`;
        // this is the only way to see it.
        const initial = await getInitialNotification(messaging);

        if (initial) {
            await persistToInbox(initial);
            handlers.onNotificationOpened?.(initial);
        }
    } catch (error) {
        logger.warn('[push] Failed to initialise push service', error);
    }

    return () => {
        while (unsubscribers.length > 0) {
            unsubscribers.pop()?.();
        }

        initialized = false;
    };
}

/**
 * Background/quit-state message handler.
 *
 * Must be registered at module scope — before the React tree exists — or Android
 * will not deliver messages while the app is terminated. Called from `index.js`.
 *
 * This is where the inbox earns its keep. The OS renders the notification itself (the
 * backend sends a `notification` block alongside the data), but if the user swipes it
 * away without tapping, the *content* is gone forever unless something wrote it down.
 * The handler therefore persists every message before returning.
 *
 * A headless launch has no session, so the store is only hydrated opportunistically —
 * writes go to whatever the last hydration left in memory, and `mergeServerPage`
 * reconciles identities on the next foreground sync.
 */
export function registerBackgroundMessageHandler(): void {
    if (!isPushAvailable()) {
        return;
    }

    try {
        setBackgroundMessageHandler(getMessaging(getApp()), async message => {
            await persistToInbox(message);
        });
    } catch (error) {
        logger.warn('[push] Failed to register background message handler', error);
    }
}
