import { DEPTHS, FIRST_X } from "./field";
import { FLOORWARD } from "./grid";
import {
  type Legend,
  type PictureRules,
  levelOpening,
  pictureProblem,
  wallFrom,
} from "./level_picture";
import { thirdsOf } from "./wall";

/** Kinds of brick made up for the specs, gates coming in pairs of twins. */
type Kind = "pebble" | "flint" | "slate" | "gate";

/**
 * Returns how many of a cell's character stand before it, so a brick's tint
 * says it was handed the picture's characters by wall cell, its lowest row
 * first.
 */
function sameBefore(characters: string, cell: number): number {
  const character = characters.charAt(cell);
  return Array.from(characters.slice(0, cell)).filter(
    (before) => before === character,
  ).length;
}

/** The legend the specs read their pictures against. */
const LEGEND: Legend<Kind> = {
  none: ".",
  bricks: {
    p: { kind: "pebble", hits: 1, plates: 0 },
    f: { kind: "flint", hits: 3, plates: 0 },
    "^": { kind: "flint", hits: 2, plates: FLOORWARD },
    "#": { kind: "slate", hits: 0, plates: 0 },
    "@": { kind: "gate", hits: 0, plates: 0 },
    "&": { kind: "gate", hits: 0, plates: 0 },
  },
  twinMarks: ["@", "&"],
  tintOf: sameBefore,
};

/** The rules the specs hold their levels' pictures to. */
const RULES: PictureRules<Kind> = {
  legend: LEGEND,
  rows: { least: 3, most: 6 },
  mostAir: 1,
  twinRows: 2,
};

const AIR = ".........";
const PEBBLES = "ppppppppp";

/** Returns a picture of a wall: rows on top, rows at the bottom, and pebbles between them, as many as make the fewest rows. */
function picture(
  top: readonly string[],
  bottom: readonly string[] = [],
): string[] {
  const between = Math.max(0, RULES.rows.least - top.length - bottom.length);
  return [...top, ...Array<string>(between).fill(PEBBLES), ...bottom];
}

describe("wallFrom", () => {
  it("lays a picture out from its lowest row up, each row left to right", () => {
    const wall = wallFrom(["^#.......", "p.......f"], LEGEND, { lowestRow: 5 });

    expect(wall).toEqual({
      bricks: [
        { kind: "pebble", hits: 1, full: 1, plates: 0, tint: 0, twin: null },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { kind: "flint", hits: 3, full: 3, plates: 0, tint: 0, twin: null },
        {
          kind: "flint",
          hits: 2,
          full: 2,
          plates: FLOORWARD,
          tint: 0,
          twin: null,
        },
        { kind: "slate", hits: 0, full: 0, plates: 0, tint: 0, twin: null },
        ...Array<null>(7).fill(null),
      ],
      rows: 2,
      lowestRow: 5,
    });
  });

  it("stands the wall's lowest row over the floor's by default", () => {
    expect(wallFrom([PEBBLES], LEGEND).lowestRow).toBe(1);
  });

  it("tints each brick as the legend says, handed the picture's characters from its lowest row up", () => {
    const wall = wallFrom(["p..p.....", "pp......."], LEGEND);

    expect(
      wall.bricks.flatMap((brick) => (brick === null ? [] : [brick.tint])),
    ).toEqual([0, 1, 2, 3]);
  });

  it("lays out an empty picture as a wall of no rows", () => {
    expect(wallFrom([], LEGEND)).toEqual({ bricks: [], rows: 0, lowestRow: 1 });
  });

  it.each(["........", ".........."])(
    "refuses a row that isn't nine wide, such as %s",
    (row) => {
      expect(() => wallFrom([AIR, row], LEGEND)).toThrow(
        `A wall's picture is 9 characters wide a row, not "${row}".`,
      );
    },
  );

  it("refuses a character the legend lacks", () => {
    expect(() => wallFrom(["....?...."], LEGEND)).toThrow(
      `A wall's picture holds "?", which the legend lacks.`,
    );
  });

  it("lays a pair of twins out as each other's twins", () => {
    const wall = wallFrom(["@........", "........@"], LEGEND);

    expect([wall.bricks[8]?.twin, wall.bricks[9]?.twin]).toEqual([9, 8]);
  });

  it("pairs each mark's twins on their own, the second pair's and the first's", () => {
    const wall = wallFrom(["&..@.....", "@..&....."], LEGEND);

    expect(
      [0, 3, 9, 12].map((cell) => wall.bricks[cell]?.twin ?? null),
    ).toEqual([12, 9, 3, 0]);
  });

  it("twins no brick of a picture with no mark", () => {
    expect(
      wallFrom([PEBBLES], LEGEND).bricks.every((brick) => brick?.twin === null),
    ).toBe(true);
  });

  it.each([
    ["once", "...@.....", 1],
    ["three times", "@@.@.....", 3],
  ])("refuses a twin's mark used %s", (_, row, count) => {
    expect(() => wallFrom([row], LEGEND)).toThrow(
      `A wall's picture holds ${String(count)} of the twin "@", where a pair has 2.`,
    );
  });
});

describe("pictureProblem", () => {
  it("finds none in a picture that keeps the rules", () => {
    expect(
      pictureProblem(picture(["p@.......", "p@......."]), RULES),
    ).toBeNull();
  });

  it.each([
    ["two pairs of twins", picture(["@@&&ppppp"])],
    [
      `twins ${String(RULES.twinRows)} rows apart`,
      picture(["@pppppppp", PEBBLES, "@pppppppp"]),
    ],
    ["a row of air between bricks", picture([PEBBLES, AIR, PEBBLES])],
    [
      "rows of air apart, each as many together as the rules let",
      [PEBBLES, AIR, PEBBLES, AIR, PEBBLES],
    ],
    [
      `the most rows the rules let, ${String(RULES.rows.most)}`,
      Array<string>(RULES.rows.most).fill(PEBBLES),
    ],
  ])("finds none in a picture with %s", (_, rows) => {
    expect(pictureProblem(rows, RULES)).toBeNull();
  });

  it.each<[string, readonly string[], string]>([
    ["too few rows", [PEBBLES, PEBBLES], "its wall has 2 rows, not 3 to 6"],
    [
      "too many rows",
      Array<string>(7).fill(PEBBLES),
      "its wall has 7 rows, not 3 to 6",
    ],
    [
      "a row too short",
      picture(["pppppppp"]),
      "row 1 of its picture is 8 long, not 9",
    ],
    [
      "a row too long",
      picture([], ["pppppppppp"]),
      "row 3 of its picture is 10 long, not 9",
    ],
    [
      "a character the legend lacks",
      picture([], ["ppppZpppp"]),
      `"Z", in row 3 of its picture, stands for no brick`,
    ],
    ["a highest row of air", picture([AIR]), "its wall's highest row is air"],
    ["a lowest row of air", picture([], [AIR]), "its wall's lowest row is air"],
    [
      "more rows of air together than the rules let",
      [PEBBLES, AIR, AIR, PEBBLES],
      "rows 2 to 3 of its picture are air, more than 1 together",
    ],
    [
      "a twin's mark used once",
      picture(["pppp@pppp"]),
      `it has 1 of the twin "@", where a pair has 2`,
    ],
    [
      "a twin's mark used three times",
      picture(["p@pp@pp@p"]),
      `it has 3 of the twin "@", where a pair has 2`,
    ],
    [
      "a second pair with no first",
      picture(["pp&ppp&pp"]),
      `its twins "&" are a second pair, with no first, "@"`,
    ],
    [
      "twins farther apart than the rules let",
      picture(["pppp@pppp", PEBBLES, PEBBLES, "pppp@pppp"]),
      `its twins "@" stand 3 rows apart, more than 2`,
    ],
  ])("names %s", (_, rows, problem) => {
    expect(pictureProblem(rows, RULES)).toBe(problem);
  });
});

describe("levelOpening", () => {
  const { bricks, rows } = wallFrom(["p........", AIR, "#........"], LEGEND);

  it.each(DEPTHS)(
    "opens a level on a field %s deep with its wall's lowest row where a jump lands it",
    (depth) => {
      expect(levelOpening({ bricks, rows }, depth).wall.lowestRow).toBe(
        thirdsOf(depth).opensOn,
      );
    },
  );

  it("stands the level's wall as it is, its fuzzball waiting at the floor's middle", () => {
    const level = { bricks, rows, name: "spec" };

    expect(levelOpening(level, 16)).toEqual({
      wall: { bricks, rows, lowestRow: 6 },
      x: FIRST_X,
    });
  });

  it("hands each opening its level's bricks, not a copy", () => {
    expect(levelOpening({ bricks, rows }, 11).wall.bricks).toBe(bricks);
  });

  it.each([10, 23])("refuses a field %s deep", (depth) => {
    expect(() => levelOpening({ bricks, rows }, depth)).toThrow(RangeError);
  });
});
