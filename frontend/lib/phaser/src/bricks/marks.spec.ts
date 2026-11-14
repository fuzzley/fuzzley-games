import { mixColors } from "../color";
import { eyesCommands, fuzzballCommands } from "../fuzzball";
import {
  type Area,
  type DrawCommand,
  ORIGIN,
  type Point,
  arcPoints,
  bandAlong,
  circle,
  diamond,
  ellipsePoints,
  middleSquare,
  placed,
  polygon,
  rect,
  ring,
  scaledBy,
  shifted,
  star,
  stroke,
  turned,
  within,
} from "../shapes";
import {
  type CageBars,
  bombMark,
  bumperMark,
  cageBars,
  cagedFriend,
  plateTeeth,
  portalMark,
  rivets,
  scallopedCap,
  sheen,
  sproutMark,
} from "./marks";
import { BRICK_SLAB, TILE_SLAB, slabBody, slabRadius, topCap } from "./slab";

/** A square tile's cell, 62 device pixels a side, a unit of 31 CSS pixels at 2 to one. */
const SQUARE: Area = { x: 0, y: 0, width: 62, height: 62 };

/** A brick's cell twice as wide as tall at the same scale, 124 device pixels by 62. */
const WIDE: Area = { x: 0, y: 0, width: 124, height: 62 };

/** The square in the middle of the wide brick's cell, as tall as it, which a mark that stands in a square takes there. */
const WIDE_SQUARE = middleSquare(WIDE, WIDE.height);

/** A square 1000 device pixels a side, in which every line's share of it is a whole number of pixels. */
const THOUSAND: Area = { x: 0, y: 0, width: 1000, height: 1000 };

/** A square twice as large, in the middle of a brick 4000 device pixels by 1800, past whose top and foot it reaches, as a mark larger than a brick's height does. */
const GROWN = middleSquare({ x: 0, y: 0, width: 4000, height: 1800 }, 2000);

/** A square 20 device pixels a side, too small for any line's share of it to reach a CSS pixel at 3 to one. */
const TINY: Area = { x: 0, y: 0, width: 20, height: 20 };

/** The pixel ratio the specs draw at, 2 device pixels to a CSS pixel. */
const RATIO = 2;

const BOMB_INKS = { cut: 0x110000, shine: 0x220000, spark: 0x330000 };
const STEEL = 0x336699;
const SHINE = mixColors(0xffffff, STEEL, 0.5);
const PORTAL_INKS = {
  middle: 0x110000,
  ring: 0x220000,
  glyph: 0x330000,
  disc: 0x440000,
};
const BUMPER_INKS = { ticks: 0x110000, disc: 0x220000, ring: 0x330000 };

/** Each mark that stands in a square, drawn in one at a pixel ratio. */
const SQUARE_MARKS: readonly (readonly [
  string,
  (square: Area, pixelRatio: number) => readonly DrawCommand[],
])[] = [
  ["a bomb", (square, pixelRatio) => bombMark(square, BOMB_INKS, pixelRatio)],
  ["a sprout", (square, pixelRatio) => sproutMark(square, 7, pixelRatio)],
  ["a sheen", (square, pixelRatio) => sheen(square, STEEL, pixelRatio)],
  [
    "a portal with a dot",
    (square, pixelRatio) => portalMark(square, "dot", PORTAL_INKS, pixelRatio),
  ],
  [
    "a portal with a diamond",
    (square, pixelRatio) =>
      portalMark(square, "diamond", PORTAL_INKS, pixelRatio),
  ],
  [
    "a bumper",
    (square, pixelRatio) => bumperMark(square, BUMPER_INKS, pixelRatio),
  ],
  [
    "a bumper whose ticks kick out 35° below across",
    (square, pixelRatio) =>
      bumperMark(square, BUMPER_INKS, pixelRatio, turned({ x: 1, y: 0 }, 35)),
  ],
];

/** Returns a value with every number in it to a billionth, so two worked out alike but for a rounding are equal. */
function billionths<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, n: unknown) =>
      typeof n === "number" ? Number(n.toFixed(9)) + 0 : n,
    ),
  ) as T;
}

/** Returns commands moved across and down by an offset. */
function moved(
  commands: readonly DrawCommand[],
  offset: Point,
): readonly DrawCommand[] {
  return commands.map((command) => shifted(command, offset));
}

/** Returns commands scaled about the origin, their lines' widths too. */
function grown(
  commands: readonly DrawCommand[],
  by: number,
): readonly DrawCommand[] {
  return commands.map((command) => scaledBy(command, by));
}

/** Returns the points of a polygon, and none of any other command. */
function pointsOf(command: DrawCommand | undefined): readonly Point[] {
  return command?.kind === "polygon" ? command.points : [];
}

/** Returns the colors commands are drawn in, each once. */
function colorsOf(commands: readonly DrawCommand[]): ReadonlySet<number> {
  return new Set(commands.map(({ color }) => color));
}

/** Returns the widths of the lines commands draw in a color, each once. */
function widthsIn(
  commands: readonly DrawCommand[],
  color: number,
): ReadonlySet<number> {
  return new Set(
    commands.flatMap((command) =>
      (command.kind === "line" || command.kind === "ring") &&
      command.color === color
        ? [command.width]
        : [],
    ),
  );
}

/** Returns the widths of every line commands draw, each once. */
function lineWidthsOf(commands: readonly DrawCommand[]): ReadonlySet<number> {
  return new Set(
    commands.flatMap((command) =>
      command.kind === "line" || command.kind === "ring" ? [command.width] : [],
    ),
  );
}

/** Returns the middle of points, the mean of them. */
function middleOf(points: readonly Point[]): Point {
  return {
    x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
    y: points.reduce((sum, { y }) => sum + y, 0) / points.length,
  };
}

/** Returns the way and the length from one point to another. */
function stepFrom(from: Point | undefined, to: Point | undefined): Point {
  return { x: (to?.x ?? 0) - (from?.x ?? 0), y: (to?.y ?? 0) - (from?.y ?? 0) };
}

describe.each(SQUARE_MARKS)("%s", (_, draw) => {
  it("draws in a square of a wide brick as in a square tile, moved to that square", () => {
    expect(billionths(draw(WIDE_SQUARE, RATIO))).toEqual(
      billionths(moved(draw(SQUARE, RATIO), WIDE_SQUARE)),
    );
  });

  it("draws in a square twice as large, past a brick's top and foot, as in one half as large scaled, its lines twice as wide", () => {
    expect(billionths(draw(GROWN, RATIO))).toEqual(
      billionths(moved(grown(draw(THOUSAND, RATIO), 2), GROWN)),
    );
  });

  it("draws each line a CSS pixel wide at the least, in a square too small for its share", () => {
    expect(lineWidthsOf(draw(TINY, 3))).toEqual(new Set([3]));
  });

  it("refuses an area that isn't square, which it would draw stretched", () => {
    expect(() => draw(WIDE, RATIO)).toThrow(RangeError);
  });
});

describe("the lines of the marks that stand in a square", () => {
  const portal = portalMark(THOUSAND, "dot", PORTAL_INKS, RATIO);
  const bumper = bumperMark(THOUSAND, BUMPER_INKS, RATIO);

  it.each([
    ["a bomb's fuse", bombMark(THOUSAND, BOMB_INKS, RATIO), BOMB_INKS.cut, 36],
    [
      "a bomb's shine",
      bombMark(THOUSAND, BOMB_INKS, RATIO),
      BOMB_INKS.shine,
      34,
    ],
    ["a sprout's stem", sproutMark(THOUSAND, 7, RATIO), 7, 34],
    ["a sheen's strokes", sheen(THOUSAND, STEEL, RATIO), SHINE, 46],
    ["a portal's arms", portal, PORTAL_INKS.glyph, 44],
    ["a portal's ring", portal, PORTAL_INKS.ring, 100],
    ["a bumper's ticks", bumper, BUMPER_INKS.ticks, 50],
    ["a bumper's ring", bumper, BUMPER_INKS.ring, 75],
  ])(
    "draws %s a share of its square wide, in a square of 1000 pixels",
    (__, commands, color, width) => {
      expect(widthsIn(commands, color)).toEqual(new Set([width]));
    },
  );
});

describe("bombMark", () => {
  const inks = BOMB_INKS;
  const bomb = bombMark(SQUARE, inks, RATIO);

  it("cuts its round body out first, below and left of its square's middle", () => {
    expect(bomb[0]).toEqual(
      circle({ x: 0.46 * 62, y: 0.56 * 62 }, 0.195 * 62, { color: inks.cut }),
    );
  });

  it("cuts its neck out next, a block 0.14 of its square long and 0.1 thick about its rim, its length rising to the right toward the fuse", () => {
    const [first, second, third] = pointsOf(bomb[1]);
    const side = 0.14 * 62 * Math.SQRT1_2;
    const end = 0.1 * 62 * Math.SQRT1_2;

    expect(
      billionths({
        color: bomb[1]?.color,
        middle: middleOf(pointsOf(bomb[1])),
        side: stepFrom(first, second),
        end: stepFrom(second, third),
      }),
    ).toEqual(
      billionths({
        color: inks.cut,
        middle: { x: 0.612 * 62, y: 0.408 * 62 },
        side: { x: side, y: -side },
        end: { x: end, y: end },
      }),
    );
  });

  it("cuts its fuse out from its neck to its spark, then shines an arc on its body, up and left of its middle, each round at its ends", () => {
    const middle = { x: 0.46 * 62, y: 0.56 * 62 };

    expect(bomb.slice(2, -2)).toEqual([
      ...stroke(
        within(SQUARE, [
          [0.63, 0.39],
          [0.675, 0.32],
          [0.72, 0.275],
        ]),
        { color: inks.cut, width: 2 },
      ),
      ...stroke(
        arcPoints(
          middle,
          0.125 * 62,
          (196 * Math.PI) / 180,
          (248 * Math.PI) / 180,
        ),
        { color: inks.shine, width: 2 },
      ),
    ]);
  });

  it("lights its spark last, at its fuse's end, on a larger star cut out round it", () => {
    const middle = { x: 0.765 * 62, y: 0.235 * 62 };

    expect(bomb.slice(-2)).toEqual([
      polygon(star(middle, 0.15 * 62, 0.064 * 62, 4), { color: inks.cut }),
      polygon(star(middle, 0.105 * 62, 0.036 * 62, 4), { color: inks.spark }),
    ]);
  });

  it("draws in its own three inks", () => {
    expect(colorsOf(bomb)).toEqual(new Set([inks.cut, inks.shine, inks.spark]));
  });
});

describe("sproutMark", () => {
  const sprout = sproutMark(SQUARE, 7, RATIO);

  it("stands its stem at 0.3 of its square down its middle, up to 0.179, round at its ends", () => {
    expect(sprout.slice(0, 3)).toEqual(
      stroke(
        [
          { x: 31, y: 0.3 * 62 },
          { x: 31, y: 0.179 * 62 },
        ],
        { color: 7, width: 2 },
      ),
    );
  });

  it("raises a leaf in its ink either side of its stem's top, each 0.082 of its square long either side of its middle and 0.044 across, turned 32° up away from the stem", () => {
    const leaf = (across: number, degrees: number) =>
      polygon(
        placed(
          ellipsePoints(ORIGIN, 0.082 * 62, 0.044 * 62).map((point) =>
            turned(point, degrees),
          ),
          1,
          { x: across * 62, y: 0.141 * 62 },
        ),
        { color: 7 },
      );

    expect(billionths(sprout.slice(3))).toEqual(
      billionths([leaf(0.405, 32), leaf(0.595, -32)]),
    );
  });
});

describe("scallopedCap", () => {
  const inks = { cap: 0x110000, shadow: 0x220000 };

  it.each([
    ["a square tile's", SQUARE, TILE_SLAB, 0.27 * 62],
    ["a wide brick's", WIDE, BRICK_SLAB, 0.3 * 62],
  ])(
    "covers %s body down to its foot, scalloped, the first and last scallop flush with its sides, each over a shadow dropped under it",
    (_, cell, shares, foot) => {
      const body = slabBody(cell, shares);
      const radius = slabRadius(cell, shares);
      const scallops = { count: 4, radius: 5, drop: 2 };
      const step = (body.width - 10) / 3;
      const middles = [0, 1, 2, 3].map((at) => ({
        x: body.x + 5 + at * step,
        y: foot,
      }));

      expect(
        billionths(scallopedCap(body, radius, foot, scallops, inks)),
      ).toEqual(
        billionths([
          ...middles.map(({ x, y }) =>
            circle({ x, y: y + 2 }, 5, { color: inks.shadow }),
          ),
          polygon(topCap(body, radius, foot), { color: inks.cap }),
          ...middles.map((middle) => circle(middle, 5, { color: inks.cap })),
        ]),
      );
    },
  );

  it.each([1, 2.5])(
    "refuses %s scallops, short of two or not a whole number",
    (count) => {
      expect(() =>
        scallopedCap(SQUARE, 8, 20, { count, radius: 5, drop: 2 }, inks),
      ).toThrow(RangeError);
    },
  );
});

describe("sheen", () => {
  it("draws two strokes rising to the right across its square, half white over the steel, round at their ends", () => {
    expect(sheen(SQUARE, STEEL, RATIO)).toEqual([
      ...stroke(
        within(SQUARE, [
          [0.38, 0.57],
          [0.56, 0.39],
        ]),
        { color: SHINE, width: 3 },
      ),
      ...stroke(
        within(SQUARE, [
          [0.5, 0.61],
          [0.63, 0.48],
        ]),
        { color: SHINE, width: 3 },
      ),
    ]);
  });
});

describe("rivets", () => {
  it.each([
    ["a square tile's cell", SQUARE, [16.12, 45.88], [15.5, 42.16]],
    ["a wide brick's cell", WIDE, [32.24, 91.76], [15.5, 42.16]],
  ])(
    "rivets %s at each share across on each share down, row by row from the top",
    (_, area, across, down) => {
      expect(
        billionths(rivets(area, [0.26, 0.74], [0.25, 0.68], 3, { color: 7 })),
      ).toEqual(
        down.flatMap((y) =>
          across.map((x) => circle({ x, y }, 3, { color: 7 })),
        ),
      );
    },
  );

  it("rivets a plate in a row, on one share down", () => {
    expect(rivets(WIDE, [0.25, 0.75], [0.5], 2, { color: 7 })).toEqual([
      circle({ x: 31, y: 31 }, 2, { color: 7 }),
      circle({ x: 93, y: 31 }, 2, { color: 7 }),
    ]);
  });
});

describe("portalMark", () => {
  const inks = PORTAL_INKS;
  const onRing = {
    x: 31 + Math.SQRT1_2 * 0.36 * 62,
    y: 31 - Math.SQRT1_2 * 0.36 * 62,
  };

  it("draws its dark middle, then three arms, then its ring, then its badge's disc on the ring, up and to the right", () => {
    const portal = portalMark(SQUARE, "dot", inks, RATIO);
    const arms = portal.slice(1, -3);

    expect({
      middle: portal[0],
      arms: colorsOf(arms),
      lines: arms.filter(({ kind }) => kind === "line").length,
      ring: portal.at(-3),
      disc: portal.at(-2),
    }).toEqual({
      middle: circle({ x: 31, y: 31 }, 0.33 * 62, { color: inks.middle }),
      arms: new Set([inks.glyph]),
      lines: 3 * 14,
      ring: ring({ x: 31, y: 31 }, 0.36 * 62, { color: inks.ring, width: 6 }),
      disc: circle(onRing, 0.145 * 62, { color: inks.disc }),
    });
  });

  it("marks the first pair's badge with a dot", () => {
    expect(portalMark(SQUARE, "dot", inks, RATIO).at(-1)).toEqual(
      circle(onRing, 0.084 * 62, { color: inks.glyph }),
    );
  });

  it.each([
    ["0.035 of its square", THOUSAND, 35],
    ["a CSS pixel at the least", { x: 0, y: 0, width: 40, height: 40 }, 2],
  ])(
    "marks the second pair's badge with a hollow diamond, a band %s wide round a hole of the disc's color",
    (_, square, band) => {
      const middle = {
        x: square.width / 2 + Math.SQRT1_2 * 0.36 * square.width,
        y: square.width / 2 - Math.SQRT1_2 * 0.36 * square.width,
      };
      const reach = 0.13 * square.width;

      expect(portalMark(square, "diamond", inks, RATIO).slice(-2)).toEqual([
        polygon(diamond(middle, reach), { color: inks.glyph }),
        polygon(diamond(middle, reach - Math.SQRT2 * band), {
          color: inks.disc,
        }),
      ]);
    },
  );
});

describe("bumperMark", () => {
  const inks = BUMPER_INKS;
  const bumper = bumperMark(SQUARE, inks, RATIO);

  /** Returns the four ticks a bumper in the square tile kicks out, the first the way given, the others mirroring it, from 0.435 of the square from its middle to 0.495. */
  function ticks({ x, y }: Point): readonly DrawCommand[] {
    const tick = (across: number, down: number) =>
      stroke(
        [0.435, 0.495].map((reach) => ({
          x: 31 + across * (reach * 62),
          y: 31 + down * (reach * 62),
        })),
        { color: inks.ticks, width: 3 },
      );
    return [...tick(x, y), ...tick(-x, y), ...tick(-x, -y), ...tick(x, -y)];
  }

  it("kicks four ticks out toward its square's corners first, from the bottom right clockwise, round at their ends", () => {
    expect(bumper.slice(0, 12)).toEqual(
      ticks({ x: Math.SQRT1_2, y: Math.SQRT1_2 }),
    );
  });

  it("kicks its ticks out the way a game gives, the other three mirroring it", () => {
    const way = turned({ x: 1, y: 0 }, 35);

    expect(bumperMark(SQUARE, inks, RATIO, way).slice(0, 12)).toEqual(
      ticks(way),
    );
  });

  it("stands its disc a little above its middle on a shadow darker, then cuts its ring out, under a cap lighter", () => {
    const disc = { x: 31, y: 0.485 * 62 };

    expect(bumper.slice(12)).toEqual([
      circle({ x: 31, y: 0.485 * 62 + 0.035 * 62 }, 0.37 * 62, {
        color: mixColors(0x000000, inks.disc, 0.28),
      }),
      circle(disc, 0.37 * 62, { color: inks.disc }),
      ring(disc, 0.24 * 62, { color: inks.ring, width: 5 }),
      circle(disc, 0.105 * 62, { color: mixColors(0xffffff, inks.disc, 0.52) }),
    ]);
  });
});

describe("cagedFriend", () => {
  it("draws the fuzzball about its body's middle, its body and fur in its ink, then its eyes", () => {
    const middle = { x: 40, y: 30 };
    const inks = { body: 0x110000, eyes: 0x220000 };

    expect(cagedFriend(middle, 1.5, inks)).toEqual(
      moved(
        [
          ...fuzzballCommands(1.5, { color: inks.body }),
          ...eyesCommands(1.5, { color: inks.eyes }),
        ],
        middle,
      ),
    );
  });

  it("draws the friend in the fur it is handed, such as none", () => {
    const middle = { x: 40, y: 30 };
    const inks = { body: 0x110000, eyes: 0x220000 };

    expect(cagedFriend(middle, 1.5, inks, [])).toEqual(
      moved(
        [
          ...fuzzballCommands(1.5, { color: inks.body, fur: [] }),
          ...eyesCommands(1.5, { color: inks.eyes }),
        ],
        middle,
      ),
    );
  });
});

describe("cageBars", () => {
  /** Two bars left of the middle, and two right, the first right of the middle broken. */
  const BARS: CageBars = {
    lefts: [0.2, 0.4],
    top: 0.2,
    broken: [
      { from: "top", bend: 0.3, aside: 0.1, down: 0.4 },
      { from: "foot", bend: 0.7, aside: -0.1, down: 0.6 },
    ],
  };
  const bar = { color: 7, width: 3 };

  it.each([
    ["a square tile's cell", SQUARE, [11, 23, 36, 48]],
    ["a wide brick's cell", WIDE, [23, 48, 73, 98]],
  ])(
    "stands its bars whole across %s on whole pixels, those right of its middle as far from its right as those left from its left",
    (_, area, lefts) => {
      expect(cageBars(area, BARS, "whole", bar)).toEqual(
        lefts.map((x) => rect({ x, y: 12, width: 3, height: 38 }, bar)),
      );
    },
  );

  it.each([
    ["a square tile's cell", SQUARE, 36, [11, 23, 48]],
    ["a wide brick's cell", WIDE, 73, [23, 48, 98]],
  ])(
    "breaks the first bar right of its middle across %s once hit, each end bent aside as a band as wide as a bar",
    (_, area, broken, whole) => {
      const middle = broken + 1.5;
      const [left = 0, inner = 0, outer = 0] = whole;

      expect(cageBars(area, BARS, "hit", bar)).toEqual([
        rect({ x: left, y: 12, width: 3, height: 38 }, bar),
        rect({ x: inner, y: 12, width: 3, height: 38 }, bar),
        polygon(
          bandAlong(
            [
              { x: middle, y: 12 },
              { x: middle, y: 0.3 * 62 },
              { x: middle + 0.1 * area.width, y: 0.4 * 62 },
            ],
            3,
          ),
          bar,
        ),
        polygon(
          bandAlong(
            [
              { x: middle, y: 50 },
              { x: middle, y: 0.7 * 62 },
              { x: middle - 0.1 * area.width, y: 0.6 * 62 },
            ],
            3,
          ),
          bar,
        ),
        rect({ x: outer, y: 12, width: 3, height: 38 }, bar),
      ]);
    },
  );
});

describe("plateTeeth", () => {
  it.each([
    ["a square tile's", 6, 50, 6],
    ["a wide brick's", 10, 100, 9],
  ])(
    "points %s plate's teeth out of its edge, each a like share of the span, cut back from it either side, from its left foot by its tip to its right foot",
    (_, from, span, count) => {
      const pitch = span / count;

      expect(
        billionths(
          plateTeeth({ from, span, count, gap: 1, foot: 40, tip: 48 }),
        ),
      ).toEqual(
        billionths(
          Array.from({ length: count }, (__, i) => [
            { x: from + pitch * i + 1, y: 40 },
            { x: from + pitch * (i + 0.5), y: 48 },
            { x: from + pitch * (i + 1) - 1, y: 40 },
          ]),
        ),
      );
    },
  );

  it.each([0, 4.5])(
    "refuses %s teeth, short of one or not a whole number",
    (count) => {
      expect(() =>
        plateTeeth({ from: 0, span: 90, count, gap: 0, foot: 40, tip: 48 }),
      ).toThrow(RangeError);
    },
  );
});
