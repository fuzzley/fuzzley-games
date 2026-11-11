import { keysOf } from "@fz/core/records";
import { uncataloged } from "../../testing/stand_ins";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
  hasTrait,
  isBrickKindId,
} from "../catalog/bricks";
import type { ZapPattern } from "../flight/events";
import { FLOORWARD } from "../grid";
import { COLUMNS, LEAST_DEPTH, MOST_FRIENDS } from "../tuning";
import type { Brick } from "../wall/wall";
import { LEGEND, NO_BRICK } from "./legend";
import type { Level } from "./level";
import {
  LEVELS,
  LEVEL_SETS,
  type LevelData,
  type LevelSetData,
  MOST_AIR,
  TWIN_ROWS,
  WALL_ROWS,
  levelEntryOf,
  levelsOf,
  parseLevel,
} from "./levels";

const AIR = NO_BRICK.repeat(COLUMNS);
const PLAIN = "ooooooooo";
const STEEL = "#########";

/** The most hits a brick the level needs may have in its wall's lowest row, so the first round has something to break. */
const MOST_LOW_HITS = 3;

/** The legend's characters whose kinds the catalog holds, with the kind. */
const BUILT = keysOf(LEGEND).flatMap((character) => {
  const { kind } = LEGEND[character];
  return isBrickKindId(kind) ? [[character, kind] as const] : [];
});

/** The first of the legend's characters whose kind the catalog doesn't hold yet, for the refusal of a kind no set has brought in. */
const UNBUILT = uncataloged();

/** Every level by its name. */
const NAMED = LEVELS.map((entry) => [entry.data.name, entry] as const);

/**
 * Returns a picture of a wall: rows on top, rows at the bottom, and plain
 * rows between them, as many as make the fewest rows a wall has.
 */
function picture(
  top: readonly string[],
  bottom: readonly string[] = [],
): string[] {
  const between = Math.max(0, WALL_ROWS.least - top.length - bottom.length);
  return [...top, ...Array<string>(between).fill(PLAIN), ...bottom];
}

/** Returns a level parsed from a picture of its wall, with its other data as given. */
function parsed(
  bricks: readonly string[],
  changes: Partial<LevelData> = {},
): Level {
  return parseLevel({
    id: "spec",
    name: "Spec",
    boon: "hot",
    bricks,
    ...changes,
  });
}

/** Returns the bricks of a level's wall row, wall row 0 its lowest. */
function rowOf(level: Level, wallRow: number): (Brick | null)[] {
  return level.bricks.slice(wallRow * COLUMNS, (wallRow + 1) * COLUMNS);
}

/** Returns a level's bricks, leaving out its empty cells. */
function bricksOf(level: Level): Brick[] {
  return level.bricks.filter((brick) => brick !== null);
}

/** Returns whether a brick is one its level needs broken. */
function isNeeded(brick: Brick | null): brick is Brick {
  return brick !== null && brickKind(brick.kind).needed;
}

/**
 * The most rows apart the bricks a round's zaps reach stand: the zappers of
 * a chain all break in one round, in the field together, and the shallowest
 * field holds them from the row over the floor's to the row under the
 * ceiling.
 */
const ZAP_ROWS = LEAST_DEPTH - 2;

/** The ways a zap or a blast of each pattern runs from its brick, a cell at a time, as far as its reach. */
const ZAP_WAYS: Readonly<
  Record<ZapPattern, readonly (readonly [number, number])[]>
> = {
  row: [
    [0, 1],
    [0, -1],
  ],
  column: [
    [1, 0],
    [-1, 0],
  ],
  cross: [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ],
  x: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  blast: [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

/**
 * Returns the cells of a level's needed bricks that nothing can reach: a
 * fuzzball floods in from the open field under the wall, a cell at a time
 * across or up and down, through every cell but those of solid bricks that
 * never break, over the wall's top row, and from a portal on out of its
 * twin; then each zapper it reaches zaps every cell its pattern reaches,
 * through steel, setting off each zapper there in turn, a chain within
 * {@link ZAP_ROWS} rows of its lowest, as one round's must be.
 */
function sealedIn({ bricks, rows }: Level): number[] {
  const brickAt = (row: number, column: number): Brick | null =>
    row >= 0 && row < rows ? (bricks[row * COLUMNS + column] ?? null) : null;
  const blocks = (brick: Brick | null): boolean =>
    brick !== null &&
    brickKind(brick.kind).solid &&
    brickKind(brick.kind).hits === "never";
  // Cells by wall row and column, the row under the wall's lowest and the
  // row over its highest among them.
  const key = (row: number, column: number): number =>
    (row + 1) * COLUMNS + column;
  const flooded = new Set<number>();
  const waiting: [number, number][] = [];
  const flood = (row: number, column: number): void => {
    if (
      column >= 0 &&
      column < COLUMNS &&
      row >= -1 &&
      row <= rows &&
      !flooded.has(key(row, column)) &&
      !blocks(brickAt(row, column))
    ) {
      flooded.add(key(row, column));
      waiting.push([row, column]);
    }
  };
  for (let column = 0; column < COLUMNS; column++) {
    flood(-1, column);
  }
  for (let next = waiting.pop(); next; next = waiting.pop()) {
    const [row, column] = next;
    flood(row + 1, column);
    flood(row - 1, column);
    flood(row, column + 1);
    flood(row, column - 1);
    const twin = brickAt(row, column)?.twin ?? null;
    if (twin !== null) {
      flood(Math.floor(twin / COLUMNS), twin % COLUMNS);
    }
  }
  // Each window of rows a round's zaps can span, from its lowest up.
  const zapped = new Set<number>();
  for (let lowest = 0; lowest < rows; lowest++) {
    const within = (row: number): boolean =>
      row >= lowest && row <= lowest + ZAP_ROWS && row < rows;
    const reached = new Set<number>();
    const zapping: [number, number][] = [...flooded]
      .map((cell): [number, number] => [
        Math.floor(cell / COLUMNS) - 1,
        cell % COLUMNS,
      ])
      .filter(([row]) => within(row));
    for (let next = zapping.pop(); next; next = zapping.pop()) {
      const [row, column] = next;
      const brick = brickAt(row, column);
      for (const trait of brick === null ? [] : brickKind(brick.kind).traits) {
        if (trait.kind !== "zaps") {
          continue;
        }
        for (const [up, across] of ZAP_WAYS[trait.pattern]) {
          for (let step = 1; step <= trait.reach; step++) {
            const [r, c] = [row + up * step, column + across * step];
            if (c >= 0 && c < COLUMNS && within(r) && !reached.has(key(r, c))) {
              reached.add(key(r, c));
              zapping.push([r, c]);
            }
          }
        }
      }
    }
    for (const cell of reached) {
      zapped.add(cell);
    }
  }
  return bricks.flatMap((brick, cell) => {
    const at = cell + COLUMNS;
    return isNeeded(brick) && !flooded.has(at) && !zapped.has(at) ? [cell] : [];
  });
}

/** Returns the data of the level with an id, throwing for one no set has. */
function dataOf(id: string): LevelData {
  const entry = LEVELS.find(({ data }) => data.id === id);
  if (entry === undefined) {
    throw new RangeError(`No level is "${id}".`);
  }
  return entry.data;
}

/** Returns the kinds of brick a level's wall holds. */
function kindsIn(level: Level): Set<BrickKindId> {
  return new Set(bricksOf(level).map(({ kind }) => kind));
}

describe("parseLevel", () => {
  it.each(BUILT)(
    "lays %s out as the legend has it, a %s whole",
    (character, kind) => {
      const { hits, plates } = LEGEND[character];

      const level = parsed(picture([], [`${character}oooooooo`]));

      expect(level.bricks[0]).toMatchObject({
        kind,
        hits,
        full: hits,
        plates,
        twin: null,
      });
    },
  );

  it("lays its picture out from the wall's lowest row up", () => {
    const level = parsed(picture(["#oooooooo"], ["o2.......", "..3......"]));

    expect(
      [...rowOf(level, 0), ...rowOf(level, 1)].map((brick) => brick?.hits),
    ).toEqual([
      undefined,
      undefined,
      3,
      ...Array<undefined>(6).fill(undefined),
      1,
      2,
      ...Array<undefined>(7).fill(undefined),
    ]);
    expect(rowOf(level, 11)[0]?.kind).toBe("steel");
  });

  it("tints plain and tough bricks by their row, in turn from the wall's lowest up", () => {
    const level = parsed(Array<string>(12).fill("o2ooooooo"));

    expect(
      Array.from({ length: 12 }, (_, wallRow) =>
        rowOf(level, wallRow)
          .slice(0, 2)
          .map((brick) => brick?.tint),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3].map((tint) => [tint, tint]));
  });

  it("leaves steel and zappers their own inks, whatever their row", () => {
    const level = parsed(picture(["#-|oooooo"], ["o#-|ooooo", PLAIN]));

    expect(
      [...rowOf(level, 1).slice(1, 4), ...rowOf(level, 11).slice(0, 3)].map(
        (brick) => brick?.tint,
      ),
    ).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("numbers its cages from the wall's lowest row up, left to right, each one's tint the ink of the friend it holds", () => {
    const level = parsed(picture(["oCooooooC"], ["C.......C", "...CC...."]));

    expect(
      level.bricks.flatMap((brick, cell) =>
        brick?.kind === "cage" ? [[cell, brick.tint]] : [],
      ),
    ).toEqual([
      [3, 0],
      [4, 1],
      [COLUMNS, 2],
      [2 * COLUMNS - 1, 3],
      [11 * COLUMNS + 1, 4],
      [12 * COLUMNS - 1, 5],
    ]);
  });

  it("keeps the boon each jump of its wall earns, and its rows", () => {
    const level = parsed(picture([PLAIN, AIR, PLAIN]), { boon: "triple" });

    expect(level).toMatchObject({ boon: "triple", rows: 12 });
    expect(level.bricks).toHaveLength(12 * COLUMNS);
  });

  it.each([WALL_ROWS.least, WALL_ROWS.most])(
    "parses a wall of %s rows",
    (rows) => {
      expect(parsed(Array<string>(rows).fill(PLAIN)).rows).toBe(rows);
    },
  );

  it(`parses ${String(MOST_AIR)} rows of air together`, () => {
    expect(() => parsed(picture([PLAIN, AIR, AIR, PLAIN]))).not.toThrow();
  });

  it("lets a row of steel stand over everything", () => {
    expect(() => parsed(picture([STEEL, AIR]))).not.toThrow();
  });

  it.each<[string, readonly string[], string]>([
    [
      "too few rows",
      Array<string>(11).fill(PLAIN),
      "its wall has 11 rows, not 12 to 40",
    ],
    [
      "too many rows",
      Array<string>(41).fill(PLAIN),
      "its wall has 41 rows, not 12 to 40",
    ],
    [
      "a row too short",
      picture(["oooooooo"]),
      "row 1 of its picture is 8 long, not 9",
    ],
    [
      "a row too long",
      picture([], ["oooooooooo"]),
      "row 12 of its picture is 10 long, not 9",
    ],
    [
      "a character no legend has",
      picture([], ["ooooZoooo"]),
      `"Z", in row 12 of its picture, stands for no brick`,
    ],
    ["a highest row of air", picture([AIR]), "its wall's highest row is air"],
    ["a lowest row of air", picture([], [AIR]), "its wall's lowest row is air"],
    [
      "three rows of air together",
      picture([PLAIN, AIR, AIR, AIR]),
      "rows 2 to 4 of its picture are air, more than 2 together",
    ],
    [
      "a portal with no twin",
      picture(["oooo@oooo"]),
      `it has 1 of the portal "@", where a pair has 2`,
    ],
    [
      "three portals of one mark",
      picture(["o@oo@oo@o"]),
      `it has 3 of the portal "@", where a pair has 2`,
    ],
    [
      "a second pair's portal with no twin",
      picture(["o@o&oo@oo"]),
      `it has 1 of the portal "&", where a pair has 2`,
    ],
    [
      "a second pair of portals with no first",
      picture(["oo&ooo&oo"]),
      `its portals "&" are a second pair, with no first, "@"`,
    ],
    [
      `a portal more than ${String(TWIN_ROWS)} rows from its twin`,
      picture(["oooo@oooo", PLAIN, PLAIN, PLAIN, PLAIN, "oooo@oooo"]),
      `its portals "@" stand 5 rows apart, more than 4`,
    ],
    [
      "a row of steel under its top course's air",
      picture([PLAIN, AIR, STEEL]),
      "row 3 of its picture is steel from side to side, neither over everything nor passed by a portal in its top course",
    ],
    [
      "a row of steel a portal passes under its top course's air",
      picture([PLAIN, "oooo@oooo", AIR, STEEL, "oooo@oooo"]),
      "row 4 of its picture is steel from side to side, neither over everything nor passed by a portal in its top course",
    ],
    [
      "a row of steel in its top course with no portal past it",
      picture([PLAIN, STEEL]),
      "row 2 of its picture is steel from side to side, neither over everything nor passed by a portal in its top course",
    ],
    [
      "a row of steel both of whose portals stand over it",
      picture(["o@ooo@ooo", STEEL]),
      "row 2 of its picture is steel from side to side, neither over everything nor passed by a portal in its top course",
    ],
    [
      "a row of steel both of whose portals stand under it",
      picture([PLAIN, STEEL, "o@ooo@ooo"]),
      "row 2 of its picture is steel from side to side, neither over everything nor passed by a portal in its top course",
    ],
    [
      "a row of steel as its lowest",
      picture([], [STEEL]),
      "row 12 of its picture is steel from side to side, neither over everything nor passed by a portal in its top course",
    ],
    [
      "a kind no set has brought in yet",
      picture([`oo${UNBUILT}oooooo`]),
      `"${UNBUILT}", in row 1 of its picture, is a "${LEGEND[UNBUILT].kind}", which no set has brought in yet`,
    ],
  ])("names %s", (_, bricks, problem) => {
    expect(() => parsed(bricks)).toThrow(`Level "spec": ${problem}.`);
  });

  it("names a boon that isn't one", () => {
    expect(() => parsed(picture([]), { boon: "double" })).toThrow(
      `Level "spec": its boon, "double", is no boon.`,
    );
  });

  it("names a key no level has, as a typo would leave", () => {
    const typo = { boom: "hot" };

    const parse = (): Level => parsed(picture([]), { boon: "hot", ...typo });

    expect(parse).toThrow(`Level "spec": it has a "boom", which no level has.`);
  });

  // The portal isn't cataloged until Tricks, so a wall that keeps the
  // portals' rules is refused only for its kind.
  it.each<[string, readonly string[], number]>([
    [
      `a portal ${String(TWIN_ROWS)} rows from its twin`,
      picture(["oooo@oooo", PLAIN, PLAIN, PLAIN, "oooo@oooo"]),
      5,
    ],
    [
      "a portal past a row of steel in its top course",
      picture([PLAIN, "oooo@oooo", STEEL, "o@ooooooo"]),
      4,
    ],
    ["two pairs of portals", picture(["@@&&ooooo"]), 1],
  ])("keeps the portals' rules with %s", (_, bricks, row) => {
    expect(() => parsed(bricks)).toThrow(
      `Level "spec": "@", in row ${String(row)} of its picture, is a "portal", which no set has brought in yet.`,
    );
  });
});

describe("levelsOf", () => {
  it("numbers the levels of every set from 1, in the order played", () => {
    const set = (id: string, ...names: string[]): LevelSetData => ({
      id,
      name: id,
      levels: names.map((name) => ({
        id: name,
        name,
        boon: "hot",
        bricks: [],
      })),
    });

    const entries = levelsOf([set("a", "one", "two"), set("b", "three")]);

    expect(
      entries.map(({ number, set: { id }, data }) => [number, id, data.id]),
    ).toEqual([
      [1, "a", "one"],
      [2, "a", "two"],
      [3, "b", "three"],
    ]);
  });
});

describe("levelEntryOf", () => {
  it("finds a level by its number, from 1", () => {
    expect(levelEntryOf(LEVELS, 1)).toBe(LEVELS[0]);
    expect(levelEntryOf(LEVELS, LEVELS.length)).toBe(LEVELS.at(-1));
  });

  it.each([0, LEVELS.length + 1, 1.5])(
    "throws for level %s, which there isn't",
    (number) => {
      expect(() => levelEntryOf(LEVELS, number)).toThrow(
        `There is no level ${String(number)}: the levels run from 1 to ${String(LEVELS.length)}.`,
      );
    },
  );
});

describe("the reach check", () => {
  it("finds a brick the level needs shut in by steel", () => {
    const level = parsed(picture([], ["###oooooo", "#o#oooooo", "###oooooo"]));

    expect(sealedIn(level)).toEqual([COLUMNS + 1]);
  });

  it("finds a brick shut in by steel that leaves its corners open", () => {
    const level = parsed(picture([], [".#.oooooo", "#o#oooooo", ".#.oooooo"]));

    expect(sealedIn(level)).toEqual([COLUMNS + 1]);
  });

  it("reaches a brick from over the wall's top row", () => {
    const level = parsed(picture(["#o#oooooo", "###oooooo"]));

    expect(sealedIn(level)).toEqual([]);
  });

  it("reaches a brick shut in by steel with a zap through it", () => {
    const level = parsed(picture([], ["###oooooo", "#o#-ooooo", "###oooooo"]));

    expect(sealedIn(level)).toEqual([]);
  });

  it("reaches a brick shut in by steel with a zap set off by a zap", () => {
    const level = parsed(
      picture([], ["###.###oo", "#-#.#o#oo", "###.###oo", "o|ooooooo"]),
    );

    expect(sealedIn(level)).toEqual([]);
  });

  it("finds a zapper shut in with the brick its zap would reach", () => {
    const level = parsed(picture([], ["####ooooo", "#-o#ooooo", "####ooooo"]));

    expect(sealedIn(level)).toEqual([COLUMNS + 1, COLUMNS + 2]);
  });

  it(`reaches a brick ${String(ZAP_ROWS)} rows over a column zapper, as far as its zap runs in the shallowest field`, () => {
    const level = parsed([
      PLAIN,
      "###oooooo",
      "#o#oooooo",
      "###oooooo",
      ...Array<string>(7).fill(PLAIN),
      "o|ooooooo",
    ]);

    expect(sealedIn(level)).toEqual([]);
  });

  it("finds a brick farther over a column zapper than its zap runs in the shallowest field", () => {
    const level = parsed([
      "###oooooo",
      "#o#oooooo",
      "###oooooo",
      ...Array<string>(8).fill(PLAIN),
      "o|ooooooo",
    ]);

    expect(sealedIn(level)).toEqual([10 * COLUMNS + 1]);
  });

  it("finds a brick a chain of zaps reaches only past the shallowest field's ceiling", () => {
    const level = parsed([
      "###oooooo",
      "#o#oooooo",
      "#|#oooooo",
      "###oooooo",
      ...Array<string>(7).fill(PLAIN),
      "o|ooooooo",
    ]);

    expect(sealedIn(level)).toEqual([10 * COLUMNS + 1]);
  });

  it("finds a brick a zap doesn't reach", () => {
    const level = parsed(
      picture([], ["###oooooo", "#o#oooooo", "###oooooo", "|oooooooo"]),
    );

    expect(sealedIn(level)).toEqual([2 * COLUMNS + 1]);
  });

  // The bomb takes the ring's corner. No fuzzball slips between the steel
  // either side of it, but the blast reaches the brick diagonally.
  it("reaches a brick shut in by steel with a blast from its corner", () => {
    const level = parsed(picture([], ["###oooooo", "#o#oooooo", "##*oooooo"]));

    expect(sealedIn(level)).toEqual([]);
  });

  it("reaches a brick shut in by steel with a cross zapper's zap down its column", () => {
    const level = parsed(
      picture(
        [],
        ["o+ooooooo", PLAIN, PLAIN, "###oooooo", "#o#oooooo", "###oooooo"],
      ),
    );

    expect(sealedIn(level)).toEqual([]);
  });

  it("finds a brick shut in by steel diagonal to a cross zapper", () => {
    const level = parsed(
      picture([], ["ooo+ooooo", "###oooooo", "#o#oooooo", "###oooooo"]),
    );

    expect(sealedIn(level)).toEqual([COLUMNS + 1]);
  });

  it("reaches a brick shut in by steel three cells along an X zapper's diagonal", () => {
    const level = parsed(
      picture([], ["ooooxoooo", PLAIN, "###oooooo", "#o#oooooo", "###oooooo"]),
    );

    expect(sealedIn(level)).toEqual([]);
  });

  it("finds a brick shut in by steel in an X zapper's column", () => {
    const level = parsed(
      picture([], ["oxooooooo", PLAIN, "###oooooo", "#o#oooooo", "###oooooo"]),
    );

    expect(sealedIn(level)).toEqual([COLUMNS + 1]);
  });

  it("finds a brick four cells along an X zapper's diagonal", () => {
    const level = parsed(
      picture(
        [],
        ["oooooxooo", PLAIN, PLAIN, "###oooooo", "#o#oooooo", "###oooooo"],
      ),
    );

    expect(sealedIn(level)).toEqual([COLUMNS + 1]);
  });
});

describe("the levels", () => {
  it("give every level an id of its own", () => {
    const ids = LEVELS.map(({ data }) => data.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("give every level a name of its own", () => {
    const names = LEVELS.map(({ data }) => data.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("give every set an id of its own", () => {
    const ids = LEVEL_SETS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  // plan.md's table of the drafts: each wall's rows, the bricks it needs and
  // their hits.
  it.each([
    ["hello-wall", 17, 64, 64],
    ["stripes", 18, 74, 74],
    ["pips", 19, 110, 140],
    ["punch-through", 15, 83, 116],
    ["girder", 19, 78, 86],
    ["zip-line", 21, 134, 198],
    ["plumb-line", 23, 162, 282],
    ["pyramid", 23, 100, 120],
    ["gatehouse", 27, 154, 230],
    ["fuse", 23, 162, 280],
    ["crossroads", 23, 162, 322],
    ["chain-reaction", 26, 189, 258],
    ["crisscross", 27, 105, 251],
    ["wool-socks", 23, 156, 256],
    ["jailbreak", 23, 103, 244],
    ["honeycomb", 27, 115, 155],
    ["switchboard", 26, 173, 318],
    ["powder-keg", 26, 198, 437],
  ])(
    "build %s as its draft: %s rows, %s bricks needed, %s hits",
    (id, rows, needed, hits) => {
      const level = parseLevel(dataOf(id));
      const bricks = bricksOf(level);

      expect([
        level.rows,
        bricks.filter(isNeeded).length,
        bricks.reduce((sum, brick) => sum + brick.hits, 0),
      ]).toEqual([rows, needed, hits]);
    },
  );

  describe.each(NAMED)("%s", (_, { number, data }) => {
    const level = (): Level => parseLevel(data);

    it("parses", () => {
      expect(level).not.toThrow();
    });

    it("seals in no brick it needs", () => {
      expect(sealedIn(level())).toEqual([]);
    });

    it(`holds no more cages than a crew's ${String(MOST_FRIENDS)} friends`, () => {
      const cages = bricksOf(level()).filter(({ kind }) =>
        hasTrait(kind, "frees"),
      );

      expect(cages.length).toBeLessThanOrEqual(MOST_FRIENDS);
    });

    it(`needs nothing of more than ${String(MOST_LOW_HITS)} hits in its wall's lowest row`, () => {
      const hits = rowOf(level(), 0)
        .filter(isNeeded)
        .map((brick) => brick.hits);

      expect(Math.max(0, ...hits)).toBeLessThanOrEqual(MOST_LOW_HITS);
    });

    it("leaves its wall's lowest row something to break from the floor", () => {
      const needed = rowOf(level(), 0).filter(isNeeded);
      const facing = needed.filter((brick) => (brick.plates & FLOORWARD) !== 0);

      // Fewer plates face the floor than it has bricks to break, or none.
      expect(facing.length).toBeLessThan(Math.max(1, needed.length));
    });

    it("uses no kind before the level that brings it in", () => {
      const early = [...kindsIn(level())].filter(
        (kind) => brickKind(kind).firstLevel > number,
      );

      expect(early).toEqual([]);
    });
  });

  it.each(
    BRICK_KIND_IDS.filter(
      (kind) => brickKind(kind).firstLevel <= LEVELS.length,
    ),
  )("bring the %s in at the level the catalog names", (kind) => {
    const first = LEVELS.find(({ data }) =>
      kindsIn(parseLevel(data)).has(kind),
    );

    expect(first?.number).toBe(brickKind(kind).firstLevel);
  });
});
