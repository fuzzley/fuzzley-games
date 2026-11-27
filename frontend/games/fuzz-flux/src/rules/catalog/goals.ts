import type { ElementId } from "./elements";
import type { KindId } from "./kinds";

/**
 * Every kind of goal: gather so many fuzzballs of a kind, or clear every
 * one of an element on the board, each named for its element.
 */
export const GOAL_IDS = [
  "gather",
  "dust",
  "brick",
  "cage",
  "sleepyhead",
] as const satisfies readonly ("gather" | ElementId)[];

/** A kind of goal, such as "cage". */
export type GoalId = (typeof GOAL_IDS)[number];

/** A goal an element counts for: every dusty square, brick, cage or sleepyhead on the board. */
export type ElementGoalId = Exclude<GoalId, "gather">;

/** Describes a goal of a level, as its file sets it. */
export type Goal =
  | {
      readonly what: "gather";
      readonly kind: KindId;
      /** How many to gather. */
      readonly count: number;
    }
  /** Every one of an element the board is dealt, so many as the deal finds: of dust, a layer each. */
  | { readonly what: ElementGoalId };
