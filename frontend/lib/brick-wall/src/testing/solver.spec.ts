import { DANGER_ROW, type Wall } from "../rules/wall";
import {
  MADE_UP_RULES,
  type MadeUpKind,
  type MadeUpStart,
  madeUpPlay,
} from "./made_up/wall";
import {
  type Line,
  type LinePlay,
  type LinePlayed,
  type Solved,
  type WallStart,
  lineHolds,
  replayLine,
  solveLine,
} from "./solver";

/** A level of a brick of clay, which aim 0 clears. */
const ONE_BRICK = madeUpPlay(["1........"], 11);

/** A level of a brick of clay that never breaks, three rows over the wall's lowest: no shot clearing it, it jumps once and is lost in six rounds. */
const HIGH_BRICK = madeUpPlay(
  ["#........", ".........", ".........", "........."],
  11,
);

/** A level of two bricks of clay on the jump line, so the first round that breaks one jumps the wall. */
const HIGH_PAIR = madeUpPlay(
  ["1...1....", ".........", ".........", "........."],
  11,
);

/**
 * A level of two bricks of clay side by side, under three of moss over each
 * other in column 8, worth more hits: greedily, at every fourth aim, the
 * moss is broken first, and the clay comes down too far to break both
 * before one stands in the danger row, but a beam of 4 keeps a wall that
 * breaks the clay first.
 */
const MOSS_FIRST = madeUpPlay(["........m", "........m", "1...1...m"], 11);

/** A level of a brick of clay in column 1, which no fourth aim reaches. */
const OFF_THE_FOURTHS = madeUpPlay([".1......."], 11);

/**
 * Returns a level of so many bricks of clay side by side from column 0, in
 * a row that opens on row 5 of a field 11 deep: a round breaks one, and
 * the rest come down a row.
 */
function rowOf(count: number): LinePlay<MadeUpKind, MadeUpStart, number> {
  return madeUpPlay(["1".repeat(count).padEnd(9, ".")], 11);
}

/** Describes where a round of a play of named shots starts: the shots played to get there, and a wall with no brick. */
interface Named {
  readonly wall: Wall<MadeUpKind>;
  readonly line: readonly string[];
}

/** Says how a play of named shots plays: which lines clear its level, how a round is measured and how starts are told apart. */
interface NamedRules {
  readonly clears: (line: readonly string[]) => boolean;
  readonly score?: (line: readonly string[]) => number;
  readonly keyOf?: (start: Named) => string;
}

/**
 * Returns a play of named shots, by aim, whose rounds each add their shot
 * to the line and clear the level where `clears` says, but a shot named
 * `stay`, which leaves the start as it was; its wall holds no brick, so
 * none is ever in danger.
 */
function namedPlay(
  shots: readonly (readonly string[])[],
  { clears, score = () => 0, keyOf = ({ line }) => line.join() }: NamedRules,
): LinePlay<MadeUpKind, Named, string> {
  const wall: Wall<MadeUpKind> = { bricks: [], rows: 0, lowestRow: 5 };
  return {
    opening: { wall, line: [] },
    shots,
    play: (start, shot) => {
      const next =
        shot === "stay" ? start : { wall, line: [...start.line, shot] };
      return {
        outcome: {
          result: clears(next.line) ? "cleared" : "on",
          jumped: false,
        },
        next,
      };
    },
    keyOf,
    score: ({ next }) => score(next.line),
    wallRules: MADE_UP_RULES,
  };
}

/** Returns the line the solver finds for a level, failing the spec if it finds none. */
function solved<T extends WallStart<MadeUpKind>, C>(
  play: LinePlay<MadeUpKind, T, C>,
): Solved<C> {
  const found = solveLine(play);
  if (!found) throw new Error("The solver found no line.");
  return found;
}

describe("solveLine", () => {
  it("clears a level of one brick greedily, at every fourth aim, in a round", () => {
    expect(solveLine(ONE_BRICK)).toEqual({
      line: [0],
      jumps: 0,
      search: { aimStep: 4, beam: 1 },
    });
  });

  it("tries each aim's shots in order before the next aim's", () => {
    const play = namedPlay([["miss", "first"], [], [], [], ["later"]], {
      clears: (line) => line.at(-1) !== "miss",
    });

    expect(solveLine(play)?.line).toEqual(["first"]);
  });

  it("counts the rounds of its line that jumped the wall", () => {
    expect(solveLine(HIGH_PAIR)).toMatchObject({ line: [0, 4], jumps: 1 });
  });

  it("finds a line its replay clears in as many rounds, with as many jumps", () => {
    const { line, jumps } = solved(HIGH_PAIR);

    expect(replayLine(HIGH_PAIR, line)).toMatchObject({
      cleared: true,
      rounds: line.length,
      jumps,
    });
  });

  it("keeps a beam of 4 walls where greedy search finds no line", () => {
    expect(solveLine(MOSS_FIRST)).toEqual({
      line: [0, 4],
      jumps: 0,
      search: { aimStep: 4, beam: 4 },
    });
  });

  it("widens its search to every aim where every fourth finds no line", () => {
    expect(solveLine(OFF_THE_FOURTHS)).toEqual({
      line: [1],
      jumps: 0,
      search: { aimStep: 1, beam: 4 },
    });
  });

  it("keeps every brick the level needs out of the danger row between rounds", () => {
    const { line } = solved(rowOf(4));

    expect(replayLine(rowOf(4), line).leastRow).toBe(DANGER_ROW + 1);
  });

  it("finds nothing for a level it can clear only by bringing a brick it needs into the danger row", () => {
    expect(solveLine(rowOf(5))).toBeNull();
  });

  it("finds nothing for a level no shot clears", () => {
    expect(solveLine(HIGH_BRICK)).toBeNull();
  });

  it("keeps no wall it has come to before, however well it measures", () => {
    const play = namedPlay([["stay", "go"]], {
      clears: (line) => line.length === 3,
      score: (line) => -line.length,
      keyOf: ({ line }) => String(line.length),
    });

    expect(solveLine(play)).toEqual({
      line: ["go", "go", "go"],
      jumps: 0,
      search: { aimStep: 4, beam: 1 },
    });
  });

  it.each([
    ["finds a line", 40, 40],
    ["gives up on a line", 41, undefined],
  ])("%s of %i rounds", (_, rounds, length) => {
    const play = namedPlay([["on"]], {
      clears: (line) => line.length === rounds,
    });

    expect(solveLine(play)?.line.length).toBe(length);
  });
});

describe("replayLine", () => {
  it("plays a line till it clears its level, and no further", () => {
    expect(replayLine(ONE_BRICK, [0, 8])).toEqual({
      cleared: true,
      rounds: 1,
      jumps: 0,
      leastRow: Number.POSITIVE_INFINITY,
    });
  });

  it("stops at the round that loses the level, counting its jumps and the lowest row a needed brick stood in", () => {
    const misses = Array.from({ length: 8 }, () => 8);

    expect(replayLine(HIGH_BRICK, misses)).toEqual({
      cleared: false,
      rounds: 6,
      jumps: 1,
      leastRow: 1,
    });
  });

  it("plays a line to its end with the level still on", () => {
    expect(replayLine(ONE_BRICK, [8, 8])).toEqual({
      cleared: false,
      rounds: 2,
      jumps: 0,
      leastRow: 3,
    });
  });

  it("throws what the game throws for a shot that isn't one", () => {
    expect(() => replayLine(ONE_BRICK, [9])).toThrow(RangeError);
  });
});

describe("lineHolds", () => {
  /** A line of two shots, played as a certificate must play it. */
  const LINE: Line<number> = [4, 8];
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
