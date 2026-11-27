// The squares a puffer strikes going off: every square within its reach,
// a ring a step, struck from itself outward.

import type { Board } from "../board/board";
import type { Strike } from "../move/record";
import { wholeBoardStrikes } from "./strikes";

/** Returns the squares a puffer going off on a square strikes, every one within so many steps of it, nearest first. */
export function pufferStrikes(
  board: Pick<Board, "width" | "open">,
  square: number,
  reach: number,
): readonly Strike[] {
  return wholeBoardStrikes(board, square).filter(({ step }) => step <= reach);
}
