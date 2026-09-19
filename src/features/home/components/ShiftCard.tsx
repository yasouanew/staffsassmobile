import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { StatusBadge } from '../../../components/StatusBadge';
import { useTheme } from '../../../theme';
import { formatDate, formatDuration, formatTime, shiftDurationMinutes } from '../../../utils/date';
import type { Shift } from '../../shifts/types';

type Props = {
    shift: Shift;
    onPress?: () => void;
    /** Render the date line (Home "Next up" and Roster detail). Hidden on Home "Today" where the section already says Today. */
    showDate?: boolean;
};

/**
 * One shift, as it appears on Home and in roster lists.
 *
 * The card leads with the times because that is what an employee opens the app to
 * check; the status badge is secondary. Duration is recomputed locally with
 * [`shiftDurationMinutes`](src/utils/date.ts:249) — which correctly handles
 * midnight-crossing shifts and unpaid breaks — rather than trusting a stored total.
 *
 * Field names match `ShiftResource` verbatim (`date`, `paid_break`, `position`,
 * `department`). Every optional relation is guarded with `??` so a missing eager
 * load renders a plain fallback, never the string "undefined".
 */
export function ShiftCard({ shift, onPress, showDate = true }: Props): React.JSX.Element {
    const theme = useTheme();
    const minutes = shiftDurationMinutes(
        shift.start_time,
        shift.end_time,
        shift.break_minutes,
        shift.paid_break,
    );

    const metaLine = [shift.position?.name, shift.department?.name].filter(Boolean).join(' · ');
    const branchLine = `${shift.branch?.name ?? 'Unassigned branch'} · ${formatDuration(minutes)}`;
    const notes = shift.notes?.trim() ? shift.notes.trim() : null;

    const content = (
        <View style={[styles.row, { gap: theme.spacing.md }]}>
            <View style={[styles.times, { gap: theme.spacing.xxs }]}>
                <AppText variant="time">{formatTime(shift.start_time)}</AppText>
                <AppText variant="caption" color="textMuted">
                    {formatTime(shift.end_time)}
                </AppText>
            </View>

            <View style={[styles.details, { gap: theme.spacing.xxs }]}>
                {showDate ? (
                    <AppText variant="bodyStrong" numberOfLines={1}>
                        {formatDate(shift.date)}
                    </AppText>
                ) : null}
                {metaLine ? (
                    <AppText variant="body" numberOfLines={1}>
                        {metaLine}
                    </AppText>
                ) : null}
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {branchLine}
                </AppText>
                {notes ? (
                    <AppText variant="caption" color="textMuted" numberOfLines={2}>
                        {notes}
                    </AppText>
                ) : null}
            </View>

            <StatusBadge status={shift.status} />
        </View>
    );

    if (!onPress) {
        return (
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        padding: theme.spacing.md,
                    },
                ]}
            >
                {content}
            </View>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Shift on ${formatDate(shift.date)} from ${formatTime(
                shift.start_time,
            )} to ${formatTime(shift.end_time)}, ${shift.status.replace(/_/g, ' ')}`}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    padding: theme.spacing.md,
                    opacity: pressed ? 0.9 : 1,
                },
            ]}
        >
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
    },
    row: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    times: {
        alignItems: 'flex-start',
        minWidth: 56,
    },
    details: {
        flex: 1,
    },
});
