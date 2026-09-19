/**
 * Spacing scale.
 *
 * A 4pt base grid. Everything that separates two elements must use one of these
 * tokens — arbitrary numbers are what make mobile UIs feel inconsistent.
 */
export const spacing = {
    none: 0,
    /** 4 — icon-to-label gaps, badge insets. */
    xxs: 4,
    /** 8 — inside chips, between related lines. */
    xs: 8,
    /** 12 — gap between compact elements in a row. */
    sm: 12,
    /** 16 — default screen gutter and card padding. */
    md: 16,
    /** 20 — comfortable padding for form fields in a column. */
    lg: 20,
    /** 24 — between form groups / sections. */
    xl: 24,
    /** 32 — between major page sections. */
    xxl: 32,
    /** 40 — hero/empty-state breathing room. */
    xxxl: 40,
    /** 56 — reserved space at the bottom of scroll views for FAB/tab bars. */
    huge: 56,
} as const;

/**
 * Fixed horizontal gutter used by [`ScreenContainer`](src/components/ScreenContainer/ScreenContainer.tsx:1)
 * and [`AppHeader`](src/components/AppHeader/AppHeader.tsx:1) so headers and content align.
 */
export const screenGutter = spacing.md;

export type Spacing = typeof spacing;
