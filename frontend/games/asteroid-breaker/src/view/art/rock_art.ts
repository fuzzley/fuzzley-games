// The rocks: each kind in each size it comes in, in each of its outlines, cut
// in facets (`rocks/`), whole and with each count of hits it can take and
// hold shown as cracks; each frame drawn twice, in its inks and as its
// normal map, which the scene bakes into an atlas of their own and lights
// with the palette's light.

import { recordOf } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  bandAlong,
  centered,
  circle,
  placed,
  polygon,
  rect,
  stroke,
  svgOf,
} from "@fz/phaser/shapes";
import {
  ROCK_KIND_IDS,
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
  rockKind,
} from "../../rules/catalog/rocks";
import { ROCK_OUTLINES, type Rock } from "../../rules/rocks/rocks";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { inLight } from "../colors/rock_light";
import type { Tones } from "../colors/tones";
import { cracksOf } from "./rocks/cracks";
import { FLAT } from "./rocks/cut";
import { litBy, normalColor } from "./rocks/light";
import { type RockLine, type RockShape, makeRock } from "./rocks/rock_shape";
import type { Facing } from "./rocks/space";
import { MOST_LINE, MOST_MITER, outlineWidth, outward } from "./shapes";

/**
 * The seed a kind and size's first outline is cut from, the art kit's
 * sheet's; each next outline takes the next, and each outline's break is
 * drawn from its seed too, as the sheet draws it.
 */
export const FIRST_SEED = 3;

/** The fewest CSS pixels a field unit is drawn at for a rock to keep its fine marks. */
export const FINE_UNIT_CSS_PX = 10;

/**
 * How far past its radius a rock's frame reaches, in shares of its radius,
 * at the most any kind's reaches: a lodestone's field's lines, past its
 * outline, and half their width.
 */
const MOST_REACH = 1.2;

/**
 * How far past its outline a rock's frame reaches, in field units: its
 * outline at its widest, mitred out at a sharp corner as far as an outline
 * may reach.
 */
const RIM = MOST_MITER * MOST_LINE;

/**
 * How far a rock's frame reaches from its middle at each size, its outline
 * and its field's lines included, in field units.
 */
export const ROCK_REACH: Readonly<Record<RockSize, number>> = recordOf(
  ROCK_SIZES,
  (size) => ROCK_RADIUS[size] * MOST_REACH + RIM,
);

/** How far each facet is grown past its edges, in device pixels, so no seam shows between two. */
const SEAM_PX = 0.5;

/** How strongly the faint marks show: a glint, a sheen, a glowing seam's halo and a lodestone's field. */
const FAINT = {
  glint: 0.7,
  sheen: 0.4,
  core: 0.28,
  field: 0.45,
} as const;

/** How long a lodestone's field's dashes are, and the gaps between, in shares of its radius. */
const FIELD_DASH = { dash: 0.1, gap: 0.12 } as const;

/**
 * How wide the lines of a crack are, and each of its two lips, in field
 * units, and the fewest CSS pixels each is.
 */
const CRACK = {
  width: 0.085,
  least: 1.1,
  lip: 0.06,
  leastLip: 0.8,
} as const;

/** How steeply each of a crack's lips slopes down into it, in radians from flat. */
const LIP_SLOPE = 0.6;

/** How much wider a glowing seam's halo is than the seam. */
const CORE_HALO = 2.6;

/** The fewest CSS pixels a glowing seam's halo is wide. */
const LEAST_CORE_HALO = 1.2;

/** The fewest CSS pixels a dot's radius is. */
const LEAST_DOT = 0.8;

/** What a normal map holds where something lies flat on a rock: its outline, its marks and its cracks. */
const FLAT_NORMAL = normalColor(FLAT);

/** Holds a value for each kind of rock in each size it comes in. */
export type BySize<T> = Readonly<
  Record<RockKindId, Readonly<Partial<Record<RockSize, T>>>>
>;

/** Returns a value for each kind of rock in each size it comes in. */
export function bySize<T>(
  make: (kind: RockKindId, size: RockSize) => T,
): BySize<T> {
  return recordOf(ROCK_KIND_IDS, (kind) =>
    recordOf(sizesOf(kind), (size) => make(kind, size)),
  );
}

/** Returns the sizes a kind of rock comes in, largest first. */
export function sizesOf(kind: RockKindId): readonly RockSize[] {
  return ROCK_SIZES.filter((size) => rockKind(kind).hits[size] !== undefined);
}

/** Returns the largest size a kind of rock comes in, which How to play pictures it at. */
export function largestOf(kind: RockKindId): RockSize {
  return (
    ROCK_SIZES.find((size) => rockKind(kind).hits[size] !== undefined) ??
    "small"
  );
}

/**
 * Returns the hits a rock of a kind takes at a size, whole, or none at a size
 * it doesn't come in.
 */
function hitsOf(kind: RockKindId, size: RockSize): number {
  return rockKind(kind).hits[size] ?? 0;
}

/**
 * How many outlines each set piece is drawn in, fewer than the rules draw,
 * so their frames, each a boulder's, keep the atlas inside its most a
 * side: two, so a wave of several needn't draw them all alike.
 */
const SET_PIECE_OUTLINES: Readonly<Partial<Record<RockKindId, number>>> = {
  crumbling: 2,
  ironclad: 2,
  stormheart: 2,
};

/** Returns how many outlines a kind of rock is drawn in: each the rules draw, but a set piece's few. */
export function outlinesOf(kind: RockKindId): number {
  return SET_PIECE_OUTLINES[kind] ?? ROCK_OUTLINES;
}

/**
 * Returns the outline a rock is drawn in: its own, taken round its kind's
 * few where it has fewer, and one the rules never draw left as it is.
 */
function drawnOutline(rock: Pick<Rock, "kind" | "outline">): number {
  const { outline } = rock;
  return outline >= 0 && outline < ROCK_OUTLINES
    ? outline % outlinesOf(rock.kind)
    : outline;
}

/** Every kind and size of rock's outlines, each cut once from its seed. */
const ROCK_SHAPES: BySize<readonly RockShape[]> = bySize((kind, size) =>
  Array.from({ length: outlinesOf(kind) }, (_, outline) =>
    makeRock(kind, size, FIRST_SEED + outline),
  ),
);

/** Returns how one of a kind and size of rock's outlines is cut, as it is drawn. */
export function rockShape(
  rock: Pick<Rock, "kind" | "size" | "outline">,
): RockShape {
  const shape = ROCK_SHAPES[rock.kind][rock.size]?.[drawnOutline(rock)];
  if (shape === undefined) {
    throw new RangeError(
      `No ${rock.size} ${rock.kind} rock has outline ${String(rock.outline)}.`,
    );
  }
  return shape;
}

/** Returns the name of a kind and size of rock's frame in an outline, with a count of hits taken. */
function frameName(
  kind: RockKindId,
  size: RockSize,
  outline: number,
  taken: number,
): string {
  const whole = `rock-${kind}-${size}-${String(outline)}`;
  return taken === 0 ? whole : `${whole}-taken-${String(taken)}`;
}

// Made once, so finding a frame's name makes nothing: for each kind and size,
// each outline's names, by the hits taken, from none.
const ROCK_FRAMES: BySize<readonly (readonly string[])[]> = bySize(
  (kind, size) =>
    Array.from({ length: outlinesOf(kind) }, (_, outline) =>
      Array.from({ length: hitsOf(kind, size) }, (__, taken) =>
        frameName(kind, size, outline, taken),
      ),
    ),
);

/**
 * Returns the name of the frame a rock is drawn in, by its kind, size and
 * outline as it is drawn, and the hits it has taken and held, whole where
 * it has none left to count.
 */
export function rockFrame(
  rock: Pick<Rock, "kind" | "size" | "outline"> & Partial<Pick<Rock, "hits">>,
): string {
  const whole = hitsOf(rock.kind, rock.size);
  const taken = whole - (rock.hits ?? whole);
  const name = ROCK_FRAMES[rock.kind][rock.size]?.[drawnOutline(rock)]?.[taken];
  if (name === undefined) {
    throw new RangeError(
      `No ${rock.size} ${rock.kind} rock has outline ${String(rock.outline)} with ${String(rock.hits)} hits left.`,
    );
  }
  return name;
}

/**
 * Returns the color a kind of rock's body is drawn in, which its shards and its
 * dust take: a crystal's is a stone's, its gem set in it.
 */
export function rockColor(kind: RockKindId, palette: BeltPalette): number {
  return palette.rocks[kind === "crystal" ? "stone" : kind];
}

/**
 * Returns whether a rock keeps its fine marks on a field drawn at a scale:
 * its glints, sheens, dots, thin lines and field. The scale is the field's
 * own, as laid out, not the atlas's, which is capped (`bakedScale()`).
 */
export function isFine(scale: ArtScale): boolean {
  return scale.unit / scale.pixelRatio >= FINE_UNIT_CSS_PX;
}

/**
 * Describes a shape of a lit drawing, a rock's or the pod's hull's, and
 * the way it faces, which its normal map holds, and whether its normal map
 * alone draws it.
 */
export interface Painted {
  readonly command: DrawCommand;
  readonly facing: Facing;
  readonly inkless?: true;
}

/** Returns shapes that lie flat on a rock, as its outline, its marks and its cracks do, or on the pod's hull, as its outline does. */
export function flat(commands: readonly DrawCommand[]): readonly Painted[] {
  return commands.map((command) => ({ command, facing: FLAT }));
}

/** Returns a line through points, a width wide, drawn faint, as one band, so nothing of it overlaps. */
function faintLine(
  points: readonly Point[],
  width: number,
  color: number,
  alpha: number,
): DrawCommand {
  return polygon(bandAlong(points, width), { color, alpha });
}

/** Adds a point to a dash, unless the dash ends there already, as a band's points may not repeat. */
function extend(run: Point[], point: Point): void {
  const last = run.at(-1);
  if (last?.x !== point.x || last.y !== point.y) run.push(point);
}

/**
 * Returns the dashes along a line through points, each a dash long and a gap
 * apart, from its start, the last cut short where the line ends.
 */
export function dashesAlong(
  points: readonly Point[],
  dash: number,
  gap: number,
): readonly (readonly Point[])[] {
  const runs: Point[][] = [];
  // The dash under way, if one is.
  let run: Point[] | null = null;
  // How far along the line the next dash starts or ends.
  let next = 0;
  let along = 0;
  for (const [i, to] of points.entries()) {
    const from = points[i - 1];
    if (from === undefined) continue;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const at = (distance: number): Point => ({
      x: from.x + ((to.x - from.x) * (distance - along)) / length,
      y: from.y + ((to.y - from.y) * (distance - along)) / length,
    });
    while (next <= along + length) {
      if (run === null) {
        run = [at(next)];
        next += dash;
      } else {
        extend(run, at(next));
        runs.push(run);
        run = null;
        next += gap;
      }
    }
    if (run !== null) extend(run, to);
    along += length;
  }
  // The dash the line ends in, unless it ends where that dash starts.
  if (run !== null && run.length > 1) runs.push(run);
  return runs;
}

/**
 * Returns a crack's two lips, a band along each side of each of its lines,
 * from its edge out, sloping down into it, which only the normal map
 * draws, so the light lights the side turned to it and leaves the other in
 * shade, however the rock turns.
 */
function lipsOf(
  line: readonly Point[],
  edge: number,
  width: number,
): readonly Painted[] {
  return line.flatMap((from, i) => {
    const to = line[i + 1];
    if (to === undefined) return [];
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const across = {
      x: -(to.y - from.y) / length,
      y: (to.x - from.x) / length,
    };
    return [1, -1].map((side) => {
      const off = (point: Point, far: number): Point => ({
        x: point.x + across.x * side * far,
        y: point.y + across.y * side * far,
      });
      const inward = -side * Math.sin(LIP_SLOPE);
      return {
        command: polygon(
          [
            off(from, edge),
            off(to, edge),
            off(to, edge + width),
            off(from, edge + width),
          ],
          { color: FLAT_NORMAL },
        ),
        facing: {
          x: across.x * inward,
          y: across.y * inward,
          z: Math.cos(LIP_SLOPE),
        },
        inkless: true,
      };
    });
  });
}

/** Describes the tones a rock's body and a crystal's gems are drawn in, in a palette. */
interface RockTones {
  readonly body: Tones;
  readonly gem: Tones;
}

/** Returns the tones a kind of rock is drawn in, in a palette: a crystal's body a stone's. */
function tonesFor(kind: RockKindId, palette: BeltPalette): RockTones {
  return {
    body: palette.rockTones[kind === "crystal" ? "stone" : kind],
    gem: palette.rockTones.crystal,
  };
}

/** Returns the color a mark of a tone is drawn in. */
function markColor(
  tone: RockLine["tone"],
  tones: Tones,
  palette: BeltPalette,
): number {
  switch (tone) {
    case "deep":
      return tones.deep;
    case "lit":
    case "sheen":
      return tones.lit;
    case "core":
      return palette.core;
    case "glint":
      return palette.glint;
  }
}

/**
 * Returns what a rock's frame draws, back to front, each shape with the way
 * it faces: a lodestone's field, the outline, the facets, the cracks for the
 * hits it has taken, and its marks, the fine ones only at a size that shows
 * them.
 */
function rockPainting(
  shape: RockShape,
  taken: number,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly Painted[] {
  const radius = ROCK_RADIUS[shape.size] * scale.unit;
  const at = (points: readonly Point[]): readonly Point[] =>
    placed(points, radius);
  const css = scale.pixelRatio;
  const tones = tonesFor(shape.kind, palette);
  const widthOf = (line: RockLine, least = 1): number =>
    Math.max(least * css, line.width * radius);

  const field = fine
    ? shape.aura.flatMap((line) =>
        dashesAlong(
          at(line.points),
          FIELD_DASH.dash * radius,
          FIELD_DASH.gap * radius,
        ).map((dash) =>
          faintLine(dash, widthOf(line), tones.body.ink, FAINT.field),
        ),
      )
    : [];
  const gems = shape.facets.filter(({ part }) => part === "gem");
  const outline = [shape.rim, ...gems.map(({ points }) => points)].map(
    (points) =>
      polygon(outward(at(points), outlineWidth(scale)), {
        color: palette.outline,
      }),
  );
  const facets = shape.facets.map(({ points, facing, part }) => ({
    command: polygon(outward(at(points), SEAM_PX), { color: tones[part].ink }),
    facing,
  }));
  const crackWidth = Math.max(CRACK.least * css, CRACK.width * scale.unit);
  const lipWidth = Math.max(CRACK.leastLip * css, CRACK.lip * scale.unit);
  const cracked = cracksOf(shape, taken).map(at);
  const lips = cracked.flatMap((line) =>
    lipsOf(line, crackWidth / 2, lipWidth),
  );
  const cracks = cracked.flatMap((line) =>
    stroke(line, { color: palette.mark, width: crackWidth }),
  );
  const lines = shape.lines
    .filter(
      ({ tone, width }) =>
        fine ||
        tone === "core" ||
        (tone !== "glint" && tone !== "sheen" && width >= 0.06),
    )
    .flatMap((line) => {
      const points = at(line.points);
      const color = markColor(line.tone, tones.body, palette);
      switch (line.tone) {
        case "core":
          return [
            faintLine(
              points,
              widthOf(line, LEAST_CORE_HALO) * CORE_HALO,
              color,
              FAINT.core,
            ),
            ...stroke(points, { color, width: widthOf(line) }),
          ];
        case "glint":
        case "sheen":
          return [faintLine(points, widthOf(line), color, FAINT[line.tone])];
        case "deep":
        case "lit":
          return stroke(points, { color, width: widthOf(line) });
      }
    });
  const dots = fine
    ? shape.dots.map((dot) =>
        circle(
          { x: dot.at.x * radius, y: dot.at.y * radius },
          Math.max(LEAST_DOT * css, dot.r * radius),
          { color: markColor(dot.tone, tones.body, palette) },
        ),
      )
    : [];
  return [
    ...flat(field),
    ...flat(outline),
    ...facets,
    ...lips,
    ...flat(cracks),
    ...flat(lines),
    ...flat(dots),
  ];
}

/** Describes a lit frame, a rock's or the pod's hull's, in its inks and as its normal map, of one name, size and place in its atlas. */
export interface LitFrame {
  readonly ink: ArtFrame;
  readonly normal: ArtFrame;
}

/**
 * Returns a lit frame, a rock's or the pod's hull's, in its inks and as its
 * normal map, of one size and place: the normal map draws every shape,
 * each facet and each of a crack's lips in the color of the way it faces
 * and all else flat, over a flat frame; the inks every shape but the lips.
 */
export function litFrame(name: string, painting: readonly Painted[]): LitFrame {
  const frame = centered(
    name,
    painting.map(({ command }) => command),
  );
  return {
    ink: {
      ...frame,
      commands: frame.commands.filter(
        (_, i) => painting[i]?.inkless === undefined,
      ),
    },
    normal: {
      ...frame,
      commands: [
        rect(
          { x: 0, y: 0, width: frame.width, height: frame.height },
          { color: FLAT_NORMAL },
        ),
        ...frame.commands.map((command, i) => ({
          ...command,
          color: normalColor(painting[i]?.facing ?? FLAT),
        })),
      ],
    },
  };
}

/**
 * Returns every rock's frames, each in its inks and as its normal map: each
 * kind in each size and outline, whole and with each count of hits it can
 * take and hold, with their fine marks or without, as the field they are
 * drawn for keeps them: `isFine()` of the field's own scale, not the
 * atlas's, which is capped.
 */
export function rockFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly LitFrame[] {
  return ROCK_KIND_IDS.flatMap((kind) =>
    sizesOf(kind).flatMap((size) =>
      (ROCK_SHAPES[kind][size] ?? []).flatMap((shape, outline) =>
        Array.from({ length: hitsOf(kind, size) }, (_, taken) =>
          litFrame(
            frameName(kind, size, outline, taken),
            rockPainting(shape, taken, palette, scale, fine),
          ),
        ),
      ),
    ),
  );
}

/**
 * Returns How to play's picture of each kind of rock, whole, at its largest
 * size, in its first outline and unturned, as an SVG `data:` URL, each
 * shape's ink times the palette's light on the way it faces.
 *
 * It draws at the scale the atlas is baked at, with the fine marks as the
 * field keeps them. The opaque shapes are lit as the field lights them; a
 * faint mark over a facet keeps its own ink, where the field lights it
 * blended with the facet beneath.
 */
export function rockPictures(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): Readonly<Record<RockKindId, string>> {
  return recordOf(ROCK_KIND_IDS, (kind) => {
    const rock = { kind, size: largestOf(kind), outline: 0 } as const;
    const lit = rockPainting(rockShape(rock), 0, palette, scale, fine).map(
      ({ command, facing }) => ({
        ...command,
        color: inLight(command.color, litBy(facing, 0, palette.rockLight)),
      }),
    );
    const svg = svgOf(centered(rockFrame(rock), lit));
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  });
}
