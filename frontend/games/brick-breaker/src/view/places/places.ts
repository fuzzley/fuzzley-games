import { clamp } from "@fz/core/math";
import { createRandom } from "@fz/core/random";
import { mixColors } from "@fz/phaser/color";
import {
  type ArtScale,
  type DrawCommand,
  type Drawing,
  line,
  lineWidth,
  shifted,
} from "@fz/phaser/shapes";
import type { Place } from "../../rules/levels/levels";
import type { BricksPalette } from "../colors/palette";
import {
  type Motif,
  arcadeMotif,
  coverOf,
  funfairMotif,
  gardenMotif,
  playroomMotif,
  workshopMotif,
} from "./motifs";

/** The inks a place's tile is drawn in. */
export interface PlaceInks {
  /** Its motifs'. */
  readonly motif: number;
  /** A fainter one, {@link FAINT} as strong, for what lies under the motifs, as the workshop's grid. */
  readonly faint: number;
}

/** Describes how a place is drawn: its tile's motifs, and how strongly it shows. */
export interface PlaceArt {
  /** Draws one of its motifs; a tile holds {@link TILE_MOTIFS} of them each way. */
  readonly motif: Motif;
  /** Whether a drawing board's grid lies under its motifs, in the fainter ink. */
  readonly grid: boolean;
  /** How much of the text it takes over the field. */
  readonly field: number;
  /** How much of the text it takes over the page, a little more than over the field. */
  readonly page: number;
}

/** How much of the text a place takes over the field: about 5%, washed so it never competes with what is played. */
const FIELD_WASH = 0.045;

/** How much of the text a place takes over the page past the field, a little more. */
const PAGE_WASH = 0.055;

/** How strong a place's faint ink is beside its motifs'. */
export const FAINT = 0.55;

/**
 * Each place's art, as the uplift's places sheet draws it
 * (docs/brick-breaker-uplift/art/places.svg), so a new place fails to
 * compile until it has its own.
 */
export const PLACE_ART: Readonly<Record<Place, PlaceArt>> = {
  playroom: {
    motif: playroomMotif,
    grid: false,
    field: FIELD_WASH,
    page: PAGE_WASH,
  },
  workshop: {
    motif: workshopMotif,
    grid: true,
    field: FIELD_WASH,
    page: PAGE_WASH,
  },
  funfair: {
    motif: funfairMotif,
    grid: false,
    field: FIELD_WASH,
    page: PAGE_WASH,
  },
  garden: {
    motif: gardenMotif,
    grid: false,
    field: FIELD_WASH,
    page: PAGE_WASH,
  },
  arcade: {
    motif: arcadeMotif,
    grid: false,
    field: FIELD_WASH,
    page: PAGE_WASH,
  },
};

/** How many motifs a tile holds across, and down: even, as every other row stands half a step along. */
export const TILE_MOTIFS = 6;

/** How far apart a tile's motifs stand, in field units, as the sheet spaces them over a field. */
export const MOTIF_STEP = 4.2;

/** Says where a motif of a tile stands and what it is, in steps from the tile's top left corner. */
interface MotifSpot {
  readonly x: number;
  readonly y: number;
  /** How large it is, as a share of a step. */
  readonly size: number;
  /** Which of its place's motifs it is, and how far it is turned, from 0 to 1. */
  readonly pick: number;
}

/** The seed the motifs' places in a tile are drawn from, as every place's tile shares them. */
const TILE_SEED = 0x51ace;

/**
 * Where each motif of a tile stands, row by row: a step apart, every other
 * row half a step along, each a little off its place and of its own size,
 * as the sheet scatters them, from the tile's own seed.
 */
const MOTIF_SPOTS: readonly MotifSpot[] = (() => {
  const draw = createRandom(TILE_SEED);
  return Array.from({ length: TILE_MOTIFS * TILE_MOTIFS }, (_, i) => {
    const row = Math.floor(i / TILE_MOTIFS);
    const column = i % TILE_MOTIFS;
    const pick = draw();
    const size = 0.34 + 0.2 * draw();
    return {
      x: column + 0.25 + (row % 2) * 0.5 + (draw() - 0.5) * 0.3,
      y: row + 0.5 + (draw() - 0.5) * 0.3,
      size,
      pick,
    };
  });
})();

/** Returns how many device pixels a side of a place's tile is at a scale: its motifs' steps, in whole pixels, one at least. */
export function tileSide(scale: ArtScale): number {
  return Math.max(1, Math.round(TILE_MOTIFS * MOTIF_STEP * scale.unit));
}

/**
 * Returns a place's tile at a scale, in inks: a square of motifs, with the
 * grid under them where the place has one, that repeats without a seam, as
 * every motif lies inside it, moved in from an edge it would come near.
 *
 * At a unit under a device pixel, as a canvas not yet laid out gives, it is
 * empty, as no motif would fit inside it.
 */
export function placeTile(
  place: Place,
  scale: ArtScale,
  inks: PlaceInks,
): Drawing {
  const art = PLACE_ART[place];
  const side = tileSide(scale);
  if (scale.unit < 1) return { width: side, height: side, commands: [] };
  const step = side / TILE_MOTIFS;
  const motifs = MOTIF_SPOTS.flatMap(({ x, y, size, pick }) =>
    keptInside(
      art.motif({ x: x * step, y: y * step }, size * step, pick, inks.motif),
      side,
    ),
  );
  return {
    width: side,
    height: side,
    commands: art.grid
      ? [...drawingBoard(side, step, lineWidth(scale), inks.faint), ...motifs]
      : motifs,
  };
}

/** Returns the inks a place takes over a color, washed from the text as strongly as it shows there, its faint ink {@link FAINT} as strong. */
export function placeInks(
  text: number,
  behind: number,
  wash: number,
): PlaceInks {
  return {
    motif: mixColors(text, behind, wash),
    faint: mixColors(text, behind, wash * FAINT),
  };
}

/**
 * Returns the inks the scene bakes a place's tile in for the field, in a
 * palette, at full strength: the text, and the faint ink {@link FAINT} of
 * the way to it from the field. The scene washes the tile over the field as
 * strongly as the place shows there, so what the field's layer draws under
 * it, as the net, only takes a tint of it.
 */
export function fieldInks(palette: BricksPalette): PlaceInks {
  return placeInks(palette.text, palette.field, 1);
}

/**
 * Returns a drawing board's grid over a tile, a line every half step each
 * way, a quarter step in from its edges so none lies on a seam, each on
 * whole device pixels, running the tile's whole side, so it carries on into
 * the tiles beside it.
 */
function drawingBoard(
  side: number,
  step: number,
  width: number,
  ink: number,
): readonly DrawCommand[] {
  const style = { color: ink, width };
  return Array.from({ length: 2 * TILE_MOTIFS }, (_, i) => {
    const at = Math.round((i + 0.5) * (step / 2) - width / 2) + width / 2;
    return [
      line({ x: at, y: 0 }, { x: at, y: side }, style),
      line({ x: 0, y: at }, { x: side, y: at }, style),
    ];
  }).flat();
}

/**
 * How far in from a tile's edges its motifs keep, in device pixels, so the
 * soft edge a canvas draws a shape with is never cut at a seam.
 */
const MOTIF_MARGIN = 1;

/** Returns a motif's commands moved, as one, as far as it takes to lie {@link MOTIF_MARGIN} inside a tile of a side. */
function keptInside(
  commands: readonly DrawCommand[],
  side: number,
): readonly DrawCommand[] {
  const extents = commands.map(coverOf);
  const left = Math.min(...extents.map(({ x }) => x));
  const top = Math.min(...extents.map(({ y }) => y));
  const right = Math.max(...extents.map(({ x, width }) => x + width));
  const bottom = Math.max(...extents.map(({ y, height }) => y + height));
  const offset = {
    x: clamp(0, MOTIF_MARGIN - left, side - MOTIF_MARGIN - right),
    y: clamp(0, MOTIF_MARGIN - top, side - MOTIF_MARGIN - bottom),
  };
  if (offset.x === 0 && offset.y === 0) return commands;
  return commands.map((command) => shifted(command, offset));
}
