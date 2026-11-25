import { cellAt } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { WALL_LEGEND } from "../../rules/levels/legend";
import { billionths } from "../../testing/art_frames";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import {
  KICK_SQUASH,
  RALLY_POP,
  type StreakPlace,
  type Strip,
  flickerHeight,
  kickHeight,
  rallyPopScale,
  rampFaceOf,
  streakPlaceOf,
  swirlScale,
} from "./flourish";
import { FLICKER_MS, STREAK } from "./timing";

/** A wall of a ramp in each corner, low left to top right as the legend writes them, in field row 5, columns 1 to 4. */
const RAMPS = wallFrom([".LJF7...."], WALL_LEGEND, { lowestRow: 5 });

/** Returns the strip along the long face of the ramp in a column of row 5 of {@link RAMPS}, to a billionth, or null. */
function faceAt(column: number): Strip | null {
  const face = rampFaceOf(RAMPS, cellAt(RAMPS, column, 5), {
    x: 0,
    y: 0,
    length: 0,
    angle: 0,
  });
  return (
    face && {
      x: face.x,
      y: face.y,
      length: billionths(face.length),
      angle: billionths(face.angle),
    }
  );
}

describe("rampFaceOf", () => {
  it("runs a ramp's long face through its cell's middle, from corner to corner", () => {
    expect(faceAt(1)).toMatchObject({
      x: 1.5,
      y: 5.5,
      length: billionths(Math.SQRT2),
    });
  });

  it.each([
    ["L", 1, Math.PI / 4],
    ["J", 2, -Math.PI / 4],
    ["F", 3, -Math.PI / 4],
    ["7", 4, Math.PI / 4],
  ])(
    "turns the long face of the ramp %s from its left top down to its right foot, or up to its right top",
    (_, column, angle) => {
      expect(faceAt(column)?.angle).toBe(billionths(angle));
    },
  );

  it("finds no face where the cell holds no ramp", () => {
    expect(faceAt(0)).toBeNull();
  });

  it("finds the face of a fixture's ramp as the flight meets it", () => {
    const { wall } = FLIGHT_FIXTURES.ramp.start;
    const into: Strip = { x: 0, y: 0, length: 0, angle: 0 };

    expect(rampFaceOf(wall, cellAt(wall, 4, 5), into)?.angle).toBe(Math.PI / 4);
  });
});

describe("streakPlaceOf", () => {
  const into: StreakPlace = { x: 0, y: 0, angle: 0 };

  it("stands the streak's middle half a streak behind the fuzzball, back along the way it flies", () => {
    const place = streakPlaceOf({ x: 4, y: 5, dx: 3, dy: 4 }, into);

    expect({
      x: billionths(place?.x ?? NaN),
      y: billionths(place?.y ?? NaN),
    }).toEqual({
      x: billionths(4 - (3 / 5) * (STREAK / 2)),
      y: billionths(5 - (4 / 5) * (STREAK / 2)),
    });
  });

  it("turns the streak on the canvas the way the fuzzball flies, up the field being up the canvas", () => {
    expect(streakPlaceOf({ x: 4, y: 5, dx: 1, dy: 1 }, into)?.angle).toBe(
      -Math.PI / 4,
    );
  });

  it("shows no streak behind a fuzzball that heads nowhere", () => {
    expect(streakPlaceOf({ x: 4, y: 5, dx: 0, dy: 0 }, into)).toBeNull();
  });
});

describe("kickHeight", () => {
  it("squashes the spring as its kick starts and stands it at its height once it is over", () => {
    expect([kickHeight(0), kickHeight(1)].map(billionths)).toEqual([
      KICK_SQUASH,
      1,
    ]);
  });

  it("springs it back past its height on the way", () => {
    expect(kickHeight(0.6)).toBeGreaterThan(1);
  });
});

describe("swirlScale", () => {
  it("shrinks a swirl to nothing as a portal draws the fuzzball in", () => {
    expect([swirlScale(0, true), swirlScale(1, true)]).toEqual([1, 0]);
  });

  it("spreads a swirl from nothing as its twin lets the fuzzball out", () => {
    expect([swirlScale(0, false), swirlScale(1, false)]).toEqual([0, 1]);
  });
});

describe("rallyPopScale", () => {
  it("draws the rally's number larger as it pops and at its size once the pop is over", () => {
    expect([rallyPopScale(0), rallyPopScale(1)].map(billionths)).toEqual([
      billionths(1 + RALLY_POP),
      1,
    ]);
  });

  it("settles it a little under its size on the way", () => {
    expect(rallyPopScale(0.6)).toBeLessThan(1);
  });
});

describe("flickerHeight", () => {
  /** A time over which both waves come back into step, whatever their periods, in milliseconds: the two multiplied. */
  const turn = FLICKER_MS.slow * FLICKER_MS.fast;

  /** Returns the least and the most a tongue stands through a turn of both waves, a millisecond apart, each to a thousandth. */
  function rangeOf(tongue: number): { least: number; most: number } {
    let least = Infinity;
    let most = -Infinity;
    for (let now = 0; now < turn; now++) {
      const height = flickerHeight(tongue, now);
      least = Math.min(least, height);
      most = Math.max(most, height);
    }
    return { least: Number(least.toFixed(3)), most: Number(most.toFixed(3)) };
  }

  it("stands each of nine tongues between three quarters of its height at rest and the whole of it, reaching both to a thousandth", () => {
    expect(Array.from({ length: 9 }, (_, tongue) => rangeOf(tongue))).toEqual(
      Array.from({ length: 9 }, () => ({ least: 0.75, most: 1 })),
    );
  });

  it("flickers neighboring tongues apart", () => {
    expect(flickerHeight(0, 100)).not.toBe(flickerHeight(1, 100));
  });

  it("flickers a tongue with time", () => {
    expect(flickerHeight(0, 0)).not.toBe(flickerHeight(0, 100));
  });
});
