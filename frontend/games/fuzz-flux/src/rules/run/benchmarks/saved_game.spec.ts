import { levelsOf } from "@fz/core/levels";
import { createRandom } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import { SIM_TIMEOUT_MS, quantile, sortedTimes } from "@fz/core/testing";
import { DESIGN_SETS, designSet } from "../../../testing/design_files";
import { DESIGN_PARTS, DESIGN_WIND } from "../../../testing/made_up_rules";
import { randomGame } from "../../../testing/random_games";
import { type Level, levelSetOf } from "../../levels/level";
import { type SavedGame, readSavedGame } from "../saved_game";

/** How many moves each saved game holds: a long game, at the sketch's 99th percentile. */
const MOVES = 33;

/** The most a saved game may take to read back, in milliseconds: well over the sketch's, which reads 33 moves, its 99th percentile, in under 15 ms. */
const MOST_MS = 50;

/** How many times each saved game is read and timed, after one that warms the code up. */
const ROUNDS = 3;

/** The rules the levels are played by: the specs' made-up elements and wind, which play every golden game as the sketch does. */
const RULES = { elements: DESIGN_PARTS, wind: DESIGN_WIND };

/** Returns a level with moves enough for a long game, and a goal no game of them meets. */
function lengthened(level: Level): Level {
  const kind = itemAt(level.kinds, 0);
  return {
    ...level,
    moves: 99,
    goals: [{ what: "gather", kind, count: 9999 }],
  };
}

/** Every level of the four sets, lengthened, in the order they are played. */
const LEVELS = levelsOf(
  DESIGN_SETS.map((name) => {
    const set = levelSetOf(designSet(name));
    return { ...set, levels: set.levels.map(lengthened) };
  }),
);

/** Returns a saved game of a long random game on each level's first deal. */
function longGames(): readonly SavedGame[] {
  const random = createRandom(2026);
  return LEVELS.map(({ data }) => {
    const seed = itemAt(data.deals, 0);
    const game = randomGame(data, seed, random, RULES.elements, RULES.wind);
    const moves = game
      .slice(0, MOVES)
      .map(({ from, to }) => [from, to] as const);
    return { level: data.id, deal: seed, moves };
  });
}

/** Returns the median time a saved game takes to read back, in milliseconds, over the rounds after the first. */
function readTime(saved: SavedGame): number {
  const times: number[] = [];
  for (let round = 0; round <= ROUNDS; round++) {
    const before = performance.now();
    readSavedGame(saved, LEVELS, RULES);
    if (round > 0) times.push(performance.now() - before);
  }
  return quantile(sortedTimes(times), 0.5);
}

// Held to the plan's generous bound, since a runner times nothing alike
// twice, at each level's median read, so one slow round fails nothing.
describe("readSavedGame's time", { timeout: SIM_TIMEOUT_MS }, () => {
  it(`is timed on games of ${String(MOVES)} moves on every level, each read back`, () => {
    const games = longGames();

    expect(
      games.filter(
        (saved) =>
          saved.moves.length !== MOVES ||
          readSavedGame(saved, LEVELS, RULES) === null,
      ),
    ).toEqual([]);
  });

  it(`is ${String(MOST_MS)} ms or less for ${String(MOVES)} moves on every level`, () => {
    const games = longGames();

    const slowest = Math.max(...games.map(readTime));

    console.log(
      `readSavedGame(): ${slowest.toFixed(2)} ms at the slowest of ${String(LEVELS.length)} levels, each the median of ${String(ROUNDS)} reads of ${String(MOVES)} moves`,
    );
    expect(slowest).toBeLessThanOrEqual(MOST_MS);
  });
});
