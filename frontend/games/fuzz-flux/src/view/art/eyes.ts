// The fuzzballs' eyes: the house fuzzball's, `@fz/phaser/fuzzball`'s
// `eyesCommands()` at each of its faces, a frame of their own a face, which
// the scene sets over a body where they sit on its kind and moves as it
// looks. They are drawn as large for the body as the house's are, which is
// as large as the design draws them, and centered across it, as the design
// draws them, where the house's mark has them a little to the right.

import { colorNumber } from "@fz/phaser/color";
import { type EyesStyle, eyesCommands } from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  centered,
  shifted,
} from "@fz/phaser/shapes";
import {
  FUZZBALL,
  FUZZBALL_FACES,
  type FuzzballLook,
} from "@fz/style/fuzzball";
import type { KindId } from "../../rules/catalog/kinds";
import { KIND_ART } from "./bodies";
import { BODY, SQUARE } from "./design_square";
import { FRAMES } from "./frame_names";

/** How many of the design's units a unit of the house fuzzball's grid is, its body as large as a fuzzball's. */
const GRID = BODY / FUZZBALL.body.r;

/**
 * How many squares a unit of the house fuzzball's grid is on a plain
 * fuzzball, the unit `@fz/style/fuzzball`'s `lookOffset()` counts a look's
 * shift of the eyes in.
 *
 * The eyes' frames look straight out, so a scene moves a fuzzball's eyes
 * from where they sit by `lookOffset(look, EYES_LOOK)` units of it, times
 * their seat's scale, its look the face's own (`restingLook()`, up for
 * `plead`) unless it looks somewhere else.
 */
export const EYES_GRID = GRID / SQUARE;

/**
 * How far a whole look shifts a fuzzball's eyes from where they sit, on the
 * house fuzzball's grid: as far as the design's looks shift them, 0.13 of
 * its body's radius across and 0.11 down. It shifts them from where they
 * sit, not from the body's middle (`centered`), since their frames have
 * them centered on it already.
 */
export const EYES_LOOK: FuzzballLook = {
  across: 0.13 * FUZZBALL.body.r,
  down: 0.11 * FUZZBALL.body.r,
  centered: false,
};

/** How far right of its body's middle the house's mark has its eyes, between them, on its grid. */
const MARK_EYES_RIGHT =
  FUZZBALL.eyes.reduce((sum, eye) => sum + eye.cx - FUZZBALL.body.cx, 0) /
  FUZZBALL.eyes.length;

/** Describes where a fuzzball's eyes sit: the middle of their frame, in squares from its square's middle, and how large they are drawn there, 1 on a plain fuzzball. */
export interface EyesSeat {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/**
 * Returns where a plain fuzzball's eyes sit on its kind: at its body's
 * middle, wherever its kind's body sits in its square.
 */
export function eyesSeatOf(kind: KindId): EyesSeat {
  const { seat } = KIND_ART[kind];
  return { x: seat.x / SQUARE, y: seat.y / SQUARE, scale: 1 };
}

/**
 * Returns the eyes in each of the house fuzzball's faces at a scale, in its
 * ink, with its glints, each frame drawn about a body's middle and looking
 * straight out, a line of a face a CSS pixel wide at least.
 */
export function eyesFrames(scale: ArtScale): readonly ArtFrame[] {
  const by = (GRID * scale.unit) / SQUARE;
  const style: EyesStyle = {
    color: colorNumber(FUZZBALL.ink),
    glint: colorNumber(FUZZBALL.glint),
    leastLine: Math.ceil(scale.pixelRatio),
  };
  const centering = { x: -MARK_EYES_RIGHT * by, y: 0 };
  return FUZZBALL_FACES.map((face) =>
    centered(
      FRAMES.eyes(face),
      eyesCommands(by, style, { face, look: { x: 0, y: 0 } }).map((command) =>
        shifted(command, centering),
      ),
    ),
  );
}
