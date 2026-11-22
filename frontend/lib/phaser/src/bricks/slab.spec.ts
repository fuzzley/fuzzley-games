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
  type SlabShares,
  TILE_SLAB,
  bodyOutline,
  showsDetail,
  slabBody,
  slabCommands,
  slabFace,
  slabRadius,
  topCap,
} from "./slab";

/** A square tile's cell, 50 device pixels a side. */
const SQUARE: Area = { x: 0, y: 0, width: 50, height: 50 };

/** A brick's cell twice as wide as tall, 200 device pixels by 100, as Brick Breaker's is. */
const WIDE: Area = { x: 0, y: 0, width: 200, height: 100 };

/** A square tile's shares with its corners cut at 45°, 0.11 of its side along each, and not round, as Rickashay's bricks are: 5.5 device pixels in a square cell. */
const CUT_SLAB: SlabShares = { ...TILE_SLAB, corner: 0, cut: 0.11 };

/** A square tile's shares with its corners both round and cut, 10 device pixels round and 7.5 along each side in a square cell, so the cut reaches past each arc's middle but not its ends. */
const ROUND_AND_CUT: SlabShares = { ...TILE_SLAB, corner: 0.2, cut: 0.15 };

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

/** Returns points to a billionth of a pixel. */
function pointsInBillionths(points: readonly Point[]): readonly Point[] {
  return points.map(({ x, y }) => ({ x: billionths(x), y: billionths(y) }));
}

/** Returns the points of a rectangle from one corner to another with each corner cut at 45°, a cut's length along each side, clockwise from the top of its left side. */
function octagon(from: Point, to: Point, cut: number): readonly Point[] {
  return [
    { x: from.x, y: from.y + cut },
    { x: from.x + cut, y: from.y },
    { x: to.x - cut, y: from.y },
    { x: to.x, y: from.y + cut },
    { x: to.x, y: to.y - cut },
    { x: to.x - cut, y: to.y },
    { x: from.x + cut, y: to.y },
    { x: from.x, y: to.y - cut },
  ];
}

/** Returns how far in from the nearest of a body's corners a point lies, along both its sides at once. */
function inFromCorner(point: Point, body: Area): number {
  const across = Math.min(point.x - body.x, body.x + body.width - point.x);
  const down = Math.min(point.y - body.y, body.y + body.height - point.y);
  return billionths(across + down);
}

/** Returns how far a point lies off the edge of a body whose corners are a radius round, out or in. */
function offRoundEdge(point: Point, body: Area, radius: number): number {
  const across = Math.max(
    body.x + radius - point.x,
    point.x - (body.x + body.width - radius),
    0,
  );
  const down = Math.max(
    body.y + radius - point.y,
    point.y - (body.y + body.height - radius),
    0,
  );
  return across > 0 && down > 0
    ? billionths(Math.hypot(across, down) - radius)
    : billionths(
        Math.min(
          point.x - body.x,
          body.x + body.width - point.x,
          point.y - body.y,
          body.y + body.height - point.y,
        ),
      );
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

describe("slabFace", () => {
  it.each([
    [
      "a square tile's",
      SQUARE,
      TILE_SLAB,
      { x: 2, y: 2, width: 46, height: 42 },
    ],
    [
      "a wide brick's",
      WIDE,
      BRICK_SLAB,
      { x: 4, y: 4, width: 192, height: 83 },
    ],
    [
      "a small brick's",
      { x: 3, y: 5, width: 21, height: 10.5 },
      BRICK_SLAB,
      { x: 4, y: 6, width: 19, height: 7.5 },
    ],
  ])(
    "is %s body above its lip, the lip a whole number of pixels tall",
    (_, cell, shares, face) => {
      expect(slabFace(cell, shares)).toEqual(face);
    },
  );

  it.each([
    ["a square tile's", SQUARE, TILE_SLAB],
    ["a wide brick's", WIDE, BRICK_SLAB],
    ["a cut tile's", SQUARE, CUT_SLAB],
  ])("is where the slab draws %s body in its ink", (_, cell, shares) => {
    const [, body] = slabCommands(cell, INK, shares);

    expect(body && extentOf(body)).toEqual(slabFace(cell, shares));
  });
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

describe("bodyOutline", () => {
  it.each([
    ["a square tile's", SQUARE, TILE_SLAB],
    ["a wide brick's", WIDE, BRICK_SLAB],
  ])(
    "runs round %s body from the top of its left side, every point on its edge, round each corner",
    (_, cell, shares) => {
      const body = slabBody(cell, shares);
      const radius = slabRadius(cell, shares);
      const outline = bodyOutline(cell, shares);

      expect({
        first: pointsInBillionths(outline.slice(0, 1)),
        extent: inBillionths(extentOf(polygon(outline, { color: 0 }))),
        off: outline.filter((point) => offRoundEdge(point, body, radius) !== 0),
      }).toEqual({
        first: [{ x: body.x, y: body.y + radius }],
        extent: body,
        off: [],
      });
    },
  );

  it("runs clockwise round a body, along its top first", () => {
    const [first, second] = bodyOutline(SQUARE, TILE_SLAB);

    expect((second?.y ?? 0) < (first?.y ?? 0)).toBe(true);
  });

  it("cuts each of a cut tile's corners across at 45°, the cut's length along each side from it, clockwise from the top of its left side", () => {
    expect(pointsInBillionths(bodyOutline(SQUARE, CUT_SLAB))).toEqual(
      octagon({ x: 2, y: 2 }, { x: 48, y: 48 }, 5.5),
    );
  });

  it("cuts a corner's arc away whole where the cut is longer than its radius", () => {
    const shares = { ...ROUND_AND_CUT, corner: 0.1 };

    expect(pointsInBillionths(bodyOutline(SQUARE, shares))).toEqual(
      octagon({ x: 2, y: 2 }, { x: 48, y: 48 }, 7.5),
    );
  });

  it("cuts across a corner both round and cut where the cut reaches past its arc, keeping the arc either side of it", () => {
    const body = slabBody(SQUARE, ROUND_AND_CUT);
    const outline = bodyOutline(SQUARE, ROUND_AND_CUT);
    const onCut = (point: Point) => inFromCorner(point, body) === 7.5;

    expect({
      off: outline.filter(
        (point) => !onCut(point) && offRoundEdge(point, body, 10) !== 0,
      ),
      nearer: outline.filter((point) => inFromCorner(point, body) < 7.5),
      cut: outline.filter(onCut).length,
      arc: outline.filter((point) => !onCut(point)).length > 8,
    }).toEqual({ off: [], nearer: [], cut: 8, arc: true });
  });
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

describe("slabCommands in a cut tile's cell", () => {
  const [lip, body, strip] = slabCommands(SQUARE, INK, CUT_SLAB);

  it("lays its lip and its body each with its corners cut across, as polygons, the lip reaching its foot", () => {
    expect(
      [lip, body].map((command) => ({
        color: command?.color,
        points: pointsInBillionths(pointsOf(command)),
      })),
    ).toEqual([
      {
        color: mixColors(0x000000, INK, 0.22),
        points: octagon({ x: 2, y: 2 + 4 }, { x: 48, y: 48 }, 5.5),
      },
      {
        color: INK,
        points: octagon({ x: 2, y: 2 }, { x: 48, y: 48 - 4 }, 5.5),
      },
    ]);
  });

  it("lays its strip along its top and down its cut corners, its lower edge the same cut moved down by its depth", () => {
    expect(pointsInBillionths(pointsOf(strip))).toEqual([
      { x: 2, y: 7.5 },
      { x: 7.5, y: 2 },
      { x: 42.5, y: 2 },
      { x: 48, y: 7.5 },
      { x: 48, y: 7.5 + 3 },
      { x: 42.5, y: 2 + 3 },
      { x: 7.5, y: 2 + 3 },
      { x: 2, y: 7.5 + 3 },
    ]);
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

  it("runs along the top of a body both round and cut across its corners, as its outline does, its lower edge the same moved down by its depth", () => {
    const points = pointsOf(slabCommands(SQUARE, INK, ROUND_AND_CUT)[2]);
    const half = points.length / 2;
    const top = points.slice(0, half);

    expect({
      top: pointsInBillionths(top),
      foot: pointsInBillionths(points.slice(half)),
    }).toEqual({
      top: pointsInBillionths(
        bodyOutline(SQUARE, ROUND_AND_CUT).slice(0, half),
      ),
      foot: pointsInBillionths(
        top.map(({ x, y }) => ({ x, y: y + 3 })).reverse(),
      ),
    });
  });
});

describe("topCap", () => {
  it.each([
    ["a square tile's", SQUARE, TILE_SLAB, 7, 13.5],
    ["a wide brick's", WIDE, BRICK_SLAB, 16, 30],
  ])(
    "covers %s body from its top down to a foot, from the foot at its left edge, round its top corners, to the foot at its right",
    (_, cell, shares, radius, foot) => {
      const body = slabBody(cell, shares);
      const cap = topCap(cell, shares, foot);

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

  it("covers a cut tile's body down to a foot, its top corners cut across", () => {
    expect(pointsInBillionths(topCap(SQUARE, CUT_SLAB, 13.5))).toEqual([
      { x: 2, y: 13.5 },
      { x: 2, y: 7.5 },
      { x: 7.5, y: 2 },
      { x: 42.5, y: 2 },
      { x: 48, y: 7.5 },
      { x: 48, y: 13.5 },
    ]);
  });
});
