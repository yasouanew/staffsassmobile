import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';

/**
 * Screen shell.
 *
 * Owns the three things every screen would otherwise get subtly wrong:
 *
 * 1. **Safe area** — bottom inset is applied for tab screens (where no header
 *    handles it) and top inset only when there is no header, so content never hides
 *    behind a notch or the home indicator.
 * 2. **Keyboard avoidance** — `keyboardShouldPersistTaps="handled"` lets a user tap
 *    a submit button while the keyboard is open, instead of the first tap only
 *    dismissing the keyboard.
 * 3. **Consistent gutter** — one horizontal padding value shared with
 *    [`AppHeader`](src/components/AppHeader/AppHeader.tsx:1).
 *
 * `scrollable={false}` renders a plain flex view for screens that manage their own
 * list (FlatList), which must not be nested inside a ScrollView.
 */
export type ScreenContainerProps = {
    children: React.ReactNode;
    /** Wrap content in a ScrollView. Use false when the screen owns a FlatList. */
    scrollable?: boolean;
    /** Pull-to-refresh control forwarded to the internal ScrollView. */
    refreshControl?: React.ReactElement;
    /** Apply the standard horizontal gutter. Disable for full-bleed lists. */
    withGutter?: boolean;
    /** Add bottom safe-area padding. Disable when a tab bar already provides it. */
    withBottomInset?: boolean;
    /** Reserve space at the bottom so a FAB does not cover the last row. */
    withFabSpacing?: boolean;
    /** Screen is rendered under a header, so the top inset is already handled. */
    hasHeader?: boolean;
    backgroundColor?: string;
    contentContainerStyle?: ViewStyle;
    style?: ViewStyle;
};

export function ScreenContainer({
    children,
    scrollable = true,
    refreshControl,
    withGutter = true,
    withBottomInset = true,
    withFabSpacing = false,
    hasHeader = false,
    backgroundColor,
    contentContainerStyle,
    style,
}: ScreenContainerProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const paddingTop = hasHeader ? 0 : insets.top;
    const paddingBottom = (withBottomInset ? insets.bottom : 0) + (withFabSpacing ? spacing.huge : spacing.md);

    const containerStyle = [
        styles.container,
        { backgroundColor: backgroundColor ?? theme.colors.background },
    ];

    const paddingStyle: ViewStyle = {
        paddingHorizontal: withGutter ? theme.screenGutter : 0,
        paddingTop,
        paddingBottom,
    };

    if (!scrollable) {
        return (
            <View style={[...containerStyle, paddingStyle, style]}>
                <View style={styles.flex}>{children}</View>
            </View>
        );
    }

    return (
        <ScrollView
            style={containerStyle}
            contentContainerStyle={[paddingStyle, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}>
            {children}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
});
