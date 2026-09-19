import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppListItem } from '../../../components/AppListItem';
import { AppText } from '../../../components/AppText';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AccountStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { useResendVerification } from '../../profile/hooks';
import { useSession, useSignOut, useSignOutEverywhere } from '../../auth/hooks';
import { useSessionStore } from '../../auth/store/sessionStore';

type Props = NativeStackScreenProps<AccountStackParamList, 'Account'>;

/**
 * Account (spec Screen 11) — the settings hub.
 *
 * Reads the user from [`useSession`](src/features/auth/hooks/useSession.ts:1) so the
 * screen reflects server truth, with the session store as the source for the initial
 * render. Sign-out is destructive and confirmed; "sign out everywhere" is separated
 * from it because it revokes tokens on every device and is not recoverable by simply
 * signing back in on this one.
 *
 * No avatar upload is offered: `POST /auth/profile` accepts `name`/`email` only, and
 * the avatar endpoint rejects the employee role (backend gap G4). Showing an avatar
 * control here would be a dead end.
 */
export function AccountScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const session = useSession();
    const cachedUser = useSessionStore(state => state.user);
    const user = session.data ?? cachedUser;

    const signOut = useSignOut();
    const signOutEverywhere = useSignOutEverywhere();
    const resendVerification = useResendVerification();

    const isVerified = user?.email_verified_at !== null && user?.email_verified_at !== undefined;

    const confirmSignOut = () => {
        Alert.alert('Sign out', 'You will need to sign in again to use the app.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => signOut.mutate(undefined),
            },
        ]);
    };

    const confirmSignOutEverywhere = () => {
        Alert.alert(
            'Sign out everywhere',
            'This signs you out on every device and revokes all active sessions.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign out everywhere',
                    style: 'destructive',
                    onPress: () => signOutEverywhere.mutate(),
                },
            ],
        );
    };

    return (
        <ScreenContainer hasHeader>
            <AppHeader title="Account" subtitle="Your profile and settings." />

            <ScrollView contentContainerStyle={[styles.content, { gap: theme.spacing.md }]}>
                <AppCard>
                    <View style={{ gap: theme.spacing.xs }}>
                        <AppText variant="subtitle">{user?.name ?? 'Signed in'}</AppText>
                        <AppText variant="caption" color="textSecondary">
                            {user?.email ?? ''}
                        </AppText>
                        {user !== null && user !== undefined ? (
                            <AppText variant="caption" color="textMuted">
                                {user.roles.join(', ') || user.role}
                            </AppText>
                        ) : null}
                    </View>
                </AppCard>

                {!isVerified && user !== null && user !== undefined ? (
                    <AppCard>
                        <AppText variant="caption" color="warning">
                            Your email address is not verified.
                        </AppText>
                        <AppListItem
                            label="Resend verification email"
                            isLast
                            onPress={() => resendVerification.mutate()}
                        />
                    </AppCard>
                ) : null}

                <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="caption" color="textSecondary">
                        Profile
                    </AppText>

                    <AppCard padded={false}>
                        <AppListItem
                            label="Personal details"
                            value="Name and email"
                            onPress={() => navigation.navigate('Profile')}
                        />
                        <AppListItem
                            label="Change password"
                            onPress={() => navigation.navigate('ChangePassword')}
                        />
                        <AppListItem
                            label="Preferences"
                            isLast
                            onPress={() => navigation.navigate('Preferences')}
                        />
                    </AppCard>
                </View>

                <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="caption" color="textSecondary">
                        Session
                    </AppText>

                    <AppCard padded={false}>
                        <AppListItem label="Sign out" isLast onPress={confirmSignOut} />
                    </AppCard>

                    <AppCard padded={false}>
                        <AppListItem
                            label="Sign out everywhere"
                            isLast
                            destructive
                            onPress={confirmSignOutEverywhere}
                        />
                    </AppCard>

                    <AppText variant="caption" color="textMuted">
                        Sign out everywhere revokes access on all devices. Use it if you have lost a
                        device or shared your password.
                    </AppText>
                </View>

                {user?.company_access.is_locked ? (
                    <AppCard>
                        <View style={{ gap: theme.spacing.xs }}>
                            <AppText variant="caption" color="danger">
                                Company access is locked
                            </AppText>
                            <AppText variant="caption" color="textSecondary">
                                {user.company_access.reason ??
                                    'Some features are unavailable until access is restored.'}
                            </AppText>
                        </View>
                    </AppCard>
                ) : null}
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 32,
    },
});
