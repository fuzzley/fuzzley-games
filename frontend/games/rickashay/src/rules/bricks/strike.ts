// What a strike does to a brick of the first three kinds: the brick and the
// tough brick, which only take hits, a strike taking one and a hot shot's
// more, and steel, which a fuzzball turns off without a strike. What a
// strike does to each other kind, such as a plated face's or a shut lock's
// taking nothing, is its traits' rules'.

import { type KindId, kindOf } from "../catalog/kinds";
import { type FlightRules, STRIKE_HITS } from "../tuning";

/** Describes what a strike did to a brick. */
export interface Strike {
  /** The hits it took off the brick. */
  readonly took: number;
  /** The hits the brick has left: 0 once it breaks. */
  readonly left: number;
}

/**
 * Returns whether a turn off a brick of a kind can strike it: one off a
 * kind that breaks can, where its traits' rules don't shield it as a
 * plated face and a shut lock do, turn by turn; one off a kind that never
 * breaks, such as steel, never does.
 */
export function takesStrikes(kind: KindId): boolean {
  return kindOf(kind).hits !== "never";
}

/**
 * Returns what a strike does to a brick with hits left: it takes a hit, or
 * a hot shot's strike `hotHits`, and never more than the brick has.
 */
export function strike(
  hits: number,
  hot: boolean,
  rules: Pick<FlightRules, "hotHits">,
): Strike {
  const took = Math.min(hot ? rules.hotHits : STRIKE_HITS, hits);
  return { took, left: hits - took };
}
