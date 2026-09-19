import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CompanyLockedView } from '../components/CompanyLockedView';
import { env } from '../config/env';
import { useSignOut } from '../features/auth/hooks/useSignOut';
import { useCompanyAccess } from '../features/auth/hooks/usePermissions';
import { useSessionStore } from '../features/auth/store/sessionStore';
import { usePreferencesStore } from '../features/settings/store/preferencesStore';
import { useTheme } from '../theme';
import { AppTabs } from './stacks/AppTabs';
import { AuthStack } from './stacks/AuthStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Deep links.
 *
 * Only the password reset flow is linked, because it is the one path the app cannot
 * initiate itself — the user arrives from an email. `env.deepLinkScheme` is
 * configurable so staging and production builds (which use distinct schemes) do not
 * fight over the same link.
 *
 * The reset link is expected as `staffapp://reset-password?token=…&email=…`.
 */
const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [`${env.deepLinkScheme}://`, env.appPublicUrl],
    config: {
        screens: {
            Auth: {
                screens: {
                    ResetPassword: 'reset-password',
                },
            },
        },
    },
};

/**
 * Root navigator.
 *
 * The single place that decides whether the user sees the auth flow or the app, based
 * on [`useSessionStore`](src/features/auth/store/sessionStore.ts:1). Screens never
 * navigate to Login on their own; they clear the session and this switch reacts. That
 * keeps route protection in one place and makes the "authenticated" condition
 * impossible to forget in a screen.
 *
 * `status === 'unknown'` renders a bare spinner rather than either hierarchy: showing
 * Login first would flash the login form at a user who is in fact signed in, which is
 * both jarring and a phishing-shaped anti-pattern.
 */
export function RootNavigator(): React.JSX.Element {
    const theme = useTheme();
    const status = useSessionStore(state => state.status);
    const restoreSession = useSessionStore(state => state.restoreSession);
    const hydratePreferences = usePreferencesStore(state => state.hydrate);
    const { isLocked, reason } = useCompanyAccess();
    const signOut = useSignOut();

    useEffect(() => {
        // Fire-and-forget: the store flips `status` when it finishes, which is what
        // drives the render below.
        void restoreSession();
        void hydratePreferences();
    }, [restoreSession, hydratePreferences]);

    if (status === 'unknown') {
        return (
            <View style={[styles.boot, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    /**
     * Locked company (`company.access` → 403).
     *
     * Checked here, above the navigator, rather than inside each screen: every tab is
     * company-scoped, so a locked account would render a shell where each screen
     * independently fails with the same 403. One gate replaces N error states and
     * cannot be forgotten when a new screen is added.
     *
     * Only applies while authenticated — the session store clears `user` on sign-out,
     * so `isLocked` cannot strand a signed-out user on this screen.
     */
    if (status === 'authenticated' && isLocked) {
        return (
            <CompanyLockedView
                reason={reason}
                onSignOut={() => signOut.mutate(undefined)}
                signingOut={signOut.isPending}
            />
        );
    }

    // React Navigation's own theme drives system chrome (the container background and
    // the default header/font colours). It is derived from the app theme so the two
    // cannot drift; `fonts` is required by the type and has no equivalent in our
    // typography scale, so it is a no-op object.
    const navigationTheme: NavigationTheme = {
        dark: false,
        colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.danger,
        },
        fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
        },
    };

    return (
        <NavigationContainer linking={linking} theme={navigationTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {status === 'authenticated' ? (
                    <Stack.Screen name="App" component={AppTabs} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthStack} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    boot: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});
