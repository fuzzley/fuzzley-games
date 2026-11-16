// How a volatile rock's blast looks over its time, as the kit's `blastFx()`
// draws it, in `art/lib/fx.mjs`: a flash, a ring sweeping out to its reach
// with a soft outside and a hot inner edge, and embers thrown; and, where
// motion isn't welcome, one still ring at its reach.

import { easeOutCubic, lerp, shareDone } from "@fz/core/math";
import { createRandom } from "@fz/core/random";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { energyOf } from "../art/energy";
import { around } from "../art/rocks/space";
import { type FieldEvent, rockSizeOf } from "../field/frame";
import { BLAST_FLASH_MS, BLAST_MS, BLAST_RING_MS } from "./timing";

/** White, which a dark palette's hot edge is mixed toward. */
const WHITE = 0xffffff;

/** How many embers a blast throws. */
export const BLAST_EMBERS = 12;

/** How many shapes of embers there are, which blasts take by their serials in turn. */
export const EMBER_SHAPES = 8;

/** How many tones an ember fades through, from its hot middle to its body. */
export const EMBER_TONES = 4;

/** Describes the colors a blast is drawn in, in a palette. */
export interface BlastInks {
  /** The ring's middle, and the still ring: the volatile rock's ink. */
  readonly ink: number;
  /** The ring's inner edge and the flash's disc. */
  readonly hot: number;
  /** The ring's soft outside, the flash's glow and the light the rocks nearby take. */
  readonly soft: number;
  /** An ember's streak. */
  readonly ember: number;
  /** An ember's head, from hot to its streak's tone as it flies, {@link EMBER_TONES} of them. */
  readonly emberHeads: readonly number[];
}

/**
 * Returns the colors a blast is drawn in, in a palette, as the kit's are:
 * on a light field its hot edge the rock's core toward its ink, and its
 * light the ink; on a dark one its hot edge the core toward white, and its
 * light the ink a little toward the core, which stays warm over a blue
 * field; its embers in the warning color's energy.
 */
export function blastInks(
  palette: Pick<BeltPalette, "mode" | "rocks" | "core" | "flame" | "shot">,
): BlastInks {
  const ink = palette.rocks.volatile;
  const light = palette.mode === "light";
  const { hot, body } = energyOf(palette.flame, palette);
  return {
    ink,
    hot: light
      ? mixTone(palette.core, ink, 0.3)
      : mixTone(palette.core, WHITE, 0.6),
    soft: light ? ink : mixTone(ink, palette.core, 0.3),
    ember: body,
    emberHeads: Array.from({ length: EMBER_TONES }, (_, i) =>
      mixTone(hot, body, i / (EMBER_TONES - 1)),
    ),
  };
}

/**
 * Returns how far a blast's ring has swept from its rock's middle, in field
 * units, a time after it went off, in milliseconds: from just inside its
 * rock to its reach, fast, then slowing.
 */
export function blastRingAt(
  sinceMs: number,
  radius: number,
  reach: number,
): number {
  return lerp(
    0.9 * radius,
    reach,
    easeOutCubic(shareDone(0, sinceMs, BLAST_RING_MS)),
  );
}

/** Returns how far through its sweep a blast's ring is, a time after it went off, from 0 to 1. */
export function blastSwept(sinceMs: number): number {
  return shareDone(0, sinceMs, BLAST_RING_MS);
}

/** Returns how wide a blast's ring's band is, in field units, a share through its sweep: wide, then thin. */
export function blastBand(swept: number): number {
  return lerp(0.75, 0.16, swept);
}

/** Returns how far a blast's flash has faded, a time after it went off, from 0 to 1. */
export function blastFlashed(sinceMs: number): number {
  return shareDone(0, sinceMs, BLAST_FLASH_MS);
}

/** How much fainter a blast's soft bands show on a light field, where they would tint it heavily. */
const LIGHT_SOFT = 0.75;

/**
 * Describes one of the lines a blast's ring is drawn in: how far out from
 * the ring's middle it lies and how wide it is, each in bands, how opaque
 * it starts, and its tone, which says its color and how it fades.
 */
export interface BlastLine {
  readonly out: number;
  readonly width: number;
  readonly alpha: number;
  readonly tone: "soft" | "ink" | "hot";
}

/**
 * The lines a blast's ring is drawn in, outside in, as the kit's are: its
 * soft outside in two bands, stepping down so it reads as light and not
 * as a rim, its middle in the rock's ink, and its hot inner edge.
 */
export const BLAST_LINES: readonly BlastLine[] = [
  { out: 0.7, width: 2.4, alpha: 0.12, tone: "soft" },
  { out: 0.3, width: 1.3, alpha: 0.26, tone: "soft" },
  { out: 0, width: 1, alpha: 0.9, tone: "ink" },
  { out: -0.32, width: 0.36, alpha: 1, tone: "hot" },
];

/**
 * Returns how opaque one of a blast's ring's lines is, a share through its
 * sweep, in a palette's mode: the soft bands fading as it sweeps, fainter
 * on a light field; its middle holding, then going; its hot edge fading.
 */
export function blastLineAlpha(
  { alpha, tone }: BlastLine,
  swept: number,
  mode: BeltPalette["mode"],
): number {
  switch (tone) {
    case "soft":
      return alpha * (1 - swept) * (mode === "light" ? LIGHT_SOFT : 1);
    case "ink":
      return alpha * (1 - swept * swept);
    case "hot":
      return alpha * (1 - swept);
  }
}

/** Returns how opaque the ground a blast's ring has swept is lit, a share through its sweep. */
export function sweptAlpha(swept: number): number {
  return 0.08 * (1 - swept);
}

/** Describes a blast's flash's disc: how far it reaches, in its rock's radii, and how opaque it is. */
export interface BlastDisc {
  reach: number;
  alpha: number;
}

/**
 * Writes a blast's flash's disc a time after it went off, in milliseconds,
 * into a record and returns it, or returns null once its flash has faded:
 * a little past its rock, growing and fading fast.
 */
export function blastDiscAt(
  sinceMs: number,
  into: BlastDisc,
): BlastDisc | null {
  const flashed = blastFlashed(sinceMs);
  if (flashed >= 1) return null;
  into.reach = 1.25 + 0.85 * flashed;
  into.alpha = 0.95 * (1 - flashed) ** 1.5;
  return into;
}

/** How far a blast's flash glows, in its rock's radii. */
export const FLASH_GLOW = 2.7;

/**
 * How a blast's embers are drawn: each streak's width, in field units, and
 * at least in pixels, and how opaque it is against its head; and each
 * head's least radius, in pixels.
 */
export const EMBER_LOOK = {
  streak: 0.1,
  leastStreak: 1,
  streakAlpha: 0.55,
  leastHead: 0.9,
} as const;

/**
 * How a blast's still ring is drawn where motion isn't welcome: how wide,
 * in field units, and at least in pixels, and how opaque.
 */
export const STILL_RING = { width: 0.16, least: 1.5, alpha: 0.8 } as const;

/** Returns whether a blast still shows a time after it went off. */
export function blastShows(sinceMs: number): boolean {
  return sinceMs >= 0 && sinceMs < BLAST_MS;
}

/** Describes an ember a blast throws: the way it flies, how far as a share of the blast's reach, and when it starts and how long it flies. */
export interface Ember {
  readonly angle: number;
  readonly far: number;
  readonly delayMs: number;
  readonly lifeMs: number;
}

/** Each shape of a blast's embers, made once. */
const EMBERS: readonly (readonly Ember[])[] = Array.from(
  { length: EMBER_SHAPES },
  (_, shape) => {
    const random = createRandom(733 * (shape + 1) + 4);
    return Array.from({ length: BLAST_EMBERS }, (__, i) => {
      const angle =
        ((i + lerp(-0.35, 0.35, random())) / BLAST_EMBERS) * 2 * Math.PI;
      const far = lerp(0.55, 1.05, random());
      const delayMs = lerp(0, 50, random());
      // Each ember is out within the blast's time.
      const lifeMs = lerp(400, BLAST_MS - delayMs, random());
      return { angle, far, delayMs, lifeMs };
    });
  },
);

/** Returns the embers a blast throws, the shape its serial picks, so blasts in a row throw theirs apart. */
export function embersOf(serial: number): readonly Ember[] {
  return around(EMBERS, serial);
}

/** Describes an ember as it flies: how far its head and its tail are from the blast's middle, how large its head is and how opaque, and its tone. */
export interface EmberShown {
  head: number;
  tail: number;
  size: number;
  alpha: number;
  tone: number;
}

/**
 * Writes an ember as it flies a time after its blast went off, in
 * milliseconds, into a record and returns it, in field units from its
 * rock's middle, or returns null before it starts or once it is out: thrown
 * from inside its rock out to its share of the reach, fast, then slowing,
 * its streak shortening behind it, its head shrinking and fading through
 * its tones.
 */
export function emberAt(
  ember: Readonly<Ember>,
  sinceMs: number,
  radius: number,
  reach: number,
  into: EmberShown,
): EmberShown | null {
  const done = (sinceMs - ember.delayMs) / ember.lifeMs;
  if (!(done >= 0 && done < 1)) return null;
  into.head = lerp(0.5 * radius, ember.far * reach, easeOutCubic(done));
  into.tail = into.head - 0.55 * (1 - done);
  into.size = 0.13 * (1 - 0.5 * done);
  into.alpha = 1 - done * done;
  into.tone = Math.min(EMBER_TONES - 1, Math.floor(done * EMBER_TONES));
  return into;
}

/**
 * How a blast lights the rocks near it, through their normal maps: how far
 * its light reaches past the blast's reach and how high over the field it
 * stands, as shares of the reach, and how strong it is as it goes off,
 * fading as its ring sweeps out.
 */
export const BLAST_LIGHT = {
  reach: 1.3,
  height: 0.4,
  strength: 2,
} as const;

/** Returns how strongly a blast's light shows, a share through its ring's sweep: all of it as it goes off, dying away. */
export function blastLightShare(swept: number): number {
  return (1 - swept) ** 2;
}

/**
 * Returns how large the heart a blast goes off from is, in field units: a
 * volatile rock's own radius, and a vent's a small one's, as it vents from
 * a set piece's heart rather than the whole rock going off.
 *
 * @throws {RangeError} For a blast that names no rock's size.
 */
export function blastRadiusOf(event: Readonly<FieldEvent>): number {
  return event.kind === "vented"
    ? ROCK_RADIUS.small
    : ROCK_RADIUS[rockSizeOf(event)];
}
