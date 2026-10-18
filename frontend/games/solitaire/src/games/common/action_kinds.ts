import { AppliedMoveKind } from "@/engine/tableau/moves/move";

/**
 * Names the actions games commit outside the normal move path, so a game that
 * counts its recycles reads the same name it records them under.
 */
export const ActionKind = {
  /** Cards turned from a stock. */
  DRAW: "draw",
  /** A waste turned back over onto its stock. */
  RECYCLE: "recycle",
  /** A row dealt from the stock onto the columns. */
  DEAL: "deal",
  /** The cards left in play gathered, shuffled and dealt out again. */
  REDEAL: "redeal",
  /** A grid closed up and refilled, as in Monte Carlo. */
  CONSOLIDATE: "consolidate",
} as const satisfies Record<string, AppliedMoveKind>;
