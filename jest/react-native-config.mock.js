/**
 * Jest stand-in for `react-native-config`.
 *
 * The real module reads its values from the `RNCConfigModule` TurboModule that the
 * native build generates from the `.env*` files in the project root. Neither the
 * module nor the generated values exist in the Jest environment, so tests would fail
 * to parse the file before ever reaching a test body.
 *
 * The values below are inert placeholders: they exist only so `src/config/env.ts` can
 * resolve its fallbacks deterministically. No test may assert on real credentials.
 */
const Config = {
    APP_ENV: 'development',
    API_BASE_URL: 'http://localhost/api/v1',
    API_TIMEOUT_MS: '15000',
    APP_PUBLIC_URL: 'http://localhost',
    APP_DEBUG: 'false',
    APP_DEEP_LINK_SCHEME: 'staffapp',
    FCM_ENABLED: 'false',
    FCM_ANDROID_CHANNEL_ID: 'staffsaas_default',
};

module.exports = Config;
module.exports.Config = Config;
module.exports.default = Config;
