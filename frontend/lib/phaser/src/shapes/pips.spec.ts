import { diePips, pipRow } from "./pips";
import { circle } from "./shapes";

/** The pips' middle, off the diagonal, so a spec tells across from down. */
const MIDDLE = { x: 50, y: 30 };

const STYLE = { color: 3 };

describe("diePips", () => {
  /** Returns where each pip of a face sits. */
  function placesOf(count: number): readonly (readonly [number, number])[] {
    return diePips(count, MIDDLE, 10, 2, STYLE).map(({ x, y }) => [x, y]);
  }

  it.each([
    [1, [[50, 30]]],
    [
      2,
      [
        [60, 20],
        [40, 40],
      ],
    ],
    [
      3,
      [
        [60, 20],
        [50, 30],
        [40, 40],
      ],
    ],
    [
      4,
      [
        [40, 20],
        [60, 20],
        [40, 40],
        [60, 40],
      ],
    ],
    [
      5,
      [
        [40, 20],
        [60, 20],
        [50, 30],
        [40, 40],
        [60, 40],
      ],
    ],
    [
      6,
      [
        [40, 20],
        [60, 20],
        [40, 30],
        [60, 30],
        [40, 40],
        [60, 40],
      ],
    ],
  ])("lays %i pips as a die's face does", (count, places) => {
    expect(placesOf(count)).toEqual(places);
  });

  it("draws each pip as a circle of the radius, in the style's color", () => {
    expect(diePips(1, MIDDLE, 10, 2, STYLE)).toEqual([
      circle(MIDDLE, 2, STYLE),
    ]);
  });

  it.each([0, 7, 1.5])(
    "refuses %s pips, which no die's face shows",
    (count) => {
      expect(() => diePips(count, MIDDLE, 10, 2, STYLE)).toThrow(RangeError);
    },
  );
});

describe("pipRow", () => {
  it.each([
    [1, [50]],
    [2, [45, 55]],
    [3, [40, 50, 60]],
    [4, [35, 45, 55, 65]],
  ])("lays %i pips in a row across a middle, a step apart", (count, across) => {
    expect(pipRow(count, MIDDLE, 10, 2, STYLE)).toEqual(
      across.map((x) => circle({ x, y: 30 }, 2, STYLE)),
    );
  });

  it("lays no pips for none", () => {
    expect(pipRow(0, MIDDLE, 10, 2, STYLE)).toEqual([]);
  });

  it.each([-1, 1.5])("refuses %s pips, which no row has", (count) => {
    expect(() => pipRow(count, MIDDLE, 10, 2, STYLE)).toThrow(RangeError);
  });
});
