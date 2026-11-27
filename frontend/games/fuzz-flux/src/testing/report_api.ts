// What tools/report-levels.mjs plays, which it loads through Vite: a deal
// of a level played to its end by the casual player and by the careful
// one, with what the design's sketch's report counts of each game, and the
// proof's line on it, all by the game's own rules. The report sets each
// level's moves, stars and deals by them, so this is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import { levelAt } from "@fz/core/levels";
import type { Game } from "../rules/board/board";
import { deal } from "../rules/board/deal";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
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
}

/** Holds what `tools/report-levels.mjs` plays: the levels, and on a level's deal the casual player's game, the careful player's and the proof's line. */
export interface ReportApi {
  /** Every level, in the order played. */
  readonly levels: readonly LevelEntry[];
  /** Returns how the casual player's game on a deal went, its dice rolled from a seed of their own. */
  readonly casual: (deal: ReportDeal, diceSeed: number) => GameFigures;
  /** Returns how the careful player's game on a deal went. */
  readonly careful: (deal: ReportDeal) => CarefulFigures;
  /** Returns the proof's line on a deal, each move in the screen's frame, or null where it finds none. */
  readonly proof: (deal: ReportDeal) => readonly Move[] | null;
}

/** Returns what the report counts of the careful player's game: whether it cleared the level, the moves it used, and each move's waves, the specials made and the shuffles. */
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
  };
}

/** What `tools/report-levels.mjs` plays: the game's levels, each deal dealt and played by the game's own rules. */
export const REPORT_API: ReportApi = {
  levels: LEVELS,
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
