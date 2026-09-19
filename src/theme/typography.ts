import { type TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Typography scale.
 *
 * Uses the platform system font (Roboto on Android, SF Pro on iOS) rather than
 * bundling a custom face: it renders crisply at every DPI, respects the user's
 * OS-level font size, and adds no asset weight to the bundle.
 *
 * Line heights are explicit (not `1.2 * fontSize`) because rounded values are
 * what keep multi-line rows visually rhythmic.
 *
 * `accessibilityRole`/semantics are applied by [`AppText`](src/components/AppText/AppText.tsx:1);
 * these variants only describe size and weight.
 */
export const fontFamilies = {
    regular: undefined as string | undefined,
    medium: undefined as string | undefined,
    semibold: undefined as string | undefined,
} as const;

export const fontSize = {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
} as const;

export const lineHeight = {
    xs: 16,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 38,
} as const;

export const fontWeight = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
} as const;

/** Named text variants referenced by [`AppText`](src/components/AppText/AppText.tsx:1). */
const base: TextStyle = {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: fontWeight.regular,
    color: colors.text,
};

export const textVariants = {
    /** Screen titles in the header. */
    title: {
        ...base,
        fontSize: fontSize.xl,
        lineHeight: lineHeight.xl,
        fontWeight: fontWeight.semibold,
    } satisfies TextStyle,
    /** Section headers inside a screen. */
    subtitle: {
        ...base,
        fontSize: fontSize.lg,
        lineHeight: lineHeight.lg,
        fontWeight: fontWeight.semibold,
    } satisfies TextStyle,
    /** Default body copy. */
    body: base satisfies TextStyle,
    /** Emphasised body copy — list row primary lines. */
    bodyStrong: {
        ...base,
        fontWeight: fontWeight.medium,
    } satisfies TextStyle,
    /** Supporting copy — list row secondary lines, helper text. */
    caption: {
        ...base,
        fontSize: fontSize.sm,
        lineHeight: lineHeight.sm,
        color: colors.textSecondary,
    } satisfies TextStyle,
    /** Smallest label — metadata, badges, timestamps. */
    label: {
        ...base,
        fontSize: fontSize.xs,
        lineHeight: lineHeight.xs,
        fontWeight: fontWeight.medium,
        color: colors.textMuted,
    } satisfies TextStyle,
    /** Time/date emphasis on shift cards. */
    time: {
        ...base,
        fontSize: fontSize.xxl,
        lineHeight: lineHeight.xxl,
        fontWeight: fontWeight.semibold,
        fontVariant: ['tabular-nums'],
    } satisfies TextStyle,
    /** Numbers that must not shift width (durations, counts). */
    numeric: {
        ...base,
        fontVariant: ['tabular-nums'],
    } satisfies TextStyle,
} as const;

export type TextVariant = keyof typeof textVariants;

export const typography = {
    fontFamilies,
    fontSize,
    lineHeight,
    fontWeight,
    variants: textVariants,
} as const;

export type Typography = typeof typography;
