import { ScrollView, StyleSheet, View } from 'react-native';

import { AppCard, Divider } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { ErrorView } from '../../../components/ErrorView';
import { LoadingView } from '../../../components/LoadingView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { StatusBadge } from '../../../components/StatusBadge';
import { useTheme } from '../../../theme';
import type { AppError } from '../../../types/appError';
import {
    formatDate,
    formatDayMonth,
    formatDuration,
    formatTime,
    shiftDurationMinutes,
} from '../../../utils/date';
import { useShiftDetail } from '../hooks';

/**
 * Shift detail params are declared inline rather than imported from the nav types
 * because the same screen is mounted in both the Home and Roster stacks, which declare
 * structurally identical params. Depending on one of them would make the screen
 * unusable from the other.
 */
type Props = {
    navigation: { goBack: () => void };
    route: { params: { shiftId: number } };
};

/**
 * Shift detail (spec Screen 6).
 *
 * Read-only detail loaded via `GET /shifts/{id}` (spec Screen 6 API 1), which eager
 * loads `company,branch,roster,employee,position,department`. Only the id travels
 * through navigation; the record is refetched here so a restored deep link or a
 * stale navigation payload cannot show outdated times.
 *
 * Duration is client-computed minus `break_minutes` (unpaid only) via
 * [`shiftDurationMinutes`](src/utils/date.ts:249). There is deliberately NO
 * swap / clock-in / edit UI: no employee-facing transition API exists and `PUT
 * shifts` requires `shift.edit` (→ 403), so building it would be a dead button
 * (spec Screen 6 BACKEND GAP).
 */
export function ShiftDetailScreen({ navigation, route }: Props): React.JSX.Element {
    const theme = useTheme();
    const { shiftId } = route.params;
    const query = useShiftDetail(shiftId);

    if (query.isPending) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="Shift" onBack={() => navigation.goBack()} />
                <LoadingView message="Loading shift…" />
            </ScreenContainer>
        );
    }

    if (query.isError || !query.data) {
        return (
            <ScreenContainer hasHeader>
                <AppHeader title="Shift" onBack={() => navigation.goBack()} />
                <ErrorView error={query.error as AppError} onRetry={() => void query.refetch()} />
            </ScreenContainer>
        );
    }

    const shift = query.data;
    const minutes = shiftDurationMinutes(
        shift.start_time,
        shift.end_time,
        shift.break_minutes,
        shift.paid_break,
    );
    const breakLabel =
        (shift.break_minutes ?? 0) > 0
            ? `${shift.break_minutes} min (${shift.paid_break ? 'paid' : 'unpaid'})`
            : 'None';
    const chips = [shift.position?.name, shift.department?.name].filter(
        (name): name is string => Boolean(name),
    );
    const rosterLabel = shift.roster
        ? `${formatDayMonth(shift.roster.week_start)} – ${formatDayMonth(shift.roster.week_end)}`
        : null;

    return (
        <ScreenContainer hasHeader>
            <AppHeader
                title={formatDate(shift.date)}
                subtitle={formatDate(shift.date, { long: true })}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                contentContainerStyle={[styles.content, { padding: theme.screenGutter }]}
                showsVerticalScrollIndicator={false}>
                <AppCard>
                    <View style={[styles.heading, { gap: theme.spacing.sm }]}>
                        <AppText variant="title">
                            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                        </AppText>
                        <StatusBadge status={shift.status} />
                    </View>

                    <AppText variant="caption" color="textMuted">
                        {formatDuration(minutes)} · {formatDate(shift.date, { long: true })}
                    </AppText>

                    {chips.length > 0 ? (
                        <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                            {chips.map(chip => (
                                <View
                                    key={chip}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: theme.colors.surfaceMuted,
                                            borderRadius: theme.radius.md,
                                            paddingVertical: theme.spacing.xxs,
                                            paddingHorizontal: theme.spacing.sm,
                                        },
                                    ]}>
                                    <AppText variant="label" color="textSecondary">
                                        {chip}
                                    </AppText>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    <Divider />

                    <DetailRow label="Duration" value={formatDuration(minutes)} />
                    <DetailRow label="Break" value={breakLabel} />
                    <DetailRow
                        label="Branch"
                        value={shift.branch?.name ?? 'Not assigned'}
                    />
                    {shift.branch?.address ? (
                        <DetailRow label="Address" value={shift.branch.address} />
                    ) : null}
                    {shift.branch?.timezone ? (
                        <DetailRow label="Timezone" value={shift.branch.timezone} />
                    ) : null}
                    {chips.length === 0 ? (
                        <>
                            <DetailRow label="Position" value="Not assigned" />
                            <DetailRow label="Department" value="Not assigned" />
                        </>
                    ) : null}
                </AppCard>

                {shift.roster ? (
                    <AppCard>
                        <View style={[styles.rosterRow, { gap: theme.spacing.sm }]}>
                            <View style={styles.rosterText}>
                                <AppText variant="caption" color="textSecondary">
                                    Roster week
                                </AppText>
                                <AppText variant="bodyStrong">{rosterLabel}</AppText>
                            </View>
                            <StatusBadge status={shift.roster.status} />
                        </View>
                    </AppCard>
                ) : null}

                {shift.notes ? (
                    <AppCard>
                        <View style={{ gap: theme.spacing.xs }}>
                            <AppText variant="label" color="textSecondary">
                                Notes
                            </AppText>
                            <AppText variant="body">{shift.notes}</AppText>
                        </View>
                    </AppCard>
                ) : null}

                <AppText variant="caption" color="textMuted">
                    Times are shown as scheduled. Contact your manager if something looks wrong —
                    shift changes are made by the office, not from this app.
                </AppText>
            </ScrollView>
        </ScreenContainer>
    );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
    const theme = useTheme();

    return (
        <View style={[styles.row, { gap: theme.spacing.md, paddingVertical: theme.spacing.sm }]}>
            <AppText variant="caption" color="textSecondary">
                {label}
            </AppText>
            <AppText variant="body" numberOfLines={2} style={styles.value}>
                {value}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        gap: 16,
    },
    heading: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    chip: {},
    rosterRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rosterText: {
        flexShrink: 1,
    },
    row: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    value: {
        flexShrink: 1,
        textAlign: 'right',
    },
});
