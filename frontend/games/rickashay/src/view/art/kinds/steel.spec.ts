import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type CircleCommand,
  type Point,
  type PolygonCommand,
  extentOf,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  distanceToSegment,
  octagon,
  pastOutline,
  pointInBillionths,
} from "../../../testing/art_frames";
import { cellOf } from "../cells";
import { FRAMES } from "../frames";
import { tileCommands } from "./brick";
import { STEEL_ART } from "./steel";

const { steel, mark } = ART_PALETTE;

/** The sheen's color: the steel, half white. */
const SHEEN = mixColors(0xffffff, steel, 0.5);

/** A cell at 31 CSS pixels a unit, 2 device pixels to one. */
const CELL = { x: 0, y: 0, width: 62, height: 62 };

/**
 * How much further along each side a cut across a corner at 45° reaches
 * for each pixel its edges move out: moved out square to itself as far as
 * the sides are, it meets them √2 further from the corner, which moved out
 * as far along each.
 */
const GROWTH = 2 - Math.SQRT2;

/** How far a point may stray past an edge and still pass, for a rounding. */
const SLACK = 1e-9;

/** A steel brick, which takes no hits. */
const BRICK = { tint: 0, hits: 0, full: 0, plates: 0 };

/** Returns the steel brick's frame at a scale. */
function steelAt(scale: ArtScale): ArtFrame {
  return frameNamed(STEEL_ART.frames(ART_PALETTE, scale), FRAMES.steel);
}

/** Returns a steel brick's bevelled frame at a scale: the band it fills in the marks' color, failing the spec where it has none. */
function bevelAt(scale: ArtScale): PolygonCommand {
  const [bevel] = drawnIn(steelAt(scale), "polygon", mark);
  if (bevel?.kind !== "polygon") throw new Error("The steel has no frame");
  return bevel;
}

/** Returns the circles a steel brick's frame draws in a color at a scale. */
function circlesAt(scale: ArtScale, color: number): readonly CircleCommand[] {
  return steelAt(scale).commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === color,
  );
}

/**
 * Returns a band's outer edge and its inner edge, each clockwise and
 * without the point it closes on, from its points, which run round its
 * outer edge and back round its inner, each back to where it started.
 */
function ringsOf({
  points,
}: PolygonCommand): readonly [readonly Point[], readonly Point[]] {
  const half = points.length / 2;
  return [points.slice(0, half - 1), points.slice(half + 1).reverse()];
}

/**
 * Returns the outlines a mark on a tile stays inside, so it lies on
 * neither its strip nor its lip: its body as drawn, above its lip, and that
 * body moved down by its strip's depth.
 */
function clearOfStripAndLip(cell: Area): readonly (readonly Point[])[] {
  const [, body, strip] = tileCommands(cell, steel);
  if (body?.kind !== "polygon" || strip?.kind !== "polygon") {
    throw new Error("The tile's body or its strip is no polygon");
  }
  const reach = extentOf(strip);
  // The strip runs down the cuts across the body's top corners to the
  // first point of the body, the cut's foot at its left side, and as far
  // again as it is deep.
  const depth = reach.y + reach.height - (body.points[0]?.y ?? NaN);
  return [body.points, body.points.map(({ x, y }) => ({ x, y: y + depth }))];
}

/** Returns how far a point lies past the furthest of some outlines, less a clearance it keeps. */
function pastAll(
  point: Point,
  outlines: readonly (readonly Point[])[],
  clearance = 0,
): number {
  return Math.max(
    ...outlines.map((outline) => pastOutline(point, outline) + clearance),
  );
}

describe("STEEL_ART's layers", () => {
  it("shows a steel brick as its one frame", () => {
    expect(STEEL_ART.layersOf(BRICK)).toEqual(["steel"]);
  });

  it("finds a brick's layers without making them", () => {
    expect(STEEL_ART.layersOf(BRICK)).toBe(STEEL_ART.layersOf(BRICK));
  });
});

describe("STEEL_ART's frame", () => {
  const frame = steelAt(ART_SCALE);

  it("brings one frame, a cell", () => {
    expect(
      STEEL_ART.frames(ART_PALETTE, ART_SCALE).map(({ name, width }) => [
        name,
        width,
      ]),
    ).toEqual([["steel", 62]]);
  });

  it("draws its tile in the steel, the cut tile", () => {
    expect(frame.commands.slice(0, 3)).toEqual(tileCommands(CELL, steel));
  });

  it("cuts its frame out in the marks' color, a band 2 pixels wide about the art's frame laid on whole pixels, 9 in from the cell, each of its corners cut 0.07 of the cell along each side", () => {
    const rings = ringsOf(bevelAt(ART_SCALE));

    expect(rings.map((ring) => ring.map(pointInBillionths))).toEqual([
      octagon({ x: 8, y: 8 }, { x: 54, y: 50 }, 0.07 * 62 + GROWTH),
      octagon({ x: 10, y: 10 }, { x: 52, y: 48 }, 0.07 * 62 - GROWTH),
    ]);
  });

  it.each([ART_SCALE, { unit: 72, pixelRatio: 3 }])(
    "keeps the band as wide across each cut corner as along its sides at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
    (scale) => {
      const [outer, inner] = ringsOf(bevelAt(scale));
      const across = [0, 2, 4, 6].map((corner) =>
        distanceToSegment(
          inner[corner] ?? { x: NaN, y: NaN },
          outer[corner] ?? { x: NaN, y: NaN },
          outer[corner + 1] ?? { x: NaN, y: NaN },
        ),
      );
      const width = (inner[1]?.y ?? NaN) - (outer[1]?.y ?? NaN);

      expect(across.map(billionths)).toEqual(across.map(() => width));
    },
  );

  it("keeps its frame as far in from its cell's left as from its right at 72 device pixels a unit, 3 to a CSS pixel, where its line is 3 pixels wide", () => {
    const { x, width } = extentOf(bevelAt({ unit: 72, pixelRatio: 3 }));

    expect([x, 72 - x - width]).toEqual([9, 9]);
  });

  it("cuts a rivet out in the marks' color in each corner of its frame", () => {
    expect(circlesAt(ART_SCALE, mark)).toMatchObject([
      { x: 0.27 * 62, y: 0.26 * 62, radius: 0.04 * 62 },
      { x: 0.73 * 62, y: 0.26 * 62, radius: 0.04 * 62 },
      { x: 0.27 * 62, y: 0.68 * 62, radius: 0.04 * 62 },
      { x: 0.73 * 62, y: 0.68 * 62, radius: 0.04 * 62 },
    ]);
  });

  it("draws two strokes of sheen across it, half white, three pixels wide, as the art's", () => {
    expect(drawnIn(frame, "line", SHEEN)).toEqual(
      [
        [0.38, 0.57, 0.56, 0.39],
        [0.5, 0.61, 0.63, 0.48],
      ].map(([fromX = 0, fromY = 0, toX = 0, toY = 0]) => ({
        kind: "line",
        from: { x: fromX * 62, y: fromY * 62 },
        to: { x: toX * 62, y: toY * 62 },
        width: 3,
        color: SHEEN,
      })),
    );
  });

  it("rounds its sheen's ends with a dot each", () => {
    expect(circlesAt(ART_SCALE, SHEEN)).toHaveLength(4);
  });

  it("leaves out its rivets at 29 CSS pixels a unit, too small for them", () => {
    expect(circlesAt({ unit: 58, pixelRatio: 2 }, mark)).toEqual([]);
  });

  it("keeps all but its rivets at 29 CSS pixels a unit", () => {
    expect(steelAt({ unit: 58, pixelRatio: 2 }).commands).toHaveLength(
      frame.commands.length - 4,
    );
  });

  it("fills its frame's outer edge at 2 device pixels a unit, where its line is as wide as the frame", () => {
    const { points } = bevelAt({ unit: 2, pixelRatio: 1 });

    expect(points.map(pointInBillionths)).toEqual(
      octagon({ x: 0, y: 0 }, { x: 2, y: 2 }, 0.07 * 2 + 0.5 * GROWTH),
    );
  });
});

describe.each(PIXEL_RATIOS)(
  "STEEL_ART's frame at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const least = Math.ceil(24 * pixelRatio);
    const scales = Array.from({ length: 128 - least + 1 }, (_, i) => ({
      unit: least + i,
      pixelRatio,
    }));

    // The marks keep less than 3:1 against the steel's strip in the light
    // palettes, so neither the frame nor a rivet lies on it.
    it("keeps its frame and its rivets on its body, off its strip and its lip", () => {
      const touching = scales.flatMap((scale) => {
        const outlines = clearOfStripAndLip(cellOf(scale));
        const bevel = bevelAt(scale).points.map((point) =>
          pastAll(point, outlines),
        );
        const rivets = circlesAt(scale, mark).map((rivet) =>
          pastAll(rivet, outlines, rivet.radius),
        );
        return [...bevel, ...rivets].some((past) => past > SLACK)
          ? [scale.unit]
          : [];
      });

      expect(touching).toEqual([]);
    });
  },
);
