const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * --- Windows SHA-1 fix ---------------------------------------------------------
 *
 * React Native 0.87 turns on Metro's lazy SHA-1 mode by default
 * (`watcher.unstable_lazySha1: true`). In that mode the file-map crawler does NOT
 * compute SHA-1 hashes up front, and they are computed on demand during
 * transformation. On Windows (where Watchman is typically not installed and Metro
 * falls back to the Node watcher/crawler) the lazy on-demand hashing can fail for
 * files that live under `node_modules`, producing:
 *
 *   Error: Failed to get the SHA-1 for:
 *     ...\node_modules\metro-runtime\src\polyfills\require.js
 *   Potential causes:
 *     1) The file is not watched. Ensure it is under the configured `projectRoot`
 *        or `watchFolders`.
 *     ...
 *
 * Disabling lazy SHA-1 restores the previous, eager behaviour where every crawled
 * file is hashed up front, which is reliable on Windows. We also explicitly add
 * `node_modules` to `watchFolders` so its files are always part of the crawled
 * /watched set, regardless of resolver block-list changes.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    // Ensure Metro always crawls/watches node_modules in addition to the project root.
    // Without this, hoisted packages (e.g. metro-runtime) can fall outside the watch set.
    watchFolders: [
        __dirname,
        path.resolve(__dirname, 'node_modules'),
    ],

    watcher: {
        // Root-cause fix: eager SHA-1 hashing instead of Metro's default lazy mode.
        unstable_lazySha1: false,
    },

    // Pin the cache version so a corrupted Metro cache (a frequent cause of the same
    // error on Windows) is reliably discarded by `--reset-cache`.
    cacheVersion: 'staffsaas-mobile-1',
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
