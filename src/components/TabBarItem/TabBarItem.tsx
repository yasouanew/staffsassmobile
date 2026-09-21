import { Pressable, StyleSheet, View } from 'react-native';

import { radiusRoles } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { iconSizes, MIN_TOUCH_TARGET } from '../../theme/sizing';
import { lineHeight } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { AppIcon, type IconComponent } from '../AppIcon/AppIcon';
import { AppText } from '../AppText/AppText';

/**
 * One slot of the bottom tab bar.
 *
 * ## Equal-width matrix
 *
 * The slot is `flexBasis: 0, flexGrow: 1, flexShrink: 1`, so five slots divide the
 * screen width exactly. Labels of different lengths must never produce different
 * slot widths, which is why the label is truncated *inside* a fixed-width slot
 * rather than being allowed to size it.
 *
 * ## Vertical stack
 *
 * A centred 24pt [`AppIcon`](src/components/AppIcon/AppIcon.tsx:1) sits above a
 * micro caption label. The icon lives in a square box, so it centres without any
 * `marginTop` correction.
 *
 * ## Active indicator and badge are both layout-neutral
 *
 *  - The indicator bar is always mounted and toggles `opacity`, rather than being
 *    conditionally rendered. Mounting/unmounting it would change the slot's
 *    geometry and make the label jump on every tab switch.
 *  - The unread badge is `position: 'absolute'` inside the icon's square box and
 *    anchored to its top-right corner. Because it is out of flow it can be
 *    unmounted at zero unread without moving anything — hence the two different
 *    treatment rules.
 *
 * ## State is never colour-only
 *
 * The active slot changes tint, **label weight** and `accessibilityState.selected`.
 * A user who cannot perceive the hue difference still sees the weight change.
 */
export type TabBarItemProps = {
    /** Vector glyph for this tab. */
    icon: IconComponent;
    label: string;
    focused: boolean;
    onPress: () => void;
    /** Unread count; renders the overlay badge when > 0. */
    badgeCount?: number;
    /** Forces `99+` clamping and formatting. */
    testID?: string;
};

/** Badge counts above this render as `99+` so the pill cannot grow unbounded. */
const MAX_BADGE = 99;

function formatBadge(count: number): string {
    return count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
}

export function TabBarItem({ icon, label, focused, onPress, badgeCount = 0, testID }: TabBarItemProps) {
    const theme = useTheme();

    const tint = focused ? theme.colors.primary : theme.colors.textMuted;
    const hasBadge = badgeCount > 0;
    const badgeLabel = hasBadge ? formatBadge(badgeCount) : '';

    return (
        <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            // The badge is inside this slot, so its count is folded into the
            // slot's label rather than left for the reader to discover.
            accessibilityLabel={hasBadge ? `${label}, ${badgeCount} unread` : label}
            onPress={onPress}
            testID={testID}
            style={styles.slot}>
            {/* Square icon box — the squaring makes the icon centre symmetrically. */}
            <View style={styles.iconBox}>
                <AppIcon icon={icon} size="medium" color={focused ? 'primary' : 'textMuted'} />

                {/* Active indicator: always mounted, opacity-only toggle. */}
                <View
                    style={[
                        styles.indicator,
                        {
                            backgroundColor: theme.colors.primary,
                            opacity: focused ? 1 : 0,
                        },
                    ]}
                />

                {/* Unread badge: absolute overlay, top-right of the icon box. */}
                {hasBadge ? (
                    <View
                        style={[
                            styles.badge,
                            {
                                backgroundColor: theme.colors.danger,
                                borderRadius: radiusRoles.pill.full,
                                minWidth: lineHeight.xs,
                                paddingHorizontal: spacing.xxs,
                            },
                        ]}
                        // The count is already announced by the slot label.
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants">
                        <AppText variant="label" numberOfLines={1} style={{ color: theme.colors.onPrimary }}>
                            {badgeLabel}
                        </AppText>
                    </View>
                ) : null}
            </View>

            <AppText
                variant="label"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                    color: tint,
                    // Weight, not just hue, distinguishes the active tab.
                    fontWeight: focused ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
                }}>
                {label}
            </AppText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    slot: {
        // Exactly 1/5 of the width, regardless of label length.
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xxs,
        // Comfortably above the 44pt floor in both axes.
        minHeight: MIN_TOUCH_TARGET,
    },
    iconBox: {
        width: iconSizes.medium,
        height: iconSizes.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicator: {
        position: 'absolute',
        bottom: -spacing.xxs,
        width: iconSizes.medium,
        height: 2,
        borderRadius: radiusRoles.pill.full,
    },
    badge: {
        position: 'absolute',
        // Anchored to the icon's top-right corner, offset outward so it overlaps
        // the corner instead of sitting inside it.
        top: 0,
        right: 0,
        transform: [{ translateX: '25%' }, { translateY: '-25%' }],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: lineHeight.xs,
    },
});
