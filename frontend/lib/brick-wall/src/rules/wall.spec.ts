import { COLUMNS, DEPTHS } from "./field";
import { cellAt, cellOf, fieldRowOf } from "./grid";
import {
  type Brick,
  DANGER_ROW,
  type Wall,
  type WallRules,
  dangerCells,
  inDanger,
  isCleared,
  isNeeded,
  lowerWall,
  lowestNeededRow,
  neededBelow,
  thirdsOf,
} from "./wall";

/** Kinds of brick made up for the specs: a level needs pebbles and lichen broken, not slate or gates. */
type Kind = "pebble" | "slate" | "lichen" | "gate";

/** The kind each character of a spec's rows stands for, each brick whole with the hits beside it. */
const KINDS: Readonly<Record<string, readonly [Kind, number]>> = {
  o: ["pebble", 1],
  "#": ["slate", 0],
  w: ["lichen", 3],
  "@": ["gate", 0],
};

/** The rules of the specs' kinds, under which a wall stands between rounds as it is. */
const RULES: WallRules<Kind> = {
  needed: (kind) => kind === "pebble" || kind === "lichen",
  betweenRounds: (wall) => wall,
};

/** The rules of the specs' kinds, under which a worn brick grows a hit back between rounds. */
const HEALING: WallRules<Kind> = {
  ...RULES,
  betweenRounds: (wall) => ({
    ...wall,
    bricks: wall.bricks.map((brick) =>
      brick !== null && brick.hits < brick.full
        ? { ...brick, hits: brick.hits + 1 }
        : brick,
    ),
  }),
};

const AIR = ".........";
const PEBBLES = "ooooooooo";
const SLATE = "#########";

/**
 * Returns a wall laid out from rows of nine characters, each keyed by the
 * field row it stands in, `.` for no brick and every row between the
 * lowest and the highest key not given air.
 */
function wallOf(rows: Readonly<Record<number, string>>): Wall<Kind> {
  const fieldRows = Object.keys(rows).map(Number);
  const lowestRow = Math.min(...fieldRows);
  const count = Math.max(...fieldRows) - lowestRow + 1;
  const bricks = Array.from({ length: count }, (_, wallRow) =>
    Array.from(rows[lowestRow + wallRow] ?? AIR, (character) => {
      const kind = KINDS[character];
      if (kind === undefined) return null;
      const [id, hits] = kind;
      return { kind: id, hits, full: hits, plates: 0, tint: 0, twin: null };
    }),
  ).flat();
  return { bricks, rows: count, lowestRow };
}

/** Returns a wall with a pair of gates at two of its cells, each the other's twin. */
function withTwins(wall: Wall<Kind>, one: number, other: number): Wall<Kind> {
  const gate = (twin: number): Brick<Kind> => ({
    kind: "gate",
    hits: 0,
    full: 0,
    plates: 0,
    tint: 0,
    twin,
  });
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) => {
      if (cell === one) return gate(other);
      return cell === other ? gate(one) : brick;
    }),
  };
}

/** Returns a wall with the bricks of a field row broken, as a round breaks them. */
function brokenRow(wall: Wall<Kind>, fieldRow: number): Wall<Kind> {
  const first = cellAt(wall, 0, fieldRow);
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) =>
      cell >= first && cell < first + COLUMNS ? null : brick,
    ),
  };
}

/** Returns a wall with every brick it holds worn to a number of hits, as a round's strikes leave them. */
function wornTo(wall: Wall<Kind>, hits: number): Wall<Kind> {
  return {
    ...wall,
    bricks: wall.bricks.map((brick) =>
      brick === null ? null : { ...brick, hits },
    ),
  };
}

/** Returns the field rows a wall's bricks stand in, the lowest first, a row once. */
function rowsWithBricks(wall: Wall<Kind>): number[] {
  const rows = wall.bricks.flatMap((brick, cell) =>
    brick === null ? [] : [fieldRowOf(wall, cell)],
  );
  return [...new Set(rows)];
}

describe("thirdsOf", () => {
  // A depth, its jump, and the row a wall opens on and a jump lands it on.
  it.each([
    [11, 3, 5],
    [12, 3, 6],
    [13, 4, 5],
    [14, 4, 6],
    [15, 4, 7],
    [16, 5, 6],
    [17, 5, 7],
    [18, 5, 8],
    [19, 6, 7],
    [20, 6, 8],
    [21, 6, 9],
    [22, 7, 8],
  ])(
    "gives a field %s deep a jump of %s rows, its wall opening on row %s",
    (depth, jump, opensOn) => {
      expect(thirdsOf(depth)).toEqual({
        depth,
        jump,
        jumpLine: depth - jump,
        opensOn,
      });
    },
  );

  it("runs the jump line under the top third, the jump's rows", () => {
    const { depth, jump, jumpLine } = thirdsOf(16);

    expect(depth - jumpLine).toBe(jump);
  });

  // A jump brings down nothing that stood under the jump line, so a wall it
  // lands stands where a level opens, or higher.
  it("lands a jump from the jump line on the row a level opens on", () => {
    const { jump, jumpLine, opensOn } = thirdsOf(19);

    expect(jumpLine - jump).toBe(opensOn);
  });

  it.each([10, 23, 11.5, Number.NaN])("refuses a depth of %s", (depth) => {
    expect(() => thirdsOf(depth)).toThrow(
      `A field is a whole number from 11 to 22 rows deep, not ${String(depth)}.`,
    );
  });
});

describe("isNeeded", () => {
  it.each([
    ["a pebble", "o", true],
    ["lichen", "w", true],
    ["slate", "#", false],
    ["no brick", ".", false],
  ])("says whether a level needs %s broken: %s", (_, character, needed) => {
    const [brick = null] = wallOf({ 1: character.padEnd(COLUMNS, ".") }).bricks;

    expect(isNeeded(brick, RULES)).toBe(needed);
  });
});

describe("isCleared", () => {
  it("clears a wall with no brick left", () => {
    expect(isCleared(wallOf({ 5: AIR }), RULES)).toBe(true);
  });

  it("clears a wall of bricks the level doesn't need", () => {
    expect(isCleared(wallOf({ 5: SLATE, 6: "@...@...." }), RULES)).toBe(true);
  });

  it("doesn't clear a wall while a brick it needs waits over the ceiling", () => {
    expect(isCleared(wallOf({ 5: SLATE, 30: "....o...." }), RULES)).toBe(false);
  });
});

describe("lowerWall", () => {
  describe.each(DEPTHS)("on a field %s deep", (depth) => {
    const { jump, jumpLine, opensOn } = thirdsOf(depth);

    it("steps a row while a brick the level needs stands below the jump line", () => {
      const wall = wallOf({ [jumpLine - 1]: "....o....", [depth]: PEBBLES });

      const lowered = lowerWall(wall, depth, RULES);

      expect(lowered).toMatchObject({ rowsDown: 1, jumped: false });
      expect(lowered.wall.lowestRow).toBe(jumpLine - 2);
    });

    it("jumps once the lowest brick the level needs stands at the jump line", () => {
      const wall = wallOf({ [jumpLine]: "....o....", [depth]: PEBBLES });

      const lowered = lowerWall(wall, depth, RULES);

      expect(lowered).toMatchObject({ rowsDown: jump, jumped: true });
      expect(lowered.wall.lowestRow).toBe(opensOn);
    });

    // The lowest a brick the level needs can stand as the wall jumps is the
    // jump line, so it lands no lower than where a level opens.
    it("never loses the level as it jumps, landing it where a level opens", () => {
      const wall = wallOf({ 1: SLATE, [jumpLine]: PEBBLES });

      const lowered = lowerWall(wall, depth, RULES);

      expect(lowered).toMatchObject({ jumped: true, lost: false });
      expect(rowsWithBricks(lowered.wall)).toEqual([opensOn]);
    });

    it("jumps again each time a round after a jump leaves the lower two-thirds clear", () => {
      const wall = wallOf({
        [opensOn]: PEBBLES,
        [opensOn + jump]: PEBBLES,
        [opensOn + 2 * jump]: PEBBLES,
      });

      const first = lowerWall(brokenRow(wall, opensOn), depth, RULES);
      const second = lowerWall(brokenRow(first.wall, opensOn), depth, RULES);

      expect([first.rowsDown, second.rowsDown]).toEqual([jump, jump]);
      expect(rowsWithBricks(second.wall)).toEqual([opensOn]);
    });

    it("jumps bricks the level doesn't need below the jump line, sinking what reaches the floor", () => {
      const slate = wallOf({
        1: SLATE,
        [jumpLine - 1]: "#.......#",
        [jumpLine]: PEBBLES,
      });
      const wall = withTwins(slate, cellAt(slate, 4, 2), cellAt(slate, 4, 3));

      const lowered = lowerWall(wall, depth, RULES);

      expect(lowered).toMatchObject({ rowsDown: jump, jumped: true });
      expect(rowsWithBricks(lowered.wall)).toEqual([
        jumpLine - 1 - jump,
        opensOn,
      ]);
    });

    it("jumps while every brick the level needs waits over the ceiling", () => {
      const wall = wallOf({ 1: SLATE, [depth + 1]: PEBBLES });

      const lowered = lowerWall(wall, depth, RULES);

      expect(lowered).toMatchObject({
        rowsDown: jump,
        jumped: true,
        sunk: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        lost: false,
      });
      expect(lowered.wall.lowestRow).toBe(1 - jump);
    });

    it("sinks a brick's twin with it as the wall jumps, the twin waiting over the ceiling", () => {
      const air = wallOf({ 1: AIR, [jumpLine]: PEBBLES, [depth + 1]: AIR });
      const one = cellAt(air, 2, 1);
      const twin = cellAt(air, 6, depth + 1);

      const lowered = lowerWall(withTwins(air, one, twin), depth, RULES);

      expect(lowered.sunk).toEqual([one, twin]);
      expect(rowsWithBricks(lowered.wall)).toEqual([opensOn]);
    });
  });

  it("sinks a brick the level doesn't need that reaches the floor's row, and keeps one a row over it", () => {
    const wall = wallOf({ 1: "#........", 2: ".#.......", 6: PEBBLES });

    const lowered = lowerWall(wall, 11, RULES);

    expect(lowered.sunk).toEqual([0]);
    expect(lowered.wall.bricks.slice(0, 2 * COLUMNS)).toEqual(
      wallOf({ 0: AIR, 1: ".#......." }).bricks,
    );
  });

  it("loses the level as a brick it needs reaches the floor's row, keeping it there", () => {
    const wall = wallOf({ 1: "....w....", 2: PEBBLES });

    const lowered = lowerWall(wall, 11, RULES);

    expect(lowered).toMatchObject({ rowsDown: 1, lost: true, sunk: [] });
    expect(lowered.wall).toEqual({ ...wall, lowestRow: 0 });
  });

  it("keeps the level while the lowest brick it needs comes down to the row over the floor's", () => {
    const wall = wallOf({ 2: "....o...." });

    expect(lowerWall(wall, 11, RULES).lost).toBe(false);
  });

  it("sinks a brick with its twin once the twin reaches the floor", () => {
    const air = wallOf({ 1: AIR, 2: AIR, 3: AIR, 4: "....o...." });
    const one = cellAt(air, 0, 3);
    const twin = cellAt(air, 8, 1);

    const lowered = lowerWall(withTwins(air, one, twin), 11, RULES);

    expect(lowered.sunk).toEqual([twin, one]);
  });

  it("names each brick sunk once, by cell, a twin among them", () => {
    const slate = wallOf({ 1: "#...#...#", 2: AIR, 3: AIR, 4: "....o...." });
    const wall = withTwins(
      withTwins(slate, cellAt(slate, 1, 1), cellAt(slate, 2, 3)),
      cellAt(slate, 6, 1),
      cellAt(slate, 7, 1),
    );

    const lowered = lowerWall(wall, 11, RULES);

    expect(lowered.sunk).toEqual([0, 1, 4, 6, 7, 8, 20]);
  });

  it("keeps each brick in its cell, the wall's rows as they were", () => {
    const wall = wallOf({ 3: "o.#......", 4: AIR, 5: "...#...w" + "." });

    const lowered = lowerWall(wall, 11, RULES);

    expect(lowered.wall).toEqual({ ...wall, lowestRow: 2 });
  });

  it("stands the wall as its rules leave it between rounds, before it comes down", () => {
    const wall = wornTo(wallOf({ 5: "w...w...." }), 1);

    const lowered = lowerWall(wall, 11, HEALING);

    expect([
      lowered.wall.lowestRow,
      lowered.wall.bricks.map((brick) => brick?.hits ?? null),
    ]).toEqual([4, [2, null, null, null, 2, null, null, null, null]]);
  });

  // HEALING hands back a new wall whatever it holds, so the wall itself
  // coming back says it never stood between rounds.
  it("leaves a cleared level's wall where it stands, as it is", () => {
    const wall = wornTo(wallOf({ 1: SLATE, 2: AIR }), 0);

    const lowered = lowerWall(wall, 11, HEALING);

    expect(lowered).toEqual({
      wall,
      rowsDown: 0,
      jumped: false,
      sunk: [],
      lost: false,
    });
    expect(lowered.wall).toBe(wall);
  });

  it("leaves the wall it is handed as it was", () => {
    const wall = withTwins(
      wornTo(wallOf({ 1: "#.#......", 2: "o.......o", 3: "#wwwwwwww" }), 1),
      2,
      18,
    );
    const before = structuredClone(wall);

    lowerWall(wall, 11, HEALING);

    expect(wall).toStrictEqual(before);
  });

  it.each([10, 23])("refuses a field %s deep", (depth) => {
    expect(() => lowerWall(wallOf({ 5: PEBBLES }), depth, RULES)).toThrow(
      RangeError,
    );
  });
});

describe("lowestNeededRow", () => {
  it("finds the field row of the lowest brick the level needs", () => {
    expect(lowestNeededRow(wallOf({ 4: "....o....", 6: PEBBLES }), RULES)).toBe(
      4,
    );
  });

  it("passes over a brick the level doesn't need under it", () => {
    expect(lowestNeededRow(wallOf({ 4: SLATE, 5: "........w" }), RULES)).toBe(
      5,
    );
  });

  it("finds a brick waiting over the ceiling", () => {
    expect(lowestNeededRow(wallOf({ 5: SLATE, 30: "....o...." }), RULES)).toBe(
      30,
    );
  });

  it("finds none in a wall with no brick the level needs", () => {
    expect(lowestNeededRow(wallOf({ 5: SLATE }), RULES)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("neededBelow", () => {
  it("counts the bricks the level needs under a row, and none the level doesn't", () => {
    const wall = wallOf({ 3: "##ooo....", 4: "o.......w", 5: PEBBLES });

    expect(neededBelow(wall, 5, RULES)).toBe(5);
  });

  it("counts none under the lowest", () => {
    expect(neededBelow(wallOf({ 3: PEBBLES }), 3, RULES)).toBe(0);
  });
});

describe("inDanger", () => {
  it.each([
    [DANGER_ROW, true],
    [DANGER_ROW + 1, false],
  ])(
    "says a brick the level needs in row %i is in danger: %s",
    (row, danger) => {
      expect(inDanger(wallOf({ [row]: "....o...." }), RULES)).toBe(danger);
    },
  );

  it("finds a brick the level needs in the floor's row in danger, as the step that loses the level comes down", () => {
    expect(inDanger(wallOf({ 0: "....o...." }), RULES)).toBe(true);
  });

  it("finds no danger in bricks the level doesn't need in the danger row under one it needs", () => {
    expect(inDanger(wallOf({ 1: SLATE, 2: "....o...." }), RULES)).toBe(false);
  });
});

describe("dangerCells", () => {
  it("gives the cells of the bricks the level needs in the danger row or lower, in order", () => {
    const wall = wallOf({ 0: "o........", 1: "#w#.....o", 2: PEBBLES });

    expect(dangerCells(wall, RULES)).toEqual([0, cellOf(1, 1), cellOf(8, 1)]);
  });

  it("gives none while no brick the level needs is in danger", () => {
    expect(dangerCells(wallOf({ 1: SLATE, 2: PEBBLES }), RULES)).toEqual([]);
  });
});
