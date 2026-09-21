import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppIcon, ChevronRightGlyph } from '../../../components/AppIcon';
import { AppText } from '../../../components/AppText';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { GreetingHeader } from '../../../components/GreetingHeader';
import { NotificationBell } from '../../../components/NotificationBell';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { SummaryHeroCard } from '../../../components/SummaryHeroCard';
import type { HomeStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { formatDate, formatDurationParts, formatTime } from '../../../utils/date';
import { isCompanyAccessLocked } from '../../../utils/errors';
import { useSessionStore } from '../../auth/store/sessionStore';
import { useLocalUnreadCount, useUnreadCount } from '../../notifications/hooks';
import type { Shift } from '../../shifts/types';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { ShiftCard, SHIFT_ROW_HEIGHT } from '../components/ShiftCard';
import { useHomeDashboard } from '../hooks';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

/**
 * One row of the Home feed.
 *
 * A **discriminated union** rather than a list of groups-each-containing-a-list.
 * The brief forbids nested mapping over server collections, and the shape that
 * violation takes is `groups.map(group => <>{group.shifts.map(...)}</>)` — a
 * nested un-virtualised loop whose outer body is not virtualised either. By
 * flattening sections and rows into a single `FeedRow[]`, one `FlatList`
 * renders both, every row is windowed, and `SectionList`'s extra machinery
 * (sticky headers) is not needed because these section titles should scroll
 * away with their content.
 */
type FeedRow =
    | { kind: 'section'; id: string; title: string; caption: string }
    | { kind: 'shift'; id: string; shift: Shift };

export function HomeScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const firstName = useSessionStore(state => state.user?.name.split(' ')[0] ?? 'there');
    const dashboard = useHomeDashboard();

    /**
     * Unread count for the header bell.
     *
     * Same precedence as [`AppTabBar`](src/navigation/stacks/AppTabs.tsx:97): the
     * local inbox is authoritative because it stays correct with no network and
     * reflects a read the user just performed, while the server count only fills
     * the pre-hydration gap so the dot does not flicker off on launch.
     */
    const serverUnread = useUnreadCount();
    const localUnreadCount = useLocalUnreadCount();
    const unreadCount = localUnreadCount ?? serverUnread.data?.count ?? 0;

    const openNotifications = useCallback((): void => {
        navigation.navigate('Notifications');
    }, [navigation]);

    /**
     * Built once and threaded into every `GreetingHeader` below.
     *
     * Home renders its header from five mutually exclusive branches (loading,
     * locked, error, no-employee, empty) plus the populated `TodayHero`. Sharing
     * one node keeps the bell from silently disappearing in an edge state.
     */
    const notificationsBell = (
        <NotificationBell count={unreadCount} onPress={openNotifications} />
    );

    const goToRoster = useCallback((): void => {
        const parent = navigation.getParent();
        parent?.navigate('RosterTab' as never);
    }, [navigation]);

    const openShift = useCallback(
        (shiftId: number): void => {
            navigation.navigate('ShiftDetail', { shiftId });
        },
        [navigation],
    );

    /**
     * Flatten today's shifts into the union feed.
     *
     * The array is small and bounded (`per_page=10`) but is still rendered by a
     * `FlatList` because it is a server collection (V1): the count is a server
     * decision, not a client one, and hard-coding an assumption that "today has
     * at most ten rows" is exactly the assumption that breaks on a double shift
     * plus a swap. Windowing also keeps the row identity work off the render
     * path once the list grows.
     */
    const feed = useMemo<FeedRow[]>(() => {
        const rows: FeedRow[] = [
            {
                kind: 'section',
                id: 'section-today',
                title: 'Today',
                caption: formatDate(dashboard.today),
            },
        ];

        dashboard.todayShifts.forEach(shift => {
            rows.push({ kind: 'shift', id: `shift-${shift.id}`, shift });
        });

        return rows;
    }, [dashboard.todayShifts, dashboard.today]);

    const refreshControl = (
        <RefreshControl
            refreshing={dashboard.isRefreshing}
            onRefresh={dashboard.refresh}
            tintColor={theme.colors.primary}
        />
    );

    // ── Loading: first mount only, never a re-fetch (V6) ─────────────────────
    if (dashboard.isLoading) {
        return (
            <ScreenContainer hasHeader>
                <GreetingHeader
                    greeting={`Good morning, ${firstName}`}
                    subtitle="Here is your day at a glance"
                    action={notificationsBell}
                />
                <HomeSkeleton />
            </ScreenContainer>
        );
    }

    // ── Locked: the company's subscription lapsed — not the user's problem ──
    if (dashboard.isError && isCompanyAccessLocked(dashboard.error)) {
        return (
            <ScreenContainer hasHeader>
                <GreetingHeader
                    greeting={`Good morning, ${firstName}`}
                    subtitle="Here is your day at a glance"
                    action={notificationsBell}
                />
                <AppCard>
                    <View style={{ gap: theme.spacing.xs }}>
                        <AppText variant="subtitle">Access paused</AppText>
                        <AppText variant="body" color="textSecondary">
                            Your company's subscription needs attention. Ask your
                            administrator to restore access.
                        </AppText>
                    </View>
                </AppCard>
            </ScreenContainer>
        );
    }

    // ── Error: the primary source failed ────────────────────────────────────
    if (dashboard.isError) {
        return (
            <ScreenContainer hasHeader>
                <GreetingHeader
                    greeting={`Good morning, ${firstName}`}
                    subtitle="Here is your day at a glance"
                    action={notificationsBell}
                />
                <ErrorView error={dashboard.error} onRetry={dashboard.refresh} />
            </ScreenContainer>
        );
    }

    // ── No linked employee record: cannot own shifts ────────────────────────
    if (dashboard.employeeId === null) {
        return (
            <ScreenContainer hasHeader>
                <GreetingHeader
                    greeting={`Good morning, ${firstName}`}
                    subtitle="Here is your day at a glance"
                    action={notificationsBell}
                />
                <EmptyState
                    title="No employee profile"
                    description="Your account is not linked to an employee record yet, so there are no shifts to show."
                />
            </ScreenContainer>
        );
    }

    // ── Empty: loaded successfully, nothing scheduled ───────────────────────
    if (dashboard.isEmpty) {
        return (
            <ScreenContainer hasHeader>
                <GreetingHeader
                    greeting={`Good morning, ${firstName}`}
                    subtitle="Here is your day at a glance"
                    action={notificationsBell}
                />
                <EmptyState
                    title="Nothing scheduled"
                    description="You have no shifts today or in the coming week."
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer hasHeader={false} scrollable={false}>
            <FlatList
                data={feed}
                keyExtractor={row => row.id}
                renderItem={({ item }) =>
                    item.kind === 'section' ? (
                        <SectionHeader title={item.title} caption={item.caption} />
                    ) : (
                        <View style={styles.rowWrap}>
                            <ShiftCard shift={item.shift} onPress={openShift} showDate={false} />
                        </View>
                    )
                }
                // Rows are uniformly `SHIFT_ROW_HEIGHT`; headers are a fixed
                // block too, so `getItemLayout` is exact (V5) and the list can
                // answer scroll offsets without measuring.
                getItemLayout={(_, index) => {
                    const row = feed[index];

                    if (row?.kind === 'section') {
                        return { length: SECTION_HEIGHT, offset: SECTION_HEIGHT * index, index };
                    }

                    return { length: ROW_BLOCK, offset: ROW_BLOCK * index, index };
                }}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews
                refreshControl={refreshControl}
                ListHeaderComponent={
                    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
                        <TodayHero
                            greeting={`Good morning, ${firstName}`}
                            minutes={dashboard.todayMinutes}
                            shifts={dashboard.todayShifts}
                            action={notificationsBell}
                        />
                    </View>
                }
                ListFooterComponent={
                    <NextUpPreview
                        shift={dashboard.nextShift}
                        onPress={openShift}
                        onViewRoster={goToRoster}
                    />
                }
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: theme.spacing.xxl },
                ]}
                showsVerticalScrollIndicator={false}
            />
        </ScreenContainer>
    );
}

/**
 * The non-scrolling "Today" hero.
 *
 * Mounted as the list's `ListHeaderComponent` rather than pinned outside the
 * scroller. Pinning it would permanently consume roughly a third of a small
 * viewport and leave the shift list scrolling in a letterbox; as a header it is
 * visible on arrival and yields the screen once the user scrolls — the
 * behaviour the brief's "non-scrollable" means in practice, since the card
 * itself never scrolls internally.
 */
function TodayHero({
    greeting,
    minutes,
    shifts,
    action,
}: {
    greeting: string;
    minutes: number;
    shifts: Shift[];
    /** Trailing slot threaded from the screen — the notification bell. */
    action?: React.ReactNode;
}): React.JSX.Element {
    const { hours, minutes: remainder } = formatDurationParts(minutes);
    const activeShift = shifts[0];

    return (
        <View style={{ gap: 16 }}>
            <GreetingHeader
                greeting={greeting}
                subtitle="Here is your day at a glance"
                action={action}
            />
            <SummaryHeroCard
                eyebrow="Worked today"
                hours={hours}
                minutes={remainder}
                status={activeShift?.status}
                statusLabel={activeShift ? 'Clocked in' : 'Not clocked in'}
                footnote={
                    shifts.length === 0
                        ? 'No shift scheduled today.'
                        : `${shifts.length} shift${shifts.length === 1 ? '' : 's'} scheduled.`
                }
            />
        </View>
    );
}

/** A section title row inside the feed. */
function SectionHeader({ title, caption }: { title: string; caption: string }): React.JSX.Element {
    const theme = useTheme();

    return (
        <View style={[styles.sectionHeader, { paddingTop: theme.spacing.lg }]}>
            <AppText variant="subtitle">{title}</AppText>
            <AppText variant="caption" color="textMuted">
                {caption}
            </AppText>
        </View>
    );
}

/**
 * The "Next up" low-elevation footer.
 *
 * Deliberately on `surfaceSunken` with a hairline top rule rather than as
 * another card: it is a *preview* of context the user will act on later, not a
 * row they can act on now, and giving it card elevation would imply parity with
 * today's shifts that it does not have.
 */
function NextUpPreview({
    shift,
    onPress,
    onViewRoster,
}: {
    shift: Shift | null;
    onPress: (shiftId: number) => void;
    onViewRoster: () => void;
}): React.JSX.Element {
    const theme = useTheme();

    if (shift === null) {
        return (
            <View
                style={[
                    styles.nextUp,
                    {
                        backgroundColor: theme.colors.surfaceSunken,
                        borderTopColor: theme.colors.border,
                        marginTop: theme.spacing.xl,
                    },
                ]}>
                <AppText variant="overline" color="textMuted">
                    NEXT UP
                </AppText>
                <AppText variant="body" color="textSecondary">
                    No upcoming shifts this week.
                </AppText>
                <Pressable onPress={onViewRoster} accessibilityRole="button">
                    <AppText variant="bodyStrong" color="primary">
                        View full roster
                    </AppText>
                </Pressable>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.nextUp,
                {
                    backgroundColor: theme.colors.surfaceSunken,
                    borderTopColor: theme.colors.border,
                    marginTop: theme.spacing.xl,
                },
            ]}>
            <View style={styles.nextUpHead}>
                <AppText variant="overline" color="textMuted">
                    NEXT UP
                </AppText>
                <Pressable onPress={onViewRoster} accessibilityRole="button">
                    <AppText variant="caption" color="primary">
                        Full roster
                    </AppText>
                </Pressable>
            </View>

            <Pressable
                onPress={() => onPress(shift.id)}
                accessibilityRole="button"
                accessibilityLabel={`Next shift ${formatDate(shift.date)}`}
                style={[styles.nextUpRow, { gap: theme.spacing.sm }]}>
                <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                        {formatDate(shift.date, { withWeekday: true })}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                        {formatTime(shift.start_time)} – {formatTime(shift.end_time)} ·{' '}
                        {shift.branch?.name ?? 'Unassigned branch'}
                    </AppText>
                </View>
                <AppIcon icon={ChevronRightGlyph} size="small" color="textMuted" />
            </Pressable>
        </View>
    );
}

const SECTION_HEIGHT = 76;
const ROW_BLOCK = SHIFT_ROW_HEIGHT + 12;

const styles = StyleSheet.create({
    content: {
        paddingTop: 0,
    },
    rowWrap: {
        paddingBottom: 12,
    },
    sectionHeader: {
        gap: 4,
        paddingBottom: 12,
    },
    nextUp: {
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    nextUpHead: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    nextUpRow: {
        alignItems: 'center',
        flexDirection: 'row',
        minHeight: 44,
    },
});
