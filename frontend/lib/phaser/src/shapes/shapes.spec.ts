import {
  type Area,
  type DrawCommand,
  ORIGIN,
  circle,
  extentOf,
  line,
  lineWidth,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
  stroke,
  widthOf,
} from "./shapes";

describe("widthOf", () => {
  it.each([
    [0.06, { unit: 6, pixelRatio: 1 }, 1],
    [0.06, { unit: 9, pixelRatio: 3 }, 3],
    [0.06, { unit: 6, pixelRatio: 1.25 }, 2],
    [0.12, { unit: 40, pixelRatio: 1.5 }, 5],
    [0.32, { unit: 20, pixelRatio: 1 }, 6],
  ])(
    "draws %f field units in whole device pixels, a CSS pixel at least, at %o",
    (units, scale, width) => {
      expect(widthOf(units, scale)).toBe(width);
    },
  );
});

describe("lineWidth", () => {
  it.each([
    [{ unit: 6, pixelRatio: 1 }, 1],
    [{ unit: 9, pixelRatio: 3 }, 3],
    [{ unit: 40, pixelRatio: 1.5 }, 2],
    [{ unit: 42, pixelRatio: 1 }, 3],
    [{ unit: 58, pixelRatio: 1 }, 3],
  ])(
    "draws the art's line in whole device pixels, a CSS pixel at least, at %o",
    (scale, width) => {
      expect(lineWidth(scale)).toBe(width);
    },
  );
});

describe("the shapes", () => {
  it("draw each where its geometry says, in its style", () => {
    const area: Area = { x: 1, y: 2, width: 3, height: 4 };
    const points = [
      { x: 0, y: 1 },
      { x: 2, y: 3 },
    ];

    expect([
      rect(area, { color: 7 }),
      roundRect(area, 1, { color: 7 }),
      circle({ x: 5, y: 6 }, 2, { color: 7 }),
      ring({ x: 5, y: 6 }, 2, { color: 7, width: 1 }),
      line({ x: 1, y: 2 }, { x: 3, y: 4 }, { color: 7, width: 1 }),
      polyline(points, { color: 7, width: 1 }),
      polygon(points, { color: 7 }),
    ]).toEqual([
      { kind: "rect", x: 1, y: 2, width: 3, height: 4, color: 7 },
      {
        kind: "roundRect",
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        radius: 1,
        color: 7,
      },
      { kind: "circle", x: 5, y: 6, radius: 2, color: 7 },
      { kind: "ring", x: 5, y: 6, radius: 2, width: 1, color: 7 },
      {
        kind: "line",
        from: { x: 1, y: 2 },
        to: { x: 3, y: 4 },
        width: 1,
        color: 7,
      },
      { kind: "polyline", points, width: 1, color: 7 },
      { kind: "polygon", points, color: 7 },
    ]);
  });

  it("fill in a line's color alone, given its style", () => {
    const style = { color: 7, width: 3 };

    expect([circle(ORIGIN, 1, style), polygon([ORIGIN], style)]).toEqual([
      { kind: "circle", x: 0, y: 0, radius: 1, color: 7 },
      { kind: "polygon", points: [ORIGIN], color: 7 },
    ]);
  });

  it("clamp a rectangle's size to nothing", () => {
    expect(rect({ x: 1, y: 2, width: -3, height: 4 }, { color: 7 })).toEqual({
      kind: "rect",
      x: 1,
      y: 2,
      width: 0,
      height: 4,
      color: 7,
    });
  });

  it("clamp a rounded rectangle's size to nothing and its radius to half its shorter side", () => {
    expect([
      roundRect({ x: 0, y: 0, width: 10, height: 4 }, 5, { color: 1 }),
      roundRect({ x: 0, y: 0, width: 4, height: -2 }, 1, { color: 1 }),
      roundRect({ x: 0, y: 0, width: 10, height: 10 }, -1, { color: 1 }),
    ]).toMatchObject([
      { width: 10, height: 4, radius: 2 },
      { width: 4, height: 0, radius: 0 },
      { radius: 0 },
    ]);
  });

  it("clamp a circle's and a ring's radius to nothing", () => {
    expect([
      circle(ORIGIN, -1, { color: 1 }),
      ring(ORIGIN, -1, { color: 1, width: 2 }),
    ]).toMatchObject([{ radius: 0 }, { radius: 0, width: 2 }]);
  });
});

describe("stroke", () => {
  it("draws a line through points as a straight line between each two, and a dot as wide at each, round at its ends and corners", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ];
    const style = { color: 9, width: 2 };

    expect(stroke(points, style)).toEqual([
      line({ x: 0, y: 0 }, { x: 4, y: 0 }, style),
      line({ x: 4, y: 0 }, { x: 4, y: 3 }, style),
      circle({ x: 0, y: 0 }, 1, style),
      circle({ x: 4, y: 0 }, 1, style),
      circle({ x: 4, y: 3 }, 1, style),
    ]);
  });

  it("draws a single point as a dot", () => {
    expect(stroke([{ x: 1, y: 1 }], { color: 9, width: 2 })).toEqual([
      circle({ x: 1, y: 1 }, 1, { color: 9 }),
    ]);
  });
});

describe("extentOf", () => {
  const POINTS = [
    { x: 0, y: 4 },
    { x: 2, y: 0 },
    { x: 6, y: 1 },
  ];

  it.each<[string, DrawCommand, Area]>([
    [
      "a rectangle",
      rect({ x: 1, y: 2, width: 3, height: 4 }, { color: 0 }),
      { x: 1, y: 2, width: 3, height: 4 },
    ],
    [
      "a rounded rectangle",
      roundRect({ x: 1, y: 2, width: 3, height: 4 }, 1, { color: 0 }),
      { x: 1, y: 2, width: 3, height: 4 },
    ],
    [
      "a circle",
      circle({ x: 5, y: 6 }, 2, { color: 0 }),
      { x: 3, y: 4, width: 4, height: 4 },
    ],
    [
      "a ring, by its line's outer edge",
      ring({ x: 5, y: 6 }, 2, { color: 0, width: 1 }),
      { x: 2.5, y: 3.5, width: 5, height: 5 },
    ],
    [
      "a line across, by its ends cut straight across",
      line({ x: 1, y: 5 }, { x: 9, y: 5 }, { color: 0, width: 2 }),
      { x: 1, y: 4, width: 8, height: 2 },
    ],
    [
      "a slanted line, by the corners its ends are cut at",
      line({ x: 0, y: 0 }, { x: 3, y: 4 }, { color: 0, width: 10 }),
      { x: -4, y: -3, width: 11, height: 10 },
    ],
    [
      "a line of no length, by its point alone",
      line({ x: 2, y: 3 }, { x: 2, y: 3 }, { color: 0, width: 4 }),
      { x: 2, y: 3, width: 0, height: 0 },
    ],
    [
      "a polyline, by half its width past its points",
      polyline(POINTS, { color: 0, width: 2 }),
      { x: -1, y: -1, width: 8, height: 6 },
    ],
    [
      "a polygon, by its points",
      polygon(POINTS, { color: 0 }),
      { x: 0, y: 0, width: 6, height: 4 },
    ],
  ])("bounds %s", (_name, command, extent) => {
    expect(extentOf(command)).toEqual(extent);
  });
});
