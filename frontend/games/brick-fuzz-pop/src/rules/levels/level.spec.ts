import { wallFrom } from "../../testing/wall_picture";
import { FIRST_X } from "../tuning";
import { type Level, levelStart } from "./level";

const { bricks, rows } = wallFrom(["o........", ".........", "#........"]);

/** A level of a plain brick over a row of air and a steel brick. */
const LEVEL: Level = { boon: "triple", bricks, rows };

describe("levelStart", () => {
  // plan.md's table in "The wall": a depth, and the row a wall opens on.
  it.each([
    [11, 5],
    [12, 6],
    [13, 5],
    [14, 6],
    [15, 7],
    [16, 6],
    [17, 7],
    [18, 8],
    [19, 7],
    [20, 8],
    [21, 9],
    [22, 8],
  ])(
    "opens a level on a field %s deep with its wall's lowest row on row %s",
    (depth, opensOn) => {
      expect(levelStart(LEVEL, depth).wall.lowestRow).toBe(opensOn);
    },
  );

  it("starts with the level's wall, its fuzzball at the floor's middle, no friend and no boon", () => {
    expect(levelStart(LEVEL, 16)).toEqual({
      wall: { bricks, rows: 3, lowestRow: 6 },
      depth: 16,
      x: FIRST_X,
      crew: { friends: [] },
      boon: null,
    });
  });

  it.each([10, 23])("refuses a field %s deep", (depth) => {
    expect(() => levelStart(LEVEL, depth)).toThrow(RangeError);
  });
});
