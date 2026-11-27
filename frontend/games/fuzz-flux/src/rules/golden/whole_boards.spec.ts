import { createRandom } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import { SIM_TIMEOUT_MS } from "@fz/core/testing";
import { PLAYABLE_LEVELS } from "../../testing/playable_levels";
import { randomGame } from "../../testing/random_games";
import type { Game } from "../board/board";
import { findBunches } from "../bunches/find";
import { ELEMENT_RULES, WIND_RULE } from "../elements/element_rules";
import type { Level } from "../levels/level";
import { settle } from "../move/settle";
import { legalMoves } from "../move/swap";

/** How many random moves are played across the levels' boards, as the sketch's random player made. */
const MOVES = 28_000;

/** The seed of the random player's draws. */
const SEED = 20261127;

// The sketch's own check of its rules, the design's "The sketch" says: a
// random player's moves across the boards of the levels the rules play,
// a level's share each, each move leaving the board whole.
describe(
  "random moves on the levels the rules play",
  { timeout: SIM_TIMEOUT_MS },
  () => {
    it.each(PLAYABLE_LEVELS.map(({ level }, place) => ({ level, place })))(
      "leave each board of level $level.id whole: no bunch standing, a move to make while it plays on, no piece doubled or in a gap, and nothing left to fall",
      ({ level, place }) => {
        const random = createRandom(SEED + place);

        const problems = randomMoves(
          level,
          Math.ceil(MOVES / PLAYABLE_LEVELS.length),
          random,
        );

        expect(problems).toEqual([]);
      },
    );
  },
);

/**
 * Returns what is wrong with the boards that random moves leave, as many as
 * asked, played on a level's deals in turn, a game each: a line for each
 * board, saying which deal and which move left it.
 */
function randomMoves(
  level: Level,
  moves: number,
  random: () => number,
): readonly string[] {
  const problems: string[] = [];
  let checked = 0;
  for (let round = 0; checked < moves; round++) {
    const seed = itemAt(level.deals, round % level.deals.length);
    const game = randomGame(level, seed, random, ELEMENT_RULES, WIND_RULE);
    for (const [move, { played }] of game.slice(0, moves - checked).entries()) {
      const wrong = [
        ...(played.record.swap.refused ? ["its legal move was refused"] : []),
        ...wholeBoardProblems(played.game),
      ];
      problems.push(
        ...wrong.map(
          (problem) =>
            `Deal ${String(seed)}, move ${String(move + 1)}: ${problem}.`,
        ),
      );
      checked++;
    }
  }
  return problems;
}

/** Returns what keeps a game's board from being whole once a move has played: each problem in a few words, none for a whole one. */
function wholeBoardProblems(game: Game): readonly string[] {
  const { open, pieces } = game.board;
  const ids = pieces.flatMap((piece) => (piece === null ? [] : [piece.id]));
  return [
    ...(findBunches(game.board, null).length > 0 ? ["a bunch stands"] : []),
    ...(game.outcome === "playing" &&
    legalMoves(game.board, ELEMENT_RULES).length === 0
      ? ["it plays on with no move to make"]
      : []),
    ...(new Set(ids).size < ids.length ? ["a piece is on two squares"] : []),
    ...(pieces.some((piece, square) => piece !== null && !itemAt(open, square))
      ? ["a piece is in a gap"]
      : []),
    ...(settle(game, ELEMENT_RULES).falls.length > 0
      ? ["something is left to fall"]
      : []),
  ];
}
