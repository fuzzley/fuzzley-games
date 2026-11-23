// What tools/report-levels.mjs plays, which it and each thread of its pool
// load through Vite: the figures of the design's table of the drafts
// (docs/rickashay/design.md, "The drafts"), a level's on a depth at a time,
// played as the specs play them from the seeds the script hands in, so a
// level that falls short of a check can be judged and redrawn. It is loaded
// by a script beside the solver and the players, so it is held as the rules
// are (eslint.config.js), to their fence and their exact arithmetic.

import { DEPTHS } from "@fz/brick-wall/rules/field";
import { isNeeded } from "@fz/brick-wall/rules/wall";
import { playCarelessly } from "@fz/brick-wall/testing/careless";
import { solveLine } from "@fz/brick-wall/testing/solver";
import { WALL_RULES } from "../rules/bricks/wall_rules";
import type { Brick } from "../rules/catalog/kinds";
import {
  LEVELS,
  type LevelEntry,
  levelEntryOf,
  parseLevel,
} from "../rules/levels/levels";
import { BLIND_CEILING, playBlind } from "./blind";
import { CARELESS_FLOORS, type RoundPlay, levelPlayOf } from "./line_play";
import { ralliesOf } from "./rally_mark";
import { LEAST_SWEET_SPOT, sweetSpotOf } from "./sweet_spot";

/** Describes a level's wall in the figures of the design's table: its rows, the bricks it needs broken, and their hits. */
export interface WallFigures {
  readonly rows: number;
  readonly bricks: number;
  readonly hits: number;
}

/** Describes how a level plays on a depth, over the careless player's games and the blind player's from the same seeds. */
export interface DepthFigures {
  /** The rounds of the solver's line, or null where it finds none. */
  readonly rounds: number | null;
  /** How many of the careless player's games cleared the level. */
  readonly cleared: number;
  /** The rounds of the games it cleared, all told. */
  readonly clearedRounds: number;
  /** The longest rally of each of its games, game by game. */
  readonly bests: readonly number[];
  /** How many of the blind player's games cleared the level. */
  readonly blind: number;
  /** The level's sweet spot as it opens, in degrees. */
  readonly sweetSpot: number;
}

/** Holds what `tools/report-levels.mjs` plays: the levels, the depths, the checks a level is held to, a wall's figures and a level's on a depth. */
export interface ReportApi {
  /** Every level, in the order played. */
  readonly levels: readonly LevelEntry[];
  /** Every depth a field has, shallowest first. */
  readonly depths: readonly number[];
  /** The times in 100 the careless player must clear each level of a set, by the set's id. */
  readonly floors: Readonly<Record<string, number>>;
  /** The most times in 100 aims drawn blind may clear a level. */
  readonly blindCeiling: number;
  /** The narrowest sweet spot a level may leave, in degrees. */
  readonly leastSweetSpot: number;
  /** Returns a level's wall in figures, by the level's number. */
  readonly wallOf: (level: number) => WallFigures;
  /** Returns how a level plays on a field of a depth, by its number, over so many games of each player's from a first seed on. */
  readonly figuresOf: (
    level: number,
    depth: number,
    firstSeed: number,
    games: number,
  ) => DepthFigures;
}

/** Returns a level's wall in figures: its rows, and the bricks it needs broken with their hits. */
export function wallFiguresOf(entry: LevelEntry): WallFigures {
  const needed = parseLevel(entry.data).bricks.filter(
    (brick): brick is Brick => brick !== null && isNeeded(brick, WALL_RULES),
  );
  return {
    rows: entry.data.bricks.length,
    bricks: needed.length,
    hits: needed.reduce((sum, brick) => sum + brick.hits, 0),
  };
}

/**
 * Returns how a level plays on the play's depth: the solver's line; so
 * many of the careless player's games, and of the blind player's, each
 * from the seeds from the first handed in on; and its sweet spot.
 */
export function figuresOfPlay(
  play: RoundPlay,
  firstSeed: number,
  games: number,
): DepthFigures {
  const seeds = Array.from({ length: games }, (_, game) => firstSeed + game);
  const careless = seeds.map((seed) => playCarelessly(play, seed));
  const won = careless.filter(({ cleared }) => cleared);
  return {
    rounds: solveLine(play)?.line.length ?? null,
    cleared: won.length,
    clearedRounds: won.reduce((sum, { rounds }) => sum + rounds, 0),
    bests: careless.map(({ line }) => bestRally(ralliesOf(play, line))),
    blind: seeds.filter((seed) => playBlind(play, seed).cleared).length,
    sweetSpot: sweetSpotOf(play),
  };
}

/** Returns the longest of a game's rallies. */
function bestRally(rallies: readonly number[]): number {
  return rallies.reduce((best, rally) => Math.max(best, rally), 0);
}

/** What `tools/report-levels.mjs` plays: the game's levels on every depth, held to its floors, its blind ceiling and its least sweet spot. */
export const REPORT_API: ReportApi = {
  levels: LEVELS,
  depths: DEPTHS,
  floors: CARELESS_FLOORS,
  blindCeiling: BLIND_CEILING,
  leastSweetSpot: LEAST_SWEET_SPOT,
  wallOf: (level) => wallFiguresOf(levelEntryOf(LEVELS, level)),
  figuresOf: (level, depth, firstSeed, games) =>
    figuresOfPlay(
      levelPlayOf(levelEntryOf(LEVELS, level), depth),
      firstSeed,
      games,
    ),
};
