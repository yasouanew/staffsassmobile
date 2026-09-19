/**
 * Border radius scale.
 *
 * Deliberately restrained: mobile enterprise UI reads best with small radii on
 * inputs/buttons and a single moderate radius on cards. Nothing uses pill radii
 * except status badges and avatars, where the shape itself carries meaning.
 */
export const radius = {
    none: 0,
    /** 4 — status badges, small chips. */
    xs: 4,
    /** 6 — inputs, small buttons. */
    sm: 6,
    /** 8 — buttons, segmented controls. */
    md: 8,
    /** 12 — cards, bottom sheets. */
    lg: 12,
    /** 16 — modals. */
    xl: 16,
    /** 999 — fully rounded (badges, avatars, icon buttons). */
    full: 999,
} as const;

export type Radius = typeof radius;
