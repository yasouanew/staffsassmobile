import { Text, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import type { TextVariant } from '../../theme/typography';

/**
 * Themed text primitive.
 *
 * Every string in the app is rendered through this component so that type scale,
 * colour and truncation behaviour stay consistent. Screens should not import
 * `Text` from `react-native` directly.
 *
 * The variant supplies font size/weight/colour; callers may override both via
 * `color` (theme token key) and `style`.
 */
export type AppTextProps = RNTextProps & {
    /** Named style from [`textVariants`](src/theme/typography.ts:1). */
    variant?: TextVariant;
    /**
     * Theme colour token to use instead of the variant default. Restricted to the
     * `colors` object keys so an arbitrary hex cannot leak into a screen.
     */
    color?: keyof ReturnType<typeof useTheme>['colors'];
    /** Centre-aligns the text — the common case for empty/error states. */
    align?: TextStyle['textAlign'];
    /** Truncates to a single line with an ellipsis (list rows). */
    numberOfLines?: number;
};

export function AppText({
    variant = 'body',
    color,
    align,
    style,
    children,
    ...rest
}: AppTextProps) {
    const theme = useTheme();
    const variantStyle = theme.typography.variants[variant];
    const colorStyle: TextStyle | null = color !== undefined ? { color: theme.colors[color] } : null;

    return (
        <Text
            // `allowFontScaling` stays enabled (the default) so the OS font-size
            // accessibility setting is honoured — a deliberate choice for an app whose
            // core content is shift times employees must be able to read.
            style={[variantStyle, colorStyle, align !== undefined ? { textAlign: align } : null, style]}
            {...rest}>
            {children}
        </Text>
    );
}
