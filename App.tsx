/**
 * Application root.
 *
 * Deliberately thin: it composes the three providers the app needs and mounts the
 * root navigator. Anything with behaviour of its own (auth gating, theme derivation,
 * session restore) lives in [`RootNavigator`](src/navigation/RootNavigator.tsx:1) or
 * the feature that owns it, so this file stays readable at a glance.
 *
 * Provider order matters:
 * 1. `SafeAreaProvider` — everything below reads insets, including the navigator's
 *    tab bar and every `ScreenContainer`.
 * 2. `QueryClientProvider` — server-state cache. Created once via module-level
 *    `useState` initialiser rather than inline, so a re-render can never discard the
 *    cache (the classic `new QueryClient()`-in-render bug).
 * 3. `NavigationContainer` — mounted *inside* `RootNavigator`, because the navigator
 *    needs the query client and session store in scope before it renders.
 *
 * No `GestureHandlerRootView`: the app uses native-stack and bottom-tabs only, neither
 * of which requires react-native-gesture-handler. Adding it would be an unnecessary
 * native dependency for a navigator that does not use gestures.
 *
 * @format
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClientConfig } from './src/config/queryConfig';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePushNotifications } from './src/services/push';

/**
 * Bridges push notifications into the query cache.
 *
 * Rendered as a component rather than called as a hook in `App` so it sits *inside*
 * `QueryClientProvider` — `usePushNotifications` invalidates notification queries, and
 * a hook called above the provider would throw.
 */
function PushNotificationsBridge(): null {
  usePushNotifications();

  return null;
}

function App(): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  return (
    <SafeAreaProvider>
      {/* The app is light-only by design (the theme has no dark variant), so the bar
          style is fixed rather than derived from `useColorScheme`. `backgroundColor`
          is not set: React Native 0.87 runs edge-to-edge on Android, where the
          status bar is transparent and draws the app background behind itself. */}
      <StatusBar barStyle="dark-content" />

      <QueryClientProvider client={queryClient}>
        <PushNotificationsBridge />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
