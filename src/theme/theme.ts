import { colors, palette } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { sizing } from './sizing';
import { spacing, screenGutter } from './spacing';
import { typography } from './typography';

/**
 * The application theme.
 *
 * This is the single object every component reads from. It is intentionally a
 * plain frozen object (not a React context) because the app ships one light
 * appearance: the OS dark-mode preference cannot be honoured across the whole
 * surface area without a parallel dark palette, and a half-dark UI is worse than
 * a consistent light one. Users can still switch appearance in Settings — that
 * preference is stored locally and reserved for when a dark palette lands.
 *
 * Usage inside components (see [`useTheme`](src/theme/useTheme.ts:1)):
 * `theme.spacing.md`, `theme.colors.textSecondary`, `theme.typography.variants.caption`.
 */
export const theme = {
    colors,
    palette,
    spacing,
    screenGutter,
    radius,
    shadows,
    sizing,
    typography,
} as const;

export type Theme = typeof theme;
