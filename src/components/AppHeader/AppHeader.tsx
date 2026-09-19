import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Screen header.
 *
 * Used by screens that need a title and/or a trailing action but are rendered
 * without the native stack header (tab roots). Stack screens use
 * `navigationOptions.title` instead — two headers on one screen is a layout bug, so
 * `hasHeader` on [`ScreenContainer`](src/components/ScreenContainer/ScreenContainer.tsx:1)
 * and this component are used together or not at all.
 *
 * Text-based back/action affordances are used rather than an icon library: the app
 * ships no vector-icon dependency (one was not required), and on Android a text
 * button matches platform conventions for headers.
 */
export type AppHeaderProps = {
    title: string;
    /** Optional supporting line under the title, e.g. the current week range. */
    subtitle?: string;
    onBack?: () => void;
    /** Trailing action rendered on the right. */
    action?: React.ReactNode;
    /** Renders the header inline (no shadow) — for use inside a scrolling content area. */
    flat?: boolean;
};

export function AppHeader({ title, subtitle, onBack, action, flat = false }: AppHeaderProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: flat ? spacing.sm : insets.top + spacing.sm,
                    paddingBottom: spacing.sm,
                    paddingHorizontal: theme.screenGutter,
                    backgroundColor: theme.colors.surface,
                    borderBottomWidth: theme.sizing.borderWidths.hairline,
                    borderBottomColor: theme.colors.border,
                    minHeight: theme.sizing.layout.headerHeight,
                },
                flat ? null : theme.shadows.sm,
            ]}>
            <View style={styles.row}>
                {onBack !== undefined ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        onPress={onBack}
                        hitSlop={spacing.sm}
                        style={styles.back}>
                        <AppText variant="bodyStrong" color="textLink">
                            Back
                        </AppText>
                    </Pressable>
                ) : null}

                <View style={styles.titleBlock}>
                    <AppText variant="title" numberOfLines={1}>
                        {title}
                    </AppText>
                    {subtitle !== undefined ? (
                        <AppText variant="label" color="textMuted" numberOfLines={1}>
                            {subtitle}
                        </AppText>
                    ) : null}
                </View>

                {action !== undefined ? <View style={styles.action}>{action}</View> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'flex-end',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    back: {
        paddingRight: spacing.xs,
    },
    titleBlock: {
        flex: 1,
    },
    action: {
        alignItems: 'flex-end',
    },
});
