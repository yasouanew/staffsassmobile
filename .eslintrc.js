module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Hand-written Jest stand-ins for native modules. They run in the Jest
      // environment, so the `jest` global is available even though they live
      // outside `__tests__`.
      files: ['jest/**/*.js'],
      env: { jest: true },
    },
  ],
};
