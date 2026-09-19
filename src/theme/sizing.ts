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

/** Icon sizes. `md` is the default for inline icons; `lg` for empty states. */
export const iconSizes = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    /** Empty-state illustrations. */
    xxl: 48,
} as const;

export const avatarSizes = {
    sm: 32,
    md: 40,
    lg: 56,
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
    avatarSizes,
    borderWidths,
    layout,
} as const;

export type Sizing = typeof sizing;
