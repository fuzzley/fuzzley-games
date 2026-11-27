// What tools/certify-levels.mjs certifies the levels through, which each
// thread of its pool loads through Vite (docs/rickashay/design.md, "The
// guarantee", checks 1 and 6): for a level on a depth, the library's
// solver's line, replayed before it is handed back, and the level's rally
// mark there, set by the careless player's floor games, with the line that
// reaches it. Both lines must replay alike in every browser, so this is
// held as the rules are (eslint.config.js), to their fence and their exact
// arithmetic.

import type { Aim } from "@fz/brick-wall/rules/aims";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { parFrom } from "@fz/brick-wall/rules/par";
import {
  type PlayedCarelessly,
  playCarelessly,
} from "@fz/brick-wall/testing/careless";
import {
  type Line,
  type Search,
  lineHolds,
  replayLine,
  solveLine,
} from "@fz/brick-wall/testing/solver";
import { levelAt } from "@fz/core/levels";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { PAR_SHARE } from "../rules/tuning";
import { type RoundPlay, levelPlayOf } from "./line_play";
import { type RallyMark, rallyMarkFrom } from "./rally_mark";

/**
 * How many of the careless player's games set a level's rally mark on a
 * depth, and how far apart two levels' seeds stand: the floor's own games,
 * as `@fz/brick-wall/testing/holders` plays them (`FLOOR_SEEDS` and
 * `SEED_STRIDE`), which `certify_api.spec.ts` holds equal. The holders
 * import Vitest, which nothing a script loads may.
 */
export const MARK_GAMES = { count: 20, seedStride: 1000 } as const;

/** Describes a level certified on a depth: the solver's line, how widely it searched, and the level's rally mark there with the line that reaches it. */
export interface MarkedLine {
  /** The certificate: the aim of each round, by its index alone (C14). */
  readonly line: Line<Aim>;
  /** How widely the solver searched for it. */
  readonly search: Search;
  /** The level's rally mark on the depth, and the line that reaches it. */
  readonly rally: RallyMark;
}

/**
 * Holds what `tools/certify-levels.mjs` certifies the levels through: the
 * levels, the depths, a level certified on a depth and the par a line earns.
 *
 * `tools/certify-levels.spec.ts` holds it to `@fz/dev/certify`'s
 * `CertifyApi`, the pool's.
 */
export interface CertifyApi {
  /** Every level, in the order played. */
  readonly levels: readonly LevelEntry[];
  /** Every depth a field has, shallowest first. */
  readonly depths: readonly number[];
  /** Returns a level's line on a field of a depth, by the level's number, with its rally mark there, or null where the solver finds no line. */
  readonly solve: (level: number, depth: number) => MarkedLine | null;
  /** Returns a level's par on a depth from the rounds of its certificate there. */
  readonly parFrom: (rounds: number) => number;
}

/**
 * Returns the careless player's games that set a level's rally mark on the
 * play's depth, by the level's number: {@link MARK_GAMES}' count of them,
 * from seeds of the level's own, its number times their stride and on, the
 * games its floor is held over.
 */
export function markGames(
  play: RoundPlay,
  level: number,
): readonly PlayedCarelessly<Aim>[] {
  const { count, seedStride } = MARK_GAMES;
  return Array.from({ length: count }, (_, game) =>
    playCarelessly(play, level * seedStride + game),
  );
}

/**
 * Returns a level certified on the play's depth: the solver's line and its
 * search, and the rally mark the careless player's games handed in set, with
 * the line that reaches it; or null where the solver finds no line, and no
 * game is replayed.
 *
 * It throws where the solver's line doesn't hold on its replay, as a
 * certificate the specs would refuse.
 */
export function certifiedOn(
  play: RoundPlay,
  games: () => readonly Pick<PlayedCarelessly<Aim>, "line">[],
): MarkedLine | null {
  const solved = solveLine(play);
  if (solved === null) {
    return null;
  }
  const { line, search } = solved;
  if (!lineHolds(line, replayLine(play, line))) {
    throw new Error(
      `The solver's line, ${JSON.stringify(line)}, doesn't hold on its replay.`,
    );
  }
  return { line, search, rally: rallyMarkFrom(play, games()) };
}

/**
 * What `tools/certify-levels.mjs` certifies through: the levels, the depths,
 * each level certified on a depth through the game's own play of it, and
 * the par a line earns at `PAR_SHARE`.
 */
export const CERTIFY_API: CertifyApi = {
  levels: LEVELS,
  depths: DEPTHS,
  solve: (level, depth) => {
    const play = levelPlayOf(levelAt(LEVELS, level), depth);
    return certifiedOn(play, () => markGames(play, level));
  },
  parFrom: (rounds) => parFrom(rounds, PAR_SHARE),
};
