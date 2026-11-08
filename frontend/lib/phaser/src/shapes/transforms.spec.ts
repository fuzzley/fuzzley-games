import {
  type DrawCommand,
  ORIGIN,
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "./shapes";
import { bounded, centered, placed, scaledBy, shifted } from "./transforms";

/** The style the specs draw lines in. */
const PEN = { color: 9, width: 2 };

describe("placed", () => {
  it("scales points about the origin, then moves them", () => {
    expect(placed([{ x: 1, y: -2 }], 3, { x: 10, y: 20 })).toEqual([
      { x: 13, y: 14 },
    ]);
  });

  it("leaves scaled points about the origin, given no place", () => {
    expect(placed([{ x: 1, y: -2 }], 3)).toEqual([{ x: 3, y: -6 }]);
  });
});

describe("scaledBy", () => {
  it.each<[DrawCommand, DrawCommand]>([
    [
      roundRect({ x: 1, y: 2, width: 3, height: 4 }, 1, PEN),
      roundRect({ x: 2, y: 4, width: 6, height: 8 }, 2, PEN),
    ],
    [circle({ x: 1, y: 2 }, 3, PEN), circle({ x: 2, y: 4 }, 6, PEN)],
    [
      ring({ x: 1, y: 2 }, 3, { color: 9, width: 1 }),
      ring({ x: 2, y: 4 }, 6, { color: 9, width: 2 }),
    ],
    [
      line({ x: 1, y: 2 }, { x: 3, y: -1 }, { color: 9, width: 1 }),
      line({ x: 2, y: 4 }, { x: 6, y: -2 }, { color: 9, width: 2 }),
    ],
    [
      rect({ x: 1, y: 2, width: 3, height: 4 }, PEN),
      rect({ x: 2, y: 4, width: 6, height: 8 }, PEN),
    ],
    [
      polyline([{ x: 1, y: 2 }], { color: 9, width: 1 }),
      polyline([{ x: 2, y: 4 }], { color: 9, width: 2 }),
    ],
    [polygon([{ x: 1, y: 2 }], PEN), polygon([{ x: 2, y: 4 }], PEN)],
  ])("scales a %o with its lines", (command, twice) => {
    expect(scaledBy(command, 2)).toEqual(twice);
  });
});

describe("shifted", () => {
  it.each<[DrawCommand, DrawCommand]>([
    [
      roundRect({ x: 1, y: 2, width: 3, height: 4 }, 1, PEN),
      roundRect({ x: 11, y: 22, width: 3, height: 4 }, 1, PEN),
    ],
    [circle({ x: 1, y: 2 }, 3, PEN), circle({ x: 11, y: 22 }, 3, PEN)],
    [ring({ x: 1, y: 2 }, 3, PEN), ring({ x: 11, y: 22 }, 3, PEN)],
    [
      line({ x: 1, y: 2 }, { x: 3, y: -1 }, PEN),
      line({ x: 11, y: 22 }, { x: 13, y: 19 }, PEN),
    ],
    [
      rect({ x: 1, y: 2, width: 3, height: 4 }, PEN),
      rect({ x: 11, y: 22, width: 3, height: 4 }, PEN),
    ],
    [polyline([{ x: 1, y: 2 }], PEN), polyline([{ x: 11, y: 22 }], PEN)],
    [polygon([{ x: 1, y: 2 }], PEN), polygon([{ x: 11, y: 22 }], PEN)],
  ])("moves a %o", (command, moved) => {
    expect(shifted(command, { x: 10, y: 20 })).toEqual(moved);
  });
});

describe("centered", () => {
  it("frames a drawing as far as it reaches either way from its middle, in whole pixels, its middle the frame's", () => {
    const frame = centered("dot", [
      circle({ x: 2, y: 0 }, 3.5, PEN),
      line({ x: 0, y: -1 }, { x: 0, y: 6 }, PEN),
    ]);

    expect(frame).toEqual({
      name: "dot",
      width: 12,
      height: 12,
      commands: [
        circle({ x: 8, y: 6 }, 3.5, PEN),
        line({ x: 6, y: 5 }, { x: 6, y: 12 }, PEN),
      ],
    });
  });

  it("frames a line of no length by its point alone, as it draws nothing past it", () => {
    const frame = centered("none", [line({ x: 3, y: 0 }, { x: 3, y: 0 }, PEN)]);

    expect([frame.width, frame.height]).toEqual([6, 2]);
  });

  it("frames a ring by its line's outer edge", () => {
    expect(centered("ring", [ring(ORIGIN, 4, PEN)])).toMatchObject({
      width: 10,
      height: 10,
    });
  });

  it("frames a rounded rectangle by its corners and a polygon by its points", () => {
    expect([
      centered("shot", [
        roundRect({ x: -3, y: -1, width: 6, height: 2 }, 1, PEN),
      ]),
      centered("tri", [
        polygon(
          [
            { x: 0, y: -2 },
            { x: 4, y: 1 },
          ],
          PEN,
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

describe("bounded", () => {
  it("frames a drawing about the middle of its own bounds", () => {
    const frame = bounded("tail", [
      circle(ORIGIN, 1, PEN),
      line({ x: -5, y: 0 }, ORIGIN, PEN),
    ]);

    expect(frame).toEqual({
      name: "tail",
      width: 6,
      height: 2,
      commands: [
        circle({ x: 5, y: 1 }, 1, PEN),
        line({ x: 0, y: 1 }, { x: 5, y: 1 }, PEN),
      ],
    });
  });

  it("frames a line slanted across by the corners its ends are cut at", () => {
    const frame = bounded("slant", [
      line(ORIGIN, { x: 3, y: 4 }, { color: 9, width: 10 }),
    ]);

    // Its ends are cut across it, 4 across and 3 down from each end's point.
    expect([frame.width, frame.height]).toEqual([12, 10]);
  });
});
