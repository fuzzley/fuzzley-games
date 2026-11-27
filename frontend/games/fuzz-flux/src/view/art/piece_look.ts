// How a piece is drawn at a moment, as a move's timeline samples it: the
// frame of each of its images and how opaque each shows, where its eyes
// sit on its body, its glow, and how deep it draws among the board's other
// pieces and its dimming.

import { clamp, lerp } from "@fz/core/math";
import type { FuzzballFace } from "@fz/style/fuzzball";
import type { Piece } from "../../rules/catalog/pieces";
import type { Sampled } from "../timeline/timeline";
import type { FrameName, Fur, Lift } from "./frame_names";
import {
  behindFrameOf,
  bodyFrameOf,
  eyesFrameOf,
  type EyesShift,
  eyesSeatOn,
  eyesShiftOf,
  furOf,
  overFrameOf,
  standsOnEnd,
} from "./piece_frames";

/** Describes how one of a piece's images shows: in a frame, or in none, and how opaque. */
export interface ImageLook {
  frame: FrameName | null;
  alpha: number;
}

/** How far a piece's fur stands on end, past which a second fur growing in shows in the frames with it on end. */
const HALF_ON_END = 0.5;

/**
 * How much deeper a piece draws for each square further down the board,
 * so the lower of two pieces raised as far draws over the other, as the
 * sketch draws them: little enough that no piece on the board, or falling
 * in from past its edge, reaches the depth of the board's dimming or of
 * one raised a level more.
 */
const ROW_DEPTH = 1 / 64;

/**
 * How deep the board's dimming draws among the pieces: over each piece
 * neither raised nor with its fur on end past halfway, and under the rest,
 * as the sketch dims the board as a frizzball goes off.
 */
export const DIM_DEPTH = 0.25;

/** How deep a piece raised no further draws once its fur stands on end past halfway, which puts it over the dimming. */
const ON_END_DEPTH = 0.5;

/** How opaque a piece's glow is at its brightest, over its body. */
const GLOW_ALPHA = 0.85;

/** Returns how opaque a sprite shows, as far faded as it is sampled. */
export function opacityOf(fade: number): number {
  return clamp(1 - fade, 0, 1);
}

/** Returns how deep a piece draws: by how far it is raised or its fur stands on end, and among those as high, deeper the further down the board it stands. */
function depthOf({ raise, lift, y }: Readonly<Sampled>): number {
  const height = raise < 1 && lift >= HALF_ON_END ? ON_END_DEPTH : raise;
  return height + y * ROW_DEPTH;
}

/**
 * Works out how a piece is drawn as it is sampled, into fields it keeps,
 * so a frame makes no record: what it wears behind it, its body, a second
 * body over it as one look gives way to another, its eyes, what it wears
 * over them, and its glow, its body lit in the effects' white.
 *
 * As its fur stands on end, the frame with it on end fades in over the one
 * at rest. As a special's second fur grows in, the special's body fades in
 * over the plain one, both on end once the fur stands past halfway, and
 * the eyes move from where they sit on the one to where they sit on the
 * other.
 */
export class PieceLook {
  /** What the piece wears behind its body, a burr. */
  readonly behind: ImageLook = { frame: null, alpha: 0 };
  /** Its body, under any other. */
  readonly body: ImageLook = { frame: null, alpha: 0 };
  /** The body fading in over the other, as the piece's look changes. */
  readonly second: ImageLook = { frame: null, alpha: 0 };
  /** Its eyes, in their face. */
  readonly eyes: ImageLook = { frame: null, alpha: 0 };
  /** What the piece wears over its body and eyes, a cage. */
  readonly over: ImageLook = { frame: null, alpha: 0 };
  /** Its glow, its body's frame lit over all the rest. */
  readonly glow: ImageLook = { frame: null, alpha: 0 };
  /** How far across from the piece's place its eyes' middle lies, in squares, squashed, stretched and turned with it. */
  eyesX = 0;
  /** How far down from the piece's place its eyes' middle lies, in squares, squashed, stretched and turned with it. */
  eyesY = 0;
  /** How large its eyes are drawn, as a scale of the piece's own. */
  eyesScale = 1;
  /** How deep it draws among the board's other pieces. */
  depth = 0;
  /** The look and the face the eyes' shift was last worked out for, and the shift, worked out again only as either changes, as working it out makes a record. */
  private lookX = 0;
  private lookY = 0;
  private face: FuzzballFace = "rest";
  private shift: EyesShift = eyesShiftOf(0, 0, "rest");

  /** Works out how a piece is drawn as it is sampled, and returns the look. */
  of(sampled: Readonly<Sampled>, piece: Piece): this {
    const alpha = opacityOf(sampled.fade);
    const fur = furOf(piece);
    const grown = fur === "plain" ? 1 : clamp(sampled.furIn, 0, 1);
    const lifted = standsOnEnd(piece) ? clamp(sampled.lift, 0, 1) : 0;
    show(this.behind, behindFrameOf(piece), alpha);
    if (grown < 1) {
      const lift: Lift = lifted >= HALF_ON_END ? "on-end" : "rest";
      show(this.body, bodyFrameOf(piece, "plain", lift), alpha);
      show(this.second, bodyFrameOf(piece, fur, lift), alpha * grown);
    } else {
      show(this.body, bodyFrameOf(piece, fur, "rest"), alpha);
      show(this.second, bodyFrameOf(piece, fur, "on-end"), alpha * lifted);
    }
    show(this.eyes, eyesFrameOf(piece, sampled.face), alpha);
    show(this.over, overFrameOf(piece), alpha);
    show(
      this.glow,
      this.body.frame,
      alpha * clamp(sampled.glow, 0, 1) * GLOW_ALPHA,
    );
    this.seatEyes(sampled, piece, fur, grown);
    this.depth = depthOf(sampled);
    return this;
  }

  /** Sets where the eyes sit on the body, as far grown into a fur as given, shifted as they look, and squashed, stretched and turned with the body. */
  private seatEyes(
    sampled: Readonly<Sampled>,
    piece: Piece,
    fur: Fur,
    grown: number,
  ): void {
    const plain = eyesSeatOn(piece, "plain");
    const seat = eyesSeatOn(piece, fur);
    const scale = lerp(plain.scale, seat.scale, grown);
    const shift = this.shiftAt(sampled);
    const along =
      (lerp(plain.x, seat.x, grown) + shift.x * scale) * sampled.scaleX;
    const down =
      (lerp(plain.y, seat.y, grown) + shift.y * scale) * sampled.scaleY;
    const cos = Math.cos(sampled.rotation);
    const sin = Math.sin(sampled.rotation);
    this.eyesX = along * cos - down * sin;
    this.eyesY = along * sin + down * cos;
    this.eyesScale = scale;
  }

  /** Returns how far the eyes shift from where they sit as the piece looks, worked out again only as the look or the face changes. */
  private shiftAt({ lookX, lookY, face }: Readonly<Sampled>): EyesShift {
    if (this.lookX !== lookX || this.lookY !== lookY || this.face !== face) {
      this.lookX = lookX;
      this.lookY = lookY;
      this.face = face;
      this.shift = eyesShiftOf(lookX, lookY, face);
    }
    return this.shift;
  }
}

/** Sets how one of a piece's images shows: in a frame, as opaque as given, or in none. */
function show(image: ImageLook, frame: FrameName | null, alpha: number): void {
  image.frame = frame;
  image.alpha = frame === null ? 0 : alpha;
}
