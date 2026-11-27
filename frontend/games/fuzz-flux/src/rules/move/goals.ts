// What a move counts toward its goals as it plays: a fuzzball gathered
// counts toward each goal that gathers its kind, and an element's change
// toward each goal of that element's. A goal counts on below 0, met all
// the same.

import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import type { ElementGoalId, Goal } from "../catalog/goals";
import type { KindId } from "../catalog/kinds";

/** Describes something a move takes that a goal can count: a fuzzball of a kind gathered, or one of an element's goal. */
export type Taken =
  | { readonly what: "gather"; readonly kind: KindId }
  | { readonly what: ElementGoalId };

/** Returns what each goal of a game still needs once something is taken, one less for each goal that counts it. */
export function countedOff(
  game: Pick<Game, "goals" | "goalsLeft">,
  taken: Taken,
): readonly number[] {
  return game.goalsLeft.map((left, place) =>
    counts(itemAt(game.goals, place), taken) ? left - 1 : left,
  );
}

/** Returns whether a goal counts something taken. */
function counts(goal: Goal, taken: Taken): boolean {
  return goal.what === "gather"
    ? taken.what === "gather" && taken.kind === goal.kind
    : taken.what === goal.what;
}
