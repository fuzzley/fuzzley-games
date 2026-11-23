import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { KIND_IDS, type Wall } from "../catalog/kinds";
import { WALL_LEGEND } from "../levels/legend";
import { WALL_RULES } from "./wall_rules";

/** Returns a wall drawn as a picture, each brick with the hits given by wall cell, the lowest row first, and the rest whole. */
function wornWall(picture: readonly string[], hits: readonly number[]): Wall {
  const wall = wallFrom(picture, WALL_LEGEND);
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) =>
      brick === null ? null : { ...brick, hits: hits[cell] ?? brick.hits },
    ),
  };
}

describe("WALL_RULES", () => {
  it("needs broken the kinds the catalog marks needed", () => {
    expect(KIND_IDS.filter((kind) => WALL_RULES.needed(kind))).toEqual([
      "brick",
      "tough",
      "spring",
      "gem",
      "plated",
      "moss",
      "lock",
    ]);
  });

  // A moss brick of 2 at 1, and two of 3 at 1 and 2.
  it("grows each moss brick short of its full hits a hit back between rounds", () => {
    const wall = wornWall(["MNN......"], [1, 1, 2]);

    const grown = WALL_RULES.betweenRounds(wall);

    expect(grown.bricks.map((brick) => brick?.hits)).toEqual([
      2,
      2,
      3,
      ...Array<undefined>(6),
    ]);
  });

  it("grows no other kind back", () => {
    const wall = wornWall(["M3v......"], [1, 1, 1]);

    const grown = WALL_RULES.betweenRounds(wall);

    expect(grown.bricks.slice(1, 3)).toEqual(wall.bricks.slice(1, 3));
  });

  it("leaves the wall as it is where no moss grows", () => {
    const wall = wornWall(["MN3......"], [2, 3, 1]);

    expect(WALL_RULES.betweenRounds(wall)).toBe(wall);
  });

  it("leaves the wall it is handed as it was", () => {
    const wall = wornWall(["MN......."], [1, 1]);
    const handed = structuredClone(wall);

    WALL_RULES.betweenRounds(wall);

    expect(wall).toStrictEqual(handed);
  });
});
