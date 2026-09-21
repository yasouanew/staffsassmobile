import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import type { IconComponent } from '../../components/AppIcon';
import { TabBarItem } from '../../components/TabBarItem';
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

/**
 * Placeholder vector glyphs.
 *
 * The app ships no icon-font dependency, so each tab glyph is currently a letter
 * in a rounded plate rendered through the icon contract. Because
 * [`AppIcon`](src/components/AppIcon/AppIcon.tsx:1) accepts any `IconComponent`,
 * swapping in Lucide/Feather later is a one-line change per entry — no atom, no
 * tab bar and no layout change.
 *
 * These are declared at module scope so each is a single stable component
 * reference. Declaring them inline would create a new component type on every
 * render and remount the icon subtree whenever the unread count changes.
 */
function makeGlyph(letter: string): IconComponent {
    function Glyph({ size = sizing.iconSizes.medium, color }: { size?: number; color?: string }) {
        return (
            <View style={[styles.letterPlate, { borderColor: color, width: size, height: size }]}>
                <AppText variant="label" style={{ color }} accessible={false}>
                    {letter}
                </AppText>
            </View>
        );
    }

    return Glyph;
}

const homeIcon = makeGlyph('H');
const rosterIcon = makeGlyph('R');
const availabilityIcon = makeGlyph('A');
const leaveIcon = makeGlyph('L');
const accountIcon = makeGlyph('M');

/** Presentation for each of the five tab slots. */
type TabPresentation = {
    icon: IconComponent;
    label: string;
};

const TAB_PRESENTATION: Record<keyof AppTabParamList, TabPresentation> = {
    HomeTab: { icon: homeIcon, label: 'Home' },
    RosterTab: { icon: rosterIcon, label: 'Roster' },
    AvailabilityTab: { icon: availabilityIcon, label: 'Availability' },
    LeaveTab: { icon: leaveIcon, label: 'Leave' },
    AccountTab: { icon: accountIcon, label: 'Account' },
};

/**
 * Custom bottom tab bar.
 *
 * Replaces the navigator's default bar so that:
 *
 *  - the five slots are exactly one fifth of the width each (`flexBasis: 0`),
 *  - the icon sits at the Phase 2 `medium` (24pt) preset above a micro caption
 *    label,
 *  - the unread badge is an absolute overlay anchored to the icon's bounding box
 *    rather than a navigator-level decoration whose position varies by platform.
 *
 * ## Absolute bottom edge
 *
 * The bar is pinned to `bottom: 0`, and its **content** band is the constant
 * `sizing.layout.tabBarHeight`. `insets.bottom` is *added* as padding so the bar
 * clears the swipe-home indicator without compressing the slots on devices that
 * have one. Content scrolls underneath, which is why
 * [`ScreenContainer`](src/components/ScreenContainer/ScreenContainer.tsx:1)
 * reserves `tabBarHeight + insets.bottom` at the bottom of every tab screen.
 */
export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps): React.JSX.Element {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const serverUnread = useUnreadCount();
    const localCount = useLocalUnreadCount();
    // The local inbox is authoritative: the badge is exactly the surface that must
    // not go blank when connectivity drops, and it has to reflect a read the user
    // performed a second ago. The server count only fills the pre-hydration gap so
    // the badge does not flicker off.
    const unreadCount = localCount ?? serverUnread.data?.count ?? 0;

    return (
        <View
            style={[
                styles.bar,
                {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: sizing.borderWidths.hairline,
                    borderTopColor: theme.colors.border,
                    paddingBottom: insets.bottom,
                    // The one place a real shadow is correct: this bar genuinely
                    // floats over moving content.
                    ...theme.shadows.medium,
                },
            ]}>
            <View style={styles.slots}>
                {state.routes.map((route, index) => {
                    const focused = state.index === index;
                    const presentation = TAB_PRESENTATION[route.name as keyof AppTabParamList];

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!focused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TabBarItem
                            key={route.key}
                            icon={presentation.icon}
                            label={presentation.label}
                            focused={focused}
                            onPress={onPress}
                            badgeCount={route.name === 'HomeTab' ? unreadCount : 0}
                            testID={descriptors[route.key]?.options.tabBarButtonTestID}
                        />
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Hoisted so the navigator receives one stable component reference. Defining it
 * inline in `tabBar` would create a new component type on every render and
 * destroy the whole tab bar subtree — including its unread badge — each time.
 */
function renderTabBar(props: BottomTabBarProps): React.JSX.Element {
    return <AppTabBar {...props} />;
}

export function AppTabs(): React.JSX.Element {
    return (
        <Tab.Navigator
            tabBar={renderTabBar}
            screenOptions={{
                headerShown: false,
                // The custom bar renders its own labels; suppress the navigator's
                // so they cannot double up.
                tabBarShowLabel: false,
            }}>
            <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
            <Tab.Screen name="RosterTab" component={RosterStack} options={{ title: 'Roster' }} />
            <Tab.Screen name="AvailabilityTab" component={AvailabilityScreen} options={{ title: 'Availability' }} />
            <Tab.Screen name="LeaveTab" component={LeaveStack} options={{ title: 'Leave' }} />
            <Tab.Screen name="AccountTab" component={AccountStack} options={{ title: 'Account' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    bar: {
        // Locked to the absolute bottom edge of the display.
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    slots: {
        flexDirection: 'row',
        alignItems: 'stretch',
        height: sizing.layout.tabBarHeight,
    },
    letterPlate: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: sizing.borderWidths.hairline,
        borderRadius: 6,
    },
});
