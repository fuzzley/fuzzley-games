// Levels made up for the shell's specs, each on one small board whose every
// square is drawn, so how its first move plays is known whatever the deal:
// the swap that lines up 3 blue clears the first, runs the second out of
// moves and leaves the third in play with 5 moves left, the third
// teaching that swap with the hand, as a level that brings something new
// does; and the fourth deals a puffer in its top left corner.

import { levelsOf } from "@fz/core/levels";
import { levelSetOf } from "../rules/levels/level";
import type { LevelEntry } from "../rules/levels/levels";
import type { Move } from "../rules/run/saved_game";

/**
 * The board every level is played on, 5 squares across and 5 down, with no
 * 3 of a kind in a line, and blue 3 in a row once the amber in the middle
 * and the blue right of it are swapped.
 */
const BOARD = ["rgarg", "garga", "bbabr", "argag", "rgarg"];

/** The swap that lines up 3 blue across the middle row: its amber, then the blue right of it. */
export const BLUE_LINE: Move = { from: 12, to: 13 };

/** A swap of two neighbors that lines up nothing, which the rules refuse. */
export const REFUSED: Move = { from: 0, to: 1 };

/** The square of the fourth level's puffer, its top left corner. */
export const PUFFER = 0;

/** Returns a level of the set, by its number, on the board, with what is its own. */
function smallLevel(
  id: number,
  name: string,
  own: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return {
    id,
    set: "small",
    name,
    idea: "A board for the shell's specs.",
    kinds: ["blue", "red", "amber", "green"],
    board: BOARD,
    deals: [1, 2, 3],
    stars: [0, 2, 4],
    ...own,
  };
}

/** The levels, in the order they are played. */
export const SMALL_LEVELS: readonly LevelEntry[] = levelsOf([
  levelSetOf({
    id: "small",
    name: "Small",
    about: "Levels for the shell's specs.",
    levels: [
      smallLevel(1, "Quick clear", {
        moves: 5,
        goals: [{ type: "gather", kind: "blue", count: 3 }],
      }),
      smallLevel(2, "Last move", {
        moves: 1,
        goals: [{ type: "gather", kind: "blue", count: 20 }],
      }),
      smallLevel(3, "Show me", {
        brings: "bunch",
        moves: 6,
        goals: [
          { type: "gather", kind: "blue", count: 20 },
          { type: "gather", kind: "red", count: 20 },
        ],
        hint: [
          [2, 2],
          [3, 2],
        ],
      }),
      smallLevel(4, "Puff", {
        moves: 10,
        goals: [{ type: "gather", kind: "red", count: 20 }],
        specials: [{ x: 0, y: 0, kind: "red", sp: "puff" }],
      }),
    ],
  }),
]);
