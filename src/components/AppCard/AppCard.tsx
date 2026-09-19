import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';

/**
 * Surface container for grouped content.
 *
 * A flat white surface with a hairline border and small radius — no shadow. Cards
 * are static content, and stacking shadows on a list of shift cards is what makes
 * mobile UIs feel heavy and dated; shadows are reserved for genuinely floating
 * chrome (see [`shadows`](src/theme/shadows.ts:1)).
 *
 * Pass `onPress` to make the whole card tappable; the pressed state is a background
 * tint, and the pressable variant adds the correct `button` accessibility role.
 */
export type AppCardProps = {
    children: React.ReactNode;
    /** Renders the card as a touch target with press feedback. */
    onPress?: () => void;
    /** Removes internal padding when the card wraps an image or a flush list. */
    padded?: boolean;
    style?: ViewStyle;
    accessibilityLabel?: string;
    testID?: string;
};

export function AppCard({
    children,
    onPress,
    padded = true,
    style,
    accessibilityLabel,
    testID,
}: AppCardProps) {
    const theme = useTheme();

    const surfaceStyle: ViewStyle = {
        borderRadius: theme.radius.lg,
        borderWidth: theme.sizing.borderWidths.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: padded ? spacing.md : 0,
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
            style={({ pressed }) => [
                surfaceStyle,
                pressed ? { backgroundColor: theme.colors.surfaceMuted } : null,
                style,
            ]}>
            {children}
        </Pressable>
    );
}

/** Horizontal rule matching the card border treatment. */
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
});
