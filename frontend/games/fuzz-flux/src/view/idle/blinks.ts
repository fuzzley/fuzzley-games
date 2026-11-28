// A fuzzball's blinks between moves and through them: each blinks every
// so often, at moments its id and the time choose through
// `hashShareOf()`, so a frame is a time, the board blinks alike on every
// run, and no two fuzzballs keep step.

import { hashShareOf } from "@fz/core/random";
import type { FeelTuning } from "../timeline/feel";
import type { Sampled } from "../timeline/timeline";

/** What each draw a fuzzball's blinks take from `hashShareOf()` is for, as its third number. */
const DRAWS = {
  /** Where its stretches of time start, apart from every other fuzzball's. */
  start: 0,
  /** When in a stretch it blinks. */
  moment: 1,
} as const satisfies Readonly<Record<string, number>>;

/** Writes a sampled fuzzball's eyes shut into its record, where they rest open at a moment on the scene's clock and it is in one of its blinks, and returns the record. */
export function blinkAt(feel: FeelTuning, ms: number, into: Sampled): Sampled {
  const piece = into.drawn;
  if (
    into.face === "rest" &&
    piece?.what === "fuzzball" &&
    blinks(piece.id, feel, ms)
  ) {
    into.face = "blink";
  }
  return into;
}

/**
 * Returns whether a fuzzball's eyes are shut at a moment: by its blink in
 * the stretch of its own time the moment falls in, or by one run on from
 * the stretch before.
 *
 * Each stretch lasts halfway between the feel's least and most times
 * between blinks, and its blink comes within half their difference of its
 * start, so two blinks in turn lie from that least to that most apart.
 */
function blinks(id: number, feel: FeelTuning, ms: number): boolean {
  const stretchMs = stretchMsOf(feel);
  const sinceMs = ms + shareOf(id, 0, DRAWS.start) * stretchMs;
  const stretch = Math.floor(sinceMs / stretchMs);
  return (
    shutBy(id, stretch, sinceMs, feel) || shutBy(id, stretch - 1, sinceMs, feel)
  );
}

/** Returns whether a fuzzball's eyes are shut, a time into its own time, by its blink in a stretch of it. */
function shutBy(
  id: number,
  stretch: number,
  sinceMs: number,
  feel: FeelTuning,
): boolean {
  // The debug menu may set the least past the most.
  const spreadMs = Math.abs(feel.blinkMostMs - feel.blinkLeastMs) / 2;
  const blinkMs =
    stretch * stretchMsOf(feel) + shareOf(id, stretch, DRAWS.moment) * spreadMs;
  return sinceMs >= blinkMs && sinceMs < blinkMs + feel.blinkMs;
}

/** Returns how long each stretch of a fuzzball's time lasts, in which it blinks once. */
function stretchMsOf(feel: FeelTuning): number {
  return (feel.blinkLeastMs + feel.blinkMostMs) / 2;
}

/** Returns a share from 0 up to 1 for a fuzzball, a stretch of its time and what the draw is for, the same every time. */
function shareOf(id: number, stretch: number, draw: number): number {
  return hashShareOf(id, stretch, draw, 0);
}
