// What a fuzzball's strike does to a brick and to the fuzzball, as plan.md's
// "Charge" says. fly() strikes the bricks a fuzzball meets at one moment in the
// order cast() lists them, faces before corners, each from the floor up and
// then left to right, as C1 says, so each strike spends the charge the one
// before it left.

import type { Struck } from "../flight/hooks";

/** Describes what a fuzzball's strike did to a brick and to the fuzzball. */
export interface Strike {
  /** The hits it took off the brick: none where the brick's rules shield it. */
  readonly took: number;
  /** The hits the brick has left: 0 once it breaks, or for one that never does. */
  readonly left: number;
  /** The fuzzball's charge after it. */
  readonly charge: number;
  /** Whether the brick took the fuzzball's charge. */
  readonly earthed: boolean;
  /** Whether the fuzzball flies on through where the brick stood, unturned: a charged fuzzball that broke it and wasn't earthed. */
  readonly passes: boolean;
}

/**
 * Returns what a fuzzball's strike does to a brick with `hits` left, once the
 * brick's rules have said whether it hurts the brick and whether the brick
 * earths the charge.
 *
 * A hot shot keeps its charge whatever it strikes, so no rule that earths
 * need ask whether the fuzzball is one.
 */
export function strike(hits: number, struck: Readonly<Struck>): Strike {
  const { charge, hot, hurts, earths } = struck;
  const took = hurts ? Math.min(charge > 0 ? charge : 1, hits) : 0;
  const left = hits - took;
  const earthed = earths && charge > 0 && !hot;
  return {
    took,
    left,
    charge: hot ? charge : earthed ? 0 : charge - Math.min(charge, took),
    earthed,
    passes: took > 0 && left === 0 && charge > 0 && !earthed,
  };
}
