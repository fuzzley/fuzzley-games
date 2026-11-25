// A gem, set on its point: `gem()` in `docs/rickashay/art/make-art.mjs`, a
// diamond in its row's ink filling its tile's body, its four points cut
// square, its upper half a lighter facet and its lower edges a darker one,
// a table in the ink at its middle and a glint across the table. The art
// cuts its points with flats 0.13 of its body wide; here each is as wide as
// the flat a flight turns off there, as a ramp's is. The art darkens its
// lower facet with 0.24 of black, which keeps under 3:1 against the dark
// palettes' field; here it takes 0.18, which keeps 3:1, as its lighter
// facet does against the light palettes'.

import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellFrame } from "@fz/brick-wall/view/art";
import { inkAt } from "@fz/brick-wall/view/inks";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type Point,
  polygon,
  stroke,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import { STAND_OFF } from "../../../rules/tuning";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, INKS } from "../frames";
import { itemAt } from "../items";
import { tileBody } from "./brick";

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** How much white its upper facet takes over its ink: the art's. */
const LIGHT = 0.24;

/** How much black its lower facet takes over its ink. */
const DARK = 0.18;

/** How much white its glint takes over its ink: the art's. */
const GLINT = 0.6;

/** How far either way of the middle of a side of its tile's body the flat cutting a point square runs, as a share of its cell: as far as the flat a flight turns off there. */
const TIP = STAND_OFF - RADIUS;

/** How far from the middle of its tile's body its lower facet reaches in, along the body's middle line, as a share of the body. */
const FACET = 0.36;

/** How far from the middle of its tile's body its table's corners reach, as a share of the body. */
const TABLE = 0.28;

/**
 * Where its glint runs across its table, as shares of its tile's body: from
 * its lower left end to its upper right, a little further in from the
 * table's edge than the art's, so a glint a CSS pixel wide stays on the
 * table at 24 CSS pixels a unit.
 */
const GLINT_LINE = [
  [0.34, 0.46],
  [0.46, 0.34],
] as const;

/** How wide its glint is, in field units: the art's. */
const GLINT_WIDTH = 0.046;

/** A gem's layers, by its tint, made once. */
const GEM_LAYERS: readonly (readonly FrameName[])[] = INKS.map((ink) => [
  FRAMES.gem(ink),
]);

/** Describes the colors of a gem's two facets in an ink. */
export interface GemFacets {
  /** Its upper half's. */
  readonly light: number;
  /** Its lower edges'. */
  readonly dark: number;
}

/** Returns the colors of a gem's facets in an ink: its upper half lighter, its lower edges darker. */
export function gemFacets(ink: number): GemFacets {
  return {
    light: mixColors(WHITE, ink, LIGHT),
    dark: mixColors(BLACK, ink, DARK),
  };
}

/** Holds the outlines a gem is drawn from, in its tile's body. */
interface GemShapes {
  /** Its outline, clockwise from the left end of the flat that cuts its upper point. */
  readonly outline: readonly Point[];
  /** Its upper half, its lighter facet: its outline from its upper point round to its middle line. */
  readonly upper: readonly Point[];
  /** Its darker facet: its outline from its middle line round its lower point, and back along its middle line as far in as {@link FACET}. */
  readonly lower: readonly Point[];
}

/** Returns the outlines a gem is drawn from in its tile's body, its points cut square by flats running a length either way of the middle of each side. */
function gemShapes(body: Area, tip: number): GemShapes {
  const right = body.x + body.width;
  const foot = body.y + body.height;
  const across = body.x + body.width / 2;
  const down = body.y + body.height / 2;
  const facet = FACET * body.width;
  const topLeft = { x: across - tip, y: body.y };
  const topRight = { x: across + tip, y: body.y };
  const rightTop = { x: right, y: down - tip };
  const rightFoot = { x: right, y: down + tip };
  const footRight = { x: across + tip, y: foot };
  const footLeft = { x: across - tip, y: foot };
  const leftFoot = { x: body.x, y: down + tip };
  const leftTop = { x: body.x, y: down - tip };
  const rightMiddle = { x: right, y: down };
  const leftMiddle = { x: body.x, y: down };
  return {
    outline: [
      topLeft,
      topRight,
      rightTop,
      rightFoot,
      footRight,
      footLeft,
      leftFoot,
      leftTop,
    ],
    upper: [topLeft, topRight, rightTop, rightMiddle, leftMiddle, leftTop],
    lower: [
      leftFoot,
      footLeft,
      footRight,
      rightFoot,
      rightMiddle,
      { x: across + facet, y: down },
      { x: across, y: down + facet },
      { x: across - facet, y: down },
      leftMiddle,
    ],
  };
}

/**
 * Returns a gem drawn in its cell, in an ink: the diamond, its upper half's
 * lighter facet down to its middle, its darker facet along its lower edges
 * as far in as {@link FACET}, its table in the ink and the glint across it.
 */
function gemCommands(
  cell: Area,
  ink: number,
  scale: ArtScale,
): readonly DrawCommand[] {
  const body = tileBody(cell);
  const { outline, upper, lower } = gemShapes(body, TIP * cell.width);
  const { light, dark } = gemFacets(ink);
  return [
    polygon(outline, { color: ink }),
    polygon(upper, { color: light }),
    polygon(lower, { color: dark }),
    polygon(
      within(body, [
        [0.5, 0.5 - TABLE],
        [0.5 + TABLE, 0.5],
        [0.5, 0.5 + TABLE],
        [0.5 - TABLE, 0.5],
      ]),
      { color: ink },
    ),
    ...stroke(within(body, GLINT_LINE), {
      color: mixColors(WHITE, ink, GLINT),
      width: widthOf(GLINT_WIDTH, scale),
    }),
  ];
}

/**
 * How a gem is drawn: one frame for each ink, its row's, whatever it has
 * met, since a strike breaks it. It brings a gem in each of the 8 inks to
 * the atlas.
 */
export const GEM_ART = {
  layersOf: ({ tint }) => itemAt(GEM_LAYERS, tint),
  frames: (palette, scale) =>
    INKS.map((ink) =>
      cellFrame(FRAMES.gem(ink), scale, (cell) =>
        gemCommands(cell, inkAt(palette.tints, ink), scale),
      ),
    ),
} as const satisfies KindArt;
