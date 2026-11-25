// A round, from the shot's release to where the next starts: its one flight,
// flown whole by fly(); the wall it leaves lowered by @fz/brick-wall's
// lowerWall() by WALL_RULES, its moss grown back first; what it came to;
// and the next round's start, where the fuzzball landed, the shot hot after
// a jump.

import { isCleared, lowerWall } from "@fz/brick-wall/rules/wall";
import { TRAIT_RULES } from "../bricks/trait_rules";
import { WALL_RULES } from "../bricks/wall_rules";
import type { Wall } from "../catalog/kinds";
import type {
  FlightEvent,
  Round,
  RoundResult,
  RoundStart,
} from "../flight/events";
import { fly } from "../flight/flight";
import type { TraitRules } from "../flight/hooks";
import { roundPoints } from "../run/scoring";
import type { Shot } from "../shot";
import type { FlightRules } from "../tuning";

/**
 * Returns the round a shot plays from where it starts: its whole flight,
 * decided as it is released, by the rules' numbers and the bricks' trait
 * rules, the game's own unless a spec hands in others; what it came to;
 * and where the next round starts.
 *
 * It changes nothing it is handed. It throws a `RangeError` for an aim
 * that isn't one of the 657.
 */
export function playRound(
  start: RoundStart,
  shot: Shot,
  rules: FlightRules,
  traits: TraitRules = TRAIT_RULES,
): Round {
  const { flight, wall } = fly(start, shot, rules, traits);
  const lowered = lowerWall(wall, start.depth, WALL_RULES);
  const { rally, events } = flight;
  const { jumped, rowsDown } = lowered;
  const earned = events.filter(
    (event) => event.kind === "bounce-earned" && event.kept,
  ).length;
  return {
    flight,
    outcome: {
      rally,
      broken: events.filter((event) => event.kind === "strike" && event.broke)
        .length,
      earned,
      jumped,
      rowsDown,
      result: resultOf(wall, lowered.lost),
      points: roundPoints({ rally, earned, jumped }),
    },
    next: {
      wall: lowered.wall,
      depth: start.depth,
      x: landingOf(events, start.x),
      hot: jumped,
    },
  };
}

/** Returns how a round leaves its level, from the wall its flight left and whether coming down lost it: cleared once no brick it needs is left. */
function resultOf(wall: Wall, lost: boolean): RoundResult {
  if (isCleared(wall, WALL_RULES)) {
    return "cleared";
  }
  return lost ? "lost" : "on";
}

/** Returns where a flight's fuzzball waits once it lands, from where it waited before: its landing's place. */
function landingOf(events: readonly FlightEvent[], waited: number): number {
  let x = waited;
  for (const event of events) {
    if (event.kind === "land") {
      x = event.x;
    }
  }
  return x;
}
