// How each tuft of a fluff flies, as the sketch throws them: out from its
// place at a speed and a way of its own and a little up, slowing fast and
// drifting down as it sways, spinning, thinning and fading over a life of
// its own. Each tuft's numbers are drawn from `hashOf()` by its fluff and
// its place in it, and where it is is worked out from the time since it
// flew, so a frame is a time, the same on every run and at any frame rate.

import { hashOf, hashShareOf } from "@fz/core/random";
import type { FeelTuning } from "../timeline/feel";
import type { Effect } from "../timeline/timeline";

/** A fluff of tufts as an effect. */
export type Fluff = Extract<Effect, { readonly what: "fluff" }>;

/**
 * Describes a tuft as it flies: where it is, in squares, how far it is
 * turned, how long and how wide it is drawn, each a share of the tuft's
 * frame, which is the largest tuft, how opaque it is, and whether it is of
 * the frizzball's color rather than its fluff's.
 */
export interface TuftFlight {
  x: number;
  y: number;
  rotation: number;
  length: number;
  width: number;
  alpha: number;
  frizzy: boolean;
}

/** What each of a tuft's draws from `hashShareOf()` is for, as its second number. */
const DRAWS = {
  way: 1,
  speed: 2,
  spin: 3,
  width: 4,
  length: 5,
  life: 6,
} as const satisfies Readonly<Record<string, number>>;

/** How many parts of a square a fluff's place is counted to, as its draws are seeded by it. */
const PLACE_PARTS = 64;

/** How fast a tuft flies out at the least, in squares a second at a fluff's power of 1, and how much faster it may. */
const SPEED = { least: 0.7, spread: 1.9 } as const;

/** How fast a tuft flies up as it sets out, in squares a second, on top of its way. */
const LIFT = 0.5;

/** How much of its speed a tuft loses a second, as fluff is light. */
const DRAG = 3.2;

/** How fast a tuft falls, in squares a second each second, against its drag. */
const FALL = 1.1;

/** How far a tuft sways across, in squares a second, and how long its sway takes to turn a radian. */
const SWAY = { squares: 0.2, radianMs: 90 } as const;

/** The most a tuft spins, either way, in radians a second. */
const SPIN = 4.5;

/** How long and how wide a tuft is at the least, in squares, and how much more it may be: its frame is drawn at the most. */
const SIZE = {
  length: { least: 0.08, spread: 0.1 },
  width: { least: 0.045, spread: 0.05 },
} as const;

/** How much of its width a tuft loses over its life. */
const THINNING = 0.5;

/** How many of a fluff's tufts in turn hold one of the frizzball's color, the first of them. */
const FRIZZY_EVERY = 3;

/**
 * Writes where a tuft of a fluff is a time after it flew into a record,
 * and returns whether it still flies then, its life not yet over.
 *
 * @param index The tuft's place among its fluff's.
 */
export function tuftAt(
  fluff: Fluff,
  index: number,
  sinceMs: number,
  feel: FeelTuning,
  into: TuftFlight,
): boolean {
  const seed = hashOf(
    fluff.atMs,
    Math.round(fluff.at.x * PLACE_PARTS),
    Math.round(fluff.at.y * PLACE_PARTS),
    index,
  );
  const lifeMs =
    feel.tuftLifeMs + drawOf(seed, DRAWS.life) * feel.tuftLifeSpreadMs;
  if (sinceMs >= lifeMs) return false;
  const way = drawOf(seed, DRAWS.way) * 2 * Math.PI;
  const speed =
    (SPEED.least + drawOf(seed, DRAWS.speed) * SPEED.spread) * fluff.power;
  const spin = (2 * drawOf(seed, DRAWS.spin) - 1) * SPIN;
  const seconds = sinceMs / 1000;
  const slowed = (1 - Math.exp(-DRAG * seconds)) / DRAG;
  const drift = FALL / DRAG;
  // The sketch sways a tuft by its turn as well as its age, so the faster
  // it spins, the faster it sways.
  const swayRate = 1000 / SWAY.radianMs + spin;
  into.x =
    fluff.at.x +
    Math.cos(way) * speed * slowed +
    (SWAY.squares / swayRate) *
      (Math.cos(way) - Math.cos(swayRate * seconds + way));
  into.y =
    fluff.at.y +
    drift * seconds +
    (Math.sin(way) * speed - LIFT - drift) * slowed;
  into.rotation = way + spin * seconds;
  const life = sinceMs / lifeMs;
  into.length =
    (SIZE.length.least + drawOf(seed, DRAWS.length) * SIZE.length.spread) /
    (SIZE.length.least + SIZE.length.spread);
  into.width =
    ((SIZE.width.least + drawOf(seed, DRAWS.width) * SIZE.width.spread) *
      (1 - THINNING * life)) /
    (SIZE.width.least + SIZE.width.spread);
  into.alpha = Math.min(1, (1 - life) * feel.looseBitFade);
  into.frizzy = index % FRIZZY_EVERY === 0;
  return true;
}

/** Returns a share from 0 up to 1 for a tuft, by its seed and what the draw is for, the same every time. */
function drawOf(seed: number, what: number): number {
  return hashShareOf(seed, what, 0, 0);
}
