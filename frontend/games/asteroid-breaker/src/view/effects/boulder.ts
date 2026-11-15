// How a boulder's break looks over its three beats, as the kit's
// `boulderFx()` draws them, in `art/lib/fx.mjs`: its cracks flare from its
// middle to its rim while the field holds still, it comes apart in the
// break every rock has, and a ring is thrown out from it with its pieces.

import { easeOutCubic, lerp, shareDone } from "@fz/core/math";
import { createRandom } from "@fz/core/random";
import type { Point } from "@fz/phaser/shapes";
import { ROCK_KIND_IDS, rockKind } from "../../rules/catalog/rocks";
import { ROCK_OUTLINES } from "../../rules/rocks/rocks";
import { rockShape } from "../art/rock_art";
import { around } from "../art/rocks/space";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { BOULDER_HOLD_MS, BOULDER_THROW_MS } from "./timing";

/** White, which a dark palette's hot cracks are mixed toward. */
const WHITE = 0xffffff;

/** How many cracks a boulder splits along: one for each of the three large rocks it breaks into. */
export const BOULDER_CRACKS = 3;

/** How many shapes of cracks there are, which boulders take by their serials. */
const CRACK_SHAPES = 8;

/** How many points each crack runs through, from the boulder's middle to its rim. */
const CRACK_POINTS = 4;

/** How long a boulder's cracks take to fade once the field moves on, in milliseconds. */
const CRACK_FADE_MS = 170;

/** How long a boulder's glow takes to fade once the field moves on, in milliseconds. */
const GLOW_FADE_MS = 120;

/** Describes the colors a boulder's break is drawn in, in a palette. */
export interface BoulderInks {
  /** The cracks' soft outside and the boulder's glow. */
  readonly glow: number;
  /** The cracks' middle and the ring thrown out. */
  readonly core: number;
  /** The cracks' hot middle line. */
  readonly hot: number;
}

/**
 * Returns the colors a boulder's break is drawn in, as the kit's are: its
 * glow in the warning color on a light field and the rock's core on a dark
 * one, and its cracks' hot line the core toward the volatile rock's ink on
 * a light field and toward white on a dark one.
 */
export function boulderInks(
  palette: Pick<BeltPalette, "mode" | "rocks" | "core" | "flame">,
): BoulderInks {
  const light = palette.mode === "light";
  return {
    glow: light ? palette.flame : palette.core,
    core: palette.core,
    hot: light
      ? mixTone(palette.core, palette.rocks.volatile, 0.35)
      : mixTone(palette.core, WHITE, 0.55),
  };
}

/** Returns how far a point lies from the nearest of a segment's points. */
function distanceToSegment(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const along = Math.min(
    1,
    Math.max(0, -(a.x * dx + a.y * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(a.x + along * dx, a.y + along * dy);
}

/**
 * How far a boulder's cracks run from its middle, in its radii: to the
 * nearest its rim comes, of every outline of every kind that comes as a
 * boulder, so no crack runs past the rock it splits, whichever outline it
 * was drawn in, which its break's event doesn't say.
 */
export const CRACK_REACH = Math.min(
  ...ROCK_KIND_IDS.flatMap((kind) =>
    rockKind(kind).hits.boulder === undefined
      ? []
      : Array.from({ length: ROCK_OUTLINES }, (_, outline) => {
          const shape = rockShape({ kind, size: "boulder", outline });
          return Math.min(
            ...shape.outline.map((corner, i) =>
              distanceToSegment(corner, around(shape.outline, i + 1)),
            ),
          );
        }),
  ),
);

/** Each shape of a boulder's cracks, made once: its three cracks, each from near its middle to its rim, in shares of its radius. */
const CRACKS: readonly (readonly (readonly Point[])[])[] = Array.from(
  { length: CRACK_SHAPES },
  (_, shape) => {
    const random = createRandom(389 * (shape + 1) + 1);
    const first = random() * 2 * Math.PI;
    const middle = {
      x: lerp(-0.08, 0.08, random()),
      y: lerp(-0.08, 0.08, random()),
    };
    return Array.from({ length: BOULDER_CRACKS }, (__, i) => {
      const angle =
        first +
        (i / BOULDER_CRACKS) * 2 * Math.PI +
        lerp(-0.22, 0.22, random());
      const rim = {
        x: CRACK_REACH * Math.cos(angle),
        y: CRACK_REACH * Math.sin(angle),
      };
      return Array.from({ length: CRACK_POINTS }, (___, k) => {
        const along = k / (CRACK_POINTS - 1);
        // Each point between the ends steps aside from the line between them.
        const aside =
          k === 0 || k === CRACK_POINTS - 1 ? 0 : lerp(-0.13, 0.13, random());
        return {
          x: lerp(middle.x, rim.x, along) - rim.y * aside,
          y: lerp(middle.y, rim.y, along) + rim.x * aside,
        };
      });
    });
  },
);

/** Returns the cracks a boulder splits along, the shape its serial picks, so boulders in a row split theirs apart. */
export function cracksOf(serial: number): readonly (readonly Point[])[] {
  return around(CRACKS, serial);
}

/** Returns how far a boulder's cracks have run from its middle to its rim a time after it broke, from 0 to 1: fast, then slowing, while the field holds still. */
export function crackFlare(sinceMs: number): number {
  return easeOutCubic(shareDone(0, sinceMs, BOULDER_HOLD_MS));
}

/** Returns how much of a boulder's cracks still shows a time after it broke, from 1 to 0 as they fade once the field moves on. */
export function crackFade(sinceMs: number): number {
  return 1 - shareDone(BOULDER_HOLD_MS, sinceMs, CRACK_FADE_MS);
}

/**
 * Describes one of the lines a boulder's cracks are drawn in, as the kit's
 * are: how wide, in its radii, and at least in pixels, how opaque, and its
 * tone, which says its color and whether it flares in as the cracks run.
 */
export interface CrackLine {
  readonly width: number;
  readonly least: number;
  readonly alpha: number;
  readonly tone: keyof BoulderInks;
}

/** The lines a boulder's cracks are drawn in, widest first: a soft line in its glow, a line in the core and a hot line down its middle. */
export const CRACK_LINES: readonly CrackLine[] = [
  { width: 0.11, least: 3, alpha: 0.32, tone: "glow" },
  { width: 0.05, least: 2, alpha: 0.9, tone: "core" },
  { width: 0.022, least: 1, alpha: 1, tone: "hot" },
];

/** Returns how opaque one of a boulder's cracks' lines is a time after it broke: its soft line flaring in as they run, and each fading once the field moves on. */
export function crackLineAlpha(
  { alpha, tone }: CrackLine,
  sinceMs: number,
): number {
  const flare = tone === "glow" ? crackFlare(sinceMs) : 1;
  return sinceMs < 0 ? 0 : alpha * flare * crackFade(sinceMs);
}

/**
 * How the ring a boulder throws is drawn: how wide as it starts, in field
 * units, and at least in pixels, and how opaque, each thinning and fading
 * as it goes.
 */
export const THROWN_RING = { width: 0.2, least: 1, alpha: 0.7 } as const;

/** Describes a boulder's glow: how far it reaches, in the boulder's radii, and how strongly it shows. */
export interface BoulderGlow {
  reach: number;
  strength: number;
}

/**
 * Writes a boulder's glow a time after it broke, in milliseconds, into a
 * record and returns it: growing as its cracks flare, then wide and fading
 * as its pieces are thrown.
 */
export function boulderGlowAt(sinceMs: number, into: BoulderGlow): BoulderGlow {
  if (sinceMs < BOULDER_HOLD_MS) {
    const flare = crackFlare(sinceMs);
    into.reach = 0.5 + 0.8 * flare;
    into.strength = 0.75 * flare;
    return into;
  }
  const faded = shareDone(BOULDER_HOLD_MS, sinceMs, GLOW_FADE_MS);
  into.reach = 1.6;
  into.strength = 0.9 * (1 - faded);
  return into;
}

/** Returns how far through its throw a boulder's ring is, a time after it broke, from 0 to 1, or null before or after it. */
export function thrownShare(sinceMs: number): number | null {
  const thrown = (sinceMs - BOULDER_HOLD_MS) / BOULDER_THROW_MS;
  return thrown >= 0 && thrown < 1 ? thrown : null;
}

/** Returns how far a boulder's thrown ring reaches, in its radii, a share through its throw. */
export function thrownReach(thrown: number): number {
  return 1 + 1.1 * easeOutCubic(thrown);
}

/** Returns whether a boulder's break still shows a time after it broke. */
export function boulderShows(sinceMs: number): boolean {
  return sinceMs >= 0 && sinceMs < BOULDER_HOLD_MS + BOULDER_THROW_MS;
}
