// How a piece looks as it stands, before a move's keys move it: at its
// place, at its size, its fur at rest and grown in, and its eyes in the
// face it rests with.

import type { FuzzballFace } from "@fz/style/fuzzball";
import type { Piece } from "../../rules/catalog/pieces";
import type { Look, Place } from "./timeline";

/**
 * Returns how a sprite looks as it stands still at a place: at its size,
 * unfaded, its fur at rest and its second fur grown in, its eyes ahead,
 * and no higher than the board's other sprites.
 */
export function lookAt({ x, y }: Place): Look {
  return {
    x,
    y,
    leanX: 0,
    leanY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    fade: 0,
    lift: 0,
    lookX: 0,
    lookY: 0,
    glow: 0,
    furIn: 1,
    raise: 0,
    wobble: 0,
  };
}

/**
 * Returns the face a piece rests with: the frizzball's wide, a caged
 * fuzzball's sleepy as it looks out, a burred one's cross, and any
 * other's at rest, as a sleepyhead's and a brick's are, which no face
 * draws.
 */
export function restingFace(piece: Piece): FuzzballFace {
  switch (piece.what) {
    case "frizzball":
      return "eep";
    case "fuzzball":
      if (piece.caged) return "sleepy";
      return piece.burred ? "cross" : "rest";
    case "sleepyhead":
    case "brick":
      return "rest";
  }
}

/**
 * How far above the board's other sprites a sprite draws, by what it is
 * doing, each the sketch's: the order sprites draw in, not a number the
 * feel tunes.
 */
export const RAISED = {
  /** A fuzzball picked up. */
  held: 1,
  /** One on the move as the rest stand still: swapped from, hopping off or running in. */
  moving: 2,
  /** A special just made. */
  made: 3,
  /** A sleepyhead put to bed, from the fall that brings it there, over what falls into its square behind it. */
  bedded: 3,
  /** A dasher or a puffer going off. */
  goingOff: 4,
  /** A frizzball going off, a wisp's copy in flight, or the hint's hand, over all the rest. */
  top: 5,
} as const satisfies Readonly<Record<string, number>>;
