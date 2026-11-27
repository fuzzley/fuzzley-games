// The frames a piece is drawn in, as a move's timeline names the piece:
// its body in the fur it wears and as its fur stands, its eyes in a face,
// where they sit on it and how far they shift as it looks, and what it
// wears behind it and over it.

import { recordOf } from "@fz/core/records";
import { type FuzzballFace, lookOffset, restingLook } from "@fz/style/fuzzball";
import { KIND_IDS } from "../../rules/catalog/kinds";
import type { Piece } from "../../rules/catalog/pieces";
import { BURRED_SCALE } from "./elements/burr";
import { EYES_GRID, EYES_LOOK, type EyesSeat, eyesSeatOf } from "./eyes";
import { FRAMES, type FrameName, type Fur, type Lift } from "./frame_names";
import { FRIZZBALL_EYES_SEAT } from "./frizzball";

/** Where the eyes sit of a piece that wears none of a face's: a sleepyhead, whose shut eyes are its body's own, and a brick, which has none. At its square's middle, at a fuzzball's size. */
const MIDDLE_SEAT: EyesSeat = { x: 0, y: 0, scale: 1 };

/** Returns the fur a piece's body wears: a special's second fur, or its own alone. */
export function furOf(piece: Piece): Fur {
  return piece.what === "fuzzball" ? (piece.special ?? "plain") : "plain";
}

/**
 * Returns the frame a piece's body is drawn in: a fuzzball's in a fur, as
 * its fur stands; the frizzball's, whose fur stands on end for good; a
 * sleepyhead's; or a brick's, by the layers it has left.
 */
export function bodyFrameOf(piece: Piece, fur: Fur, lift: Lift): FrameName {
  switch (piece.what) {
    case "fuzzball":
      return FRAMES.body(piece.kind, fur, lift);
    case "frizzball":
      return FRAMES.frizzball;
    case "sleepyhead":
      return FRAMES.sleepyhead;
    case "brick":
      return FRAMES.brick(piece.layers);
  }
}

/** Returns whether a piece's body has a frame with its fur on end, as a fuzzball's has. */
export function standsOnEnd(piece: Piece): boolean {
  return piece.what === "fuzzball";
}

/** Returns the frame a piece's eyes are drawn in, in a face: the frizzball's own and a fuzzball's the house's; or null for a sleepyhead, whose eyes are shut in its body's frame for good, and a brick, which has none. */
export function eyesFrameOf(
  piece: Piece,
  face: FuzzballFace,
): FrameName | null {
  switch (piece.what) {
    case "fuzzball":
      return FRAMES.eyes(face);
    case "frizzball":
      return FRAMES.frizzballEyes(face);
    case "sleepyhead":
    case "brick":
      return null;
  }
}

/**
 * Where each kind's eyes sit on a burred fuzzball, which is never special,
 * drawn smaller about its square's middle, made once so finding them makes
 * nothing.
 */
const BURRED_EYES_SEATS = recordOf(KIND_IDS, (kind): EyesSeat => {
  const { x, y, scale } = eyesSeatOf(kind, "plain");
  return {
    x: x * BURRED_SCALE,
    y: y * BURRED_SCALE,
    scale: scale * BURRED_SCALE,
  };
});

/**
 * Returns how large a piece's body is drawn, as a share of its size: a
 * burred fuzzball's smaller, inside its ring of thorns, and any other's
 * whole.
 *
 * A burred fuzzball is never special, as the rules keep it: a burr spreads
 * only to a plain fuzzball, and a special's fur brushes it off, so this
 * scale never meets a special's own.
 */
export function bodyScaleOf(piece: Piece): number {
  return piece.what === "fuzzball" && piece.burred ? BURRED_SCALE : 1;
}

/** Returns where a piece's eyes sit on its body in a fur, and how large they are drawn there. */
export function eyesSeatOn(piece: Piece, fur: Fur): EyesSeat {
  switch (piece.what) {
    case "fuzzball":
      return piece.burred
        ? BURRED_EYES_SEATS[piece.kind]
        : eyesSeatOf(piece.kind, fur);
    case "frizzball":
      return FRIZZBALL_EYES_SEAT;
    case "sleepyhead":
    case "brick":
      return MIDDLE_SEAT;
  }
}

/** Describes how far a piece's eyes shift from where they sit, in squares on a plain fuzzball. */
export interface EyesShift {
  readonly x: number;
  readonly y: number;
}

/** Returns how far a piece's eyes shift from where they sit as it looks a way, or as its face's own look has them where it looks nowhere. */
export function eyesShiftOf(
  lookX: number,
  lookY: number,
  face: FuzzballFace,
): EyesShift {
  const look =
    lookX === 0 && lookY === 0 ? restingLook(face) : { x: lookX, y: lookY };
  const offset = lookOffset(look, EYES_LOOK);
  return { x: offset.x * EYES_GRID, y: offset.y * EYES_GRID };
}

/** Returns the frame of what a piece wears behind its body, a burr's ring of thorns or the frizzball's sparks, or null for nothing. */
export function behindFrameOf(piece: Piece): FrameName | null {
  if (piece.what === "frizzball") return FRAMES.frizzballSparks;
  return piece.what === "fuzzball" && piece.burred ? FRAMES.burr : null;
}

/** Returns the frame of what a piece wears over its body and eyes, a cage, or null for nothing. */
export function overFrameOf(piece: Piece): FrameName | null {
  return piece.what === "fuzzball" && piece.caged ? FRAMES.cage : null;
}
