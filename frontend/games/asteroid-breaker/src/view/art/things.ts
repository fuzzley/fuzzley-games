// What drifts on the field to be caught, as the art kit's `things.mjs`
// draws it (`docs/asteroid-breaker-uplift/art/lib/things.mjs`): each pickup
// as a round glass orb, its rim saying its group and its symbol bold in
// its middle, breathing and glowing while it floats.

import { recordOf } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  arcPoints,
  centered,
  circle,
  ring,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";
import {
  type EffectKind,
  PICKUP_IDS,
  type PickupId,
  pickup,
} from "../../rules/catalog/pickups";
import { type Floating, blinks } from "../../rules/rocks/drops";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { GOLDEN_ANGLE, blinkShown, breathShare } from "../effects/flourish";
import { polar } from "./rocks/space";
import { MOST_LINE, outlineWidth } from "./shapes";
import { SYMBOLS } from "./symbols";

/** An orb's sizes, in field units, as the kit has them: its radius, its rim's width, how far its halo reaches and its symbol's square. */
export const ORB = {
  radius: 1.1,
  rim: 0.17,
  halo: 2.05,
  symbol: 1.32,
} as const;

/**
 * How far a pickup's frame reaches from its middle, in field units, before
 * it breathes: its orb, and its outline at the widest a line gets.
 */
export const PICKUP_REACH = ORB.radius + MOST_LINE;

/** Names how an orb's rim says its pickup's group: one ring, a ring doubled, or four arcs. */
type OrbRim = "ring" | "double" | "arcs";

/**
 * The rim of each group's orb, by its effect's kind: one ring for a weapon,
 * doubled for what guards the ship, and four arcs for what changes the
 * field.
 */
const ORB_RIMS: Readonly<Record<EffectKind, OrbRim>> = {
  weapon: "ring",
  guard: "double",
  pull: "arcs",
  pace: "arcs",
};

/** How large an orb's symbol's square is against {@link ORB}'s, by its rim, so a doubled ring or the arcs' ends leave it room. */
const SYMBOL_SHARE: Readonly<Record<OrbRim, number>> = {
  ring: 1,
  double: 0.86,
  arcs: 0.96,
};

/** White, which an orb's glints are drawn in. */
const WHITE = 0xffffff;

/** How strongly the deeper glass shows over the glass, as the kit lays it. */
const DEEP_ALPHA = 0.55;

/** Describes the colors an orb is drawn in, mixed from the palette's field, accent and text. */
export interface OrbColors {
  /** Its glass, the field tinted with the accent. */
  readonly glass: number;
  /**
   * The glass deeper in it, a fine mark, as it shows over the glass: the
   * field tinted more with the accent, laid at {@link DEEP_ALPHA}, mixed
   * here so the disc is drawn whole.
   */
  readonly deep: number;
  /** Its symbol: the accent sunk toward the field's text on a light field, lifted toward white on a dark one. */
  readonly ink: number;
  /** The glint on its rim: the rim's accent nearly white. */
  readonly glint: number;
}

/** Returns the colors an orb is drawn in, in a palette, as the kit's `orbSvg()` mixes them. */
export function orbColors(palette: BeltPalette): OrbColors {
  const light = palette.mode === "light";
  const glass = mixTone(palette.field, palette.accent, light ? 0.13 : 0.26);
  const inner = mixTone(palette.field, palette.accent, light ? 0.24 : 0.4);
  return {
    glass,
    deep: mixTone(glass, inner, DEEP_ALPHA),
    ink: light
      ? mixTone(palette.accent, palette.shot, 0.42)
      : mixTone(palette.accent, WHITE, 0.74),
    glint: mixTone(palette.accent, WHITE, 0.9),
  };
}

/** The names of the pickups' frames, made once, so finding one makes nothing. */
export const PICKUP_FRAMES: Readonly<Record<PickupId, string>> = recordOf(
  PICKUP_IDS,
  (id) => `pickup-${id}`,
);

/** Returns the name of a pickup's frame, as it drifts. */
export function pickupFrame(id: PickupId): string {
  return PICKUP_FRAMES[id];
}

/**
 * Returns an orb's rim about its middle, in the accent: one ring, doubled
 * within, or four arcs cut at the top, the bottom and each side; a doubled
 * ring is one wider ring without the fine marks, as the kit draws it small.
 */
function rimOf(
  kind: OrbRim,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  const radius = ORB.radius * scale.unit;
  const rim = widthOf(ORB.rim, scale);
  const at = radius - rim / 2;
  const color = palette.accent;
  if (kind === "arcs") {
    const gap = fine ? 0.24 : 0.3;
    return Array.from({ length: 4 }, (_, i) => {
      const from = (i / 4) * TURN + gap;
      return stroke(arcPoints(ORIGIN, at, from, from + TURN / 4 - 2 * gap), {
        color,
        width: rim,
      });
    }).flat();
  }
  if (kind === "double" && !fine) {
    return [ring(ORIGIN, radius - rim * 0.85, { color, width: rim * 1.7 })];
  }
  const outer = ring(ORIGIN, at, { color, width: rim });
  if (kind === "ring") return [outer];
  return [
    outer,
    ring(ORIGIN, radius - rim - 0.14 * scale.unit, {
      color,
      width: widthOf(0.08, scale),
    }),
  ];
}

/**
 * Returns a pickup's frame, as the kit's `orbSvg()` draws it but its halo,
 * which the scene shows: a glass ball outlined in the field's color, the
 * glass deeper within it as a fine mark, its rim by its group, its symbol in
 * its ink, the cuts of a symbol drawn in the glass, and the glint on its rim
 * where the field's light falls, with a fine dot of it in the glass.
 */
function orbArt(
  id: PickupId,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): ArtFrame {
  const { unit, pixelRatio } = scale;
  const radius = ORB.radius * unit;
  const rim = widthOf(ORB.rim, scale);
  const colors = orbColors(palette);
  const kind = ORB_RIMS[pickup(id).effect.kind];
  const side = ORB.symbol * unit * SYMBOL_SHARE[kind];
  const square = { x: -side / 2, y: -side / 2, width: side, height: side };
  const inner: readonly DrawCommand[] = fine
    ? [
        circle({ x: 0.07 * radius, y: 0.1 * radius }, 0.74 * radius, {
          color: colors.deep,
        }),
      ]
    : [];
  const dot: readonly DrawCommand[] = fine
    ? [
        circle(
          polar(TURN * 0.615, 0.6 * radius),
          Math.max(0.8 * pixelRatio, 0.07 * unit),
          { color: WHITE, alpha: palette.mode === "light" ? 0.9 : 0.7 },
        ),
      ]
    : [];
  return centered(PICKUP_FRAMES[id], [
    circle(ORIGIN, radius + outlineWidth(scale), { color: palette.outline }),
    circle(ORIGIN, radius, { color: colors.glass }),
    ...inner,
    ...rimOf(kind, palette, scale, fine),
    ...SYMBOLS[id](square, {
      color: colors.ink,
      width: (fine ? 1.3 : 1.5) * pixelRatio,
      ground: { color: colors.glass, width: pixelRatio },
    }),
    ...stroke(arcPoints(ORIGIN, radius - rim / 2, TURN * 0.555, TURN * 0.68), {
      color: colors.glint,
      width: widthOf(ORB.rim * 0.62, scale),
    }),
    ...dot,
  ]);
}

/**
 * Returns the frames of what drifts on the field to be caught, in a palette
 * at a scale, the fine marks only where the field keeps them: each pickup's
 * orb.
 */
export function thingsFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  return PICKUP_IDS.map((id) => orbArt(id, palette, scale, fine));
}

/** Describes how an orb shows at a moment, written for each orb drawn. */
export interface OrbLook {
  /** How large it is drawn against its frame. */
  scale: number;
  /** How opaque it is drawn. */
  alpha: number;
  /** How far its halo reaches from its middle, in field units. */
  haloReach: number;
  /** How strongly its halo shows, before the palette's strength, or 0 for none. */
  haloStrength: number;
}

/** How much an orb swells as it breathes in, its halo widens with it, and its halo strengthens, as the kit has them. */
const ORB_BREATH = { swell: 0.07, widen: 0.1, glow: 0.28 } as const;

/** How strongly an orb's halo shows breathed out, before {@link ORB_BREATH}'s glow. */
const ORB_GLOW = 0.72;

/** How opaque an orb shows while it is dim, blinking off in its last seconds. */
export const ORB_DIM = 0.5;

/** Returns a new record of how an orb shows, at rest, for {@link orbLook} to write. */
export function restingLook(): OrbLook {
  return { scale: 1, alpha: 1, haloReach: ORB.halo, haloStrength: ORB_GLOW };
}

/**
 * Writes how an orb shows at a time, in seconds, its slot's phase on: as it
 * breathes, from out to in, where motion is welcome, else at rest, breathed
 * out; and, in its last seconds, dim for the off half of each blink, with no
 * halo, rather than gone, as the kit draws it.
 */
export function orbLook(
  blinking: boolean,
  seconds: number,
  phase: number,
  motion: boolean,
  into: OrbLook,
): OrbLook {
  const breath = breathShare(seconds, phase, motion);
  const dim = blinking && !blinkShown(seconds);
  into.scale = 1 + ORB_BREATH.swell * breath;
  into.alpha = dim ? ORB_DIM : 1;
  into.haloReach = ORB.halo * (1 + ORB_BREATH.widen * breath) * into.scale;
  into.haloStrength = dim ? 0 : ORB_GLOW + ORB_BREATH.glow * breath;
  return into;
}

/**
 * Writes how a pickup floating on the field shows at a time, in seconds, by
 * its record's slot, each a phase apart, as {@link orbLook} says, so its orb
 * and its halo breathe and blink as one.
 */
export function pickupLook(
  floating: Readonly<Floating>,
  slot: number,
  seconds: number,
  motion: boolean,
  into: OrbLook,
): OrbLook {
  return orbLook(blinks(floating), seconds, slot * GOLDEN_ANGLE, motion, into);
}
