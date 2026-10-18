import { Adjacency } from "./adjacency";
import { buildsOn } from "./builds";
import { GrabRule } from "./grab";
import {
  PlacementContext,
  PlacementRule,
  all,
  byEmptiness,
  maxStackSize,
} from "./placement";

/** Describes a column whose cards build, and lift, in runs. */
export interface RunColumnOptions {
  /**
   * Whether `upper` may sit directly on `lower`: what a card landing on the
   * column and a run lifted off it both follow.
   */
  readonly adjacent: Adjacency;
  /** What an empty column takes. */
  readonly whenEmpty: PlacementRule;
  /**
   * How many cards may move at once in the current position, or undefined
   * for no limit.
   */
  readonly maxStack?: (context: PlacementContext) => number;
}

/** Holds what a column accepts and what may be lifted from it. */
export interface ColumnRules {
  readonly accept: PlacementRule;
  readonly grab: GrabRule;
}

/**
 * Returns a column's build and grab rules from one adjacency, so a run a player
 * can lift is always one they could land.
 */
export function runColumn(options: RunColumnOptions): ColumnRules {
  const build = byEmptiness(options.whenEmpty, buildsOn(options.adjacent));
  return {
    accept: options.maxStack
      ? all(build, maxStackSize(options.maxStack))
      : build,
    grab: { kind: "run", adjacent: options.adjacent },
  };
}
