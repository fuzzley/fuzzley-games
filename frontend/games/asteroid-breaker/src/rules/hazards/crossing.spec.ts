import { entriesOf, entryOf } from "../../testing/crossings";
import { PICTURE_TORUS, fieldFrom } from "../../testing/field_picture";
import { STEP_S } from "../tuning";
import {
  type Crossing,
  blankCrossing,
  comeIn,
  edgeOf,
  fly,
  hasLeft,
  reaches,
} from "./crossing";

/** A rock in the field's corner and the ship, far off it. */
const PICTURE = ["L", "", "", "", "........^"];

/** The picture's field's width and height. */
const { width: WIDTH, height: HEIGHT } = PICTURE_TORUS;

/** How far off its edge a crossing comes in, and how far its heading may tilt, in degrees. */
const MARGIN = 2;
const TILT = 30;

/** The seeds the specs of what is drawn try. */
const SEEDS = Array.from({ length: 40 }, (_, seed) => seed + 1);

/** Returns a crossing on its way at a place, heading a way. */
function crossingAt(x: number, y: number, heading = 0): Crossing {
  return { live: true, x, y, heading, lastX: x, lastY: y };
}

describe("blankCrossing", () => {
  it("returns a crossing not on its way", () => {
    const crossing = blankCrossing();

    expect(crossing.live).toBe(false);
  });
});

describe("comeIn", () => {
  it("puts a crossing off any edge by its margin, heading across within its tilt", () => {
    const entries = SEEDS.map((seed) => {
      const field = fieldFrom(PICTURE, { seed });
      const crossing = blankCrossing();
      comeIn(field, crossing, MARGIN, TILT);
      return entryOf(crossing, field.torus);
    });

    expect(entriesOf(entries, MARGIN, TILT)).toEqual({ edges: 4, wrong: [] });
  });

  it("puts a crossing on its way, where it was a step ago", () => {
    const field = fieldFrom(PICTURE);
    const crossing = blankCrossing();

    comeIn(field, crossing, MARGIN, TILT);

    expect(crossing).toMatchObject({
      live: true,
      lastX: crossing.x,
      lastY: crossing.y,
    });
  });
});

describe("edgeOf", () => {
  it.each([
    [-MARGIN, 10, { x: 0, y: 10 }],
    [WIDTH + MARGIN, 10, { x: WIDTH, y: 10 }],
    [10, -MARGIN, { x: 10, y: 0 }],
    [10, HEIGHT + MARGIN, { x: 10, y: HEIGHT }],
  ])("returns the place on the edge nearest %s, %s", (x, y, edge) => {
    const crossing = crossingAt(x, y);

    const place = edgeOf(crossing, PICTURE_TORUS);

    expect(place).toEqual(edge);
  });
});

describe("fly", () => {
  it("flies a crossing a step along its heading at its speed", () => {
    const crossing = crossingAt(10, 10, Math.PI / 2);

    fly(crossing, 6);

    expect(crossing.x).toBeCloseTo(10);
    expect(crossing.y).toBeCloseTo(10 + 6 * STEP_S);
  });

  it("flies a crossing past an edge without wrapping", () => {
    const crossing = crossingAt(WIDTH - 0.01, 10);

    fly(crossing, 6);

    expect(crossing.x).toBeGreaterThan(WIDTH);
  });
});

describe("hasLeft", () => {
  it.each([
    [WIDTH + MARGIN, 10, false],
    [WIDTH + MARGIN + 0.01, 10, true],
    [10, -MARGIN - 0.01, true],
    [10, HEIGHT + MARGIN, false],
  ])("says whether a crossing at %s, %s has left the field", (x, y, left) => {
    const crossing = crossingAt(x, y);

    const hasGone = hasLeft(crossing, MARGIN, PICTURE_TORUS);

    expect(hasGone).toBe(left);
  });
});

describe("reaches", () => {
  it("reaches a place within its reach", () => {
    const crossing = crossingAt(10, 10);

    const reached = reaches(crossing, { x: 12, y: 10 }, 2, PICTURE_TORUS);

    expect(reached).toBe(true);
  });

  it("reaches across the wrap from on the field", () => {
    const crossing = crossingAt(0.5, 10);

    const reached = reaches(
      crossing,
      { x: WIDTH - 0.5, y: 10 },
      2,
      PICTURE_TORUS,
    );

    expect(reached).toBe(true);
  });

  it("reaches nothing with its middle off the field", () => {
    const crossing = crossingAt(-0.5, 10);

    const reached = reaches(
      crossing,
      { x: WIDTH - 0.5, y: 10 },
      2,
      PICTURE_TORUS,
    );

    expect(reached).toBe(false);
  });
});
