// A wall game's field made up for the scene's specs: two palettes, made
// from roles each a color no other takes, the frames a scene shows, each a
// square in one of a palette's colors, the stack of them a made-up brick
// shows, and the field laid out on a canvas as a board lays it out. It
// stands in a folder beside the entries, which a game's fences refuse it.

import { type ArtFrame, type ArtScale, rect, widthOf } from "@fz/phaser/shapes";
import { viewport } from "@fz/phaser/testing/pure";
import type { Brick } from "../../rules/wall";
import {
  type FieldMetrics,
  type FieldShape,
  MARGIN_CSS_PX,
  fieldMetrics,
  fieldShape,
} from "../../view/field_metrics";
import { type WallPalette, wallPalette } from "../../view/palette";
import { marginInsets } from "../canvases";
import type { MadeUpKind } from "./wall";

/** A light palette made up for the specs, made from roles each a color no other takes. */
export const LIGHT_MADE_UP: WallPalette = wallPalette(
  {
    field: "#fafafa",
    fieldLine: "#d0d4d8",
    fieldText: "#202428",
    fieldMuted: "#68707a",
    page: "#f0f2f4",
    accent: "#2a7a48",
    danger: "#c42a2a",
    warning: "#b85c10",
  },
  "light",
);

/** A dark palette made up for the specs, made from roles each a color no other takes, nor any of {@link LIGHT_MADE_UP}'s roles. */
export const DARK_MADE_UP: WallPalette = wallPalette(
  {
    field: "#1c2329",
    fieldLine: "#3a444d",
    fieldText: "#eceff1",
    fieldMuted: "#9aa5ae",
    page: "#11161a",
    accent: "#e0b13a",
    danger: "#f47c74",
    warning: "#f39a4b",
  },
  "dark",
);

/** The colors of a palette a made-up frame may be drawn in, those that are one color. */
type Ink = {
  readonly [R in keyof WallPalette]: WallPalette[R] extends number ? R : never;
}[keyof WallPalette];

/** Says how a made-up frame is drawn: a square some field units wide, in one of a palette's colors. */
interface Square {
  readonly units: number;
  readonly ink: Ink;
}

/** The made-up frames, by name: each a square some field units wide, in one of a palette's colors. */
export const MADE_UP_SQUARES = {
  dot: { units: 0.2, ink: "guide" },
  cell: { units: 1, ink: "steel" },
  "grid-dot": { units: 0.055, ink: "line" },
  "count-dot": { units: 0.14, ink: "jumpLine" },
  clay: { units: 0.9, ink: "steel" },
  moss: { units: 0.9, ink: "spark" },
  "pip-2": { units: 0.2, ink: "text" },
  "pip-3": { units: 0.2, ink: "field" },
  warning: { units: 1, ink: "dangerLine" },
} as const satisfies Readonly<Record<string, Square>>;

/** The name of a made-up frame. */
export type MadeUpFrame = keyof typeof MADE_UP_SQUARES;

/** The most frames a made-up brick shows stacked in its cell: its kind's square and a pip for each hit past the first, two at most. */
export const MADE_UP_MOST_LAYERS = 3;

/** The frames a made-up brick of each kind shows, by its hits, at most {@link MADE_UP_MOST_LAYERS}: made once, so a brick's are the same list each time. */
const LAYERS: Readonly<
  Record<MadeUpKind, readonly (readonly MadeUpFrame[])[]>
> = {
  clay: [["clay"], ["clay"], ["clay", "pip-2"], ["clay", "pip-2", "pip-3"]],
  moss: [["moss"], ["moss"], ["moss", "pip-2"], ["moss", "pip-2", "pip-3"]],
};

/**
 * Returns the frames a made-up brick shows in its cell, from the bottom of
 * its stack up: its kind's square, and a pip for each hit it takes past the
 * first, two at most.
 */
export function madeUpLayers(brick: Brick<MadeUpKind>): readonly MadeUpFrame[] {
  const layers = LAYERS[brick.kind];
  return layers[Math.min(brick.hits, layers.length - 1)] ?? [];
}

/** Returns every made-up frame, drawn in a palette at a scale: each a square its units wide, in whole device pixels, a CSS pixel at least. */
export function madeUpFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return Object.entries(MADE_UP_SQUARES).map(([name, { units, ink }]) => {
    const side = widthOf(units, scale);
    return {
      name,
      width: side,
      height: side,
      commands: [
        rect(
          { x: 0, y: 0, width: side, height: side },
          { color: palette[ink] },
        ),
      ],
    };
  });
}

/** Says where a made-up field lies on a canvas: the shape a board works out for it, and where it lies in that shape. */
export interface MadeUpField {
  readonly shape: FieldShape;
  readonly metrics: FieldMetrics;
}

/**
 * Returns the field a board lays out on a canvas of some CSS pixels at a
 * pixel ratio, inside a compact screen's margin: its shape, and where it
 * lies in it.
 */
export function madeUpField(
  width: number,
  height: number,
  pixelRatio = 1,
): MadeUpField {
  const canvas = viewport(
    width,
    height,
    pixelRatio,
    marginInsets(MARGIN_CSS_PX.compact),
  );
  const shape = fieldShape(canvas);
  return { shape, metrics: fieldMetrics(canvas, shape) };
}
