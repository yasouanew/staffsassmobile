import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin typed wrapper over AsyncStorage.
 *
 * AsyncStorage is used (rather than an MMKV/SQLite store) because it is the
 * platform-supported key/value store that ships with the React Native ecosystem and
 * the payloads here are tiny: a Sanctum token, a cached user object, and UI
 * preferences. All three must survive app restarts but are not hot-path reads, so
 * the async API costs nothing and avoids an extra native dependency.
 *
 * Failures are swallowed and reported as `null`/no-ops: a corrupt or unavailable
 * store must degrade to "signed out" or "default settings", never crash a launch.
 */

export async function getItem<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);

        if (raw === null) {
            return null;
        }

        return JSON.parse(raw) as T;
    } catch {
        // Corrupt payload — drop it so the next write starts from a clean slate.
        void removeItem(key);

        return null;
    }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage full or unavailable: the in-memory session stays authoritative.
    }
}

export async function removeItem(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch {
        // Nothing actionable — the key is either gone or will be overwritten.
    }
}

export async function getString(key: string): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(key);
    } catch {
        return null;
    }
}

export async function setString(key: string, value: string): Promise<void> {
    try {
        await AsyncStorage.setItem(key, value);
    } catch {
        // See `setItem`.
    }
}

/**
 * Removes every namespaced key owned by the app.
 *
 * Used on sign-out and on `logout-all`. Only keys prefixed with `@staffsaas/` are
 * cleared so any third-party library state (Firebase, navigation persistence) is
 * left untouched.
 */
export async function clearAppStorage(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const appKeys = keys.filter(key => key.startsWith('@staffsaas/'));

        if (appKeys.length > 0) {
            await AsyncStorage.removeMany(appKeys);
        }
    } catch {
        // See `removeItem`.
    }
}
