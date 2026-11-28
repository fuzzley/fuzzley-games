// What tools/report-levels.mjs plays, which it loads through Vite: a deal
// of a level played to its end by the casual player and by the careful
// one, with what the design's sketch's report counts of each game and what
// each turn of the wind moved, and the proof's line on it, all by the
// game's own rules, and how often each level asks the casual player to
// clear it. The report sets each level's moves, stars and deals by them,
// so this is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import { levelAt } from "@fz/core/levels";
import type { Game } from "../rules/board/board";
import { deal } from "../rules/board/deal";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import type { Gust } from "../rules/move/record";
import { playCarefully } from "./careful";
import { playCasually } from "./casual";
import { seededDice } from "./dice";
import type { Move, PlayedOut } from "./play_out";
import { proofOf } from "./proof";

/** Describes a deal the report plays: its level, by the level's number, the moves it is dealt, and its seed. */
export interface ReportDeal {
  readonly level: number;
  readonly moves: number;
  readonly seed: number;
}

/** Describes how a player's game on a deal went. */
export interface GameFigures {
  readonly cleared: boolean;
  /** How many of the moves it was dealt it used. */
  readonly used: number;
}

/** Describes how the careful player's game on a deal went, and what its moves were made of. */
export interface CarefulFigures extends GameFigures {
  /** How many waves each of its moves played, in the order played, the wind's after it left out. */
  readonly waves: readonly number[];
  /** How many specials the bunches of its moves' waves made, all told. */
  readonly specials: number;
  /** How many of its moves ended in a shuffle. */
  readonly shuffles: number;
  /** How many pieces, fuzzballs and sleepyheads, fell, rolled or came in in the fall each turn of the wind after its moves starts with, in the order played. */
  readonly gusts: readonly number[];
}

/** Holds what `tools/report-levels.mjs` plays: the levels and what each asks, and on a level's deal the casual player's games, the careful player's and the proof's line. */
export interface ReportApi {
  /** Every level, in the order played. */
  readonly levels: readonly LevelEntry[];
  /** Returns how many times in 100 the casual player should clear a level, by its number. */
  readonly asked: (level: number) => number;
  /** Returns the casual player's games on a deal, {@link CASUAL_GAMES} of them, each rolling dice of its own. */
  readonly casualGames: (deal: ReportDeal) => readonly GameFigures[];
  /** Returns how the casual player's game on a deal went, its dice rolled from a seed of their own. */
  readonly casual: (deal: ReportDeal, diceSeed: number) => GameFigures;
  /** Returns how the careful player's game on a deal went. */
  readonly careful: (deal: ReportDeal) => CarefulFigures;
  /** Returns the proof's line on a deal, each move in the screen's frame, or null where it finds none. */
  readonly proof: (deal: ReportDeal) => readonly Move[] | null;
}

/** How many games the casual player plays on each deal the report plays. */
const CASUAL_GAMES = 16;

/**
 * How many times in 100 the casual player should clear each level of a
 * set, first to last, by the set's id: what the level's moves are set to
 * give, the design's sketch's asks.
 */
export const CLEARS_ASKED: Readonly<Record<string, readonly number[]>> = {
  "warm-up": [99, 99, 98, 98, 98, 95, 92, 92, 80],
  "bricks-and-bars": [92, 86, 80, 90, 84, 76, 80, 74, 60],
  bedtime: [90, 80, 74, 86, 76, 74, 70, 70, 55],
  "windy-days": [90, 80, 80, 74, 70, 68, 70, 64, 50],
};

/**
 * Returns how many times in 100 the casual player should clear a level, as
 * its place in its set asks.
 *
 * @throws {Error} for a level of a set that asks nothing of it.
 */
export function askOf({ number, set, data }: LevelEntry): number {
  const asked = CLEARS_ASKED[set.id]?.[set.levels.indexOf(data)];
  if (asked === undefined) {
    throw new Error(
      `Level ${String(number)}'s set, "${set.id}", asks nothing of it.`,
    );
  }
  return asked;
}

/**
 * Returns the seed of the dice the casual player rolls in a game on a
 * deal, by the deal's seed and the game's place among its games, from 0,
 * as the sketch's report seeds them, so the games are the sketch's.
 */
function casualDiceOf(seed: number, game: number): number {
  return seed * 1000 + game + 17;
}

/** Returns what the report counts of the careful player's game: whether it cleared the level, the moves it used, each move's waves, the specials made, the shuffles, and what each turn of the wind moved. */
export function carefulFiguresOf({
  cleared,
  used,
  records,
}: Pick<PlayedOut, "cleared" | "used" | "records">): CarefulFigures {
  const bunches = records.flatMap((record) =>
    record.waves.flatMap((wave) => wave.bunches),
  );
  return {
    cleared,
    used,
    waves: records.map((record) => record.waves.length),
    specials: bunches.filter((bunch) => bunch.makes !== null).length,
    shuffles: records.filter((record) => record.shuffle !== null).length,
    gusts: records.flatMap(({ gust }) =>
      gust === null ? [] : [movedBy(gust)],
    ),
  };
}

/** Returns how many pieces a turn of the wind moved: those that fell, rolled or came in in the fall it starts with, its gust's wave 0. */
function movedBy({ waves }: Gust): number {
  return waves
    .filter(({ number }) => number === 0)
    .flatMap(({ falls }) => falls).length;
}

/** What `tools/report-levels.mjs` plays: the game's levels, each deal dealt and played by the game's own rules. */
export const REPORT_API: ReportApi = {
  levels: LEVELS,
  asked: (level) => askOf(levelAt(LEVELS, level)),
  casualGames: (dealt) =>
    Array.from({ length: CASUAL_GAMES }, (_, game) =>
      REPORT_API.casual(dealt, casualDiceOf(dealt.seed, game)),
    ),
  casual: (dealt, diceSeed) => {
    const { cleared, used } = playCasually(
      gameOf(dealt),
      seededDice(diceSeed),
      ELEMENT_RULES,
      WIND_RULE,
    );
    return { cleared, used };
  },
  careful: (dealt) =>
    carefulFiguresOf(playCarefully(gameOf(dealt), ELEMENT_RULES, WIND_RULE)),
  proof: (dealt) => proofOf(gameOf(dealt), ELEMENT_RULES, WIND_RULE),
};

/** Returns the opening game of a deal the report plays, by the game's own rules. */
function gameOf({ level, moves, seed }: ReportDeal): Game {
  return deal({ ...levelAt(LEVELS, level).data, moves }, seed, ELEMENT_RULES);
}
