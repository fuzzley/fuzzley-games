// What the player's hands ask of the game, which the picking and the keys
// make of each press and the scene and the shell play, each square in the
// screen's frame.

import type { Square } from "../../rules/board/cells";

/** Describes a move the player makes, which the shell plays: a swap, or a special set off where it stands. */
export type MoveCommand =
  /** Swaps the fuzzball on a square with its neighbor's piece. */
  | { readonly what: "swap"; readonly from: Square; readonly to: Square }
  /** Sets off the special on a square where it stands. */
  | { readonly what: "set-off"; readonly square: Square };

/** Describes what the player asks of the board. */
export type BoardCommand =
  /** Picks up the fuzzball on a square, those that could bunch with it looking its way. */
  | {
      readonly what: "pick-up";
      readonly square: Square;
      /** The fuzzballs that could bunch with it, were it swapped with a neighbor. */
      readonly mates: readonly Square[];
    }
  /** Puts down the fuzzball held on a square. */
  | { readonly what: "put-down"; readonly square: Square }
  | MoveCommand
  /** Moves the ring the keys steer to a square. */
  | { readonly what: "move-ring"; readonly square: Square }
  /** Shows the hint at once. */
  | { readonly what: "hint" };
