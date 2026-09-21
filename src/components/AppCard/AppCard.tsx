import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { radiusRoles } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';

/**
 * Elevated surface container for grouped content.
 *
 * This is the molecule every list screen is built from, so its geometry is rigid
 * rather than expressive: `radiusRoles.macro.md` (12pt) corners, `spacing.md`
 * (16pt) internal padding on both axes, and the `low` soft-elevation tier.
 *
 * ## Why `low` and not a bigger shadow
 *
 * A card is a *grouping* surface, not a floating one. Overshadowing a scrolling
 * list is the fastest way to make a business app look dated, so `low`
 * (2pt drop / 6pt blur / 6% ink on iOS, `elevation: 2` on Android) is the
 * default and the ceiling for a resting card. Genuinely floating chrome — sheets,
 * FABs, the tab bar — uses `medium`/`high` (see [`shadows`](src/theme/shadows.ts:1)).
 *
 * ## Clipping is not conditional
 *
 * `overflow: 'hidden'` is always set. The failure it prevents is concrete: a
 * [`StatusBadge`](src/components/StatusBadge/StatusBadge.tsx:1) sitting flush
 * against the card edge is a soft-filled rounded rectangle whose own corner radius
 * is smaller than the card's, so without clipping it paints a square corner over
 * the card's 12pt curve.
 *
 * ## Press feedback
 *
 * When `onPress` is supplied the whole card is the hit target and the pressed
 * state is `scale: 0.99` + a `surfaceMuted` tint. Both are composited/colour-only
 * changes, so pressing a card never reflows the cards below it.
 */
export type AppCardProps = {
    children: React.ReactNode;
    /** Renders the card as a touch target with press feedback. */
    onPress?: () => void;
    /** Removes internal padding when the card wraps an image or a flush list. */
    padded?: boolean;
    /**
     * Elevation tier. A resting card should stay at `low`; `medium` is available
     * for a card that must read as sticky over scrolling content.
     */
    elevated?: 'low' | 'medium';
    style?: ViewStyle;
    accessibilityLabel?: string;
    testID?: string;
};

export function AppCard({
    children,
    onPress,
    padded = true,
    elevated = 'low',
    style,
    accessibilityLabel,
    testID,
}: AppCardProps) {
    const theme = useTheme();

    const surfaceStyle: ViewStyle = {
        borderRadius: radiusRoles.macro.md,
        // Always clip: children must never paint outside the rounded rect.
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        padding: padded ? spacing.md : 0,
        borderWidth: theme.sizing.borderWidths.hairline,
        // In dark mode a drop shadow is invisible against a lifted surface, so the
        // edge is described with a hairline ring instead (see `darkElevation`).
        borderColor: theme.isDark ? theme.darkElevation.ring : theme.colors.border,
        ...theme.shadows[elevated],
    };

    if (onPress === undefined) {
        return (
            <View style={[surfaceStyle, style]} testID={testID}>
                {children}
            </View>
        );
    }

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            testID={testID}
            // A card sitting flush against its neighbour is still comfortably
            // tappable at the seam.
            hitSlop={spacing.xxs}
            style={({ pressed }) => [
                surfaceStyle,
                pressed ? styles.pressed : null,
                pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
                style,
            ]}>
            {/* `flex: 1` keeps the touch area covering the full card rectangle
                rather than only the content's intrinsic height. */}
            <View style={styles.content}>{children}</View>
        </Pressable>
    );
}

/**
 * Horizontal rule matching the card border treatment.
 *
 * Insets by `spacing.md` to line up with the card's own padding, so a divider
 * between two card sections reads as a rule inside the card rather than a break
 * across it.
 */
export function Divider({ inset = false }: { inset?: boolean }) {
    const theme = useTheme();

    return (
        <View
            style={[
                styles.divider,
                {
                    height: theme.sizing.borderWidths.hairline,
                    backgroundColor: theme.colors.divider,
                    marginHorizontal: inset ? spacing.md : 0,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    divider: {
        width: '100%',
    },
    // 0.99 on a ~340pt card is a ~3.4pt contraction — perceptible without looking
    // like a glitch, and small enough that no layout property changes.
    pressed: {
        transform: [{ scale: 0.99 }],
    },
    content: {
        flex: 1,
    },
});
