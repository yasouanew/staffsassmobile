/**
 * `@react-native/jest-preset` transforms the RN packages that ship Flow/JSX, but not the
 * ESM-only libraries used by this app (react-navigation, and several of its transitive
 * dependencies all publish `lib/module` ESM). Those are excluded from transformation by
 * the preset's default `transformIgnorePatterns`, so Jest hits `Unexpected token 'export'`.
 *
 * Rather than copy the preset's pattern and let it drift, the negation for the preset
 * itself is preserved and the ESM libraries this project actually depends on are appended.
 */
const esmPackages = [
  '@react-navigation',
  '@react-native-async-storage',
  '@react-native-firebase',
  '@notifee',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-config',
  'use-latest-callback',
  'nanoid',
  'zustand',
];

module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    `node_modules/(?!(@react-native|react-native|${esmPackages.join('|')})/)`,
  ],
  // These packages read their values from native TurboModules that only exist inside a
  // real build, so they cannot be imported under Jest. Mocking them keeps the test
  // environment hermetic and independent of the build-time `.env*` files.
  moduleNameMapper: {
    '^react-native-config$': '<rootDir>/jest/react-native-config.mock.js',
    '^@react-native-firebase/app$': '<rootDir>/jest/firebase-app.mock.js',
    '^@react-native-firebase/messaging$': '<rootDir>/jest/firebase-messaging.mock.js',
    '^@notifee/react-native$': '<rootDir>/jest/notifee.mock.js',
    // AsyncStorage resolves to a native TurboModule that does not exist under Jest, so
    // any test touching the persisted notification inbox needs an in-memory store.
    '^@react-native-async-storage/async-storage$': '<rootDir>/jest/async-storage.mock.js',
  },
};
