import { Platform, type ViewStyle } from 'react-native';

import { colors } from './colors';

/**
 * Elevation tokens.
 *
 * Android uses the native `elevation` (which draws a real shadow and participates
 * in z-ordering); iOS needs explicit shadow properties. Both are expressed through
 * the same named token so call sites never branch on platform.
 *
 * The palette is intentionally flat — shadow is used to separate floating things
 * (headers, sheets, FABs) from content, not to decorate static cards, which use
 * [`radius`](src/theme/radius.ts:1) plus a hairline border instead.
 */

type ShadowToken = {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
};

function createElevation(androidElevation: number, ios: Omit<ShadowToken, 'elevation'>): ViewStyle {
    if (Platform.OS === 'android') {
        return { elevation: androidElevation };
    }

    return { ...ios };
}

export const shadows = {
    /** Static surfaces: cards, list rows. */
    none: createElevation(0, {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
    }),
    /** Slightly lifted content such as an active tab pill or a focused input. */
    sm: createElevation(2, {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
    }),
    /** Cards that need to read as above the page background. */
    md: createElevation(4, {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    }),
    /** Sticky headers, bottom sheets, FABs. */
    lg: createElevation(8, {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
    }),
} as const;

export type Shadows = typeof shadows;
export type ShadowLevel = keyof typeof shadows;
