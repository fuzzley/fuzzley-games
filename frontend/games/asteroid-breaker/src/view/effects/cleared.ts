// How a wave's clearing looks as its last rock goes, as the kit's
// `clearedFx()` draws it, in `art/lib/fx.mjs`: after a moment, which the
// flourishes are slowed for at a sector's last rock, as
// `flourish_clock.ts` keeps them, one calm ring crosses the whole field
// from where the last rock went.

import { lerp, shareDone } from "@fz/core/math";
import type { Torus } from "../../rules/torus";
import { WAVE_RING_MS } from "./timing";

/**
 * How the wave's ring is drawn, as the kit's: its soft outside, how far
 * inside the ring and how wide, in field units, and how opaque; and its
 * line, how wide in field units, and at least in pixels, and how opaque.
 */
export const WAVE_RING = {
  softIn: 0.6,
  softWidth: 2.4,
  softAlpha: 0.14,
  width: 0.16,
  least: 1.2,
  alpha: 0.7,
} as const;

/** Returns how far a place lies from a field's farthest corner, in field units, which the wave's ring crosses to. */
export function farthestCorner(
  x: number,
  y: number,
  { width, height }: Readonly<Torus>,
): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

/** Describes the wave's ring at a moment: how far it has crossed, in field units, and how much of it still shows. */
export interface WaveRing {
  radius: number;
  shown: number;
}

/**
 * Writes the wave's ring a time after it starts, in milliseconds, out to a
 * reach, into a record and returns it, or returns null before it starts or
 * once it is gone: crossing evenly, so it reads as calm, and fading.
 */
export function waveRingAt(
  sinceMs: number,
  reach: number,
  into: WaveRing,
): WaveRing | null {
  if (sinceMs < 0 || sinceMs >= WAVE_RING_MS) return null;
  const done = shareDone(0, sinceMs, WAVE_RING_MS);
  into.radius = lerp(1.5, reach, (done * (2 - done)) / 2 + done / 2);
  into.shown = 1 - done ** 2;
  return into;
}
