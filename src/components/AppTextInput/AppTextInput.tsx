import { forwardRef, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
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
import { borderWidths, controlHeights } from '../../theme/sizing';
import { fontSize, lineHeight } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { AppText } from '../AppText/AppText';

/**
 * Floating-label text input.
 *
 * Wraps `TextInput` with the label, helper/error messaging and focus styling that
 * every form field in the app needs, so screens never hand-roll this. Designed to
 * be driven by React Hook Form: pass `value`/`onChangeText` from
 * `Controller`/`register` and read `error` from `formState.errors`.
 *
 * ## Fixed vertical footprint
 *
 * The most important property of this atom is that **its height never changes**.
 * Swapping a helper line for an error line, or floating the label, must not move
 * anything below the field. That is achieved by reserving four bands
 * unconditionally:
 *
 *     labelBand (16) + gap (4) + controlBand (44) + messageBand (16)
 *
 * The message band is always mounted — an empty spacer of exactly the same height
 * stands in when there is neither an error nor a helper. Validation therefore only
 * paints a colour into space that already existed.
 *
 * ## The floating label
 *
 * The label is rendered once and moved, never swapped between two elements. Only
 * `scale` / `translateY` / `color` are animated (all composited). Font size is
 * deliberately *not* animated — animating `fontSize` re-lays-out the text every
 * frame, which drops frames and can transiently change the field's height, breaking
 * the guarantee above. Instead the label is rendered at the floated size and scaled
 * up while it rests inside the box.
 *
 * The label floats when the field is focused **or** populated, so a filled field
 * still shows its label after blur.
 */

/** Floated label size — the caption tier. */
const FLOAT_FONT_SIZE = fontSize.xs; // 12
const REST_FONT_SIZE = fontSize.md; // 15
/** How much the label is scaled up while resting inside the box. */
const REST_SCALE = REST_FONT_SIZE / FLOAT_FONT_SIZE; // 1.25
/** Duration of the float transition, in ms. Under 200 so it never lags the keyboard. */
const FLOAT_DURATION = 150;

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
    /**
     * Caps the control band's height, in points.
     *
     * Pair with `multiline` + `scrollEnabled` to build a narrative box that scrolls
     * its own text instead of growing the page hierarchy — the deterministic way to
     * hold a form's layout still while a long reason is typed. `numberOfLines` alone
     * is only a hint and is honoured inconsistently across platforms and font scales,
     * which is why this is a hard constraint rather than another hint.
     *
     * Ignored (with a dev warning) for single-line inputs: a clamped one-line field
     * silently clips its own text.
     */
    maxHeight?: number;
};

export const AppTextInput = forwardRef<AppTextInputRef, AppTextInputProps>(function AppTextInputImpl(
    {
        label,
        error,
        helper,
        secureToggle = false,
        required = false,
        editable = true,
        secureTextEntry,
        multiline = false,
        containerStyle,
        maxHeight,
        onFocus,
        onBlur,
        value,
        defaultValue,
        onChangeText,
        ...rest
    },
    ref,
) {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureVisible, setIsSecureVisible] = useState(false);
    // Tracks text the user typed when the caller is uncontrolled.
    const [uncontrolledValue, setUncontrolledValue] = useState(
        typeof defaultValue === 'string' ? defaultValue : '',
    );

    const hasError = typeof error === 'string' && error.length > 0;

    if (__DEV__ && maxHeight !== undefined && !multiline) {
        console.warn(
            `AppTextInput "${label}": maxHeight has no effect without multiline. ` +
            'A single-line control clamped to a fixed height clips its own text.',
        );
    }

    /** Only a multiline box can be height-capped without losing text. */
    const heightCap = multiline ? maxHeight : undefined;

    // The toggle is only meaningful when the field is actually masked. Defaulting
    // `secureTextEntry` to `true` whenever `secureToggle` is set makes the prop
    // pair self-consistent: the Show/Hide control can never render over an
    // unmasked input (a no-op toggle), while callers may still force `false`.
    const isSecureField = secureTextEntry ?? secureToggle;

    const currentValue = value !== undefined ? value : uncontrolledValue;
    const isPopulated = currentValue.length > 0;
    const isFloating = isFocused || isPopulated;

    // 0 → resting inside the box, 1 → floated above it.
    const floatProgress = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(floatProgress, {
            toValue: isFloating ? 1 : 0,
            duration: FLOAT_DURATION,
            easing: Easing.out(Easing.cubic),
            // `scale`/`translateY`/`color` are composited properties; the JS driver
            // is used so no `useNativeDriver` warning is emitted for colour.
            useNativeDriver: false,
        }).start();
    }, [floatProgress, isFloating]);

    const borderColor = hasError
        ? theme.colors.danger
        : isFocused
            ? theme.colors.primary
            : theme.colors.borderStrong;

    const labelColor = hasError
        ? theme.colors.danger
        : isFloating
            ? theme.colors.textSecondary
            : theme.colors.textMuted;

    /**
     * Travel distance of the label, in points: from vertically centred in the
     * control band up to the label band. Derived from tokens so the two resting
     * positions cannot drift apart if the bands are re-tuned.
     */
    const labelTravel = -((controlHeights.md - lineHeight.xs) / 2);

    const animatedLabelStyle = {
        color: labelColor,
        transform: [
            {
                translateY: floatProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [labelTravel, 0],
                }),
            },
            {
                // Scaled *down* to the floated size as it rises, and up to body
                // size while resting.
                scale: floatProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [REST_SCALE, 1],
                }),
            },
        ],
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {/* ---- labelBand: reserved unconditionally (lineHeight.xs = 16) ---- */}
            <View style={styles.labelBand}>
                <Animated.Text
                    style={[
                        theme.typography.variants.label,
                        { fontSize: FLOAT_FONT_SIZE, lineHeight: lineHeight.xs },
                        animatedLabelStyle,
                    ]}
                    // The label is decoration over the input; tapping where it
                    // appears to be must focus the input, not the label.
                    pointerEvents="none"
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {required ? `${label} *` : label}
                </Animated.Text>
            </View>

            {/* ---- controlBand: controlHeights.md = 44 ---- */}
            <View
                style={[
                    styles.inputWrapper,
                    {
                        // A capped multiline box sizes to its content up to the cap;
                        // an uncapped control keeps the single-line 44pt band.
                        ...(heightCap !== undefined
                            ? { minHeight: controlHeights.md, maxHeight: heightCap }
                            : { height: controlHeights.md }),
                        borderRadius: theme.radius.sm,
                        backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceMuted,
                        paddingHorizontal: spacing.sm,
                        // A permanent transparent frame of the focus width means
                        // switching 1pt → 2pt on focus changes only the colour, so
                        // the text baseline never shifts by a point.
                        borderWidth: borderWidths.focus,
                        borderColor: hasError || isFocused ? borderColor : theme.colors.border,
                    },
                ]}>
                <TextInput
                    ref={ref}
                    editable={editable}
                    value={value}
                    defaultValue={defaultValue}
                    secureTextEntry={isSecureField && !isSecureVisible}
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
                    onChangeText={text => {
                        if (value === undefined) {
                            setUncontrolledValue(text);
                        }
                        onChangeText?.(text);
                    }}
                    style={[
                        styles.input,
                        theme.typography.variants.body,
                        {
                            color: editable ? theme.colors.text : theme.colors.textDisabled,
                            ...(heightCap !== undefined
                                ? {
                                    // Padding is applied to the text layer, not the wrapper, so
                                    // `maxHeight` measures content and the box's outer height
                                    // matches the number the caller passed in.
                                    paddingTop: spacing.sm,
                                    paddingBottom: spacing.sm,
                                    maxHeight: heightCap,
                                    // Android otherwise centres multiline text in a tall box.
                                    textAlignVertical: 'top',
                                }
                                : null),
                        },
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

            {/* ---- messageBand: always mounted, always lineHeight.xs tall ---- */}
            <View style={styles.messageBand}>
                {hasError ? (
                    // `accessibilityLiveRegion` makes screen readers announce
                    // validation failures as soon as they appear.
                    <AppText
                        variant="label"
                        color="danger"
                        numberOfLines={1}
                        accessibilityLiveRegion="polite">
                        {error}
                    </AppText>
                ) : helper !== undefined ? (
                    <AppText variant="label" color="textMuted" numberOfLines={1}>
                        {helper}
                    </AppText>
                ) : null}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        gap: spacing.xxs,
    },
    // Both placeholder bands pin their height so the stack's total height is a
    // constant, independent of label/error state.
    labelBand: {
        height: lineHeight.xs,
        justifyContent: 'center',
        // Inset so the floated label lines up with the text inside the field.
        paddingHorizontal: spacing.sm,
    },
    messageBand: {
        height: lineHeight.xs,
        justifyContent: 'center',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    input: {
        flex: 1,
        paddingVertical: 0,
        // Vertical centring is structural (the wrapper is `alignItems: 'center'`),
        // never faked with padding.
        textAlignVertical: 'center',
    },
    toggle: {
        paddingVertical: spacing.xxs,
    },
});
