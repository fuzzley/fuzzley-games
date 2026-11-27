// The fuzzballs' eyes: the house fuzzball's, `@fz/phaser/fuzzball`'s
// `eyesCommands()` at each of its faces, a frame of their own a face, which
// the scene sets over a body where they sit on its kind and moves as it
// looks. They are drawn as large for the body as the house's are, which is
// as large as the design draws them, and centered across it, as the design
// draws them, where the house's mark has them a little to the right.

import { recordOf } from "@fz/core/records";
import { colorNumber } from "@fz/phaser/color";
import { type EyesStyle, eyesCommands } from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  shifted,
} from "@fz/phaser/shapes";
import {
  FUZZBALL,
  FUZZBALL_FACES,
  type FuzzballFace,
  type FuzzballLook,
} from "@fz/style/fuzzball";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { seatOf } from "./bodies";
import { BODY, SQUARE } from "./design_square";
import { FRAMES, type FrameName, FURS, type Fur } from "./frame_names";

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
export const EYES_GRID = BODY / FUZZBALL.body.r / SQUARE;

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

/** Where each kind's eyes sit in each fur, made once, so finding them makes nothing. */
const EYES_SEATS = recordOf(KIND_IDS, (kind) =>
  recordOf(FURS, (fur): EyesSeat => {
    const { x, y, scale } = seatOf(kind, fur);
    return { x: x / SQUARE, y: y / SQUARE, scale };
  }),
);

/**
 * Returns where a fuzzball's eyes sit on its kind in a fur: at its body's
 * middle, wherever its body sits in its square, and as much smaller as a
 * special's fuzzball is drawn.
 */
export function eyesSeatOf(kind: KindId, fur: Fur): EyesSeat {
  return EYES_SEATS[kind][fur];
}

/** Says what a fuzzball's eyes are drawn in: their color, and their glints' where they have them. */
export type EyesInks = Pick<EyesStyle, "color" | "glint">;

/** The least of their size a fuzzball's eyes are shown at, a wisp's, the smallest a fuzzball is drawn. */
const LEAST_EYES_SCALE = Math.min(
  ...Object.values(EYES_SEATS).flatMap((seats) =>
    Object.values(seats).map(({ scale }) => scale),
  ),
);

/**
 * Returns the eyes in a face, in inks at a scale, about a body's middle and
 * looking straight out, a line of a face a CSS pixel wide at least wherever
 * the scene shows it, down to `leastScale` of its size.
 */
export function eyesDrawing(
  face: FuzzballFace,
  inks: EyesInks,
  scale: ArtScale,
  leastScale: number,
): readonly DrawCommand[] {
  const by = EYES_GRID * scale.unit;
  const style = {
    ...inks,
    leastLine: Math.ceil(scale.pixelRatio) / leastScale,
  };
  const centering = { x: -MARK_EYES_RIGHT * by, y: 0 };
  return eyesCommands(by, style, { face, look: { x: 0, y: 0 } }).map(
    (command) => shifted(command, centering),
  );
}

/** Returns a frame of {@link eyesDrawing}'s eyes, under a name. */
export function eyesFrame(
  name: FrameName,
  face: FuzzballFace,
  inks: EyesInks,
  scale: ArtScale,
  leastScale: number,
): ArtFrame {
  return centered(name, eyesDrawing(face, inks, scale, leastScale));
}

/** The house fuzzball's eyes' inks, which every kind and the sleepyhead wear. */
export const HOUSE_EYES: EyesInks = {
  color: colorNumber(FUZZBALL.ink),
  glint: colorNumber(FUZZBALL.glint),
};

/** Returns the fuzzballs' eyes in each of the house fuzzball's faces at a scale, in its ink and its glints. */
export function eyesFrames(scale: ArtScale): readonly ArtFrame[] {
  return FUZZBALL_FACES.map((face) =>
    eyesFrame(FRAMES.eyes(face), face, HOUSE_EYES, scale, LEAST_EYES_SCALE),
  );
}
