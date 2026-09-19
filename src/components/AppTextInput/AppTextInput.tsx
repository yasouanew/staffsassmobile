import { forwardRef, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
    type TextInputProps,
    type TextStyle,
} from 'react-native';

/**
 * Instance type exposed by `TextInput` in React Native 0.87. Used for the forwarded
 * ref so callers can call `.focus()`/`.blur()` (e.g. "next field" on submit) with
 * the correct type across both architectures.
 */
export type AppTextInputRef = React.ComponentRef<typeof TextInput>;

import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Labelled text input.
 *
 * Wraps `TextInput` with the label, helper/error messaging and focus styling that
 * every form field in the app needs, so screens never hand-roll this. Designed to
 * be driven by React Hook Form: pass `value`/`onChangeText` from
 * `Controller`/`register` and read `error` from `formState.errors`.
 *
 * The error replaces the helper text rather than appearing below it, so the field's
 * height never shifts while the user is typing a correction.
 */
export type AppTextInputProps = Omit<TextInputProps, 'style'> & {
    label: string;
    /** Validation or server error for this field. Takes precedence over `helper`. */
    error?: string;
    /** Guidance shown when there is no error. */
    helper?: string;
    /** Renders a show/hide control for password fields. */
    secureToggle?: boolean;
    required?: boolean;
    containerStyle?: TextStyle;
};

export const AppTextInput = forwardRef<AppTextInputRef, AppTextInputProps>(function AppTextInputImpl(
    {
        label,
        error,
        helper,
        secureToggle = false,
        required = false,
        editable = true,
        secureTextEntry = false,
        containerStyle,
        onFocus,
        onBlur,
        ...rest
    },
    ref,
) {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureVisible, setIsSecureVisible] = useState(false);

    const hasError = typeof error === 'string' && error.length > 0;
    const borderColor = hasError
        ? theme.colors.danger
        : isFocused
            ? theme.colors.primary
            : theme.colors.borderStrong;

    return (
        <View style={[styles.container, containerStyle]}>
            <AppText variant="caption" color="textSecondary">
                {required ? `${label} *` : label}
            </AppText>

            <View
                style={[
                    styles.inputWrapper,
                    {
                        minHeight: theme.sizing.controlHeights.md,
                        borderRadius: theme.radius.sm,
                        borderWidth: hasError || isFocused ? theme.sizing.borderWidths.focus : theme.sizing.borderWidths.hairline,
                        borderColor,
                        backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceMuted,
                        paddingHorizontal: spacing.sm,
                    },
                ]}>
                <TextInput
                    ref={ref}
                    editable={editable}
                    secureTextEntry={secureTextEntry && !isSecureVisible}
                    placeholderTextColor={theme.colors.textMuted}
                    accessibilityLabel={label}
                    accessibilityState={{ disabled: !editable }}
                    onFocus={event => {
                        setIsFocused(true);
                        onFocus?.(event);
                    }}
                    onBlur={event => {
                        setIsFocused(false);
                        onBlur?.(event);
                    }}
                    style={[
                        styles.input,
                        theme.typography.variants.body,
                        { color: editable ? theme.colors.text : theme.colors.textDisabled },
                    ]}
                    {...rest}
                />

                {secureToggle ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isSecureVisible ? 'Hide password' : 'Show password'}
                        onPress={() => setIsSecureVisible(previous => !previous)}
                        hitSlop={spacing.sm}
                        style={styles.toggle}>
                        <AppText variant="label" color="textLink">
                            {isSecureVisible ? 'Hide' : 'Show'}
                        </AppText>
                    </Pressable>
                ) : null}
            </View>

            {hasError ? (
                // `accessibilityLiveRegion` makes screen readers announce validation
                // failures as soon as they appear.
                <AppText variant="label" color="danger" accessibilityLiveRegion="polite">
                    {error}
                </AppText>
            ) : helper !== undefined ? (
                <AppText variant="label" color="textMuted">
                    {helper}
                </AppText>
            ) : null}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        gap: spacing.xxs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.sm,
    },
    toggle: {
        paddingVertical: spacing.xxs,
    },
});
