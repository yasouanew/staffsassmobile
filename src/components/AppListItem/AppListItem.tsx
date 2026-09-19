import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Tappable row used by the Account/Settings screens.
 *
 * A separate component from [`AppCard`](src/components/AppCard/AppCard.tsx:1)
 * because these rows have a fixed anatomy (label, optional value, optional chevron)
 * and are grouped into a single bordered block rather than sitting as individual
 * cards — the platform-conventional shape for a settings list.
 */
export type AppListItemProps = {
    label: string;
    /** Current value shown right-aligned in muted text, e.g. "On" or a version. */
    value?: string;
    onPress?: () => void;
    /** Destructive styling for actions like "Sign out everywhere". */
    destructive?: boolean;
    disabled?: boolean;
    /** Custom trailing element (e.g. a Switch) — replaces the default chevron. */
    trailing?: React.ReactNode;
    /** Suppresses the separator; use on the final row of a group. */
    isLast?: boolean;
};

export function AppListItem({
    label,
    value,
    onPress,
    destructive = false,
    disabled = false,
    trailing,
    isLast = false,
}: AppListItemProps) {
    const theme = useTheme();

    const content = (
        <>
            <View style={styles.textBlock}>
                <AppText
                    variant="body"
                    color={destructive ? 'danger' : disabled ? 'textDisabled' : 'text'}
                    numberOfLines={1}>
                    {label}
                </AppText>
                {value !== undefined ? (
                    <AppText variant="caption" numberOfLines={1}>
                        {value}
                    </AppText>
                ) : null}
            </View>

            {trailing ?? (onPress !== undefined ? (
                // Text chevron instead of an icon font: no icon dependency is bundled.
                <AppText variant="body" color="textMuted" accessibilityElementsHidden>
                    {'>'}
                </AppText>
            ) : null)}
        </>
    );

    const rowStyle = [
        styles.row,
        {
            minHeight: theme.sizing.minTouchTarget,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: isLast ? 0 : theme.sizing.borderWidths.hairline,
            borderBottomColor: theme.colors.divider,
        },
    ];

    if (onPress === undefined || disabled) {
        return <View style={rowStyle}>{content}</View>;
    }

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={value !== undefined ? `${label}, ${value}` : label}
            accessibilityState={{ disabled }}
            onPress={onPress}
            style={({ pressed }) => [...rowStyle, pressed ? { backgroundColor: theme.colors.surfaceMuted } : null]}>
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    textBlock: {
        flex: 1,
    },
});
