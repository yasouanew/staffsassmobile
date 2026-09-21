/**
 * Component, icon and layout sizing constants.
 *
 * Keeping control heights here is what stops a button on one screen from being
 * 44pt and its twin on another being 48pt.
 */

/** Minimum tappable dimension recommended by both Apple (44pt) and Material (48dp). */
export const MIN_TOUCH_TARGET = 44;

export const controlHeights = {
    sm: 36,
    md: 44,
    lg: 52,
} as const;

/**
 * Icon sizes.
 *
 * Two addressing modes, deliberately:
 *
 *  - **Presets** (`micro`/`small`/`medium`/`large`) — the Phase 2 contract. These
 *    are the four sizes an icon is ever *supposed* to be: 12 / 16 / 24 / 32pt.
 *    Prefer these; they are the values the atoms are tuned against.
 *  - **Legacy numeric steps** (`xs`…`xxl`) — retained verbatim so existing
 *    call sites reading `theme.sizing.iconSizes.md` keep working. New code
 *    should not reach for these.
 */
export const iconSizes = {
    /** Micro — inline suffix glyphs, dense metadata, badge markers. */
    micro: 12,
    /** Small — buttons, list rows, inputs, tab bar. */
    small: 16,
    /** Medium — primary actions, headers, toolbars. */
    medium: 24,
    /** Large — empty states, hero/illustrative slots. */
    large: 32,

    /* ---- Legacy steps (pre-Phase-2). ---- */
    xs: 14,
    sm: 16,
    /**
     * `md` is the default for inline icons; retained at its historical 20pt.
     * Note this is *not* the same as the `medium` preset (24pt).
     */
    md: 20,
    lg: 24,
    xl: 32,
    /** Empty-state illustrations. */
    xxl: 48,
} as const;

/** The four canonical icon size presets. */
export type IconSizePreset = 'micro' | 'small' | 'medium' | 'large';

/**
 * Default stroke weight for vector icons.
 *
 * Deliberately *not* scaled with icon size: a stroked 32pt glyph at a scaled-up
 * stroke looks spindly, and a 12pt glyph at a scaled-down stroke fills in.
 */
export const ICON_STROKE_WIDTH = 2;

export const avatarSizes = {
    sm: 32,
    md: 40,
    lg: 56,
    /** `profile` — the Account hub identity header (Phase 6). */
    profile: 64,
    xl: 72,
} as const;

export const borderWidths = {
    none: 0,
    hairline: 1,
    /** Used for focused inputs and selected cards. */
    focus: 2,
} as const;

/** Heights of fixed chrome, referenced when computing scroll insets. */
export const layout = {
    headerHeight: 56,
    tabBarHeight: 56,
    /** Maximum width for content on large phones/tablets before it looks stretched. */
    maxContentWidth: 640,
} as const;

export const sizing = {
    minTouchTarget: MIN_TOUCH_TARGET,
    controlHeights,
    iconSizes,
    iconStrokeWidth: ICON_STROKE_WIDTH,
    avatarSizes,
    borderWidths,
    layout,
} as const;

export type Sizing = typeof sizing;
