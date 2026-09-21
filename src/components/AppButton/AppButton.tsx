import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../theme/spacing';
import { MIN_TOUCH_TARGET, controlHeights } from '../../theme/sizing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Primary action button.
 *
 * Handles the four states every form in the app needs: idle, pressed,
 * submitting (spinner + disabled), and disabled. The `danger` variant covers the
 * error-adjacent/destructive case (e.g. "Sign out everywhere").
 *
 * Two rules drive the implementation:
 *
 *  1. **The paint and the touch target are separate concerns.** A `sm` button is
 *     painted 36pt tall because that is what the layout rhythm wants, but it is
 *     still tappable across 44pt (Apple HIG / Material minimum). Shrinking the
 *     hit area to match a visual choice is the most common accessibility defect
 *     in a button component.
 *  2. **Pressed feedback is composited, not animated.** A one-step `scale` +
 *     `opacity` change is applied instantly on touch-down. There is no spring and
 *     no timing curve, so it cannot lag the finger, works on low-end Android, and
 *     degrades to nothing harmful when the OS "Reduce Motion" setting is on.
 */
export type AppButtonVariant = 'primary' | 'secondary' | 'text' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
    label: string;
    onPress: () => void;
    variant?: AppButtonVariant;
    size?: AppButtonSize;
    /** Shows a spinner in the label's slot and blocks interaction. Implied by `disabled`. */
    loading?: boolean;
    disabled?: boolean;
    /** Stretches to the container width — the default for form submit buttons. */
    fullWidth?: boolean;
    /** Optional leading element, e.g. an [`AppIcon`](src/components/AppIcon/AppIcon.tsx:1). */
    leading?: React.ReactNode;
    /** Optional trailing element, e.g. a disclosure chevron. */
    trailing?: React.ReactNode;
    /** Accessibility label; falls back to `label`. */
    accessibilityLabel?: string;
    testID?: string;
};

const HORIZONTAL_PADDING: Record<AppButtonSize, number> = {
    sm: spacing.sm,
    md: spacing.lg,
    lg: spacing.xl,
};

export function AppButton({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = true,
    leading,
    trailing,
    accessibilityLabel,
    testID,
}: AppButtonProps) {
    const theme = useTheme();
    const isBlocked = disabled || loading;

    const paintedHeight = controlHeights[size];
    // Never smaller than the platform minimum, whatever `size` says.
    const touchHeight = Math.max(paintedHeight, MIN_TOUCH_TARGET);

    const isTextOnly = variant === 'text' || variant === 'ghost';

    const backgroundColor = (() => {
        if (variant === 'primary') {
            return isBlocked ? theme.colors.primaryDisabled : theme.colors.primary;
        }

        if (variant === 'danger') {
            return isBlocked ? theme.colors.surfaceMuted : theme.colors.danger;
        }

        if (variant === 'secondary') {
            return isBlocked ? theme.colors.surfaceMuted : theme.colors.secondary;
        }

        return 'transparent';
    })();

    const labelColor = (() => {
        if (variant === 'primary') {
            return isBlocked ? theme.colors.textMuted : theme.colors.onPrimary;
        }

        if (variant === 'danger') {
            return isBlocked ? theme.colors.textMuted : theme.colors.onDanger;
        }

        if (isTextOnly) {
            return isBlocked ? theme.colors.textDisabled : theme.colors.textLink;
        }

        return isBlocked ? theme.colors.textDisabled : theme.colors.onSecondary;
    })();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled: isBlocked, busy: loading }}
            disabled={isBlocked}
            onPress={onPress}
            testID={testID}
            style={({ pressed }) => [
                styles.base,
                {
                    // Padding is computed against the *painted* height so the label
                    // stays optically centred while the touch band stretches.
                    minHeight: touchHeight,
                    height: touchHeight,
                    paddingHorizontal: HORIZONTAL_PADDING[size],
                    borderRadius: theme.radius.md,
                    backgroundColor,
                    borderWidth: isTextOnly ? 0 : theme.sizing.borderWidths.hairline,
                    borderColor: variant === 'secondary' ? theme.colors.border : 'transparent',
                    width: fullWidth ? '100%' : undefined,
                },
                pressed && !isBlocked ? styles.pressed : null,
            ]}>
            {loading ? (
                // The spinner replaces the row rather than joining it, so the
                // button does not grow when it starts submitting.
                <ActivityIndicator size="small" color={labelColor} />
            ) : (
                <View style={styles.content}>
                    {leading}
                    <AppText variant="bodyStrong" style={{ color: labelColor }} numberOfLines={1}>
                        {label}
                    </AppText>
                    {trailing}
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Instant, composited press feedback. `0.7` is the readability floor against
    // the Ocean Blue fill; `0.98` is small enough to feel responsive and large
    // enough that the button never appears to shrink away from the finger.
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        // Lets an over-long (e.g. translated) label ellipsise instead of pushing
        // the leading icon out of the button.
        maxWidth: '100%',
    },
});
