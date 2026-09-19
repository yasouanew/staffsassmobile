import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { HomeStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { formatDate, formatDuration, formatTime } from '../../../utils/date';
import { isCompanyAccessLocked } from '../../../utils/errors';
import { useSessionStore } from '../../auth/store/sessionStore';
import { ShiftCard } from '../components/ShiftCard';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { useHomeDashboard } from '../hooks';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

/**
 * Home dashboard (spec Screen 4).
 *
 * There is no `/today` endpoint (spec G7), so "today" is assembled client-side by
 * [`useHomeDashboard`](../hooks/useHomeDashboard.ts:1). This screen is therefore
 * pure presentation over one object — it holds no loading logic of its own, which
 * is what keeps the loading/empty/error rules in §9 applied consistently.
 *
 * The empty state can only appear after a successful load: `isEmpty` is false while
 * `isLoading` is true, so a slow network never reads as "no shifts".
 */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const firstName = useSessionStore(state => state.user?.name.split(' ')[0] ?? 'there');
    const dashboard = useHomeDashboard();

    const refreshControl = (
        <RefreshControl
            refreshing={dashboard.isRefreshing}
            onRefresh={dashboard.refresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
        />
    );

    const bell = (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={
                dashboard.unreadNotifications > 0
                    ? `Notifications, ${dashboard.unreadNotifications} unread`
                    : 'Notifications'
            }
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={theme.spacing.sm}
            style={styles.bell}>
            <AppText variant="title" accessible={false}>
                {'\u{1F514}'}
            </AppText>
            {dashboard.unreadNotifications > 0 ? (
                <View
                    testID="home-unread-dot"
                    style={[
                        styles.dot,
                        {
                            backgroundColor: theme.colors.danger,
                            borderColor: theme.colors.surface,
                        },
                    ]}
                />
            ) : null}
        </Pressable>
    );

    if (dashboard.isLoading) {
        return (
            <ScreenContainer hasHeader refreshControl={refreshControl}>
                <AppHeader
                    title={`Hi, ${firstName}`}
                    subtitle={formatDate(dashboard.today, { long: true })}
                    action={bell}
                />
                <HomeSkeleton />
            </ScreenContainer>
        );
    }

    if (dashboard.isError) {
        // A locked company surfaces as a 403 with a subscription/trial message
        // (spec Screen 4 §2). The root navigator gates the cached lock, but the
        // lock can also land after `me` was cached — in that case the shift query
        // is what fails, so Home explains inline instead of showing a retryable
        // error. There is deliberately no retry or upgrade CTA: paying is an
        // admin web task and retrying a lock can never succeed.
        if (isCompanyAccessLocked(dashboard.error)) {
            return (
                <ScreenContainer hasHeader refreshControl={refreshControl}>
                    <AppHeader
                        title={`Hi, ${firstName}`}
                        subtitle={formatDate(dashboard.today, { long: true })}
                        action={bell}
                    />
                    <AppCard
                        testID="home-locked-banner"
                        style={{ backgroundColor: theme.colors.warningSoft }}>
                        <View style={{ gap: theme.spacing.xs }}>
                            <AppText variant="bodyStrong" color="warningStrong">
                                Account unavailable
                            </AppText>
                            <AppText variant="body" color="warningStrong">
                                {dashboard.error.message}
                            </AppText>
                            <AppText variant="caption" color="textSecondary">
                                Ask your company administrator to restore the subscription.
                            </AppText>
                        </View>
                    </AppCard>
                </ScreenContainer>
            );
        }

        return (
            <ScreenContainer hasHeader refreshControl={refreshControl}>
                <AppHeader
                    title={`Hi, ${firstName}`}
                    subtitle={formatDate(dashboard.today, { long: true })}
                    action={bell}
                />
                <ErrorView error={dashboard.error} onRetry={dashboard.refresh} />
            </ScreenContainer>
        );
    }

    // A signed-in account with no linked employee record cannot have shifts —
    // the shift queries stay disabled, so this is an explanatory empty state,
    // not an error with a retry button that could never succeed.
    if (dashboard.employeeId === null) {
        return (
            <ScreenContainer hasHeader refreshControl={refreshControl}>
                <AppHeader
                    title={`Hi, ${firstName}`}
                    subtitle={formatDate(dashboard.today, { long: true })}
                    action={bell}
                />
                <EmptyState
                    title="No employee record"
                    description="Your account is not linked to an employee record yet. Ask your administrator to link it, then pull to refresh."
                />
            </ScreenContainer>
        );
    }

    const goToRoster = (): void => {
        (navigation.getParent() as unknown as { navigate: (screen: string) => void } | undefined)?.navigate(
            'RosterTab',
        );
    };

    return (
        <ScreenContainer hasHeader refreshControl={refreshControl}>
            <AppHeader
                title={`Hi, ${firstName}`}
                subtitle={formatDate(dashboard.today, { long: true })}
                action={bell}
            />

            <View style={[styles.section, { gap: theme.spacing.sm }]}>
                <View style={styles.sectionHeader}>
                    <AppText variant="subtitle">Today</AppText>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="View roster"
                        onPress={goToRoster}
                        hitSlop={theme.spacing.sm}>
                        <AppText variant="bodyStrong" color="textLink">
                            View roster
                        </AppText>
                    </Pressable>
                </View>

                {dashboard.todayShifts.length > 0 ? (
                    <>
                        {dashboard.todayShifts.map(shift => (
                            <ShiftCard
                                key={shift.id}
                                shift={shift}
                                showDate={false}
                                onPress={() =>
                                    navigation.navigate('ShiftDetail', { shiftId: shift.id })
                                }
                            />
                        ))}

                        <AppCard>
                            <View style={[styles.summaryRow, { gap: theme.spacing.sm }]}>
                                <AppText variant="caption" color="textSecondary">
                                    Worked time today
                                </AppText>
                                <AppText variant="bodyStrong">
                                    {formatDuration(dashboard.todayMinutes)}
                                </AppText>
                            </View>
                        </AppCard>
                    </>
                ) : (
                    <EmptyState
                        title="No shift today"
                        description="You have nothing rostered for today. Your next shift will appear here once published."
                        actionLabel="View roster"
                        onAction={goToRoster}
                    />
                )}
            </View>

            {dashboard.nextShift ? (
                <View style={[styles.section, { gap: theme.spacing.sm }]}>
                    <AppText variant="subtitle">Next up</AppText>
                    <ShiftCard
                        shift={dashboard.nextShift}
                        onPress={() =>
                            navigation.navigate('ShiftDetail', { shiftId: dashboard.nextShift?.id ?? 0 })
                        }
                    />
                    <AppText variant="caption" color="textMuted">
                        Starts at {formatTime(dashboard.nextShift.start_time)}.
                    </AppText>
                </View>
            ) : null}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    bell: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
        minWidth: 40,
    },
    dot: {
        borderRadius: 999,
        borderWidth: 2,
        height: 12,
        position: 'absolute',
        right: 6,
        top: 6,
        width: 12,
    },
});
