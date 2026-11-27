// A brick, a pile of felt cushions, one for each layer it has left: each a
// plump pad, darker underneath, tied with a button across its middle, its
// corners pinched out into ears. The pile fills its square whatever its
// count, so 4 cushions are thin, 2 are fat and the last is one big one,
// and each is a shade darker than the one beneath it, keeping its shade
// for as long as it is in the pile. And what a hit throws off a pile: its
// top cushion, tufts of its felt, and the button its last throws up as it
// bursts.

import { clamp } from "@fz/core/math";
import { itemAt } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  centered,
  circle,
  line,
  polygon,
  polyline,
  quadraticPoints,
  shifted,
} from "@fz/phaser/shapes";
import {
  BRICK_LAYERS,
  type BrickLayers,
} from "../../../rules/catalog/elements";
import type { BoardPalette } from "../../colors/palette";
import { inPixels } from "../design_square";
import { tuftOf } from "../fluff";
import { FRAMES } from "../frame_names";

/** How tall a pile stands, its middle its square's, in the design's units. */
const PILE_HEIGHT = 88;

/** How far apart two cushions of a pile lie, in the design's units. */
const CUSHION_GAP = 1.6;

/** How wide a pile's bottom cushion is, in the design's units. */
const BOTTOM_WIDTH = 87;

/** How much narrower each cushion is than the one beneath it, in the design's units. */
const NARROWING = 2.6;

/**
 * How far each cushion lies right of its pile's middle, by its place from
 * the bottom, in the design's units, so the pile looks stacked by hand on
 * its bottom cushion, which lies in the middle.
 */
const STAGGER = { 1: 0, 2: -1.2, 3: 1.4, 4: -1 } as const satisfies Readonly<
  Record<BrickLayers, number>
>;

/** Says how a part of a cushion is sized by its height: a share of it, held between a least and a most, in the design's units. */
interface Sized {
  readonly share: number;
  readonly least: number;
  readonly most: number;
}

/**
 * How each part of a cushion is sized by its height: its corners' radius,
 * how far its sides bow out, its darker underside, its button's radius,
 * how far its tie reaches past its button each way and how wide it is,
 * its ears' radius, and its shine's width.
 */
const PARTS = {
  corner: { share: 0.42, least: 0, most: 15 },
  bow: { share: 0.1, least: 0, most: 2.6 },
  underside: { share: 0.18, least: 3.5, most: 8 },
  button: { share: 0.15, least: 2.4, most: 5 },
  tie: { share: 0.26, least: 4, most: 10 },
  tieWidth: { share: 0.1, least: 1.6, most: 2.8 },
  ear: { share: 0.13, least: 2.2, most: 4.4 },
  shine: { share: 0.1, least: 1.6, most: 3 },
} as const satisfies Readonly<Record<string, Sized>>;

/** How far in from a cushion's side its ears' middles lie, in the design's units. */
const EAR_INSET = 1.5;

/** How far in from a cushion's top and bottom its ears' middles lie, as a share of their radius. */
const EAR_DROP = 0.9;

/** How far below a cushion's top its shine lies, as a share of its width. */
const SHINE_DROP = 1.5;

/** How much of the white its shine shows. */
const SHINE_ALPHA = 0.2;

/** The color of a cushion's shine. */
const WHITE = 0xffffff;

/** The radius of the button a brick's last cushion throws up as it bursts, in the design's units. */
const THROWN_BUTTON = 5.5;

/** Describes a cushion as it lies in its pile: its place from the bottom, its middle about its square's, and its size, in the design's units. */
interface Cushion {
  readonly place: BrickLayers;
  readonly middle: Point;
  readonly width: number;
  readonly height: number;
}

/** Returns how tall each cushion of a pile of some layers is, in the design's units. */
function cushionHeight(layers: BrickLayers): number {
  return (PILE_HEIGHT - CUSHION_GAP * (layers - 1)) / layers;
}

/** Returns each cushion of a pile of some layers, from the bottom up. */
function cushionsOf(layers: BrickLayers): readonly Cushion[] {
  const height = cushionHeight(layers);
  return BRICK_LAYERS.filter((place) => place <= layers).map((place) => ({
    place,
    middle: {
      x: STAGGER[place],
      y: PILE_HEIGHT / 2 - (place - 0.5) * height - (place - 1) * CUSHION_GAP,
    },
    width: BOTTOM_WIDTH - (place - 1) * NARROWING,
    height,
  }));
}

/** Returns the top cushion of a pile of some layers. */
function topOf(layers: BrickLayers): Cushion {
  const cushions = cushionsOf(layers);
  return itemAt(cushions, cushions.length - 1);
}

/** Returns a part of a cushion's size, by its height. */
function sizeOf({ share, least, most }: Sized, height: number): number {
  return clamp(height * share, least, most);
}

/**
 * Returns the outline of a pad about its middle, a rounded box whose sides
 * bow out a little, as a stuffed thing's do: a quadratic curve along each
 * side and round each corner, clockwise from its top left corner's end.
 */
function padOf(
  width: number,
  height: number,
  corner: number,
  bow: number,
): readonly Point[] {
  const right = width / 2;
  const bottom = height / 2;
  const left = -right;
  const top = -bottom;
  const curves: readonly (readonly [Point, Point])[] = [
    [
      { x: 0, y: top - bow },
      { x: right - corner, y: top },
    ],
    [
      { x: right, y: top },
      { x: right, y: top + corner },
    ],
    [
      { x: right + bow, y: 0 },
      { x: right, y: bottom - corner },
    ],
    [
      { x: right, y: bottom },
      { x: right - corner, y: bottom },
    ],
    [
      { x: 0, y: bottom + bow },
      { x: left + corner, y: bottom },
    ],
    [
      { x: left, y: bottom },
      { x: left, y: bottom - corner },
    ],
    [
      { x: left - bow, y: 0 },
      { x: left, y: top + corner },
    ],
    [
      { x: left, y: top },
      { x: left + corner, y: top },
    ],
  ];
  let from: Point = { x: left + corner, y: top };
  return curves.flatMap(([control, to]) => {
    const points = quadraticPoints(from, control, to);
    from = to;
    return points;
  });
}

/** Returns a cushion about its middle, in its face's ink and its underside's. */
function cushionOf(
  { width, height }: Pick<Cushion, "width" | "height">,
  face: number,
  underside: number,
): readonly DrawCommand[] {
  const corner = sizeOf(PARTS.corner, height);
  const bow = sizeOf(PARTS.bow, height);
  const below = sizeOf(PARTS.underside, height);
  const button = sizeOf(PARTS.button, height);
  const tie = button + sizeOf(PARTS.tie, height);
  const ear = sizeOf(PARTS.ear, height);
  const shine = sizeOf(PARTS.shine, height);
  const top = -height / 2;
  const earX = width / 2 - EAR_INSET;
  const shineY = top + shine * SHINE_DROP;
  const shineX = width / 2 - corner - 1;
  // The face is the pad less its underside, which shows below it, its
  // middle where the tie pinches it in.
  const faceMiddle = -below / 2;
  return [
    circle({ x: -earX, y: height / 2 - ear * EAR_DROP }, ear, {
      color: underside,
    }),
    circle({ x: earX, y: height / 2 - ear * EAR_DROP }, ear, {
      color: underside,
    }),
    circle({ x: -earX, y: top + ear * EAR_DROP }, ear, { color: face }),
    circle({ x: earX, y: top + ear * EAR_DROP }, ear, { color: face }),
    polygon(padOf(width, height, corner, bow), { color: underside }),
    polygon(
      padOf(width, height - below, corner, bow).map(({ x, y }) => ({
        x,
        y: y + faceMiddle,
      })),
      { color: face },
    ),
    polyline(
      [
        { x: -shineX, y: shineY },
        ...quadraticPoints(
          { x: -shineX, y: shineY },
          { x: 0, y: shineY - bow },
          { x: shineX, y: shineY },
        ),
      ],
      { color: WHITE, width: shine, alpha: SHINE_ALPHA },
    ),
    line(
      { x: -tie, y: faceMiddle },
      { x: tie, y: faceMiddle },
      {
        color: underside,
        width: sizeOf(PARTS.tieWidth, height),
      },
    ),
    circle({ x: 0, y: faceMiddle }, button, { color: underside }),
  ];
}

/** Returns a cushion of a pile in its own inks, its middle at a point: where it lies in the pile, unless another is given. */
function cushionIn(
  cushion: Cushion,
  palette: BoardPalette,
  at: Point = cushion.middle,
): readonly DrawCommand[] {
  return cushionOf(
    cushion,
    palette.cushions[cushion.place],
    palette.cushionUndersides[cushion.place],
  ).map((command) => shifted(command, at));
}

/**
 * Returns a brick's frames in a palette at a scale: its pile at each count
 * of layers, the top cushion of each knocked off, a tuft of each
 * cushion's felt, and the button its last cushion throws up.
 */
export function brickFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...BRICK_LAYERS.map((layers) =>
      centered(
        FRAMES.brick(layers),
        inPixels(
          cushionsOf(layers).flatMap((cushion) => cushionIn(cushion, palette)),
          scale,
        ),
      ),
    ),
    ...BRICK_LAYERS.map((layers) =>
      centered(
        FRAMES.cushion(layers),
        inPixels(cushionIn(topOf(layers), palette, ORIGIN), scale),
      ),
    ),
    ...BRICK_LAYERS.map((layers) =>
      centered(
        FRAMES.cushionTuft(layers),
        inPixels(tuftOf(palette.cushions[layers]), scale),
      ),
    ),
    centered(
      FRAMES.button,
      inPixels(
        [
          circle(ORIGIN, THROWN_BUTTON, {
            color: palette.cushionUndersides[1],
          }),
        ],
        scale,
      ),
    ),
  ];
}
