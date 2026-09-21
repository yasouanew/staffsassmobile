import { View, type ViewStyle } from 'react-native';

/**
 * Built-in glyph set.
 *
 * The app's icon strategy (Phase 2, §4) is to type against the
 * [`IconComponent`](src/components/AppIcon/AppIcon.tsx:21) shape — `size` / `color` /
 * `strokeWidth` — so that adopting Lucide or Feather later is a change to the
 * *imports* at the call sites, not a rewrite of the atom. These glyphs exist so
 * that Phase 4 can ship a real back arrow and a real set of strength icons today,
 * with **no vector library in `package.json`** and no native module to link.
 *
 * They are deliberately drawn from primitives rather than a font or an SVG: a
 * font-based icon needs a `.ttf` asset and a native font link, and an SVG needs
 * `react-native-svg` plus a pod install. Neither is justified for five glyphs,
 * and both would be a build-configuration change smuggled into a layout task.
 *
 * **These are placeholders with the correct geometry.** Each one occupies exactly
 * the `size` × `size` box it is given and honours `color`, which is the only
 * contract [`AppIcon`](src/components/AppIcon/AppIcon.tsx:1) relies on. Swapping
 * in a real vector set later changes nothing at the call sites.
 *
 * `strokeWidth` is accepted for interface compatibility and applied where the
 * primitive supports it (border widths); glyphs drawn from boxes use
 * `strokeWidth / 2` per side so the visual weight matches a stroked path.
 */

export type GlyphProps = {
    size?: number;
    color?: string;
    strokeWidth?: number;
};

/**
 * Every glyph is composed from absolutely-positioned bars over a square box. The
 * `position` key is the one part of that arrangement that never varies, so it is
 * hoisted: the remaining values are derived from `size` and therefore *must* be
 * computed per glyph.
 */
const abs = { position: 'absolute' } as const satisfies ViewStyle;

/** A stroked "L" rotated — the universal back affordance. */
export function ArrowLeftGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const half = size / 2;
    const arm = size * 0.34;
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {/* Shaft */}
            <View
                style={{
                    ...abs,
                    left: size * 0.16,
                    width: size * 0.66,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            {/* Head: two arms forming a chevron pointing left. */}
            <View
                style={{
                    ...abs,
                    left: size * 0.16,
                    top: half - arm / 2,
                    width: arm,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-45deg' }],
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.16,
                    top: half - arm / 2,
                    width: arm,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }],
                }}
            />
        </View>
    );
}

/**
 * Shield with a horizontal divider — "strength is partial".
 * Used for the **Medium** strength state.
 */
export function ShieldHalfGlyph({ size = 12, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth - 1, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderWidth: thickness,
                    borderColor: color,
                    // Squared-off top, rounded bottom: the silhouette of a shield
                    // at this size, without needing a path.
                    borderTopLeftRadius: size * 0.14,
                    borderTopRightRadius: size * 0.14,
                    borderBottomLeftRadius: size * 0.42,
                    borderBottomRightRadius: size * 0.42,
                }}
            />
            <View
                style={{
                    ...abs,
                    width: size * 0.54,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/** Shield with a check — the "Strong" state. */
export function ShieldCheckGlyph({ size = 12, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth - 1, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderWidth: thickness,
                    borderColor: color,
                    borderTopLeftRadius: size * 0.14,
                    borderTopRightRadius: size * 0.14,
                    borderBottomLeftRadius: size * 0.42,
                    borderBottomRightRadius: size * 0.42,
                }}
            />
            {/* Check: a short arm joining a long arm at 45°, centred in the shield. */}
            <View
                style={{
                    ...abs,
                    left: size * 0.28,
                    top: size * 0.5,
                    width: size * 0.2,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }],
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.42,
                    top: size * 0.44,
                    width: size * 0.34,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-45deg' }],
                }}
            />
        </View>
    );
}

/** Shield with a diagonal slash — the "Weak" state. */
export function ShieldAlertGlyph({ size = 12, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth - 1, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderWidth: thickness,
                    borderColor: color,
                    borderTopLeftRadius: size * 0.14,
                    borderTopRightRadius: size * 0.14,
                    borderBottomLeftRadius: size * 0.42,
                    borderBottomRightRadius: size * 0.42,
                }}
            />
            <View
                style={{
                    ...abs,
                    width: size * 0.46,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }],
                }}
            />
        </View>
    );
}

/** Envelope with a check — the "reset link sent" confirmation. */
export function MailCheckGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size,
                    height: size * 0.72,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size * 0.14,
                }}
            />
            {/* The flap, drawn as a narrow rotated bar so it reads as a "V". */}
            <View
                style={{
                    ...abs,
                    top: size * 0.3,
                    width: size * 0.62,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '35deg' }],
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.3,
                    width: size * 0.62,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-35deg' }],
                }}
            />
        </View>
    );
}

/** Bell with a clapper — used for rate-limit ("slow down") messaging. */
export function ClockGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size / 2,
                }}
            />
            {/* Hands at 12 and 3. */}
            <View
                style={{
                    ...abs,
                    width: thickness,
                    height: size * 0.3,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ translateY: -size * 0.12 }],
                }}
            />
            <View
                style={{
                    ...abs,
                    width: size * 0.24,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ translateX: size * 0.12 }],
                }}
            />
        </View>
    );
}

/** Triangle with a bang — form-level failure. */
export function AlertTriangleGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth - 1, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {/* A rotated square is the cheapest stable triangle at 16pt. */}
            <View
                style={{
                    width: size * 0.78,
                    height: size * 0.78,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size * 0.12,
                    transform: [{ rotate: '45deg' }],
                    marginTop: size * 0.1,
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.34,
                    width: thickness,
                    height: size * 0.26,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.68,
                    width: thickness,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/** Shield silhouette with a tick used by the login hero (large size). */
export function BrandShieldGlyph({ size = 32, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 2);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size * 0.78,
                    height: size * 0.86,
                    borderWidth: thickness,
                    borderColor: color,
                    borderTopLeftRadius: size * 0.16,
                    borderTopRightRadius: size * 0.16,
                    borderBottomLeftRadius: size * 0.4,
                    borderBottomRightRadius: size * 0.4,
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.33,
                    top: size * 0.48,
                    width: size * 0.16,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }],
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.44,
                    top: size * 0.42,
                    width: size * 0.28,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-45deg' }],
                }}
            />
        </View>
    );
}

/* ------------------------------------------------------------------ *
 * Phase 5 — navigation, drill-down and detail-matrix glyphs
 * ------------------------------------------------------------------ */

/** A stroked "L" mirrored — drill-down / next. */
export function ChevronRightGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const arm = size * 0.34;
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    left: size * 0.36,
                    width: arm,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }, { translateY: -size * 0.12 }],
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.36,
                    width: arm,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-45deg' }, { translateY: size * 0.12 }],
                }}
            />
        </View>
    );
}

/** A stroked "L" — previous / back in a horizontal control. */
export function ChevronLeftGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const arm = size * 0.34;
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    right: size * 0.36,
                    width: arm,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-45deg' }, { translateY: -size * 0.12 }],
                }}
            />
            <View
                style={{
                    ...abs,
                    right: size * 0.36,
                    width: arm,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }, { translateY: size * 0.12 }],
                }}
            />
        </View>
    );
}

/** Teardrop pin — physical work location. */
export function MapPinGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);
    const head = size * 0.62;

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    top: size * 0.06,
                    width: head,
                    height: head,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size / 2,
                }}
            />
            {/* Pointer converging to the bottom-centre of the box. */}
            <View
                style={{
                    ...abs,
                    top: size * 0.52,
                    width: thickness,
                    height: size * 0.34,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/** Head-and-shoulders — assigned supervisor / employee. */
export function UserGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);
    const head = size * 0.34;

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    top: size * 0.1,
                    width: head,
                    height: head,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size / 2,
                }}
            />
            {/* Shoulders: a wide bar with the top corners rounded. */}
            <View
                style={{
                    ...abs,
                    top: size * 0.56,
                    width: size * 0.68,
                    height: size * 0.3,
                    borderWidth: thickness,
                    borderColor: color,
                    borderTopLeftRadius: size * 0.34,
                    borderTopRightRadius: size * 0.34,
                    borderBottomLeftRadius: size * 0.08,
                    borderBottomRightRadius: size * 0.08,
                }}
            />
        </View>
    );
}

/** Calendar page with a header rule and a day mark. */
export function CalendarGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size * 0.84,
                    height: size * 0.8,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size * 0.14,
                }}
            />
            {/* Header rule, inset so it reads as a binding line rather than a border. */}
            <View
                style={{
                    ...abs,
                    top: size * 0.32,
                    width: size * 0.84,
                    height: thickness,
                    backgroundColor: color,
                }}
            />
            {/* A single day mark below the rule. */}
            <View
                style={{
                    ...abs,
                    top: size * 0.5,
                    width: size * 0.16,
                    height: size * 0.16,
                    borderRadius: size * 0.04,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/** Price-tag — position / department classification. */
export function TagGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);
    const body = size * 0.62;

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {/* A rotated square is a stable tag body at small sizes. */}
            <View
                style={{
                    width: body,
                    height: body,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size * 0.12,
                    transform: [{ rotate: '45deg' }],
                }}
            />
            {/* The eyelet. */}
            <View
                style={{
                    ...abs,
                    top: size * 0.26,
                    left: size * 0.26,
                    width: thickness,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/** A line of text with a leading rule — notes / description. */
export function NoteGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {[0, 1, 2].map(index => (
                <View
                    key={index}
                    style={{
                        ...abs,
                        top: size * (0.22 + index * 0.22),
                        left: size * 0.14,
                        width: index === 2 ? size * 0.42 : size * 0.72,
                        height: thickness,
                        borderRadius: thickness / 2,
                        backgroundColor: color,
                    }}
                />
            ))}
        </View>
    );
}

/** Circled "i" — generic metadata that has no better glyph. */
export function InfoGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    width: size * 0.86,
                    height: size * 0.86,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size / 2,
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.22,
                    width: thickness,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.4,
                    width: thickness,
                    height: size * 0.3,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/* -------------------------------------------------------------------------- */
/*  Phase 6 — workflow & settings glyphs                                       */
/*                                                                             */
/*  Added rather than substituted: the Phase 2–5 set covers navigation and     */
/*  status, but the settings matrix and the FAB need affordances the earlier    */
/*  phases never had (a plus, a sign-out, a bell, a sun/moon pair). Same bar-  */
/*  based technique, same `size`×`size` box, same `color` contract, so a later  */
/*  swap to a vector library still touches only the imports.                   */
/* -------------------------------------------------------------------------- */

/**
 * A `+`. Drawn as two crossed bars rather than the `+` character so the stroke
 * weight matches every other glyph — a text plus takes its weight from the font,
 * which varies by platform and by whether the family has a bold face loaded.
 *
 * This is the FAB's default icon, so it must read correctly at 24pt on a filled
 * circle, where a font-rendered plus sits visibly off-centre.
 */
export function PlusGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);
    const length = size * 0.5;

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    width: length,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            <View
                style={{
                    ...abs,
                    width: thickness,
                    height: length,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/**
 * A door frame with an arrow leaving it — the conventional sign-out mark.
 *
 * Three bars: the frame's upright, the frame's lintel, and the arrow shaft. The
 * arrow *head* is deliberately omitted: at 24pt two diagonal bars to form a
 * chevron collapse into a smudge, and the shaft breaking the frame's right edge is
 * already unambiguous.
 */
export function SignOutGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);
    const frameWidth = size * 0.44;
    const frameHeight = size * 0.72;

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {/* Frame: left upright + top + bottom rails. */}
            <View
                style={{
                    ...abs,
                    left: size * 0.16,
                    width: frameWidth,
                    height: frameHeight,
                    borderWidth: thickness,
                    // The right edge is left open so the arrow reads as passing through.
                    borderRightWidth: 0,
                    borderColor: color,
                    borderTopLeftRadius: thickness,
                    borderBottomLeftRadius: thickness,
                }}
            />
            {/* Arrow shaft, exiting to the right. */}
            <View
                style={{
                    ...abs,
                    right: 0,
                    width: size * 0.42,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/**
 * A bell — the push-notification row.
 *
 * Dome (a rounded box with only its top corners curved), base rail, and a clapper
 * dot. The base rail is what stops the dome from reading as a bag at small sizes.
 */
export function BellGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    top: size * 0.12,
                    width: size * 0.62,
                    height: size * 0.5,
                    borderWidth: thickness,
                    borderColor: color,
                    borderTopLeftRadius: size * 0.34,
                    borderTopRightRadius: size * 0.34,
                    borderBottomLeftRadius: thickness,
                    borderBottomRightRadius: thickness,
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.62,
                    width: size * 0.78,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            <View
                style={{
                    ...abs,
                    top: size * 0.78,
                    width: size * 0.2,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}

/**
 * Sliders — three tracks with a knob on each, for the "Preferences" row.
 *
 * Knob positions deliberately differ per track (high, low, middle): three aligned
 * knobs would read as a list, not as sliders.
 */
export function SlidersGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);
    const knob = Math.max(size * 0.16, thickness + 1);
    /*
     * Paired [trackTop, knobLeft] fractions. Kept as one array of tuples rather
     * than two parallel arrays so an index into one can never drift from the other.
     * The knob positions deliberately differ per track (high, low, middle) —
     * three aligned knobs would read as a list, not as sliders.
     */
    const tracks: ReadonlyArray<readonly [number, number]> = [
        [0.22, 0.62],
        [0.5, 0.3],
        [0.78, 0.46],
    ];

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {tracks.map(([top, knobLeft]) => (
                <View key={top} style={{ ...abs, top: size * top }}>
                    <View
                        style={{
                            width: size * 0.86,
                            height: thickness,
                            borderRadius: thickness / 2,
                            backgroundColor: color,
                        }}
                    />
                    <View
                        style={{
                            ...abs,
                            // Centre the knob on the track's midline.
                            top: -(knob - thickness) / 2,
                            left: size * knobLeft,
                            width: knob,
                            height: knob,
                            borderRadius: knob / 2,
                            backgroundColor: color,
                        }}
                    />
                </View>
            ))}
        </View>
    );
}

/**
 * A sun beside a crescent — the appearance/dark-mode row.
 *
 * Two shapes, not one, because a lone crescent means "moon" and a lone disc means
 * "brightness"; side by side they unambiguously mean "the choice between them".
 */
export function SunMoonGlyph({ size = 24, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {/* Sun: a ring plus four cardinal rays. */}
            <View
                style={{
                    ...abs,
                    left: size * 0.08,
                    width: size * 0.34,
                    height: size * 0.34,
                    borderWidth: thickness,
                    borderColor: color,
                    borderRadius: size * 0.17,
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.08 + size * 0.17 - thickness / 2,
                    top: 0,
                    width: thickness,
                    height: size * 0.1,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.08 + size * 0.17 - thickness / 2,
                    bottom: 0,
                    width: thickness,
                    height: size * 0.1,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                }}
            />
            {/* Moon: a filled disc with a background-coloured disc bitten out of it.
                The bite uses `transparent` rather than the surface colour so the
                glyph works on any background it is placed on. */}
            <View
                style={{
                    ...abs,
                    right: size * 0.06,
                    width: size * 0.4,
                    height: size * 0.4,
                    borderRadius: size * 0.2,
                    backgroundColor: color,
                }}
            />
            <View
                style={{
                    ...abs,
                    right: size * 0.06 - size * 0.02,
                    top: 0,
                    width: size * 0.34,
                    height: size * 0.34,
                    borderRadius: size * 0.17,
                    backgroundColor: 'transparent',
                }}
            />
        </View>
    );
}

/**
 * A tick — the selected-segment marker.
 *
 * Two bars of unequal length meeting at a corner: the short arm drops down-right,
 * the long arm rises up-right. Rotating a single bar would be shorter code but the
 * rotation's origin is the bar's centre, which makes the join land off-grid.
 */
export function CheckGlyph({ size = 16, color = '#000', strokeWidth = 2 }: GlyphProps) {
    const thickness = Math.max(strokeWidth, 1);

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            <View
                style={{
                    ...abs,
                    left: size * 0.12,
                    top: size * 0.44,
                    width: size * 0.3,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '45deg' }],
                }}
            />
            <View
                style={{
                    ...abs,
                    left: size * 0.28,
                    top: size * 0.36,
                    width: size * 0.56,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: color,
                    transform: [{ rotate: '-45deg' }],
                }}
            />
        </View>
    );
}

const styles = {
    box: {
        alignItems: 'center',
        justifyContent: 'center',
    },
} as const satisfies Record<string, ViewStyle>;
