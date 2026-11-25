// The look the view writes into a lock in the wall it draws, as its tint,
// which the lock's art (`kinds/lock.ts`) draws it by: kept apart from the
// art, so that the view's playback, in the game's main chunk, takes none of
// the art the scene's chunk holds.

import type { BOLTS } from "./frames";

/**
 * The most bolts a lock has: as many as `frames.ts`' `BOLTS` lists, which
 * run from 1, as its type holds it, written out, since importing the list
 * itself would bring all of `frames.ts` into the main chunk.
 */
const MOST_BOLTS: (typeof BOLTS)["length"] = 3;

/**
 * How much a lock's tint rises for each of its bolts the flight has drawn
 * back: one more than the most bolts a lock has, so its bolts are what its
 * tint leaves over it.
 */
const BOLT_STEP = MOST_BOLTS + 1;

/** Returns the bolts a lock has, from its tint, as the rules give it or as the view writes it. */
export function lockBolts(tint: number): number {
  return tint % BOLT_STEP;
}

/** Returns how many of a lock's bolts the view shows drawn back, from its tint: none in a wall the rules make. */
export function boltsBack(tint: number): number {
  return Math.floor(tint / BOLT_STEP);
}

/**
 * Returns the tint the view gives a lock with a tint once a flight has
 * drawn bolts back: its bolts, and {@link BOLT_STEP} for each bolt drawn
 * back, as many as it has at most, so a lock of fewer bolts than are drawn
 * shows open.
 */
export function lockTint(tint: number, drawn: number): number {
  const bolts = lockBolts(tint);
  return bolts + BOLT_STEP * Math.min(bolts, drawn);
}
