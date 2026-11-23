// The guide a shot shows as it is aimed: the start of the round's own
// flight, flown by fly() as playRound() flies it, so it never shows what
// the shot won't do, and stopped a little past its first, third or fifth
// turn (C13). It shows each place the fuzzball turns, each brick it
// strikes, and a floor bounce in hand spent off the floor, as the flight
// spends it.
//
// It keeps nothing between aims: fly() keeps the field it casts through
// for each wall and depth, so only a wall's first guide builds it, and its
// caller casts the guide again only as the aim, the start or the hot shot
// changes.

import { TRAIT_RULES } from "../bricks/trait_rules";
import type { Shot } from "../shot";
import type { FlightRules } from "../tuning";
import type { BallTrack, FlightEvent, RoundStart } from "./events";
import { fly } from "./flight";
import type { TraitRules } from "./hooks";

/** Describes the guide a shot shows as it is aimed: its flight from the release to where the guide ends. */
export interface Guide {
  /** The fuzzball's path, from where it waits to where the guide ends. */
  readonly track: BallTrack;
  /** What happens on the way, as `Flight.events` orders it: each turn, at its place, each strike, and the rest. */
  readonly events: readonly FlightEvent[];
  /** Where the guide ends, in units flown: `FlightRules.guidePast` past its last turn, or at the landing, where the fuzzball lands first. */
  readonly length: number;
}

/**
 * Returns the guide of a shot from where a round starts: its flight, flown
 * as `playRound()` flies it, to `rules.guidePast` past its `turns`th turn,
 * or to its landing where it lands first.
 *
 * `turns`, a whole number from 1, is 1 or 5 where the player's setting
 * asks for the first turn or the fifth, and `rules.guideTurns`, the third,
 * where it doesn't. It throws a `RangeError` for an aim that isn't one of
 * the 657.
 */
export function guideOf(
  start: RoundStart,
  shot: Shot,
  rules: FlightRules,
  turns: number = rules.guideTurns,
  traits: TraitRules = TRAIT_RULES,
): Guide {
  const { flight } = fly(start, shot, rules, traits, {
    turn: turns,
    past: rules.guidePast,
  });
  return { track: flight.track, events: flight.events, length: flight.length };
}
