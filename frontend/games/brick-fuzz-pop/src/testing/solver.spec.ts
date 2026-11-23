import type { Level } from "../rules/levels/levels";
import type { RoundRules } from "../rules/round/round";
import { HIGH_BRICK, NO_HITS, levelFrom } from "./level_picture";
import {
  type CertifiedShot,
  type Solved,
  linePlayOf,
  replayLine,
  solveLevel,
} from "./solver";

/** A level of one plain brick, which opens on row 5 of a field 11 deep, under the jump line. */
const ONE_BRICK = levelFrom(["o........"]);

/** A level of one tough brick, which aim 0 clears at charge 2, and aim 12 at charge 0: tried charge by charge, aim 12's would come first. */
const ONE_TOUGH = levelFrom(["2........"]);

/** A level of nine bricks of six hits three rows over the wall's lowest, which the solver clears in three rounds on a field 11 deep, the first jumping the wall. */
const HIGH_SIXES = levelFrom([
  "666666666",
  ".........",
  ".........",
  ".........",
]);

/** Rules under which a fuzzball yawns 6 units out, before a shot at aim 0 reaches {@link ONE_BRICK}'s brick. */
const SHORT_FLIGHTS: RoundRules = { bored: 6 };

/** Returns the line the solver finds for a level, failing the spec if it finds none. */
function solved(level: Level, depth: number): Solved<CertifiedShot> {
  const found = solveLevel(level, depth);
  if (!found) throw new Error("The solver found no line.");
  return found;
}

describe("linePlayOf", () => {
  it("gives every aim a shot at every charge, as a certificate keeps one", () => {
    const { shots } = linePlayOf(ONE_BRICK, 11);

    expect({ aims: shots.length, last: shots.at(-1) }).toEqual({
      aims: 657,
      last: [
        [656, 0],
        [656, 1],
        [656, 2],
        [656, 3],
        [656, 4],
        [656, 5],
      ],
    });
  });

  it("tells apart the starts of rounds that leave the wall alike but free a friend or earn a boon", () => {
    const play = linePlayOf(ONE_BRICK, 11);
    const { opening } = play;

    const keys = [
      opening,
      { ...opening, crew: { friends: [3] } },
      { ...opening, boon: "hot" as const },
      { ...opening, x: 2 },
    ].map(play.keyOf);

    expect(new Set(keys).size).toBe(4);
  });
});

describe("solveLevel", () => {
  it("clears a level of one brick greedily, at every fourth aim, in a round", () => {
    expect(solveLevel(ONE_BRICK, 11)).toEqual({
      line: [[0, 0]],
      jumps: 0,
      search: { aimStep: 4, beam: 1 },
    });
  });

  it("tries each aim at every charge before the next aim", () => {
    const later = replayLine(ONE_TOUGH, 11, [[12, 0]]);

    expect([solveLevel(ONE_TOUGH, 11)?.line, later.cleared]).toEqual([
      [[0, 2]],
      true,
    ]);
  });

  it("finds a line its replay clears in as many rounds, with as many jumps", () => {
    const { line, jumps } = solved(HIGH_SIXES, 11);

    expect(replayLine(HIGH_SIXES, 11, line)).toMatchObject({
      cleared: true,
      rounds: line.length,
      jumps,
    });
  });

  it("searches through the rules it is handed", () => {
    expect(solveLevel(ONE_BRICK, 11, SHORT_FLIGHTS)?.line).toEqual([[460, 0]]);
  });
});

describe("replayLine", () => {
  it("plays a line through the rules it is handed, till the round that loses the level", () => {
    const misses = Array.from({ length: 8 }, () => [0, 0] as const);

    expect(replayLine(HIGH_BRICK, 11, misses, NO_HITS)).toEqual({
      cleared: false,
      rounds: 6,
      jumps: 1,
      leastRow: 1,
    });
  });

  it("throws a RangeError for a shot of an aim that isn't one", () => {
    expect(() => replayLine(ONE_BRICK, 11, [[657, 0]])).toThrow(RangeError);
  });
});
