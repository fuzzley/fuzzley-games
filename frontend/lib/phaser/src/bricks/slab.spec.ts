import { mixColors } from "../color";
import {
  type Area,
  type DrawCommand,
  type Point,
  extentOf,
  polygon,
  roundRect,
} from "../shapes";
import {
  BRICK_SLAB,
  TILE_SLAB,
  showsDetail,
  slabBody,
  slabCommands,
  slabRadius,
  topCap,
} from "./slab";

/** A square tile's cell, 50 device pixels a side. */
const SQUARE: Area = { x: 0, y: 0, width: 50, height: 50 };

/** A brick's cell twice as wide as tall, 200 device pixels by 100, as the uplift's art kit draws one. */
const WIDE: Area = { x: 0, y: 0, width: 200, height: 100 };

const INK = 0x3366cc;

/** Returns a number to a billionth, so two worked out alike but for a rounding are equal. */
function billionths(n: number): number {
  return Number(n.toFixed(9)) + 0;
}

/** Returns an area to a billionth of a pixel. */
function inBillionths({ x, y, width, height }: Area): Area {
  return {
    x: billionths(x),
    y: billionths(y),
    width: billionths(width),
    height: billionths(height),
  };
}

/** Returns the points of a polygon, and none of any other command. */
function pointsOf(command: DrawCommand | undefined): readonly Point[] {
  return command?.kind === "polygon" ? command.points : [];
}

/**
 * Returns how far a point lies from the nearer of a body's top corners'
 * middles, a radius in from its sides and its top, each moved down by a
 * drop, or along the line between them.
 */
function fromCorner(
  point: Point,
  body: Area,
  radius: number,
  drop = 0,
): number {
  const middle = Math.min(
    Math.max(point.x, body.x + radius),
    body.x + body.width - radius,
  );
  return billionths(
    Math.hypot(middle - point.x, body.y + radius + drop - point.y),
  );
}

describe("showsDetail", () => {
  it.each([
    [58, 2, false],
    [60, 2, true],
    [29, 1, false],
    [30, 1, true],
  ])(
    "shows a square tile's finest detail at %i device pixels a unit, %i to a CSS pixel: %s",
    (unit, pixelRatio, detail) => {
      expect(showsDetail({ unit, pixelRatio }, 1)).toBe(detail);
    },
  );

  it.each([
    [29, 2, false],
    [30, 2, true],
    [14, 1, false],
    [15, 1, true],
  ])(
    "shows the finest detail of a brick two units wide at %i device pixels a unit, %i to a CSS pixel: %s",
    (unit, pixelRatio, detail) => {
      expect(showsDetail({ unit, pixelRatio }, 2)).toBe(detail);
    },
  );
});

describe("slabBody", () => {
  it.each([
    [50, 2],
    [62, 2],
    [10, 1],
    [3, 1],
    [2, 0],
    [1, 0],
    [0, 0],
  ])(
    "lies a whole number of pixels in from a square cell %i pixels a side on each side, a twenty-fifth of it, a pixel at least, but none where the cell is too small, or has no size: %i",
    (side, gap) => {
      expect(
        slabBody({ x: 0, y: 0, width: side, height: side }, TILE_SLAB),
      ).toEqual({
        x: gap,
        y: gap,
        width: side - 2 * gap,
        height: side - 2 * gap,
      });
    },
  );

  it.each([
    [{ x: 10, y: 20, width: 200, height: 100 }, 4],
    [{ x: 0, y: 0, width: 20, height: 10 }, 1],
    [{ x: 0, y: 0, width: 4, height: 2 }, 0],
  ])(
    "lies as far in from each side of a cell twice as wide as tall, by its short side: %o, %i",
    (cell, gap) => {
      expect(slabBody(cell, BRICK_SLAB)).toEqual({
        x: cell.x + gap,
        y: cell.y + gap,
        width: cell.width - 2 * gap,
        height: cell.height - 2 * gap,
      });
    },
  );
});

describe("slabRadius", () => {
  it.each([
    ["a square tile's", SQUARE, TILE_SLAB, 50 * 0.14],
    ["a wide brick's", WIDE, BRICK_SLAB, 100 * 0.16],
  ])(
    "rounds %s corners by a share of its short side",
    (_, cell, shares, radius) => {
      expect(slabRadius(cell, shares)).toBe(radius);
    },
  );
});

describe("slabCommands in a square tile's cell", () => {
  const [lip, body, strip] = slabCommands(SQUARE, INK, TILE_SLAB);

  it("lays a lip darkened toward black under the body, reaching its foot, a whole number of pixels tall", () => {
    expect(lip).toEqual(
      roundRect({ x: 2, y: 2 + 4, width: 46, height: 46 - 4 }, 50 * 0.14, {
        color: mixColors(0x000000, INK, 0.22),
      }),
    );
  });

  it("draws the body in the ink, short of the cell's foot by the lip, its corners rounded", () => {
    expect(body).toEqual(
      roundRect({ x: 2, y: 2, width: 46, height: 46 - 4 }, 50 * 0.14, {
        color: INK,
      }),
    );
  });

  it("lays a strip lightened toward white along the body's top, round its corners, a whole number of pixels deep", () => {
    expect({
      color: strip?.color,
      extent: strip && inBillionths(extentOf(strip)),
    }).toEqual({
      color: mixColors(0xffffff, INK, 0.22),
      extent: { x: 2, y: 2, width: 46, height: 7 + 3 },
    });
  });
});

describe("slabCommands in a cell twice as wide as tall", () => {
  const [lip, body, strip] = slabCommands(WIDE, INK, BRICK_SLAB);

  it("lays the kit's slab: its body 4 in, 16 round, its lip 9 tall and darker by a little more", () => {
    expect([lip, body]).toEqual([
      roundRect({ x: 4, y: 4 + 9, width: 192, height: 92 - 9 }, 16, {
        color: mixColors(0x000000, INK, 0.24),
      }),
      roundRect({ x: 4, y: 4, width: 192, height: 92 - 9 }, 16, {
        color: INK,
      }),
    ]);
  });

  it("lays its strip 7 deep along the whole top, round both corners", () => {
    expect({
      color: strip?.color,
      extent: strip && inBillionths(extentOf(strip)),
    }).toEqual({
      color: mixColors(0xffffff, INK, 0.22),
      extent: { x: 4, y: 4, width: 192, height: 16 + 7 },
    });
  });

  it("lays the strip as deep at its right end as at its left", () => {
    const deepest = (side: (x: number) => boolean) =>
      billionths(
        Math.max(
          ...pointsOf(strip)
            .filter(({ x }) => side(x))
            .map(({ y }) => y),
        ),
      );

    expect(deepest((x) => x > 100)).toBe(deepest((x) => x < 100));
  });
});

describe("slabCommands' strip", () => {
  it.each([
    ["a square tile's", SQUARE, TILE_SLAB, 7, 3],
    ["a wide brick's", WIDE, BRICK_SLAB, 16, 7],
  ])(
    "lies along %s top between its corners' arcs and the same arcs moved down by its depth, its lower edge an arc too",
    (_, cell, shares, radius, depth) => {
      const body = slabBody(cell, shares);
      const points = pointsOf(slabCommands(cell, INK, shares)[2]);
      const between = (x: number) =>
        billionths(x) >= body.x + radius &&
        billionths(x) <= body.x + body.width - radius;

      expect({
        off: points.filter(
          (point) =>
            fromCorner(point, body, radius) !== radius &&
            fromCorner(point, body, radius, depth) !== radius,
        ),
        between: new Set(
          points.filter(({ x }) => between(x)).map(({ y }) => billionths(y)),
        ),
      }).toEqual({ off: [], between: new Set([body.y, body.y + depth]) });
    },
  );
});

describe("topCap", () => {
  it.each([
    ["a square tile's", slabBody(SQUARE, TILE_SLAB), 7, 13.5],
    ["a wide brick's", slabBody(WIDE, BRICK_SLAB), 16, 30],
  ])(
    "covers %s body from its top down to a foot, from the foot at its left edge, round its top corners, to the foot at its right",
    (_, body, radius, foot) => {
      const cap = topCap(body, radius, foot);

      expect({
        ends: [cap[0], cap.at(-1)],
        extent: inBillionths(extentOf(polygon(cap, { color: 0 }))),
        corners: cap
          .slice(1, -1)
          .map((point) => fromCorner(point, body, radius)),
      }).toEqual({
        ends: [
          { x: body.x, y: foot },
          { x: body.x + body.width, y: foot },
        ],
        extent: {
          x: body.x,
          y: body.y,
          width: body.width,
          height: foot - body.y,
        },
        corners: cap.slice(1, -1).map(() => radius),
      });
    },
  );
});
