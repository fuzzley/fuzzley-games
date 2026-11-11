import type { Level } from "../rules/levels/level";
import { DANGER_ROW } from "../rules/wall/lower";
import { HIGH_BRICK, NO_HITS, levelFrom } from "./level_picture";
import {
  type Line,
  type LinePlayed,
  type Solved,
  lineHolds,
  replayLine,
  solveLevel,
} from "./solver";

/** A level of one plain brick, which opens on row 5 of a field 11 deep, under the jump line. */
const ONE_BRICK = levelFrom(["o........"]);

/** A level of one tough brick, which aim 4 clears at charge 2, and aim 12 at charge 0: tried charge by charge, aim 12's would come first. */
const ONE_TOUGH = levelFrom(["2........"]);

/** A level of nine bricks of six hits three rows over the wall's lowest, which the solver clears in three rounds on a field 11 deep, the first jumping the wall. */
const HIGH_SIXES = levelFrom([
  "666666666",
  ".........",
  ".........",
  ".........",
]);

/** A level of eighteen bricks of six hits, which takes every aim and a beam to clear on a field 12 deep. */
const THICK = levelFrom(["666666666", "666666666"]);

/** Returns a line of shots that take no hit under {@link NO_HITS}. */
function missesOf(count: number): Line {
  return Array.from({ length: count }, () => [0, 0] as const);
}

/** Returns the line the solver finds for a level, failing the spec if it finds none. */
function solved(level: Level, depth: number): Solved {
  const found = solveLevel(level, depth);
  if (!found) throw new Error("The solver found no line.");
  return found;
}

describe("solveLevel", () => {
  it("clears a level of one brick greedily, at every fourth aim, in a round", () => {
    expect(solveLevel(ONE_BRICK, 11)).toEqual({
      line: [[4, 0]],
      jumps: 0,
      search: { aimStep: 4, beam: 1 },
    });
  });

  it("tries each aim at every charge before the next aim", () => {
    const later = replayLine(ONE_TOUGH, 11, [[12, 0]]);

    expect([solveLevel(ONE_TOUGH, 11)?.line, later.cleared]).toEqual([
      [[4, 2]],
      true,
    ]);
  });

  it("finds the same line every time", () => {
    expect(solveLevel(HIGH_SIXES, 11)).toEqual(solveLevel(HIGH_SIXES, 11));
  });

  it("finds a line its replay clears in as many rounds, with as many jumps", () => {
    const { line, jumps } = solved(HIGH_SIXES, 11);

    expect(replayLine(HIGH_SIXES, 11, line)).toMatchObject({
      cleared: true,
      rounds: line.length,
      jumps,
    });
  });

  it("finds nothing for a level no shot takes a hit off", () => {
    expect(solveLevel(ONE_BRICK, 11, NO_HITS)).toBeNull();
  });

  describe("on a level greedy search at every fourth aim can't clear", () => {
    let thick: Solved;

    beforeAll(() => {
      thick = solved(THICK, 12);
    });

    it("widens its search to every aim and a beam of 4", () => {
      expect(thick.search).toEqual({ aimStep: 1, beam: 4 });
    });

    it("keeps every brick the level needs out of the danger row between rounds", () => {
      const { leastRow } = replayLine(THICK, 12, thick.line);

      expect(leastRow).toBe(DANGER_ROW + 1);
    });
  });
});

describe("replayLine", () => {
  it("plays a line till it clears its level, and no further", () => {
    expect(replayLine(ONE_BRICK, 11, [[4, 0], ...missesOf(1)])).toEqual({
      cleared: true,
      rounds: 1,
      jumps: 0,
      leastRow: Number.POSITIVE_INFINITY,
    });
  });

  it("stops at the round that loses the level, counting its jumps and the lowest row a needed brick stood in", () => {
    const played = replayLine(HIGH_BRICK, 11, missesOf(8), NO_HITS);

    expect(played).toEqual({
      cleared: false,
      rounds: 6,
      jumps: 1,
      leastRow: 1,
    });
  });

  it("plays a line to its end with the level still on", () => {
    expect(replayLine(ONE_BRICK, 11, missesOf(2), NO_HITS)).toEqual({
      cleared: false,
      rounds: 2,
      jumps: 0,
      leastRow: 3,
    });
  });

  it("throws a RangeError for a shot of an aim that isn't one", () => {
    expect(() => replayLine(ONE_BRICK, 11, [[657, 0]])).toThrow(RangeError);
  });
});

describe("lineHolds", () => {
  /** A line of two shots, played as a certificate must play it. */
  const LINE: Line = [
    [4, 0],
    [8, 0],
  ];
  const HELD: LinePlayed = {
    cleared: true,
    rounds: 2,
    jumps: 0,
    leastRow: DANGER_ROW + 1,
  };

  it("holds a line that clears its level in its rounds with a row to spare", () => {
    expect(lineHolds(LINE, HELD)).toBe(true);
  });

  it.each([
    ["doesn't clear its level", { ...HELD, cleared: false }],
    ["clears it before its last shot", { ...HELD, rounds: 1 }],
    [
      "lets a needed brick into the danger row",
      { ...HELD, leastRow: DANGER_ROW },
    ],
  ])("refuses a line that %s", (_, played) => {
    expect(lineHolds(LINE, played)).toBe(false);
  });
});
