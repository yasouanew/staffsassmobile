module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // `react-native-config` ships no Babel plugin of its own. Values from the `.env*`
    // files are injected natively at build time and read at runtime through the
    // TurboModule (`src/config/env.ts`), so no transform is required here. Metro is
    // told to resolve the package instead (see `metro.config.js`).
    [
      // Absolute imports for the feature-based `src/` tree, e.g.
      // `import { AppText } from '@components/AppText';`
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@api': './src/api',
          '@app': './src/app',
          '@components': './src/components',
          '@config': './src/config',
          '@features': './src/features',
          '@hooks': './src/hooks',
          '@navigation': './src/navigation',
          '@store': './src/store',
          '@theme': './src/theme',
          '@types': './src/types',
          '@utils': './src/utils',
        },
      },
    ],
  ],
};
