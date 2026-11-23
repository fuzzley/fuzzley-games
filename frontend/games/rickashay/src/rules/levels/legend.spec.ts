import { COLUMNS } from "@fz/brick-wall/rules/field";
import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { isKeyOf, keysOf } from "@fz/core/records";
import { KIND_IDS, type KindId, kindOf } from "../catalog/kinds";
import {
  LEGEND,
  LOCK_BOLTS,
  type LegendBrick,
  type LegendCharacter,
  type LegendKindId,
  NO_BRICK,
  PORTAL_MARKS,
  WALL_LEGEND,
  tintOf,
} from "./legend";

const CHARACTERS = keysOf(LEGEND);

/** The kinds that break, and those that never do. */
const BREAKING = KIND_IDS.filter((id) => kindOf(id).hits !== "never");
const LASTING = KIND_IDS.filter((id) => kindOf(id).hits === "never");

// Every kind the catalog holds is one the legend names, as the compiler
// checks here, so a kind added under an id the legend doesn't use fails.
const CATALOGED: readonly LegendKindId[] = KIND_IDS;

/** Returns the legend's characters of a kind, in its order. */
function charactersOf(kind: KindId): LegendCharacter[] {
  return CHARACTERS.filter((character) => LEGEND[character].kind === kind);
}

/**
 * Returns the tint of a character in a wall cell, the wall's cells before
 * it empty, so a cell's row is its cell over the nine of a row.
 */
function tintIn(character: string, cell: number): number {
  return tintOf(NO_BRICK.repeat(cell) + character, cell);
}

describe("the legend", () => {
  // An object lists its keys that are numbers first, so a ramp's 7 comes
  // before its L.
  it.each(CATALOGED)("writes %s in the characters its kind lists", (id) => {
    expect(charactersOf(id).sort()).toEqual([...kindOf(id).letters].sort());
  });

  it("keeps the empty cell's character for no brick", () => {
    expect(isKeyOf(NO_BRICK, LEGEND)).toBe(false);
  });

  it.each(BREAKING)(
    "gives %s the fewest and the most hits its kind lists",
    (id) => {
      const given = charactersOf(id).map((character) => LEGEND[character].hits);
      const { hits, mostHits } = kindOf(id);

      expect([Math.min(...given), Math.max(...given)]).toEqual([
        hits,
        mostHits,
      ]);
    },
  );

  it.each(LASTING)("gives %s, which never breaks, no hits", (id) => {
    const given = charactersOf(id).map((character) => LEGEND[character].hits);

    expect(given.filter((hits) => hits !== 0)).toEqual([]);
  });

  it.each(["2", "3", "4", "5", "6"] as const)(
    "makes %s a tough brick of that many hits",
    (character) => {
      expect(LEGEND[character]).toEqual({
        kind: "tough",
        hits: Number(character),
        plates: 0,
      });
    },
  );

  it.each(
    CHARACTERS.filter(
      (character) =>
        LEGEND[character].kind !== "plated" &&
        LEGEND[character].kind !== "ramp",
    ),
  )("plates no face of %s, neither a plated brick nor a ramp", (character) => {
    expect(LEGEND[character].plates).toBe(0);
  });

  // A plate covers a brick's faces, as @fz/brick-wall/rules/grid names them.
  it.each<[LegendCharacter, LegendBrick]>([
    ["v", { kind: "plated", hits: 2, plates: FLOORWARD }],
    ["V", { kind: "plated", hits: 3, plates: FLOORWARD }],
    ["U", { kind: "plated", hits: 2, plates: FLOORWARD | LEFT | RIGHT }],
  ])("plates %s as the design's table of bricks has it", (character, brick) => {
    expect(LEGEND[character]).toEqual(brick);
  });

  it.each<[LegendCharacter, number]>([
    ["L", FLOORWARD | LEFT],
    ["J", FLOORWARD | RIGHT],
    ["F", CEILINGWARD | LEFT],
    ["7", CEILINGWARD | RIGHT],
  ])(
    "stands the ramp %s on the two faces of the corner its right angle sits in",
    (character, plates) => {
      expect(LEGEND[character]).toEqual({ kind: "ramp", hits: 0, plates });
    },
  );

  it("writes a wall's two pairs of portals apart, its first pair's mark first", () => {
    expect([charactersOf("portal"), PORTAL_MARKS]).toEqual([
      ["@", "&"],
      ["@", "&"],
    ]);
  });

  it("writes the locks in the order of their bolts", () => {
    expect([charactersOf("lock"), LOCK_BOLTS]).toEqual([
      ["x", "y", "z"],
      ["x", "y", "z"],
    ]);
  });
});

describe("tintOf", () => {
  it.each(["o", "2", "6", "G"])(
    "tints %s by its wall row, the eight in turn from the lowest",
    (character) => {
      const rows = [0, 1, 7, 8, 13];

      const tints = rows.map((row) => tintIn(character, row * COLUMNS + 4));

      expect(tints).toEqual([0, 1, 7, 0, 5]);
    },
  );

  it.each<[LegendCharacter, number]>([
    ["@", 0],
    ["&", 1],
  ])("gives the portal %s its pair's mark, %s", (character, mark) => {
    expect(tintIn(character, 5 * COLUMNS)).toBe(mark);
  });

  it.each<[LegendCharacter, number]>([
    ["x", 1],
    ["y", 2],
    ["z", 3],
  ])("gives the lock %s its bolts, %s", (character, bolts) => {
    expect(tintIn(character, 5 * COLUMNS)).toBe(bolts);
  });

  it.each(["#", "L", "=", "S", "v", "U", "M", "N"])(
    "leaves %s its own ink, whatever its row",
    (character) => {
      expect(tintIn(character, 5 * COLUMNS)).toBe(0);
    },
  );

  it.each([
    ["no brick", NO_BRICK],
    ["a character the legend lacks", "?"],
  ])("gives a cell of %s 0", (_, character) => {
    expect(tintIn(character, 2 * COLUMNS)).toBe(0);
  });
});

describe("WALL_LEGEND", () => {
  it("lays out a wall's ramps on their corners, its locks with their bolts and its portals as twins", () => {
    const wall = wallFrom(
      ["7.z@", "L.x@"].map((row) => row.padEnd(9, ".")),
      WALL_LEGEND,
    );

    expect(
      [0, 2, 3, 9, 11, 12].map((cell) => {
        const brick = wall.bricks[cell];
        return [brick?.kind, brick?.plates, brick?.tint, brick?.twin];
      }),
    ).toEqual([
      ["ramp", FLOORWARD | LEFT, 0, null],
      ["lock", 0, 1, null],
      ["portal", 0, 0, 12],
      ["ramp", CEILINGWARD | RIGHT, 0, null],
      ["lock", 0, 3, null],
      ["portal", 0, 0, 3],
    ]);
  });
});
