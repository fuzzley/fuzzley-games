import type { BrickKind } from "../bricks";

/**
 * The kinds of brick Sparks brings in, levels 10 to 18, in How to play's
 * order: none yet. X1 adds the bomb, the cross and X zappers, wool and the cage.
 */
export const SPARKS_KINDS = {} as const satisfies Readonly<
  Record<string, BrickKind>
>;
