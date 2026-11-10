import type { BrickKind } from "../bricks";

/**
 * The kinds of brick Tricks brings in, levels 19 to 27, in How to play's
 * order: none yet. X2 adds the bumper, the prism, the portal and the plated brick.
 */
export const TRICKS_KINDS = {} as const satisfies Readonly<
  Record<string, BrickKind>
>;
