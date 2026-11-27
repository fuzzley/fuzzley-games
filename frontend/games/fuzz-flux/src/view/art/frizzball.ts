// The frizzball, which has no kind's color: a fuzzball fully charged, its
// fur on end in a sun of separate rays round its body and 4 sparks of
// static standing about them, drawn a little smaller than a fuzzball, as
// the design draws it. Its sparks are a frame of their own, which the
// scene turns as its static crackles while its rays hold still, as the
// sketch turns them. It wears the palette's frizzball colors, which turn
// with the palette, and its eyes are a frame a face, as a fuzzball's are:
// dark as a fuzzball's on a dark palette, and on a light one white, each
// open eye holding a fuzzball's eye shrunk to a pupil.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  centered,
  circle,
  extentOf,
  pointAt,
  scaledBy,
  shifted,
  stroke,
} from "@fz/phaser/shapes";
import { FUZZBALL_FACES, type FuzzballFace } from "@fz/style/fuzzball";
import type { BoardPalette, FrizzballColors } from "../colors/palette";
import { BODY, inPixels, polar } from "./design_square";
import { type EyesSeat, eyesDrawing, eyesFrame } from "./eyes";
import { FRAMES } from "./frame_names";

/** How large the frizzball is drawn, as a share of a fuzzball. */
const FRIZZBALL_SCALE = 0.84;

/** Where the frizzball's eyes sit: at its body's middle, in the middle of its square, as much smaller as it is drawn. */
export const FRIZZBALL_EYES_SEAT: EyesSeat = {
  x: 0,
  y: 0,
  scale: FRIZZBALL_SCALE,
};

/** How many rays stand round the frizzball's body, long and short in turn, the first straight up. */
const RAYS = 18;

/**
 * Says how the frizzball's rays are drawn, in its body's radii: how far out
 * they grow from, how far its long ones and its short ones reach, and how
 * wide each is.
 */
const RAY_LOOK = { root: 0.78, long: 1.52, short: 1.3, width: 0.24 } as const;

/** Returns the frizzball's rays in a color, each straight out from its body and round at its ends. */
function rays(color: number): readonly DrawCommand[] {
  const { root, long, short, width } = RAY_LOOK;
  return Array.from({ length: RAYS }, (_, i) => {
    const angle = (i / RAYS) * 2 * Math.PI - Math.PI / 2;
    const reach = i % 2 === 0 ? long : short;
    return stroke([polar(angle, BODY * root), polar(angle, BODY * reach)], {
      color,
      width: BODY * width,
    });
  }).flat();
}

/** How many sparks of static stand about the frizzball, evenly round it. */
const SPARKS = 4;

/**
 * Says how the frizzball's sparks are drawn: how far out each stands, how
 * large its zigzag is and how wide its line, in its body's radii; and how
 * far round the first stands from the right, in radians, where the
 * scene's static turns it on from.
 */
const SPARK_LOOK = { reach: 1.86, size: 0.2, width: 0.13, turn: 0.3 } as const;

/**
 * A spark's zigzag, three strokes from its inner end out, each corner how
 * far out along the spark's way and across it, in the spark's size.
 */
const ZIGZAG: readonly { readonly along: number; readonly across: number }[] = [
  { along: -1.1, across: -0.5 },
  { along: -0.1, across: 0.45 },
  { along: 0.1, across: -0.45 },
  { along: 1.1, across: 0.5 },
];

/** Returns the frizzball's sparks of static in a color, each a zigzag pointing away from its body. */
function sparks(color: number): readonly DrawCommand[] {
  const { reach, size, width, turn } = SPARK_LOOK;
  return Array.from({ length: SPARKS }, (_, i) => {
    const angle = (i / SPARKS) * 2 * Math.PI + turn;
    const corners = ZIGZAG.map(({ along, across }): Point => {
      const out = polar(angle, BODY * (reach + along * size));
      const aside = polar(angle + Math.PI / 2, BODY * across * size);
      return { x: out.x + aside.x, y: out.y + aside.y };
    });
    return stroke(corners, { color, width: BODY * width });
  }).flat();
}

/** The faces whose eyes are open, each a filled shape, which hold pupils where the frizzball's eyes are white; the rest are lines, or shut in part by a lid. */
const OPEN_FACES: ReadonlySet<FuzzballFace> = new Set(["rest", "eep", "plead"]);

/** How large a pupil is drawn, as a share of the fuzzball's eye it is drawn from, about as large in its white eye as the design's. */
const PUPIL = 0.5;

/**
 * Returns a fuzzball's eyes drawn {@link PUPIL} of their size about the
 * body's middle, as pupils in white eyes: each of their shapes moved out
 * as far as the white eye it lies nearest has moved in, so the pupils
 * shrink about the whites' middles.
 *
 * They are drawn small rather than shrunk once drawn, so a glint too
 * narrow for a device pixel at the pupil's size is left out, as a
 * fuzzball's is at its own.
 */
function pupilsIn(
  whites: readonly DrawCommand[],
  smallEyes: readonly DrawCommand[],
): readonly DrawCommand[] {
  const middles = whites.map((white) => pointAt(extentOf(white), 0.5, 0.5));
  return smallEyes.map((command) => {
    const at = pointAt(extentOf(command), 0.5, 0.5);
    const off = ({ x, y }: Point): number =>
      Math.hypot(x * PUPIL - at.x, y * PUPIL - at.y);
    const middle = middles.reduce((nearest, next) =>
      off(next) < off(nearest) ? next : nearest,
    );
    return shifted(command, {
      x: middle.x * (1 - PUPIL),
      y: middle.y * (1 - PUPIL),
    });
  });
}

/**
 * Returns the frizzball's eyes in a face, in its colors at a scale: a
 * fuzzball's, in its eyes' color, where they hold no pupils; or else white
 * in its eyes' color, an open face's each holding a fuzzball's eye in its
 * pupils' color, glint and all, drawn small as a pupil about its middle.
 */
function eyesIn(
  face: FuzzballFace,
  { eyes, pupils, glint }: FrizzballColors,
  scale: ArtScale,
): ArtFrame {
  const name = FRAMES.frizzballEyes(face);
  if (pupils === undefined) {
    return eyesFrame(
      name,
      face,
      { color: eyes, glint },
      scale,
      FRIZZBALL_SCALE,
    );
  }
  const whites = eyesDrawing(face, { color: eyes }, scale, FRIZZBALL_SCALE);
  const small = { ...scale, unit: scale.unit * PUPIL };
  const held = OPEN_FACES.has(face)
    ? pupilsIn(
        whites,
        eyesDrawing(face, { color: pupils, glint }, small, FRIZZBALL_SCALE),
      )
    : [];
  return centered(name, [...whites, ...held]);
}

/** Returns a drawing about the frizzball's body's middle in device pixels, as much smaller than a fuzzball as it is drawn, at a scale. */
function frizzballSized(
  commands: readonly DrawCommand[],
  scale: ArtScale,
): readonly DrawCommand[] {
  return inPixels(
    commands.map((command) => scaledBy(command, FRIZZBALL_SCALE)),
    scale,
  );
}

/** Returns the frizzball's body, its sparks about its body's middle, and its eyes in each face, in a palette at a scale. */
export function frizzballFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const { body } = palette.frizzball;
  return [
    centered(
      FRAMES.frizzball,
      frizzballSized(
        [...rays(body), circle(ORIGIN, BODY, { color: body })],
        scale,
      ),
    ),
    centered(
      FRAMES.frizzballSparks,
      frizzballSized(sparks(palette.spark), scale),
    ),
    ...FUZZBALL_FACES.map((face) => eyesIn(face, palette.frizzball, scale)),
  ];
}
