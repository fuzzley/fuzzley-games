import { keysOf } from "@fz/core/records";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
} from "../../testing/flight_fixtures";
import { wallFrom } from "../../testing/wall_picture";
import { BRICK_KIND_IDS, type BrickKindId, brickKind } from "../catalog/bricks";
import { cellAt, fieldRowOf } from "../grid";
import { NO_BRICK } from "../levels/legend";
import { COLUMNS, LEAST_DEPTH, MOST_DEPTH } from "../tuning";
import {
  dangerCells,
  inDanger,
  isCleared,
  lowerWall,
  lowestNeededRow,
  neededBelow,
  regrow,
} from "./lower";
import { type Brick, type Wall, thirdsOf } from "./wall";

/** Every depth a field has, 11 to 22. */
const DEPTHS = Array.from(
  { length: MOST_DEPTH - LEAST_DEPTH + 1 },
  (_, index) => LEAST_DEPTH + index,
);

const AIR = NO_BRICK.repeat(COLUMNS);
const BRICKS = "ooooooooo";
const STEEL = "#########";

/**
 * Returns a wall drawn with `wallFrom()` as its rows in the legend's
 * characters, each keyed by the field row it stands in, so a spec at every
 * depth draws its rows where the depth's thirds put them: its lowest row
 * the lowest key, its highest the highest, and every row between them not
 * drawn air.
 */
function wallOf(rows: Readonly<Record<number, string>>): Wall {
  const fieldRows = Object.keys(rows).map(Number);
  const lowestRow = Math.min(...fieldRows);
  const highestRow = Math.max(...fieldRows);
  const picture = Array.from(
    { length: highestRow - lowestRow + 1 },
    (_, below) => rows[highestRow - below] ?? AIR,
  );
  return wallFrom(picture, { lowestRow });
}

/** Returns a whole brick of a kind with the fewest hits it takes, none for one that never breaks. */
function wholeBrick(kind: BrickKindId): Brick {
  const { hits } = brickKind(kind);
  const whole = hits === "never" ? 0 : hits;
  return { kind, hits: whole, full: whole, plates: 0, tint: 0, twin: null };
}

/**
 * Returns a wall with a pair of portals at two of its cells, each the
 * other's twin. Tricks catalogs the portal, so until it does each stands
 * in as steel with a twin: a brick that never breaks and that a level
 * doesn't need, which is all lowerWall() reads of a portal.
 */
function withPortals(wall: Wall, one: number, other: number): Wall {
  const portal = (twin: number): Brick => ({
    ...wholeBrick("steel"),
    twin,
  });
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) => {
      if (cell === one) {
        return portal(other);
      }
      return cell === other ? portal(one) : brick;
    }),
  };
}

/** Returns a wall with the bricks of a field row broken, as a round breaks them. */
function brokenRow(wall: Wall, fieldRow: number): Wall {
  const first = cellAt(wall, 0, fieldRow);
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) =>
      cell >= first && cell < first + COLUMNS ? null : brick,
    ),
  };
}

/** Returns a wall with every brick it holds worn to a number of hits, as a round's strikes leave them. */
function wornTo(wall: Wall, hits: number): Wall {
  return {
    ...wall,
    bricks: wall.bricks.map((brick) =>
      brick === null ? null : { ...brick, hits },
    ),
  };
}

/** Returns the hits each brick of a wall has left, in order, null for no brick. */
function hitsOf(wall: Wall): (number | null)[] {
  return wall.bricks.map((brick) => brick?.hits ?? null);
}

/** Returns the field rows a wall's bricks stand in, the lowest first, a row once. */
function rowsWithBricks(wall: Wall): number[] {
  const rows = wall.bricks.flatMap((brick, cell) =>
    brick === null ? [] : [fieldRowOf(wall, cell)],
  );
  return [...new Set(rows)];
}

/**
 * Returns the wall a hand-made round's flight leaves, before it comes
 * down: the next round's, standing where the start's stood, with each brick
 * the round didn't break back from the start's.
 */
function flownWall({ start, round }: FlightFixture): Wall {
  const broken = new Set(
    round.flight.events.flatMap((event) =>
      event.kind === "break" ? [event.cell] : [],
    ),
  );
  return {
    bricks: round.next.wall.bricks.map(
      (brick, cell) =>
        brick ?? (broken.has(cell) ? null : (start.wall.bricks[cell] ?? null)),
    ),
    rows: start.wall.rows,
    lowestRow: start.wall.lowestRow,
  };
}

describe("isCleared", () => {
  it("clears a wall with no brick left", () => {
    expect(isCleared(wallOf({ 5: AIR }))).toBe(true);
  });

  it.each(BRICK_KIND_IDS)(
    "clears a wall of a lone %s only if a level doesn't need it",
    (kind) => {
      const wall: Wall = {
        bricks: [wholeBrick(kind)],
        rows: 1,
        lowestRow: 5,
      };

      expect(isCleared(wall)).toBe(!brickKind(kind).needed);
    },
  );

  it("doesn't clear a wall while a brick it needs waits over the ceiling", () => {
    const wall = wallOf({ 5: STEEL, 30: "....o...." });

    expect(isCleared(wall)).toBe(false);
  });
});

describe("lowerWall", () => {
  describe.each(DEPTHS)("on a field %s deep", (depth) => {
    const { jump, jumpLine, opensOn } = thirdsOf(depth);

    it("steps a row while a brick the level needs stands below the jump line", () => {
      const wall = wallOf({ [jumpLine - 1]: "....o....", [depth]: BRICKS });

      const lowered = lowerWall(wall, depth);

      expect(lowered).toMatchObject({ rowsDown: 1, jumped: false });
      expect(lowered.wall.lowestRow).toBe(jumpLine - 2);
    });

    it("jumps once the lowest brick the level needs stands at the jump line", () => {
      const wall = wallOf({ [jumpLine]: "....o....", [depth]: BRICKS });

      const lowered = lowerWall(wall, depth);

      expect(lowered).toMatchObject({ rowsDown: jump, jumped: true });
      expect(lowered.wall.lowestRow).toBe(opensOn);
    });

    // The lowest a brick the level needs can stand as the wall jumps is the
    // jump line, so it lands no lower than where a level opens.
    it("never loses the level as it jumps, landing it where a level opens", () => {
      const wall = wallOf({ 1: STEEL, [jumpLine]: BRICKS });

      const lowered = lowerWall(wall, depth);

      expect(lowered).toMatchObject({ jumped: true, lost: false });
      expect(rowsWithBricks(lowered.wall)).toEqual([opensOn]);
    });

    it("jumps again each time a round after a jump leaves the lower two-thirds clear", () => {
      const wall = wallOf({
        [opensOn]: BRICKS,
        [opensOn + jump]: BRICKS,
        [opensOn + 2 * jump]: BRICKS,
      });

      const first = lowerWall(brokenRow(wall, opensOn), depth);
      const second = lowerWall(brokenRow(first.wall, opensOn), depth);

      expect([first.rowsDown, second.rowsDown]).toEqual([jump, jump]);
      expect(rowsWithBricks(second.wall)).toEqual([opensOn]);
    });

    it("jumps past steel and portals below the jump line, sinking what reaches the floor", () => {
      const steel = wallOf({
        1: STEEL,
        [jumpLine - 1]: "#.......#",
        [jumpLine]: BRICKS,
      });
      const wall = withPortals(steel, cellAt(steel, 4, 2), cellAt(steel, 4, 3));

      const lowered = lowerWall(wall, depth);

      expect(lowered).toMatchObject({ rowsDown: jump, jumped: true });
      expect(rowsWithBricks(lowered.wall)).toEqual([
        jumpLine - 1 - jump,
        opensOn,
      ]);
    });

    it("jumps while every brick the level needs waits over the ceiling", () => {
      const wall = wallOf({ 1: STEEL, [depth + 1]: BRICKS });

      const lowered = lowerWall(wall, depth);

      expect(lowered).toMatchObject({
        rowsDown: jump,
        jumped: true,
        sunk: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        lost: false,
      });
      expect(lowered.wall.lowestRow).toBe(1 - jump);
    });

    it("sinks a portal's twin with it as the wall jumps, the twin waiting over the ceiling", () => {
      const air = wallOf({ 1: AIR, [jumpLine]: BRICKS, [depth + 1]: AIR });
      const portal = cellAt(air, 2, 1);
      const twin = cellAt(air, 6, depth + 1);

      const lowered = lowerWall(withPortals(air, portal, twin), depth);

      expect(lowered.sunk).toEqual([portal, twin]);
      expect(rowsWithBricks(lowered.wall)).toEqual([opensOn]);
    });
  });

  it("sinks steel that reaches the floor's row, and keeps steel a row over it", () => {
    const wall = wallOf({ 1: "#........", 2: ".#.......", 6: BRICKS });

    const lowered = lowerWall(wall, 11);

    expect(lowered.sunk).toEqual([0]);
    expect(lowered.wall.bricks.slice(0, 2 * COLUMNS)).toEqual(
      wallOf({ 0: AIR, 1: ".#......." }).bricks,
    );
  });

  it("loses the level as a brick it needs reaches the floor's row, keeping it there", () => {
    const wall = wallOf({ 1: "....2....", 2: BRICKS });

    const lowered = lowerWall(wall, 11);

    expect(lowered).toMatchObject({ rowsDown: 1, lost: true, sunk: [] });
    expect(lowered.wall).toEqual({ ...wall, lowestRow: 0 });
  });

  it("keeps the level while the lowest brick it needs comes down to the row over the floor's", () => {
    const wall = wallOf({ 2: "....o...." });

    expect(lowerWall(wall, 11).lost).toBe(false);
  });

  it("sinks a portal with its twin once the twin reaches the floor first", () => {
    const air = wallOf({ 1: AIR, 2: AIR, 3: AIR, 4: "....o...." });
    const portal = cellAt(air, 0, 3);
    const twin = cellAt(air, 8, 1);

    const lowered = lowerWall(withPortals(air, portal, twin), 11);

    expect(lowered.sunk).toEqual([twin, portal]);
  });

  it("names each brick sunk once, by cell, a twin among them", () => {
    const steel = wallOf({ 1: "#...#...#", 2: AIR, 3: AIR, 4: "....o...." });
    const wall = withPortals(
      withPortals(steel, cellAt(steel, 1, 1), cellAt(steel, 2, 3)),
      cellAt(steel, 6, 1),
      cellAt(steel, 7, 1),
    );

    const lowered = lowerWall(wall, 11);

    expect(lowered.sunk).toEqual([0, 1, 4, 6, 7, 8, 20]);
  });

  it("keeps each brick in its cell, the wall's rows as they were", () => {
    const wall = wallOf({ 3: "o.2......", 4: AIR, 5: "#...|...-" });

    const lowered = lowerWall(wall, 11);

    expect(lowered.wall).toEqual({ ...wall, lowestRow: 2 });
  });

  it("grows worn moss back a hit as the wall comes down", () => {
    const wall = wornTo(wallOf({ 5: "M...N...." }), 1);

    const lowered = lowerWall(wall, 11);

    expect([lowered.wall.lowestRow, hitsOf(lowered.wall)]).toEqual([
      4,
      [2, null, null, null, 2, null, null, null, null],
    ]);
  });

  it("leaves a cleared level's wall where it stands", () => {
    const wall = wallOf({ 1: STEEL, 2: AIR });

    expect(lowerWall(wall, 11)).toEqual({
      wall,
      rowsDown: 0,
      jumped: false,
      sunk: [],
      lost: false,
    });
  });

  it("leaves the wall it is handed as it was", () => {
    const wall = withPortals(
      wallOf({ 1: "#.#......", 2: "o.......o", 3: "#oooooooo" }),
      2,
      18,
    );
    const before = structuredClone(wall);

    lowerWall(wall, 11);

    expect(wall).toStrictEqual(before);
  });

  it.each([10, 23])("refuses a field %s deep", (depth) => {
    expect(() => lowerWall(wallOf({ 5: BRICKS }), depth)).toThrow(RangeError);
  });

  // K2's rounds made by hand, which the view, the scene and the shell are
  // built against, come down as the rules bring the wall down.
  it.each(keysOf(FLIGHT_FIXTURES))(
    "brings the wall down as the hand-made %s round does",
    (name) => {
      const fixture = FLIGHT_FIXTURES[name];
      const { outcome, next } = fixture.round;

      const lowered = lowerWall(flownWall(fixture), fixture.start.depth);

      expect(lowered).toMatchObject({
        wall: next.wall,
        rowsDown: outcome.rowsDown,
        jumped: outcome.jumped,
        lost: outcome.result === "lost",
      });
    },
  );
});

describe("regrow", () => {
  it("gives no hit back to a worn brick of a kind that doesn't regrow", () => {
    const worn = wornTo(wallOf({ 5: "....4...." }), 1);

    expect(regrow(worn)).toEqual(worn);
  });

  it("gives worn moss back one hit, however worn", () => {
    const worn = wornTo(wallOf({ 5: "N...M...o" }), 1);

    expect(hitsOf(regrow(worn))).toEqual([
      2,
      null,
      null,
      null,
      2,
      null,
      null,
      null,
      1,
    ]);
  });

  it("grows moss no further than its full hits", () => {
    const wall = wallOf({ 5: "N...M...." });

    expect(regrow(wall)).toBe(wall);
  });

  it("grows moss worn by one back to its full hits", () => {
    const worn = wornTo(wallOf({ 5: "N........" }), 2);

    expect(hitsOf(regrow(worn))[0]).toBe(3);
  });

  it("leaves the wall it is handed as it was", () => {
    const worn = wornTo(wallOf({ 5: "N...M...." }), 1);
    const before = structuredClone(worn);

    regrow(worn);

    expect(worn).toStrictEqual(before);
  });
});

describe("lowestNeededRow", () => {
  it("finds the field row of the lowest brick the level needs", () => {
    expect(lowestNeededRow(wallOf({ 4: "....o....", 6: BRICKS }))).toBe(4);
  });

  it("passes over a brick the level doesn't need under it", () => {
    expect(lowestNeededRow(wallOf({ 4: STEEL, 5: "........o" }))).toBe(5);
  });

  it("finds a brick waiting over the ceiling", () => {
    expect(lowestNeededRow(wallOf({ 5: STEEL, 30: "....o...." }))).toBe(30);
  });

  it("finds none in a wall with no brick the level needs", () => {
    expect(lowestNeededRow(wallOf({ 5: STEEL }))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("neededBelow", () => {
  it("counts the bricks the level needs under a row, and none the level doesn't", () => {
    const wall = wallOf({ 3: "##ooo....", 4: "o.......o", 5: BRICKS });

    expect(neededBelow(wall, 5)).toBe(5);
  });

  it("counts none under the lowest row", () => {
    expect(neededBelow(wallOf({ 3: BRICKS }), 3)).toBe(0);
  });
});

describe("inDanger", () => {
  it.each([
    [1, true],
    [2, false],
  ])(
    "says a brick the level needs in row %i is in danger: %s",
    (row, danger) => {
      expect(inDanger(wallOf({ [row]: "....o...." }))).toBe(danger);
    },
  );

  it("finds a brick the level needs in the floor's row in danger, as the step that loses the level comes down", () => {
    expect(inDanger(wallOf({ 0: "....o...." }))).toBe(true);
  });

  it("finds no danger in steel in the danger row under a brick the level needs", () => {
    expect(inDanger(wallOf({ 1: STEEL, 2: "....o...." }))).toBe(false);
  });
});

describe("dangerCells", () => {
  it("gives the cells of the bricks the level needs in the danger row or lower, in order", () => {
    const wall = wallOf({ 0: "o........", 1: "#o#.....o", 2: BRICKS });

    expect(dangerCells(wall)).toEqual([0, 10, 17]);
  });

  it("gives none while no brick the level needs is in danger", () => {
    expect(dangerCells(wallOf({ 1: STEEL, 2: BRICKS }))).toEqual([]);
  });
});
