import {
  levelResultOf,
  statsOf,
  withLevelCleared,
} from "@fz/brick-wall/rules/stats";
import warmUpMarks from "../../testing/warm_up_marks.json";
import { LEVELS } from "../levels/levels";
import type { Run } from "./run";
import type { Marks } from "./stars";
import {
  type LevelRecord,
  type Stats,
  levelRecordOf,
  statsRulesOf,
} from "./stats";

/** Warm-up's marks, as a fixture of `marks/warm-up.json` holds them: Side door's rally mark 10 and its par 9 on a field 11 deep. */
const MARKS: Marks = warmUpMarks;

/** The records' rules over Warm-up's levels and marks. */
const RULES = statsRulesOf(LEVELS, MARKS);

/** First bounce's record as storage keeps it, every key written out, so renaming one fails. */
const FIRST_BOUNCE = {
  points: 900,
  rounds: 5,
  rally: 24,
  stars: { cleared: true, par: true, mark: false },
};

/** Side door's record as storage keeps it. */
const SIDE_DOOR = {
  points: 700,
  rounds: 9,
  rally: 12,
  stars: { cleared: true, par: false, mark: true },
};

/** Records as storage keeps them. */
const STORED = {
  runs: 4,
  best: 5200,
  furthest: 6,
  levels: { "first-bounce": FIRST_BOUNCE, "side-door": SIDE_DOOR },
};

/** The records {@link STORED} reads as. */
const STATS: Stats = statsOf(STORED, LEVELS, RULES);

/** What clearing Side door brings, beating none of its record. */
const NO_BETTER: LevelRecord = {
  points: 600,
  rounds: 10,
  rally: 5,
  stars: { cleared: true, par: false, mark: false },
};

/** The stars of a level cleared within par, short of its rally mark. */
const AT_PAR_STARS = { cleared: true, par: true, mark: false } as const;

/** Returns a run that has just cleared Side door on a field 11 deep, in so many rounds, with so many points of its own. */
function clearedRun(change: Partial<Run> = {}): Run {
  return {
    id: 1,
    lastLevel: LEVELS.length,
    firstLevel: 1,
    level: 2,
    depth: 11,
    par: 9,
    rounds: 6,
    tally: { jumps: 1, earned: 2, bestRally: 12 },
    banked: 1500,
    stars: 5,
    score: 2500,
    ending: null,
    outcome: "cleared",
    ...change,
  };
}

/** Returns Side door's record once a result is kept. */
function sideDoorAfter(result: LevelRecord): LevelRecord | undefined {
  return withLevelCleared(STATS, "side-door", result, RULES).levels[
    "side-door"
  ];
}

describe("statsRulesOf", () => {
  it("reads the records storage keeps", () => {
    expect(STATS).toEqual(STORED);
  });

  it("brings a level cleared's points, rounds, best rally and the stars it earned to its record", () => {
    expect(levelResultOf(clearedRun(), RULES)).toEqual({
      points: 1000,
      rounds: 6,
      rally: 12,
      stars: { cleared: true, par: true, mark: true },
    });
  });

  it("earns the stars against the level's par and its rally mark on the depth it began on", () => {
    const run = clearedRun({
      rounds: 10,
      tally: { ...clearedRun().tally, bestRally: 9 },
    });

    expect(levelResultOf(run, RULES)?.stars).toEqual({
      cleared: true,
      par: false,
      mark: false,
    });
  });

  it("keeps a level's first record whole", () => {
    const stats = withLevelCleared(STATS, "columns", NO_BETTER, RULES);

    expect(stats.levels["columns"]).toBe(NO_BETTER);
  });

  it("keeps the records themselves for a result that beats none of a level's", () => {
    expect(withLevelCleared(STATS, "side-door", NO_BETTER, RULES)).toBe(STATS);
  });

  it("keeps the records themselves for a result that only equals a level's", () => {
    const equal = { ...SIDE_DOOR, stars: { ...SIDE_DOOR.stars } };

    expect(withLevelCleared(STATS, "side-door", equal, RULES)).toBe(STATS);
  });

  it.each<[string, Partial<LevelRecord>, Partial<LevelRecord>]>([
    ["more points", { points: 800 }, { points: 800 }],
    ["fewer rounds", { rounds: 7 }, { rounds: 7 }],
    ["a better rally", { rally: 30 }, { rally: 30 }],
    [
      "a star the record lacks",
      { stars: { cleared: true, par: true, mark: false } },
      { stars: { cleared: true, par: true, mark: true } },
    ],
  ])("keeps a result's %s, and the rest of the record", (_, beats, kept) => {
    expect(sideDoorAfter({ ...NO_BETTER, ...beats })).toEqual({
      ...SIDE_DOOR,
      ...kept,
    });
  });

  it("leaves the record and the result it is handed as they were", () => {
    const stats = structuredClone(STATS);
    const result = { ...NO_BETTER, points: 800, stars: AT_PAR_STARS };
    const before = structuredClone([stats, result]);

    withLevelCleared(stats, "side-door", result, RULES);

    expect([stats, result]).toEqual(before);
  });

  it("keeps every part a result beats at once", () => {
    const result: LevelRecord = {
      points: 800,
      rounds: 12,
      rally: 30,
      stars: { cleared: true, par: true, mark: false },
    };

    expect(sideDoorAfter(result)).toEqual({
      points: 800,
      rounds: 9,
      rally: 30,
      stars: { cleared: true, par: true, mark: true },
    });
  });
});

describe("levelRecordOf", () => {
  it("reads a record a level cleared keeps", () => {
    expect(levelRecordOf(FIRST_BOUNCE)).toEqual(FIRST_BOUNCE);
  });

  it.each<[string, unknown]>([
    ["something that isn't a record", [FIRST_BOUNCE]],
    ["points that aren't a count", { ...FIRST_BOUNCE, points: "900" }],
    ["no rounds kept", { points: 900, rally: 24, stars: FIRST_BOUNCE.stars }],
    ["a rally below nothing", { ...FIRST_BOUNCE, rally: -1 }],
    ["a level cleared in no round", { ...FIRST_BOUNCE, rounds: 0 }],
    ["stars that aren't a record", { ...FIRST_BOUNCE, stars: 2 }],
    [
      "stars that say the level wasn't cleared",
      { ...FIRST_BOUNCE, stars: { cleared: false, par: true, mark: false } },
    ],
    [
      "stars without the star for clearing",
      { ...FIRST_BOUNCE, stars: { par: true, mark: false } },
    ],
    [
      "the star for par that isn't a flag",
      { ...FIRST_BOUNCE, stars: { cleared: true, par: 1, mark: false } },
    ],
    [
      "the rally mark's star that isn't a flag",
      { ...FIRST_BOUNCE, stars: { cleared: true, par: true, mark: "no" } },
    ],
  ])("drops %s", (_, value) => {
    expect(levelRecordOf(value)).toBeNull();
  });

  it("drops a level's record it can't trust from the records, keeping the others", () => {
    const stored = {
      ...STORED,
      levels: {
        ...STORED.levels,
        "first-bounce": { ...FIRST_BOUNCE, rounds: 0 },
      },
    };

    expect(statsOf(stored, LEVELS, RULES).levels).toEqual({
      "side-door": SIDE_DOOR,
    });
  });
});
