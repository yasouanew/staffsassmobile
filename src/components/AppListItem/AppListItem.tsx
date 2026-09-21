import { Pressable, StyleSheet, View } from 'react-native';

import type { Colors } from '../../theme/colors';
import { iconSizes } from '../../theme/sizing';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppIcon, type IconComponent } from '../AppIcon/AppIcon';
import { ChevronRightGlyph } from '../AppIcon/glyphs';
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
    /**
     * Leading 24pt navigation icon (Phase 6 settings matrix).
     *
     * Additive: rows that pass nothing keep their previous full-width label, so no
     * Phase 3 call site changes. The slot is a fixed square rather than a sized
     * glyph so that labels in a group stay on a shared left edge whether or not a
     * neighbouring row has an icon — a ragged gutter is the usual giveaway that a
     * settings list was assembled row by row.
     */
    icon?: IconComponent;
    /**
     * Tint for [`icon`](src/components/AppListItem/AppListItem.tsx:15).
     *
     * Defaults to `textSecondary`. Destructive rows should pass `danger` so the
     * glyph and the label agree; a grey padlock next to red "Sign out" text reads
     * like two different states.
     */
    iconColor?: keyof Colors;
    /**
     * Custom trailing element (e.g. a Switch) — replaces the default chevron.
     *
     * `undefined` means "not supplied" and keeps the default chevron; `null` means
     * "supply nothing" and removes it. The distinction matters for destructive rows:
     * a "Sign out" row is an action, not a navigation, so a chevron would promise a
     * screen that does not exist. A plain `??` test cannot express that, because
     * `null` is itself nullish and would fall through to the chevron.
     */
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
    icon,
    iconColor,
    trailing,
    isLast = false,
}: AppListItemProps) {
    const theme = useTheme();

    const resolvedIconColor: keyof Colors =
        iconColor ?? (destructive ? 'danger' : disabled ? 'textDisabled' : 'textSecondary');

    const content = (
        <>
            {icon !== undefined ? (
                <View style={styles.iconSlot}>
                    <AppIcon
                        icon={icon}
                        size="medium"
                        color={resolvedIconColor}
                    /*
                     * Decorative. The row already announces its label, so an
                     * accessible glyph would only make a screen reader say the
                     * row twice.
                     */
                    />
                </View>
            ) : null}

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

            {trailing !== undefined ? trailing : onPress !== undefined ? (
                // A real glyph rather than the '>' character: the text chevron sat on
                // the baseline and drifted as type scaled.
                <AppIcon
                    icon={ChevronRightGlyph}
                    size="small"
                    color={disabled ? 'textDisabled' : 'textMuted'}
                />
            ) : null}
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
    iconSlot: {
        width: iconSizes.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: {
        flex: 1,
        // Phase 6 spec §0.3: a long label must truncate rather than push the
        // trailing chevron or Switch off the row.
        minWidth: 0,
    },
});
