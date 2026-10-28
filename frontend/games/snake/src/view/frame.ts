import type { Run } from "../rules/run";

/** Describes the board between one step and the next. */
export interface SnakeFrame {
  /** The run on the board, as of its last step. */
  readonly run: Run;
  /**
   * How far the board is from the last step to the next, from 0 to 1; always
   * 0 when the snake steps rather than glides.
   */
  readonly progress: number;
  /** Whether the run, once it has ended, set a new best. */
  readonly newBest: boolean;
}
