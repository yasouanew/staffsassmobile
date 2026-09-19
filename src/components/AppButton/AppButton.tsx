import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Primary action button.
 *
 * Handles the four states every form in the app needs: idle, submitting (spinner +
 * disabled), disabled, and error-adjacent (the `danger` variant, used for
 * destructive confirmations such as "Sign out everywhere").
 *
 * Pressed feedback is a colour change rather than an animation: it is instant, works
 * on low-end Android devices, and matches the platform's touch-feedback idiom.
 */
export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
    label: string;
    onPress: () => void;
    variant?: AppButtonVariant;
    size?: AppButtonSize;
    /** Shows a spinner and blocks interaction. Implied by `disabled`. */
    loading?: boolean;
    disabled?: boolean;
    /** Stretches to the container width — the default for form submit buttons. */
    fullWidth?: boolean;
    /** Optional leading element, e.g. an icon. */
    leading?: React.ReactNode;
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
    accessibilityLabel,
    testID,
}: AppButtonProps) {
    const theme = useTheme();
    const isBlocked = disabled || loading;

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

        if (variant === 'ghost') {
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
                    height: theme.sizing.controlHeights[size],
                    paddingHorizontal: HORIZONTAL_PADDING[size],
                    borderRadius: theme.radius.md,
                    backgroundColor,
                    borderWidth: variant === 'ghost' ? 0 : theme.sizing.borderWidths.hairline,
                    borderColor: variant === 'secondary' ? theme.colors.border : 'transparent',
                    width: fullWidth ? '100%' : undefined,
                },
                pressed && !isBlocked ? { opacity: 0.85 } : null,
            ]}>
            {loading ? (
                <ActivityIndicator size="small" color={labelColor} />
            ) : (
                <View style={styles.content}>
                    {leading}
                    <AppText variant="bodyStrong" style={{ color: labelColor }} numberOfLines={1}>
                        {label}
                    </AppText>
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
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
});
