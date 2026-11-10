import type { BrickKind } from "../bricks";

/**
 * The kinds of brick Thick walls brings in, levels 28 to 36, in How to play's
 * order: none yet. X3 adds the shell and moss bricks.
 */
export const THICK_WALL_KINDS = {} as const satisfies Readonly<
  Record<string, BrickKind>
>;
