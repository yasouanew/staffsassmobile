import { StyleSheet, View, type ViewStyle } from 'react-native';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Status pill.
 *
 * Maps the API's enum values directly to a colour + label, so callers pass the raw
 * status string and never invent their own palette:
 *
 * - shift: `scheduled | completed | cancelled | swap_requested`
 * - leave request: `pending | approved | rejected`
 * - roster: `draft | published`
 *
 * Unknown values fall back to a neutral grey badge rather than rendering nothing —
 * if the backend adds a status, the UI degrades gracefully instead of leaving a
 * blank space.
 */
export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type StatusBadgeProps = {
    status: string;
    /** Overrides the derived label (defaults to the humanised status). */
    label?: string;
    tone?: StatusBadgeTone;
    style?: ViewStyle;
};

const STATUS_TONES: Record<string, StatusBadgeTone> = {
    // shifts
    scheduled: 'info',
    completed: 'success',
    cancelled: 'danger',
    swap_requested: 'warning',
    // leave requests
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    // rosters
    draft: 'neutral',
    published: 'success',
    // users
    active: 'success',
    inactive: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
    swap_requested: 'Swap requested',
    first_half: 'First half',
    second_half: 'Second half',
    full_day: 'Full day',
};

function humanize(status: string): string {
    return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/^\w/, character => character.toUpperCase());
}

export function StatusBadge({ status, label, tone, style }: StatusBadgeProps) {
    const theme = useTheme();
    const resolvedTone = tone ?? STATUS_TONES[status] ?? 'neutral';

    const toneColors: Record<StatusBadgeTone, { background: string; text: string }> = {
        neutral: { background: theme.colors.surfaceMuted, text: theme.colors.textSecondary },
        info: { background: theme.colors.infoSoft, text: theme.colors.infoStrong },
        success: { background: theme.colors.successSoft, text: theme.colors.successStrong },
        warning: { background: theme.colors.warningSoft, text: theme.colors.warningStrong },
        danger: { background: theme.colors.dangerSoft, text: theme.colors.dangerStrong },
    };

    const { background, text } = toneColors[resolvedTone];

    return (
        <View
            // A status change is meaningful content, so screen readers announce it.
            accessibilityRole="text"
            accessibilityLabel={label ?? humanize(status)}
            style={[
                styles.badge,
                {
                    backgroundColor: background,
                    borderRadius: theme.radius.xs,
                    paddingHorizontal: spacing.xs,
                    paddingVertical: spacing.xxs,
                },
                style,
            ]}>
            <AppText variant="label" style={{ color: text }} numberOfLines={1}>
                {label ?? humanize(status)}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
    },
});
