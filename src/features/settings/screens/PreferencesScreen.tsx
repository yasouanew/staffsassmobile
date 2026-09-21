import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppListItem } from '../../../components/AppListItem';
import { AppText } from '../../../components/AppText';
import { LoadingView } from '../../../components/LoadingView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AccountStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { usePreferencesStore, type AppearancePreference } from '../store';

/** Order and copy for the appearance picker. `system` is listed first (default). */
const APPEARANCE_OPTIONS: ReadonlyArray<{ value: AppearancePreference; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

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
    const appearance = usePreferencesStore(state => state.appearance);
    const setPushEnabled = usePreferencesStore(state => state.setPushEnabled);
    const setRosterWeekView = usePreferencesStore(state => state.setRosterWeekView);
    const setAppearance = usePreferencesStore(state => state.setAppearance);
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
                        Appearance
                    </AppText>

                    <View style={[styles.segmented, { gap: theme.spacing.xs }]}>
                        {APPEARANCE_OPTIONS.map(option => {
                            const isSelected = option.value === appearance;

                            return (
                                <Pressable
                                    key={option.value}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: isSelected }}
                                    testID={`appearance-${option.value}`}
                                    onPress={() => {
                                        void setAppearance(option.value);
                                    }}
                                    style={[
                                        styles.segment,
                                        {
                                            borderRadius: theme.radius.md,
                                            borderWidth: theme.sizing.borderWidths.hairline,
                                            borderColor: isSelected
                                                ? theme.colors.primary
                                                : theme.colors.border,
                                            backgroundColor: isSelected
                                                ? theme.colors.primarySoft
                                                : theme.colors.surface,
                                        },
                                    ]}>
                                    <AppText
                                        variant="bodyStrong"
                                        color={isSelected ? 'textLink' : 'textSecondary'}
                                        align="center">
                                        {option.label}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>

                    <AppText variant="caption" color="textMuted">
                        System follows your device setting. Choosing Light or Dark pins the app to
                        that appearance on this device.
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
    /** Equal-width segments laid out in a row. */
    segmented: {
        flexDirection: 'row',
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
});
