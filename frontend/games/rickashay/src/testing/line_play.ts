// How the game plays a level's line, which @fz/brick-wall's solver searches
// for the levels' certificates and replays to hold them to their levels, and
// its careless player plays (docs/rickashay/design.md, "The guarantee"):
// each shot an aim's index alone, as a certificate keeps it (C14), and each
// round played whole by playRound(). A line found in Node must clear its
// level in every browser, so this is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import { AIM_COUNT, type Aim } from "@fz/brick-wall/rules/aims";
import type { LinePlay } from "@fz/brick-wall/testing/solver";
import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import { WALL_RULES } from "../rules/bricks/wall_rules";
import type { KindId } from "../rules/catalog/kinds";
import type { Round, RoundStart } from "../rules/flight/events";
import type { TraitRules } from "../rules/flight/hooks";
import {
  type Level,
  type LevelEntry,
  parseLevel,
} from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { levelStart } from "../rules/run/run";
import { FLIGHT_RULES, type FlightRules } from "../rules/tuning";
import { wallScore } from "./wall_score";

/**
 * Describes how the game plays a level on a field of a depth, as the
 * library's solver and careless player take it, each round played whole,
 * so a player that reads a flight's rally reads it from the round.
 */
export interface RoundPlay extends LinePlay<KindId, RoundStart, Aim> {
  /** Returns the round an aim plays from where a round starts, throwing a `RangeError` for an aim that isn't one of the 657. */
  readonly play: (start: RoundStart, aim: Aim) => Round;
}

/** Every shot a round can take, by aim, as a certificate keeps one: each aim's index alone, so the solver's every fourth aim is every fourth shot. */
const SHOTS: readonly (readonly Aim[])[] = Array.from(
  { length: AIM_COUNT },
  (_, aim) => [aim],
);

/**
 * Returns how the game plays a level on a field of a depth, through
 * `playRound()` by the rules' numbers and the bricks' trait rules, the
 * game's own unless a spec hands in others: from the level's opening, its
 * rounds measured by `wallScore()`, and its starts told apart by their
 * walls' hits and height, where the fuzzball waits and the hot shot.
 */
export function linePlayOf(
  level: Level,
  depth: number,
  rules: FlightRules = FLIGHT_RULES,
  traits: TraitRules = TRAIT_RULES,
): RoundPlay {
  return {
    opening: levelStart(level, depth),
    shots: SHOTS,
    play: (start, aim) => playRound(start, { aim }, rules, traits),
    keyOf,
    score: wallScore,
    wallRules: WALL_RULES,
  };
}

/** Returns how the game plays one of its levels on a field of a depth, by its own rules, as the library's holders take a level's play. */
export function levelPlayOf(entry: LevelEntry, depth: number): RoundPlay {
  return linePlayOf(parseLevel(entry.data), depth);
}

/** Returns what tells one round's start from another: its wall's hits and height, where the fuzzball waits, and whether the shot is hot. */
function keyOf({ wall, x, hot }: RoundStart): string {
  const hits = wall.bricks.map((brick) => brick?.hits ?? ".").join(",");
  return `${hits}|${String(wall.lowestRow)}|${String(x)}|${String(hot)}`;
}
