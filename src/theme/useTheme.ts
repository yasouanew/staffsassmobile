import { theme, type Theme } from './theme';

/**
 * Returns the application theme.
 *
 * A hook (rather than a bare import) so that when a dark palette is introduced
 * only this function changes and every consumer keeps working — no component
 * needs to be touched because they all read the theme through here.
 */
export function useTheme(): Theme {
    return theme;
}
