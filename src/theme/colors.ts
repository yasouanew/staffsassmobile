/**
 * Colour palette.
 *
 * A restrained, professional product palette: a single brand accent, a neutral
 * grey ramp for surfaces/text, and a semantic set for status communication.
 *
 * Every foreground/background pairing used by [`Text`](src/theme/typography.ts:1)
 * and the shared components meets WCAG AA (>= 4.5:1) at the documented size, so
 * screens can be assembled without re-checking contrast per screen.
 */

const brand = {
    50: '#EEF4FF',
    100: '#D9E5FF',
    200: '#BCCFFF',
    300: '#8FAEFF',
    400: '#5C84FA',
    500: '#3563E9',
    600: '#2549C4',
    700: '#1D3A9E',
    800: '#1A3178',
    900: '#16295E',
} as const;

const neutral = {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
} as const;

const semantic = {
    success: { light: '#DCFCE7', base: '#15803D', strong: '#166534' },
    warning: { light: '#FEF3C7', base: '#B45309', strong: '#92400E' },
    danger: { light: '#FEE2E2', base: '#B91C1C', strong: '#991B1B' },
    info: { light: '#DBEAFE', base: '#1D4ED8', strong: '#1E40AF' },
} as const;

export const palette = {
    brand,
    neutral,
    semantic,
    /** Fixed hues used for leave-type / status dots coming from the API `color` field. */
    accents: {
        teal: '#0F766E',
        violet: '#6D28D9',
        pink: '#BE185D',
        amber: '#B45309',
        slate: '#475569',
    },
} as const;

/** Semantic colour tokens consumed by components. */
export const colors = {
    /** App background — subtle off-white so white cards read as elevated surfaces. */
    background: neutral[50],
    /** Elevated surface (cards, sheets, inputs). */
    surface: neutral[0],
    /** Secondary surface used for pressed states and inert fills. */
    surfaceMuted: neutral[100],
    /** Grouped/sectioned list background. */
    surfaceSunken: neutral[200],

    border: neutral[200],
    borderStrong: neutral[300],
    divider: neutral[200],

    text: neutral[900],
    textSecondary: neutral[600],
    textMuted: neutral[500],
    textDisabled: neutral[400],
    textInverse: neutral[0],
    textLink: brand[600],

    primary: brand[500],
    primaryPressed: brand[600],
    primaryDisabled: brand[200],
    primarySoft: brand[50],
    onPrimary: neutral[0],

    /** Outlined/secondary button tokens. */
    secondary: neutral[100],
    secondaryPressed: neutral[200],
    onSecondary: neutral[800],

    success: semantic.success.base,
    successSoft: semantic.success.light,
    successStrong: semantic.success.strong,

    warning: semantic.warning.base,
    warningSoft: semantic.warning.light,
    warningStrong: semantic.warning.strong,

    danger: semantic.danger.base,
    dangerSoft: semantic.danger.light,
    dangerStrong: semantic.danger.strong,
    onDanger: neutral[0],

    info: semantic.info.base,
    infoSoft: semantic.info.light,
    infoStrong: semantic.info.strong,

    /** Scrim behind modals/bottom sheets. */
    overlay: 'rgba(15, 23, 42, 0.45)',
    /** Skeleton placeholder fill. */
    skeleton: neutral[200],
    skeletonHighlight: neutral[100],
} as const;

export type Colors = typeof colors;
