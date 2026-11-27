// Where a wisp flies: to the square that most helps a goal still open, by
// the design's order. Each element's rule says what a square it bears on
// is worth, the first by its rank that does; a square no element weighs
// is worth what its fuzzball is, more for a kind a goal still gathers.

import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import { squareOf } from "../board/cells";
import { ELEMENT_IDS, type ElementId } from "../catalog/elements";
import { SALTS } from "../draws";
import type { ElementRule, WispAim } from "../elements/element_rule";
import { stillCounts } from "../move/goals";
import {
  WISP_FUZZBALL_WORTH,
  WISP_WANTED_WORTH,
  WISP_TIE_DRAWS,
} from "../tuning";
import { stepsApart } from "./strikes";

/** Describes a square as a wisp weighs it. */
interface Weighed {
  readonly square: number;
  readonly worth: number;
  /** Its steps across and down from the wisp. */
  readonly far: number;
  readonly draw: number;
}

/** Describes an element's aim, its place in the elements' order, and whether its goal is still open. */
interface Aim extends WispAim {
  readonly place: number;
  readonly goalOpen: boolean;
}

/**
 * Returns the square a wisp going off on a square flies to: the one worth
 * the most, then the farthest, then the one the draw puts first, then the
 * first by index; or null where no square is worth anything to it.
 *
 * @param game The game as the wave has struck it so far, its goals as
 *   they stand and its moves played not yet counting the move.
 * @param passedOver Whether a square is out of the wisp's choosing: one a
 *   wisp of the wave flew to already, or whose piece the wave gathered.
 */
export function wispTarget(
  game: Pick<Game, "board" | "goals" | "goalsLeft" | "seed" | "movesPlayed">,
  from: number,
  passedOver: (square: number) => boolean,
  rules: Readonly<Record<ElementId, ElementRule>>,
): number | null {
  const { board } = game;
  const aims = aimsOf(game, rules);
  const at = squareOf(from, board.width);
  let best: Weighed | null = null;
  for (const [square, open] of board.open.entries()) {
    if (!open || square === from || passedOver(square)) {
      continue;
    }
    const worth = worthOf(game, square, aims);
    if (worth <= 0) {
      continue;
    }
    const weighed = {
      square,
      worth,
      far: stepsApart(squareOf(square, board.width), at),
      draw:
        hashOf(game.seed, game.movesPlayed, square, SALTS.wisp) %
        WISP_TIE_DRAWS,
    };
    if (best === null || outweighs(weighed, best)) {
      best = weighed;
    }
  }
  return best?.square ?? null;
}

/** Returns what a square is worth to a wisp. */
function worthOf(
  game: Pick<Game, "board" | "goals" | "goalsLeft">,
  square: number,
  aims: readonly Aim[],
): number {
  for (const aim of aims) {
    const worth = aim.worth(game.board, square, aim.goalOpen);
    if (worth !== null) {
      return worth;
    }
  }
  const piece = itemAt(game.board.pieces, square);
  if (piece?.what !== "fuzzball") {
    return 0;
  }
  return stillCounts(game, { what: "gather", kind: piece.kind })
    ? WISP_WANTED_WORTH
    : WISP_FUZZBALL_WORTH;
}

/** Returns whether a square weighs more to a wisp than another. */
function outweighs(square: Weighed, than: Weighed): boolean {
  if (square.worth !== than.worth) {
    return square.worth > than.worth;
  }
  if (square.far !== than.far) {
    return square.far > than.far;
  }
  return square.draw > than.draw;
}

/** Returns the aims of the elements that weigh a square, by rank and then in the elements' order. */
function aimsOf(
  game: Pick<Game, "goals" | "goalsLeft">,
  rules: Readonly<Record<ElementId, ElementRule>>,
): readonly Aim[] {
  return ELEMENT_IDS.flatMap((element, place) => {
    const { wisp, goal } = rules[element];
    if (wisp === undefined) {
      return [];
    }
    const goalOpen = goal !== undefined && stillCounts(game, { what: goal.id });
    return [{ ...wisp, place, goalOpen }];
  }).sort((a, b) => a.rank - b.rank || a.place - b.place);
}
