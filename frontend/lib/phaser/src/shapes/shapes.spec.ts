import {
  type DrawCommand,
  circle,
  extentOf,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
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

describe("the shapes", () => {
  it("clamp a rectangle's size to nothing", () => {
    expect(rect({ x: 1, y: 2, width: -3, height: 4 }, 7)).toEqual({
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
      roundRect({ x: 0, y: 0, width: 10, height: 4 }, 5, 1),
      roundRect({ x: 0, y: 0, width: 4, height: -2 }, 1, 1),
      roundRect({ x: 0, y: 0, width: 10, height: 10 }, -1, 1),
    ]).toMatchObject([
      { width: 10, height: 4, radius: 2 },
      { width: 4, height: 0, radius: 0 },
      { radius: 0 },
    ]);
  });

  it("clamp a circle's and a ring's radius to nothing", () => {
    expect([circle(0, 0, -1, 1), ring(0, 0, -1, 2, 1)]).toMatchObject([
      { radius: 0 },
      { radius: 0, width: 2 },
    ]);
  });
});

describe("extentOf", () => {
  it.each<[string, DrawCommand, readonly number[]]>([
    ["a rectangle", rect({ x: 1, y: 2, width: 3, height: 4 }, 0), [1, 2, 4, 6]],
    [
      "a rounded rectangle",
      roundRect({ x: 1, y: 2, width: 3, height: 4 }, 1, 0),
      [1, 2, 4, 6],
    ],
    ["a circle", circle(5, 6, 2, 0), [3, 4, 7, 8]],
    [
      "a ring, by its line's outer edge",
      ring(5, 6, 2, 1, 0),
      [2.5, 3.5, 7.5, 8.5],
    ],
    [
      "a line across, by its ends cut straight across",
      line({ x: 1, y: 5 }, { x: 9, y: 5 }, 2, 0),
      [1, 4, 9, 6],
    ],
    [
      "a slanted line, by the corners its ends are cut at",
      line({ x: 0, y: 0 }, { x: 3, y: 4 }, 10, 0),
      [-4, -3, 7, 7],
    ],
    [
      "a line of no length, by its point alone",
      line({ x: 2, y: 3 }, { x: 2, y: 3 }, 4, 0),
      [2, 3, 2, 3],
    ],
    [
      "a polyline, by half its width past its points",
      polyline(
        [
          { x: 0, y: 4 },
          { x: 2, y: 0 },
          { x: 6, y: 1 },
        ],
        2,
        0,
      ),
      [-1, -1, 7, 5],
    ],
    [
      "a polygon, by its points",
      polygon(
        [
          { x: 0, y: 4 },
          { x: 2, y: 0 },
          { x: 6, y: 1 },
        ],
        0,
      ),
      [0, 0, 6, 4],
    ],
  ])("bounds %s", (_name, command, extent) => {
    expect(extentOf(command)).toEqual(extent);
  });
});
