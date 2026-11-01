import {
  type DrawCommand,
  MOST_BAKED_UNIT,
  type Point,
  arcPoints,
  bounded,
  bakedScale,
  centered,
  circle,
  cubicPoints,
  dashedRing,
  ellipsePoints,
  lineWidth,
  outlineWidth,
  outward,
  placed,
  polygon,
  line,
  quadraticPoints,
  ring,
  roundRect,
  scaledBy,
  shifted,
  stroke,
  widthOf,
} from "./shapes";

/** A square of side 2 about the origin, its points clockwise on the screen. */
const SQUARE: readonly Point[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];

/** Returns points rounded to a thousandth, so specs compare them plainly. */
function rounded(points: readonly Point[]): readonly Point[] {
  return points.map(({ x, y }) => ({
    x: Math.round(x * 1000) / 1000 + 0,
    y: Math.round(y * 1000) / 1000 + 0,
  }));
}

describe("bakedScale", () => {
  it("keeps a unit no larger than the most baked", () => {
    expect(bakedScale({ unit: 24, pixelRatio: 2 })).toEqual({
      unit: 24,
      pixelRatio: 2,
    });
  });

  it("bakes a larger unit at the most, keeping the pixel ratio", () => {
    expect(bakedScale({ unit: 65, pixelRatio: 2 })).toEqual({
      unit: MOST_BAKED_UNIT,
      pixelRatio: 2,
    });
  });
});

describe("the widths", () => {
  it.each([
    [{ unit: 6, pixelRatio: 1 }, 1, 1],
    [{ unit: 9, pixelRatio: 3 }, 3, 3],
    [{ unit: 40, pixelRatio: 1.5 }, 2, 5],
  ])(
    "draw a line and an outline in whole device pixels, a CSS pixel at least, at %o",
    (scale, line, outline) => {
      expect([lineWidth(scale), outlineWidth(scale)]).toEqual([line, outline]);
    },
  );

  it("draw a width given in field units in whole device pixels", () => {
    expect(widthOf(0.32, { unit: 20, pixelRatio: 1 })).toBe(6);
  });
});

describe("the shapes", () => {
  it("clamp a rounded rectangle's size and radius to nothing and to half its side", () => {
    expect([
      roundRect({ x: 0, y: 0, width: 10, height: 4 }, 5, 1),
      roundRect({ x: 0, y: 0, width: -2, height: 4 }, 1, 1),
    ]).toMatchObject([
      { width: 10, height: 4, radius: 2 },
      { width: 0, height: 4, radius: 0 },
    ]);
  });

  it("clamp a circle's and a ring's radius to nothing", () => {
    expect([circle(0, 0, -1, 1), ring(0, 0, -1, 2, 1)]).toMatchObject([
      { radius: 0 },
      { radius: 0, width: 2 },
    ]);
  });
});

describe("the curves", () => {
  it("run an arc from one angle to the other, both ends among its points, on its circle", () => {
    const points = arcPoints(10, 0, 2, 0, Math.PI);

    expect({
      first: rounded(points.slice(0, 1)),
      last: rounded(points.slice(-1)),
      onCircle: points.every(
        (point) => Math.abs(Math.hypot(point.x - 10, point.y) - 2) < 1e-9,
      ),
      pieces: points.length - 1,
    }).toEqual({
      first: [{ x: 12, y: 0 }],
      last: [{ x: 8, y: 0 }],
      onCircle: true,
      pieces: 20,
    });
  });

  it("run an arc of no turn as a single piece", () => {
    expect(arcPoints(0, 0, 1, 1, 1)).toHaveLength(2);
  });

  it("go round an ellipse once, on it", () => {
    const points = ellipsePoints(0, 0, 4, 2);

    expect({
      count: points.length,
      onIt: points.every(
        ({ x, y }) => Math.abs((x / 4) ** 2 + (y / 2) ** 2 - 1) < 1e-9,
      ),
      first: rounded(points.slice(0, 1)),
    }).toEqual({ count: 40, onIt: true, first: [{ x: 4, y: 0 }] });
  });

  it("run a quadratic curve past its start to its end, through its middle point", () => {
    const points = quadraticPoints(
      { x: 0, y: 0 },
      { x: 4, y: 8 },
      { x: 8, y: 0 },
    );

    expect([
      points.length,
      rounded(points.slice(3, 4)),
      rounded(points.slice(-1)),
    ]).toEqual([8, [{ x: 4, y: 4 }], [{ x: 8, y: 0 }]]);
  });

  it("run a cubic curve past its start to its end, through its middle point", () => {
    const points = cubicPoints(
      { x: 0, y: 0 },
      { x: 0, y: 8 },
      { x: 8, y: 8 },
      { x: 8, y: 0 },
    );

    expect([
      points.length,
      rounded(points.slice(3, 4)),
      rounded(points.slice(-1)),
    ]).toEqual([8, [{ x: 4, y: 6 }], [{ x: 8, y: 0 }]]);
  });
});

describe("bounded", () => {
  it("frames a drawing about the middle of its own bounds", () => {
    const frame = bounded("tail", [
      circle(0, 0, 1, 9),
      line({ x: -5, y: 0 }, { x: 0, y: 0 }, 2, 9),
    ]);

    expect(frame).toEqual({
      name: "tail",
      width: 6,
      height: 2,
      commands: [
        circle(5, 1, 1, 9),
        line({ x: 0, y: 1 }, { x: 5, y: 1 }, 2, 9),
      ],
    });
  });

  it("frames a line slanted across by the corners its ends are cut at", () => {
    const frame = bounded("slant", [
      line({ x: 0, y: 0 }, { x: 3, y: 4 }, 10, 9),
    ]);

    // Its ends are cut across it, 4 across and 3 down from each end's point.
    expect([frame.width, frame.height]).toEqual([12, 10]);
  });
});

describe("stroke", () => {
  it("draws a line through points as a straight line between each two, and a dot as wide at each, round at its ends and corners", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ];

    expect(stroke(points, 2, 9)).toEqual([
      line({ x: 0, y: 0 }, { x: 4, y: 0 }, 2, 9),
      line({ x: 4, y: 0 }, { x: 4, y: 3 }, 2, 9),
      circle(0, 0, 1, 9),
      circle(4, 0, 1, 9),
      circle(4, 3, 1, 9),
    ]);
  });

  it("draws a single point as a dot", () => {
    expect(stroke([{ x: 1, y: 1 }], 2, 9)).toEqual([circle(1, 1, 1, 9)]);
  });
});

describe("dashedRing", () => {
  /** Returns a dashed ring's straight pieces' ends. */
  function endsOf(commands: readonly DrawCommand[]): readonly Point[] {
    return commands.flatMap((command) =>
      command.kind === "line" ? [command.from, command.to] : [],
    );
  }

  it("dashes a ring as many times as a dash and a gap fit round it, each dash an arc on it", () => {
    // A ring of radius 10 is 62.8 round, so dashes of 5 with gaps of 5 fit six
    // times, and each, half a radian of arc, is drawn in four straight pieces.
    const ends = endsOf(dashedRing(10, 1, { dash: 5, gap: 5 }, 9));

    expect({
      pieces: ends.length / 2,
      first: rounded(ends.slice(0, 1)),
      onRing: ends.every(({ x, y }) => Math.abs(Math.hypot(x, y) - 10) < 1e-9),
    }).toEqual({ pieces: 6 * 4, first: [{ x: 10, y: 0 }], onRing: true });
  });

  it("draws one dash at least, on a ring too small for a dash and a gap", () => {
    // A dash of 5 on a ring of radius 0.5 is ten radians round, in 64 pieces.
    const ends = endsOf(dashedRing(0.5, 1, { dash: 5, gap: 5 }, 9));

    expect(ends.length / 2).toBe(64);
  });
});

describe("outward", () => {
  it("grows a square by a width on every side, its corners out along both", () => {
    expect(rounded(outward(SQUARE, 0.5))).toEqual([
      { x: -1.5, y: -1.5 },
      { x: 1.5, y: -1.5 },
      { x: 1.5, y: 1.5 },
      { x: -1.5, y: 1.5 },
    ]);
  });

  it("grows a square outward whichever way its points run", () => {
    expect(rounded(outward([...SQUARE].reverse(), 0.5))).toEqual([
      { x: -1.5, y: 1.5 },
      { x: 1.5, y: 1.5 },
      { x: 1.5, y: -1.5 },
      { x: -1.5, y: -1.5 },
    ]);
  });

  it("keeps a sharp corner from reaching out more than twice the width", () => {
    const spike = [
      { x: 0, y: -10 },
      { x: 0.2, y: 0 },
      { x: -0.2, y: 0 },
    ];

    expect(rounded(outward(spike, 1).slice(0, 1))).toEqual([{ x: 0, y: -12 }]);
  });
});

describe("placing a drawing", () => {
  it("scales points about the origin, then moves them", () => {
    expect(placed([{ x: 1, y: -2 }], 3, 10, 20)).toEqual([{ x: 13, y: 14 }]);
  });

  it.each<[DrawCommand, DrawCommand]>([
    [
      roundRect({ x: 1, y: 2, width: 3, height: 4 }, 1, 9),
      roundRect({ x: 2, y: 4, width: 6, height: 8 }, 2, 9),
    ],
    [circle(1, 2, 3, 9), circle(2, 4, 6, 9)],
    [ring(1, 2, 3, 1, 9), ring(2, 4, 6, 2, 9)],
    [
      line({ x: 1, y: 2 }, { x: 3, y: -1 }, 1, 9),
      line({ x: 2, y: 4 }, { x: 6, y: -2 }, 2, 9),
    ],
    [polygon([{ x: 1, y: 2 }], 9), polygon([{ x: 2, y: 4 }], 9)],
  ])("scales a %o with its lines", (command, twice) => {
    expect(scaledBy(command, 2)).toEqual(twice);
  });

  it.each<[DrawCommand, DrawCommand]>([
    [
      roundRect({ x: 1, y: 2, width: 3, height: 4 }, 1, 9),
      roundRect({ x: 11, y: 22, width: 3, height: 4 }, 1, 9),
    ],
    [circle(1, 2, 3, 9), circle(11, 22, 3, 9)],
    [ring(1, 2, 3, 1, 9), ring(11, 22, 3, 1, 9)],
    [
      line({ x: 1, y: 2 }, { x: 3, y: -1 }, 1, 9),
      line({ x: 11, y: 22 }, { x: 13, y: 19 }, 1, 9),
    ],
    [polygon([{ x: 1, y: 2 }], 9), polygon([{ x: 11, y: 22 }], 9)],
  ])("moves a %o", (command, moved) => {
    expect(shifted(command, 10, 20)).toEqual(moved);
  });
});

describe("centered", () => {
  it("frames a drawing as far as it reaches either way from its middle, in whole pixels, its middle the frame's", () => {
    const frame = centered("dot", [
      circle(2, 0, 3.5, 9),
      line({ x: 0, y: -1 }, { x: 0, y: 6 }, 2, 9),
    ]);

    expect(frame).toEqual({
      name: "dot",
      width: 12,
      height: 12,
      commands: [
        circle(8, 6, 3.5, 9),
        line({ x: 6, y: 5 }, { x: 6, y: 12 }, 2, 9),
      ],
    });
  });

  it("frames a line of no length by its point alone, as it draws nothing past it", () => {
    const frame = centered("none", [
      line({ x: 3, y: 0 }, { x: 3, y: 0 }, 2, 9),
    ]);

    expect([frame.width, frame.height]).toEqual([6, 2]);
  });

  it("frames a ring by its line's outer edge", () => {
    expect(centered("ring", [ring(0, 0, 4, 2, 9)])).toMatchObject({
      width: 10,
      height: 10,
    });
  });

  it("frames a rounded rectangle by its corners and a polygon by its points", () => {
    expect([
      centered("shot", [
        roundRect({ x: -3, y: -1, width: 6, height: 2 }, 1, 9),
      ]),
      centered("tri", [
        polygon(
          [
            { x: 0, y: -2 },
            { x: 4, y: 1 },
          ],
          9,
        ),
      ]),
    ]).toMatchObject([
      { width: 6, height: 2 },
      { width: 8, height: 4 },
    ]);
  });

  it("frames nothing in a frame of two pixels a side", () => {
    expect(centered("none", [])).toMatchObject({ width: 2, height: 2 });
  });
});
