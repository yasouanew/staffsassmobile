import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppText } from '../../components/AppText';
import { useLocalUnreadCount, useUnreadCount } from '../../features/notifications/hooks';
import { AvailabilityScreen } from '../../features/availability/screens';
import { useTheme } from '../../theme';
import { sizing } from '../../theme/sizing';
import { AccountStack } from './AccountStack';
import { HomeStack } from './HomeStack';
import { LeaveStack } from './LeaveStack';
import { RosterStack } from './RosterStack';
import type { AppTabParamList } from '../types';

const Tab = createBottomTabNavigator<AppTabParamList>();

type TabIconProps = { focused: boolean; color: string };

/**
 * Stable, referentially-equal style objects. Building these inline on every render
 * allocates a fresh object each pass, which defeats `React.memo`-style comparisons
 * inside the tab bar for no benefit.
 */
const styles = StyleSheet.create({
    glyph: {
        alignItems: 'center',
        height: 22,
        justifyContent: 'center',
        width: 22,
    },
});

/**
 * Icon renderers are hoisted to module scope so each is a single stable function
 * reference. Declaring them inline in `options` would create a new component type on
 * every `AppTabs` render, forcing React to unmount and remount the icon subtree each
 * time the unread badge changes.
 */
const homeIcon = ({ focused, color }: TabIconProps) => (
    <TabGlyph label="H" focused={focused} color={color} />
);
const rosterIcon = ({ focused, color }: TabIconProps) => (
    <TabGlyph label="R" focused={focused} color={color} />
);
const availabilityIcon = ({ focused, color }: TabIconProps) => (
    <TabGlyph label="A" focused={focused} color={color} />
);
const leaveIcon = ({ focused, color }: TabIconProps) => (
    <TabGlyph label="L" focused={focused} color={color} />
);
const accountIcon = ({ focused, color }: TabIconProps) => (
    <TabGlyph label="M" focused={focused} color={color} />
);

/**
 * Authenticated tab bar.
 *
 * No icon library is bundled (see §7 of the preparing notes): adding one for five
 * glyphs would be a large dependency for little value, and text labels are legible,
 * localisable and honest about what each tab does. The active tab is distinguished by
 * colour weight plus a thin indicator bar, not by colour alone, so it remains
 * perceivable without colour vision.
 *
 * Only the Home tab shows a badge. The number rendered comes from the local inbox
 * ([`useLocalUnreadCount`](src/features/notifications/hooks/useLocalUnreadCount.ts:1)),
 * not from the server — the badge is exactly the surface that must not go blank when
 * connectivity drops, and it has to reflect a read the user performed a second ago.
 *
 * [`useUnreadCount`](src/features/notifications/hooks/useUnreadCount.ts:15) is still
 * called because its response is what reconciles the local inbox on a schedule; the
 * fetched `.count` is deliberately not rendered. When the inbox has not hydrated yet,
 * the server count is used as a placeholder so the badge does not flicker off.
 */
export function AppTabs(): React.JSX.Element {
    const theme = useTheme();
    const unread = useUnreadCount();
    const localCount = useLocalUnreadCount();
    const unreadCount = localCount ?? unread.data?.count ?? 0;

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    height: sizing.layout.tabBarHeight,
                    paddingBottom: 0,
                },
                tabBarLabelStyle: {
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                },
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeStack}
                options={{
                    title: 'Home',
                    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: theme.colors.danger,
                        color: theme.colors.onPrimary,
                        fontSize: theme.typography.fontSize.xs,
                    },
                    tabBarIcon: homeIcon,
                }}
            />
            <Tab.Screen
                name="RosterTab"
                component={RosterStack}
                options={{
                    title: 'Roster',
                    tabBarIcon: rosterIcon,
                }}
            />
            <Tab.Screen
                name="AvailabilityTab"
                component={AvailabilityScreen}
                options={{
                    title: 'Availability',
                    tabBarIcon: availabilityIcon,
                }}
            />
            <Tab.Screen
                name="LeaveTab"
                component={LeaveStack}
                options={{
                    title: 'Leave',
                    tabBarIcon: leaveIcon,
                }}
            />
            <Tab.Screen
                name="AccountTab"
                component={AccountStack}
                options={{
                    title: 'Account',
                    tabBarIcon: accountIcon,
                }}
            />
        </Tab.Navigator>
    );
}

/**
 * Placeholder tab glyph.
 *
 * A letter in a rounded square, sized to the tab bar's icon slot. It keeps the touch
 * target and visual rhythm a real icon set would have, so swapping in an icon library
 * later is a drop-in change confined to this component.
 */
function TabGlyph({
    label,
    focused,
    color,
}: {
    label: string;
    focused: boolean;
    color: string;
}): React.JSX.Element {
    const theme = useTheme();

    // Only the colour inputs vary per render; the layout half comes from the
    // `StyleSheet`, so no new style object is allocated for the invariant part.
    const dynamicStyle: StyleProp<ViewStyle> = {
        borderColor: color,
        borderWidth: sizing.borderWidths.hairline,
        borderRadius: theme.radius.xs,
        backgroundColor: focused ? theme.colors.primarySoft : 'transparent',
    };

    return (
        <View style={[styles.glyph, dynamicStyle]}>
            <AppText variant="label" style={{ color }} accessible={false}>
                {label}
            </AppText>
        </View>
    );
}

