import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { StatusBadge } from '../../../components/StatusBadge';
import type { RosterStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import {
    formatDate,
    formatDayMonth,
    getWeekdayShort,
    isSameApiDate,
    todayApiDate,
} from '../../../utils/date';
import { isCompanyAccessLocked } from '../../../utils/errors';
import { ShiftCard } from '../../home/components/ShiftCard';
import { HomeSkeleton } from '../../home/components/HomeSkeleton';
import { useMyRosterWeek } from '../hooks';

type Props = NativeStackScreenProps<RosterStackParamList, 'MyRoster'>;

/**
 * My Roster (spec Screen 5).
 *
 * Primary path is the week-window shifts query
 * (`GET /shifts?employee_id=<own>&date_from=<weekStart>&date_to=<weekEnd>&per_page=50`,
 * spec Screen 5 API 1) composed by [`useMyRosterWeek`](../hooks/useMyRosterWeek.ts:1).
 * The supplementary published-rosters query (API 2) only supplies week chrome —
 * shift times always come from API 1.
 *
 * Week logic is client-side (no `my-roster` endpoint) with Monday as the documented
 * default, since the employee role cannot read `company_settings.week_start_day`.
 * Draft rosters are filtered client-side because `RosterPolicy@view` does not hide
 * them — only `published` weeks render chrome.
 */
export function MyRosterScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const week = useMyRosterWeek();

    const refreshControl = (
        <RefreshControl
            refreshing={week.isRefreshing}
            onRefresh={week.refresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
        />
    );

    const weekLabel = `${formatDayMonth(week.weekStart)} – ${formatDayMonth(week.weekEnd)}`;
    const matchingRoster = week.publishedRosters.find(
        roster => roster.week_start === week.weekStart && roster.week_end === week.weekEnd,
    );

    if (week.isLoading) {
        return (
            <ScreenContainer hasHeader refreshControl={refreshControl}>
                <AppHeader title="My Roster" subtitle={weekLabel} />
                <HomeSkeleton />
            </ScreenContainer>
        );
    }

    if (week.isError) {
        if (isCompanyAccessLocked(week.error)) {
            return (
                <ScreenContainer hasHeader refreshControl={refreshControl}>
                    <AppHeader title="My Roster" subtitle={weekLabel} />
                    <AppCard
                        testID="roster-locked-banner"
                        style={{ backgroundColor: theme.colors.warningSoft }}>
                        <View style={{ gap: theme.spacing.xs }}>
                            <AppText variant="bodyStrong" color="warningStrong">
                                Account unavailable
                            </AppText>
                            <AppText variant="body" color="warningStrong">
                                {week.error.message}
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
                <AppHeader title="My Roster" subtitle={weekLabel} />
                <ErrorView error={week.error} onRetry={week.refresh} />
            </ScreenContainer>
        );
    }

    if (week.employeeId === null) {
        return (
            <ScreenContainer hasHeader refreshControl={refreshControl}>
                <AppHeader title="My Roster" subtitle={weekLabel} />
                <EmptyState
                    title="No employee record"
                    description="Your account is not linked to an employee record yet. Ask your administrator to link it, then pull to refresh."
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer hasHeader refreshControl={refreshControl}>
            <AppHeader title="My Roster" subtitle={weekLabel} />

            <View style={[styles.weekNav, { gap: theme.spacing.sm }]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous week"
                    onPress={week.goToPreviousWeek}
                    hitSlop={theme.spacing.sm}
                    style={({ pressed }) => [
                        styles.navButton,
                        {
                            backgroundColor: pressed
                                ? theme.colors.surfaceMuted
                                : theme.colors.surface,
                            borderColor: theme.colors.border,
                            borderRadius: theme.radius.md,
                            paddingVertical: theme.spacing.sm,
                            paddingHorizontal: theme.spacing.md,
                        },
                    ]}>
                    <AppText variant="bodyStrong" color="textLink">
                        ‹ Prev
                    </AppText>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go to current week"
                    onPress={week.goToToday}
                    hitSlop={theme.spacing.sm}
                    style={({ pressed }) => [
                        styles.navButton,
                        {
                            backgroundColor: pressed
                                ? theme.colors.surfaceMuted
                                : theme.colors.surface,
                            borderColor: theme.colors.border,
                            borderRadius: theme.radius.md,
                            paddingVertical: theme.spacing.sm,
                            paddingHorizontal: theme.spacing.md,
                        },
                    ]}>
                    <AppText variant="bodyStrong" color="textLink">
                        Today
                    </AppText>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next week"
                    onPress={week.goToNextWeek}
                    hitSlop={theme.spacing.sm}
                    style={({ pressed }) => [
                        styles.navButton,
                        {
                            backgroundColor: pressed
                                ? theme.colors.surfaceMuted
                                : theme.colors.surface,
                            borderColor: theme.colors.border,
                            borderRadius: theme.radius.md,
                            paddingVertical: theme.spacing.sm,
                            paddingHorizontal: theme.spacing.md,
                        },
                    ]}>
                    <AppText variant="bodyStrong" color="textLink">
                        Next ›
                    </AppText>
                </Pressable>
            </View>

            <View
                accessibilityRole="tablist"
                accessibilityLabel={`Week ${weekLabel}`}
                style={[styles.strip, { gap: theme.spacing.xs }]}>
                {week.days.map(day => {
                    const selected = isSameApiDate(day, week.selectedDate);
                    const isToday = isSameApiDate(day, todayApiDate());

                    return (
                        <Pressable
                            key={day}
                            accessibilityRole="button"
                            accessibilityLabel={`${formatDate(day)}${selected ? ', selected' : ''}`}
                            accessibilityState={{ selected }}
                            onPress={() => week.selectDate(day)}
                            style={[
                                styles.day,
                                {
                                    backgroundColor: selected
                                        ? theme.colors.primary
                                        : theme.colors.surface,
                                    borderColor: selected
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                    borderRadius: theme.radius.md,
                                    paddingVertical: theme.spacing.sm,
                                },
                            ]}>
                            <AppText
                                variant="caption"
                                color={selected ? 'textInverse' : 'textMuted'}
                                style={styles.dayText}>
                                {getWeekdayShort(day)}
                            </AppText>
                            <AppText
                                variant="bodyStrong"
                                color={selected ? 'textInverse' : 'text'}
                                style={styles.dayText}>
                                {formatDayMonth(day).split(' ')[0]}
                            </AppText>
                            {isToday && !selected ? (
                                <View
                                    testID={`roster-today-dot-${day}`}
                                    style={[
                                        styles.todayDot,
                                        { backgroundColor: theme.colors.primary },
                                    ]}
                                />
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>

            {matchingRoster ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Roster week ${weekLabel}, published. View roster detail.`}
                    onPress={() =>
                        navigation.navigate('RosterDetail', { rosterId: matchingRoster.id })
                    }>
                    <AppCard style={styles.rosterChrome}>
                        <View style={[styles.rosterRow, { gap: theme.spacing.sm }]}>
                            <View style={styles.rosterText}>
                                <AppText variant="caption" color="textSecondary">
                                    Roster week
                                </AppText>
                                <AppText variant="bodyStrong">
                                    {weekLabel} · {week.totalShifts} shift
                                    {week.totalShifts === 1 ? '' : 's'}
                                </AppText>
                            </View>
                            <StatusBadge status={matchingRoster.status} />
                        </View>
                    </AppCard>
                </Pressable>
            ) : null}

            {week.groups.length === 0 ? (
                <EmptyState
                    title="No shifts this week"
                    description={`You have nothing rostered for ${weekLabel}. Published shifts will appear here once your manager releases them.`}
                    actionLabel="Go to current week"
                    onAction={week.goToToday}
                />
            ) : (
                <View style={[styles.groups, { gap: theme.spacing.md }]}>
                    {week.groups.map(group => (
                        <View key={group.date} style={[styles.group, { gap: theme.spacing.sm }]}>
                            <View style={styles.groupHeader}>
                                <AppText variant="subtitle">
                                    {formatDate(group.date, { withWeekday: true })}
                                </AppText>
                                <AppText variant="caption" color="textMuted">
                                    {group.shifts.length} shift{group.shifts.length === 1 ? '' : 's'}
                                </AppText>
                            </View>
                            {group.shifts.map(shift => (
                                <ShiftCard
                                    key={shift.id}
                                    shift={shift}
                                    showDate={false}
                                    onPress={() =>
                                        navigation.navigate('ShiftDetail', {
                                            shiftId: shift.id,
                                        })
                                    }
                                />
                            ))}
                        </View>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    weekNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    navButton: {
        alignItems: 'center',
        borderWidth: 1,
        flex: 1,
    },
    strip: {
        flexDirection: 'row',
    },
    day: {
        alignItems: 'center',
        borderWidth: 1,
        flex: 1,
        position: 'relative',
    },
    dayText: {
        textAlign: 'center',
    },
    todayDot: {
        borderRadius: 999,
        bottom: 4,
        height: 6,
        position: 'absolute',
        width: 6,
    },
    rosterChrome: {
        width: '100%',
    },
    rosterRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rosterText: {
        flexShrink: 1,
    },
    groups: {
        paddingBottom: 24,
    },
    group: {},
    groupHeader: {
        alignItems: 'baseline',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});
