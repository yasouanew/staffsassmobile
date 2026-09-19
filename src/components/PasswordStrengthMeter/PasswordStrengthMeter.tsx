import { StyleSheet, View } from 'react-native';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Segmented password-strength meter.
 *
 * Four segments filled according to the score from
 * [`evaluatePasswordStrength`](src/features/auth/utils/passwordStrength.ts:1). A
 * segmented bar is used rather than a continuous one because the score is discrete —
 * a smooth gradient implies precision the heuristic does not have.
 *
 * Colour is never the only signal: the label ("Weak" → "Strong") and the suggestion
 * list carry the same information, so the meter still works for a colour-blind user
 * or in high-contrast mode.
 */

export type PasswordStrengthMeterProps = {
    /** `0`–`4`, as returned by the strength evaluator. */
    score: number;
    label: string;
    /** Advisory copy; rendered only when non-empty. */
    suggestions?: string[];
    /** Suppresses the label row when the parent already shows one. */
    showLabel?: boolean;
};

const SEGMENT_COUNT = 4;

export function PasswordStrengthMeter({
    score,
    label,
    suggestions = [],
    showLabel = true,
}: PasswordStrengthMeterProps) {
    const theme = useTheme();

    // Index 0 is unused (score 0 means "empty" and renders nothing filled).
    const segmentColours = [
        theme.colors.danger,
        theme.colors.danger,
        theme.colors.warning,
        theme.colors.info,
        theme.colors.success,
    ];

    const activeColour = segmentColours[Math.min(Math.max(score, 0), 4)];

    if (score <= 0) {
        return null;
    }

    return (
        <View style={styles.container} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 4, now: score }}>
            <View style={[styles.track, { gap: spacing.xxs }]}>
                {Array.from({ length: SEGMENT_COUNT }, (_unused, index) => (
                    <View
                        key={index}
                        style={[
                            styles.segment,
                            {
                                backgroundColor: index < score ? activeColour : theme.colors.surfaceSunken,
                                borderRadius: theme.radius.xs,
                            },
                        ]}
                    />
                ))}
            </View>

            {showLabel ? (
                <AppText variant="label" style={{ color: activeColour }}>
                    {label}
                </AppText>
            ) : null}

            {suggestions.length > 0 ? (
                <AppText variant="label" color="textMuted">
                    {suggestions[0]}
                </AppText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xxs,
    },
    track: {
        flexDirection: 'row',
    },
    segment: {
        flex: 1,
        height: 4,
    },
});
