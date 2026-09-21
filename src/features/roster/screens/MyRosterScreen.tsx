import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppIcon, ChevronLeftGlyph, ChevronRightGlyph } from '../../../components/AppIcon';
import { AppText } from '../../../components/AppText';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { RosterSkeleton, SkeletonRosterGroup } from '../../../components/Skeleton';
import type { WeekDay } from '../../../components/WeekDayStrip';
import { WeekDayStrip } from '../../../components/WeekDayStrip';
import type { RosterStackParamList } from '../../../navigation/types';
import { radiusRoles } from '../../../theme/radius';
import { useTheme } from '../../../theme/useTheme';
import {
    formatDate,
    formatDayMonth,
    getWeekdayShort,
    isSameApiDate,
    todayApiDate,
} from '../../../utils/date';
import { isCompanyAccessLocked } from '../../../utils/errors';
import { ShiftCard, SHIFT_ROW_HEIGHT } from '../../home/components/ShiftCard';
import { useMyRosterWeek } from '../hooks';

type Props = NativeStackScreenProps<RosterStackParamList, 'MyRoster'>;

export function MyRosterScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const week = useMyRosterWeek();

    const openShift = useCallback(
        (shiftId: number): void => {
            navigation.navigate('ShiftDetail', { shiftId });
        },
        [navigation],
    );

    /**
     * The seven day cells, built once per week change.
     *
     * `hasShifts` is resolved from the already-grouped week data rather than a
     * second pass over the raw shift list, so the carousel and the feed can
     * never disagree about which days hold shifts.
     */
    const dayCells = useMemo<WeekDay[]>(() => {
        const withShifts = new Set(week.groups.filter(g => g.shifts.length > 0).map(g => g.date));

        return week.days.map(date => ({
            date,
            weekday: getWeekdayShort(date),
            day: formatDayMonth(date).replace(/^\D+/, ''),
            isToday: isSameApiDate(date, todayApiDate()),
            hasShifts: withShifts.has(date),
        }));
    }, [week.days, week.groups]);

    /**
     * `SectionList` sections.
     *
     * `SectionList` is chosen over a hand-rolled union `FlatList` here — the
     * opposite of the Home screen's decision — because this feed needs
     * `stickySectionHeadersEnabled`. A roster is scanned by day, and the day
     * label must stay pinned while its shifts scroll past, which the native
     * engine provides only if it owns the header. Hand-rolling it would mean
     * measuring and animating a fake sticky header on the JS thread, which is
     * precisely the work virtualization exists to avoid.
     *
     * `sections` is empty when there are no shifts, which the list renders as
     * its `ListEmptyComponent` rather than as an empty day group.
     */
    const sections = useMemo(
        () =>
            week.groups.map(group => ({
                date: group.date,
                title: formatDate(group.date, { withWeekday: true }),
                data: group.shifts,
            })),
        [week.groups],
    );

    /**
     * Flattened prefix sums for `getItemLayout` (V5).
     *
     * A `SectionList`'s `getItemLayout` receives an index into the *flattened*
     * list — sections and their headers interleaved with rows — so the offsets
     * cannot be computed from a single row height. Precomputing the prefix
     * lengths once per week change is what keeps the lookup O(1) at scroll time
     * instead of re-walking the sections on every call, which would run on
     * every frame of a fling.
     */
    const layoutIndex = useMemo(() => {
        const map = new Map<number, { length: number; offset: number; index: number }>();
        let cursor = 0;
        let flat = 0;

        sections.forEach(section => {
            map.set(flat, { length: SECTION_HEADER_HEIGHT, offset: cursor, index: flat });
            cursor += SECTION_HEADER_HEIGHT;
            flat += 1;

            section.data.forEach(() => {
                map.set(flat, { length: ROW_BLOCK, offset: cursor, index: flat });
                cursor += ROW_BLOCK;
                flat += 1;
            });
        });

        return map;
    }, [sections]);

    const refreshControl = (
        <RefreshControl
            refreshing={week.isRefreshing}
            onRefresh={week.refresh}
            tintColor={theme.colors.primary}
        />
    );

    const weekLabel = `${formatDayMonth(week.weekStart)} – ${formatDayMonth(week.weekEnd)}`;

    // ── First mount: nothing to preserve, so the whole screen is a skeleton ──
    if (week.isLoading) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="My Roster" subtitle={weekLabel} />
                <RosterSkeleton />
            </ScreenContainer>
        );
    }

    if (week.isError && isCompanyAccessLocked(week.error)) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="My Roster" />
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

    if (week.isError) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="My Roster" />
                <ErrorView error={week.error} onRetry={week.refresh} />
            </ScreenContainer>
        );
    }

    if (week.employeeId === null) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="My Roster" />
                <EmptyState
                    title="No employee profile"
                    description="Your account is not linked to an employee record yet, so there is no roster to show."
                />
            </ScreenContainer>
        );
    }

    /*
     * `hasHeader={false}`: this branch renders **no** `AppHeader` — unlike the four
     * branches above, which each pass `hasHeader` precisely because they do. The
     * only chrome here is `WeekNav` / `WeekDayStrip` / `RosterChrome`, all of which
     * sit inside the list's `ListHeaderComponent` and therefore scroll away with
     * the content. With the flag set, the container skipped its own `insets.top`
     * while nothing else absorbed it, so the top row began underneath the status
     * bar. `scrollable` stays false because the `SectionList` is the scroller and
     * must not be nested inside a `ScrollView`.
     */
    return (
        <ScreenContainer hasHeader={false} scrollable={false}>
            <SectionList
                sections={sections}
                keyExtractor={shift => String(shift.id)}
                renderItem={({ item }) => (
                    <View style={styles.rowWrap}>
                        <ShiftCard shift={item} onPress={openShift} showDate={false} />
                    </View>
                )}
                renderSectionHeader={({ section }) => (
                    <DayDivider title={section.title} count={section.data.length} />
                )}
                getItemLayout={(_, index) =>
                    layoutIndex.get(index) ?? { length: ROW_BLOCK, offset: ROW_BLOCK * index, index }
                }
                // Day headers must stay pinned while their shifts scroll (V7).
                stickySectionHeadersEnabled
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={9}
                removeClippedSubviews
                refreshControl={refreshControl}
                ListHeaderComponent={
                    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
                        <WeekNav
                            label={weekLabel}
                            onPrevious={week.goToPreviousWeek}
                            onNext={week.goToNextWeek}
                            onToday={week.goToToday}
                        />
                        <WeekDayStrip
                            days={dayCells}
                            selectedDate={week.selectedDate}
                            onSelect={week.selectDate}
                        />
                        <RosterChrome
                            publishedCount={week.publishedRosters.length}
                            totalShifts={week.totalShifts}
                        />
                    </View>
                }
                ListEmptyComponent={
                    // A week change keeps the header, nav and carousel live and
                    // replaces only the feed region — the user's selected week
                    // must not vanish mid-interaction.
                    week.isRefreshing ? (
                        <View style={{ paddingTop: theme.spacing.md }}>
                            <SkeletonRosterGroup />
                        </View>
                    ) : (
                        <EmptyState
                            title="No shifts this week"
                            description="Nothing is scheduled for the selected week. Try another week, or check back once the roster is published."
                        />
                    )
                }
                /*
                 * The list is the top-level view here, so it — not the container —
                 * owns the top safe-area inset. Applied as tail padding on the
                 * content container rather than as a `SafeAreaView`: the inset is
                 * then part of the scrollable area, so the nav row slides under the
                 * transparent status bar and leaves the viewport cleanly, instead
                 * of being permanently confined below an opaque band.
                 */
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: theme.spacing.xxl,
                }}
                showsVerticalScrollIndicator={false}
            />
        </ScreenContainer>
    );
}

/**
 * Week navigation row: prev / today / next, flanking the centred range label.
 *
 * Each control is a 44pt square so it clears the touch-target floor without a
 * hit-slop hack, and each carries an explicit `accessibilityLabel` — an
 * unlabelled chevron announces nothing.
 */
function WeekNav({
    label,
    onPrevious,
    onNext,
    onToday,
}: {
    label: string;
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
}): React.JSX.Element {
    const theme = useTheme();

    return (
        <View style={[styles.weekNav, { gap: theme.spacing.sm }]}>
            <NavButton label="Previous week" icon={ChevronLeftGlyph} onPress={onPrevious} />

            <Pressable
                onPress={onToday}
                accessibilityRole="button"
                accessibilityLabel="Jump to this week"
                style={[styles.weekLabel, { minHeight: 44 }]}>
                <AppText variant="subtitle" numberOfLines={1}>
                    {label}
                </AppText>
                <AppText variant="caption" color="textMuted">
                    Tap for this week
                </AppText>
            </Pressable>

            <NavButton label="Next week" icon={ChevronRightGlyph} onPress={onNext} />
        </View>
    );
}

function NavButton({
    label,
    icon,
    onPress,
}: {
    label: string;
    icon: typeof ChevronLeftGlyph;
    onPress: () => void;
}): React.JSX.Element {
    const theme = useTheme();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.navButton,
                {
                    backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                },
            ]}>
            <AppIcon icon={icon} size="medium" color="text" />
        </Pressable>
    );
}

/**
 * Pinned day divider.
 *
 * Opaque `background` is mandatory, not cosmetic: a sticky header sits over the
 * rows scrolling beneath it, so anything translucent would let the row text
 * bleed through the day label and destroy its legibility at exactly the moment
 * it is most needed.
 */
function DayDivider({ title, count }: { title: string; count: number }): React.JSX.Element {
    const theme = useTheme();

    return (
        <View
            style={[
                styles.divider,
                { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border },
            ]}>
            <AppText variant="bodyStrong">{title}</AppText>
            <AppText variant="caption" color="textMuted">
                {count} shift{count === 1 ? '' : 's'}
            </AppText>
        </View>
    );
}

/** Week chrome: which published roster covers the selected week, plus a total. */
function RosterChrome({
    publishedCount,
    totalShifts,
}: {
    publishedCount: number;
    totalShifts: number;
}): React.JSX.Element {
    const theme = useTheme();

    return (
        <AppCard padded={false}>
            <View style={[styles.chrome, { gap: theme.spacing.sm }]}>
                <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">
                        {publishedCount > 0
                            ? `${publishedCount} published roster${publishedCount === 1 ? '' : 's'}`
                            : 'No published roster yet'}
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                        {totalShifts} shift{totalShifts === 1 ? '' : 's'} in this week
                    </AppText>
                </View>
            </View>
        </AppCard>
    );
}

const SECTION_HEADER_HEIGHT = 40;
const ROW_BLOCK = SHIFT_ROW_HEIGHT + 12;

const styles = StyleSheet.create({
    weekNav: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    navButton: {
        alignItems: 'center',
        borderRadius: radiusRoles.macro.md,
        borderWidth: 1,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    weekLabel: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    divider: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        height: SECTION_HEADER_HEIGHT,
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    rowWrap: {
        paddingBottom: 12,
    },
    chrome: {
        alignItems: 'center',
        flexDirection: 'row',
        padding: 16,
    },
});
