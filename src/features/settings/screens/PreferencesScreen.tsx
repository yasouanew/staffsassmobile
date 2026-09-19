import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppListItem } from '../../../components/AppListItem';
import { AppText } from '../../../components/AppText';
import { LoadingView } from '../../../components/LoadingView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AccountStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { usePreferencesStore } from '../store';

type Props = NativeStackScreenProps<AccountStackParamList, 'Preferences'>;

/**
 * Preferences.
 *
 * These are device-local UI settings held in [`usePreferencesStore`](src/features/settings/store/preferencesStore.ts:1) —
 * nothing here is sent to the API, which is why this is Zustand and not a query.
 *
 * The push toggle is an *app-level* opt-in layered on top of the OS permission. It is
 * deliberately not presented as a way to grant permission: if the OS has denied push,
 * turning this on cannot help, so the screen says so rather than letting the user flip
 * a switch that has no effect.
 */
export function PreferencesScreen(_props: Props): React.JSX.Element {
    const theme = useTheme();

    const isHydrated = usePreferencesStore(state => state.isHydrated);
    const pushEnabled = usePreferencesStore(state => state.pushEnabled);
    const rosterWeekView = usePreferencesStore(state => state.rosterWeekView);
    const setPushEnabled = usePreferencesStore(state => state.setPushEnabled);
    const setRosterWeekView = usePreferencesStore(state => state.setRosterWeekView);
    const reset = usePreferencesStore(state => state.reset);

    if (!isHydrated) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="Preferences" />
                <LoadingView />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer hasHeader>
            <AppHeader title="Preferences" subtitle="How the app works on this device." />

            <ScrollView contentContainerStyle={[styles.content, { gap: theme.spacing.md }]}>
                <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="caption" color="textSecondary">
                        Notifications
                    </AppText>

                    <AppCard padded={false}>
                        <AppListItem
                            label="Push notifications"
                            isLast
                            onPress={() => {
                                void setPushEnabled(!pushEnabled);
                            }}
                            trailing={
                                <Switch
                                    value={pushEnabled}
                                    onValueChange={value => {
                                        void setPushEnabled(value);
                                    }}
                                />
                            }
                        />
                    </AppCard>

                    <AppText variant="caption" color="textMuted">
                        Shift and roster updates are sent as push notifications. If notifications are
                        blocked in your device settings, turning this on will not override that.
                    </AppText>
                </View>

                <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="caption" color="textSecondary">
                        Roster
                    </AppText>

                    <AppCard padded={false}>
                        <AppListItem
                            label="Open rosters in week view"
                            isLast
                            onPress={() => {
                                void setRosterWeekView(!rosterWeekView);
                            }}
                            trailing={
                                <Switch
                                    value={rosterWeekView}
                                    onValueChange={value => {
                                        void setRosterWeekView(value);
                                    }}
                                />
                            }
                        />
                    </AppCard>
                </View>

                <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="caption" color="textSecondary">
                        Reset
                    </AppText>

                    <AppCard padded={false}>
                        <AppListItem
                            label="Restore default preferences"
                            isLast
                            destructive
                            onPress={() => {
                                void reset();
                            }}
                        />
                    </AppCard>

                    <AppText variant="caption" color="textMuted">
                        This only affects settings on this device. It does not change your account or
                        your notification history.
                    </AppText>
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 32,
    },
});
