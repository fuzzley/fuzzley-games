import { wallFrom } from "../../testing/wall_picture";
import { type Level, levelStart } from "../levels/level";
import {
  LEVELS,
  type LevelSetData,
  levelEntryOf,
  levelsOf,
  parseLevel,
} from "../levels/levels";
import type { RoundStart } from "../round/round";
import type { Brick } from "../wall/wall";
import { type Run, createRun, pause, startLevel, takeRound } from "./run";
import {
  type RunKeeping,
  hasDepth,
  hasEarnedBoon,
  hasKnownLevel,
  hasSoundCrew,
  hasSoundPlace,
  hasSoundRounds,
  hasSoundScore,
  readRun,
  readStart,
  readWall,
  restoreGame,
  saveGame,
} from "./saved_game";
import { starPoints } from "./scoring";
import { parOf, starsFor } from "./stars";

/** A change a browser might make to what storage keeps, named for the specs. */
type Spoil = readonly [string, Readonly<Record<string, unknown>>];

/** Girder, level 5: its wall's lowest row steel, the row over it bricks and two tough ones. */
const GIRDER: Level = parseLevel(levelEntryOf(LEVELS, 5).data);

/** What of the run the shell keeps beside it, as most specs have it: nothing tuned. */
const KEEPING: RunKeeping = { tuned: false };

/** Returns Girder's bricks as three rounds left them: the first of its second row broken, the tough one beside it worn to a hit. */
function playedBrick(brick: Brick | null, cell: number): Brick | null {
  if (cell === 9) return null;
  return cell === 10 && brick ? { ...brick, hits: 1 } : brick;
}

/** Where Girder's fourth round starts: its wall come down three rows from where it opened on a field 11 deep, now 12 deep. */
const PLAYED: RoundStart = {
  wall: { bricks: GIRDER.bricks.map(playedBrick), rows: 19, lowestRow: 2 },
  depth: 12,
  x: 3.25,
  crew: { friends: [3, 1] },
  boon: null,
};

/** The run under way and {@link PLAYED} as storage keeps them, every key written out, so renaming one fails. */
const STORED = {
  levelId: "girder",
  level: 5,
  firstLevel: 3,
  depth: 11,
  rounds: 3,
  jumps: 0,
  banked: 3000,
  score: 3450,
  tuned: false,
  start: {
    hits: PLAYED.wall.bricks.map((brick) => brick?.hits ?? null),
    lowestRow: 2,
    depth: 12,
    x: 3.25,
    friends: [3, 1],
    boon: null,
  },
};

/** {@link STORED}'s round start with its wall's lowest row, of steel, sunk into the floor. */
const SUNK = {
  hits: STORED.start.hits.map((kept, cell) => (cell < 9 ? null : kept)),
  lowestRow: 0,
};

/** What of a run its wall is read against, three rounds into Girder on a field 11 deep, none of them a jump. */
const THREE_ROUNDS = { depth: 11, rounds: 3, jumps: 0 };

/** Levels a run kept may name that the game doesn't have so, each failing `hasKnownLevel()`. */
const KNOWN_LEVEL_SPOILS: readonly Spoil[] = [
  ["a level that isn't a number", { level: "5" }],
  ["a level before the first", { level: 0 }],
  ["a level past the last", { level: LEVELS.length + 1 }],
  [
    "a level past the last, with no id",
    { level: LEVELS.length + 1, levelId: undefined },
  ],
  ["another level's id", { levelId: "pips" }],
  ["a first level that isn't a number", { firstLevel: "3" }],
  ["a first level before the first", { firstLevel: 0 }],
  ["a first level after the level in play", { firstLevel: 6 }],
];

/** Depths a value kept may hold that no field has, each failing `hasDepth()`. */
const DEPTH_SPOILS: readonly Spoil[] = [
  ["a depth shallower than any field", { depth: 10 }],
  ["a depth deeper than any field", { depth: 23 }],
  ["a depth that isn't whole", { depth: 11.5 }],
  ["a depth that isn't a number", { depth: "11" }],
];

/** Rounds a run kept may hold that don't add up, each failing `hasSoundRounds()`. */
const ROUND_SPOILS: readonly Spoil[] = [
  ["rounds that aren't a number", { rounds: "3" }],
  ["jumps below nothing", { jumps: -1 }],
  ["more jumps than rounds", { jumps: 4 }],
];

/** Points a run kept may hold that don't add up, each failing `hasSoundScore()`. */
const SCORE_SPOILS: readonly Spoil[] = [
  ["points banked that aren't a number", { banked: "3000" }],
  ["a score that isn't a number", { score: null }],
  ["a score below the points banked", { score: 2999 }],
  ["fewer points banked than a star for each level cleared", { banked: 399 }],
  ["points banked with no level cleared", { firstLevel: 5 }],
  [
    "fewer points on the level than its jumps scored",
    { jumps: 3, score: 3299 },
  ],
  ["points on a level with no round played", { rounds: 0 }],
];

/** Places a fuzzball kept may wait at that none can, each failing `hasSoundPlace()`. */
const PLACE_SPOILS: readonly Spoil[] = [
  ["nearer the left wall than a fuzzball waits", { x: 0.25 }],
  ["nearer the right wall than a fuzzball waits", { x: 8.75 }],
  ["a place that isn't a number", { x: "4.5" }],
];

/** Crews a round's start kept may hold that none has, each failing `hasSoundCrew()`. */
const CREW_SPOILS: readonly Spoil[] = [
  ["more friends than a crew holds", { friends: [0, 1, 2, 3, 4, 5, 6] }],
  ["a friend of no ink", { friends: [3, -1] }],
  ["a friend of an ink past the friends'", { friends: [3, 8] }],
  ["friends that aren't a list", { friends: 3 }],
];

/** Boons a round's start kept may carry that the run hasn't earned, each failing `hasEarnedBoon()`. */
const BOON_SPOILS: readonly Spoil[] = [
  ["a boon there is none of", { boon: "warm" }],
  ["a boon the level's jumps don't earn", { boon: "triple" }],
  ["the level's boon with no jump to earn it", { boon: "hot" }],
];

/** Returns a run on Girder, three rounds in, as the moves would bring it there from level 3. */
function runUnderWay(change: Partial<Run> = {}): Run {
  return {
    id: 4,
    lastLevel: LEVELS.length,
    firstLevel: 3,
    level: 5,
    depth: 11,
    par: parOf("girder", 11),
    rounds: 3,
    jumps: 0,
    banked: 3000,
    score: 3450,
    ending: null,
    outcome: "playing",
    ...change,
  };
}

/** Returns the run kept with some of its values changed, as a browser might come to hold it. */
function tampered(
  change: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return { ...STORED, ...change };
}

/** Returns the run kept with some of its round's start's values changed. */
function tamperedStart(
  change: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return { ...STORED.start, ...change };
}

/** Returns the hits kept with a cell's changed. */
function hitsWith(cell: number, hits: unknown): unknown[] {
  return STORED.start.hits.map((kept, at) => (at === cell ? hits : kept));
}

/** Returns a value as storage would read it back. */
function readBack(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

/** Returns whether a run kept holds a sound score, given the levels it says it cleared, its rounds and its jumps. */
function scoreHolds(value: Readonly<Record<string, unknown>>): boolean {
  const cleared = Number(value["level"]) - Number(value["firstLevel"]);
  const rounds = Number(value["rounds"]);
  return hasSoundScore(value, cleared, {
    rounds,
    jumps: Number(value["jumps"]),
  });
}

describe("saveGame", () => {
  it("keeps a run under way and where its next round starts, every key by its name", () => {
    expect(saveGame(runUnderWay(), PLAYED, LEVELS, KEEPING)).toEqual(STORED);
  });

  it("keeps whether the run was tuned", () => {
    const saved = saveGame(runUnderWay(), PLAYED, LEVELS, { tuned: true });

    expect(saved?.tuned).toBe(true);
  });

  it("keeps a level with no round played as one to lay out afresh", () => {
    const run = runUnderWay({ rounds: 0, score: 3000, outcome: "paused" });

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING);

    expect(saved).toMatchObject({ level: 5, rounds: 0, start: null });
  });

  it("keeps a run whose level was just cleared at the start of the next, on the field's depth", () => {
    const run = runUnderWay({ jumps: 1, score: 4100, outcome: "cleared" });

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING);

    expect(saved).toEqual({
      levelId: "zip-line",
      level: 6,
      firstLevel: 3,
      depth: 12,
      rounds: 0,
      jumps: 0,
      banked: 4100,
      score: 4100,
      tuned: false,
      start: null,
    });
  });

  it("keeps a round in flight that clears its level as it lands, at the start of the next", () => {
    const run = takeRound(runUnderWay(), {
      points: 10,
      jumped: false,
      result: "cleared",
    });

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING);

    expect(saved).toMatchObject({
      level: 6,
      banked: 3460 + starPoints(starsFor(4, run.par)),
      start: null,
    });
  });

  it("keeps a paused round in flight that clears its level as it lands", () => {
    const run = takeRound(runUnderWay(), {
      points: 10,
      jumped: false,
      result: "cleared",
    });

    const saved = saveGame(
      { ...run, outcome: "paused" },
      PLAYED,
      LEVELS,
      KEEPING,
    );

    expect(saved).toMatchObject({ level: 6, start: null });
  });

  it("keeps nothing of a run whose round in flight loses its level", () => {
    const run = takeRound(runUnderWay(), {
      points: 0,
      jumped: false,
      result: "lost",
    });

    expect(saveGame(run, PLAYED, LEVELS, KEEPING)).toBeNull();
  });

  it("keeps a cleared level of levels with no par at the start of the next", () => {
    const levels = levelsOf([
      {
        id: "set",
        name: "Set",
        levels: ["a", "b"].map((id) => ({
          id,
          name: id,
          boon: "hot",
          bricks: [],
        })),
      } satisfies LevelSetData,
    ]);
    const run = runUnderWay({
      lastLevel: 2,
      firstLevel: 1,
      level: 1,
      banked: 0,
      outcome: "cleared",
    });

    expect(saveGame(run, PLAYED, levels, KEEPING)).toMatchObject({
      levelId: "b",
      level: 2,
    });
  });

  it.each<[string, Run]>([
    [
      "waiting for its first level's first move",
      createRun({ id: 1, level: 5, depth: 11 }, LEVELS),
    ],
    [
      "under way on its first level with no round played",
      startLevel(createRun({ id: 1, level: 5, depth: 11 }, LEVELS)),
    ],
    [
      "paused on its first level with no round played",
      pause(startLevel(createRun({ id: 1, level: 5, depth: 11 }, LEVELS))),
    ],
    ["over", runUnderWay({ outcome: "over" })],
    ["won", runUnderWay({ level: LEVELS.length, outcome: "won" })],
  ])("keeps nothing of a run %s", (_, run) => {
    expect(saveGame(run, PLAYED, LEVELS, KEEPING)).toBeNull();
  });
});

describe("restoreGame", () => {
  it("takes up a run kept, paused, under a new id, and where its next round starts", () => {
    expect(restoreGame(STORED, LEVELS, 9)).toEqual({
      run: runUnderWay({ id: 9, outcome: "paused" }),
      start: PLAYED,
      tuned: false,
    });
  });

  it("takes up what it kept, as storage reads it back", () => {
    const run = runUnderWay();
    const kept = readBack(saveGame(run, PLAYED, LEVELS, { tuned: true }));

    expect(restoreGame(kept, LEVELS, 9)).toEqual({
      run: { ...run, id: 9, outcome: "paused" },
      start: PLAYED,
      tuned: true,
    });
  });

  it("takes up a run with a boon earned by a jump", () => {
    const start = tamperedStart({ ...SUNK, boon: "hot" });

    const takenUp = restoreGame(tampered({ jumps: 1, start }), LEVELS, 9);

    expect(takenUp?.start.boon).toBe("hot");
  });

  it("works its par out from the pars it is given", () => {
    const takenUp = restoreGame(STORED, LEVELS, 9, { girder: { "11": 4 } });

    expect(takenUp?.run.par).toBe(4);
  });

  it("lays a level with no round played out afresh, on the depth it began on", () => {
    const value = tampered({ depth: 14, rounds: 0, score: 3000, start: null });

    expect(restoreGame(value, LEVELS, 9)?.start).toEqual(
      levelStart(GIRDER, 14),
    );
  });

  it("takes up a level just cleared, as it kept it, at the start of the next", () => {
    const cleared = runUnderWay({ score: 4100, outcome: "cleared" });
    const kept = readBack(saveGame(cleared, PLAYED, LEVELS, KEEPING));

    const takenUp = restoreGame(kept, LEVELS, 9);

    expect(takenUp?.run).toEqual({
      ...cleared,
      id: 9,
      level: 6,
      depth: 12,
      par: parOf("zip-line", 12),
      rounds: 0,
      banked: 4100,
      outcome: "paused",
    });
  });

  it.each<[string, unknown]>([
    ["something that isn't a run", 5],
    ["a run that can't be trusted", tampered({ level: 0 })],
    ["a tuning that isn't a yes or a no", tampered({ tuned: "no" })],
    ["a level with rounds played and no start", tampered({ start: null })],
    [
      "a start of a level with no round played",
      tampered({ rounds: 0, score: 3000 }),
    ],
    ["a start that isn't one", tampered({ start: 5 })],
    ["no start at all", tampered({ start: undefined })],
    [
      "a start that can't be trusted",
      tampered({ start: tamperedStart({ x: 0 }) }),
    ],
  ])("drops %s", (_, value) => {
    expect(restoreGame(value, LEVELS, 9)).toBeNull();
  });
});

describe("readRun", () => {
  it("reads the run kept, paused, under a new id, its par worked out afresh", () => {
    expect(readRun(STORED, LEVELS, 9)).toEqual(
      runUnderWay({ id: 9, outcome: "paused" }),
    );
  });

  it.each([
    ...KNOWN_LEVEL_SPOILS,
    ...DEPTH_SPOILS,
    ...ROUND_SPOILS,
    ...SCORE_SPOILS,
  ])("drops a run of %s", (_, change) => {
    expect(readRun(tampered(change), LEVELS, 9)).toBeNull();
  });
});

describe("hasKnownLevel", () => {
  it("holds a run kept to the level the game has under its number", () => {
    expect(hasKnownLevel(STORED, LEVELS)).toBe(true);
  });

  it("holds a run kept on its first level", () => {
    expect(hasKnownLevel(tampered({ firstLevel: 5 }), LEVELS)).toBe(true);
  });

  it.each(KNOWN_LEVEL_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasKnownLevel(tampered(change), LEVELS)).toBe(false);
  });
});

describe("hasDepth", () => {
  it.each([11, 22])("holds a depth of %i", (depth) => {
    expect(hasDepth(tampered({ depth }))).toBe(true);
  });

  it.each(DEPTH_SPOILS)("fails %s", (_, change) => {
    expect(hasDepth(tampered(change))).toBe(false);
  });
});

describe("hasSoundRounds", () => {
  it("holds a run kept with as many jumps as rounds", () => {
    expect(hasSoundRounds(tampered({ jumps: 3 }))).toBe(true);
  });

  it.each(ROUND_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasSoundRounds(tampered(change))).toBe(false);
  });
});

describe("hasSoundScore", () => {
  it("holds a run kept to its points", () => {
    expect(scoreHolds(STORED)).toBe(true);
  });

  it("holds a run kept with no round played and nothing scored on its level", () => {
    expect(scoreHolds(tampered({ rounds: 0, score: 3000 }))).toBe(true);
  });

  it("holds a run kept on its first level with nothing banked", () => {
    expect(scoreHolds(tampered({ firstLevel: 5, banked: 0 }))).toBe(true);
  });

  it("holds a run kept with a star's points for each level cleared, and its jumps' on the level", () => {
    expect(scoreHolds(tampered({ banked: 400, jumps: 3, score: 700 }))).toBe(
      true,
    );
  });

  it.each(SCORE_SPOILS)("fails a run of %s", (_, change) => {
    expect(scoreHolds(tampered(change))).toBe(false);
  });
});

describe("readStart", () => {
  it("reads where a round starts as kept", () => {
    expect(readStart(STORED.start, GIRDER, runUnderWay())).toEqual(PLAYED);
  });

  it.each([
    ...DEPTH_SPOILS,
    ...PLACE_SPOILS,
    ...CREW_SPOILS,
    ...BOON_SPOILS,
    ["a wall that can't be trusted", { lowestRow: 6 }] as const,
  ])("drops a start of %s", (_, change) => {
    expect(readStart(tamperedStart(change), GIRDER, runUnderWay())).toBeNull();
  });

  it("drops something that isn't a start", () => {
    expect(readStart([], GIRDER, runUnderWay())).toBeNull();
  });
});

describe("hasSoundPlace", () => {
  it.each([0.5, 8.5])("holds a fuzzball waiting at %f", (x) => {
    expect(hasSoundPlace(tamperedStart({ x }))).toBe(true);
  });

  it.each(PLACE_SPOILS)("fails a fuzzball waiting %s", (_, change) => {
    expect(hasSoundPlace(tamperedStart(change))).toBe(false);
  });
});

describe("hasSoundCrew", () => {
  it.each([[[]], [[0, 1, 2, 3, 4, 5]], [[7]]])(
    "holds a crew of %j",
    (friends) => {
      expect(hasSoundCrew(tamperedStart({ friends }))).toBe(true);
    },
  );

  it.each(CREW_SPOILS)("fails a crew of %s", (_, change) => {
    expect(hasSoundCrew(tamperedStart(change))).toBe(false);
  });
});

describe("hasEarnedBoon", () => {
  it("holds a start with no boon", () => {
    expect(hasEarnedBoon(STORED.start, GIRDER, 0)).toBe(true);
  });

  it("holds a start with the level's boon after a jump", () => {
    expect(hasEarnedBoon(tamperedStart({ boon: "hot" }), GIRDER, 1)).toBe(true);
  });

  it.each(BOON_SPOILS)("fails a start of %s", (_, change) => {
    expect(hasEarnedBoon(tamperedStart(change), GIRDER, 0)).toBe(false);
  });

  it("fails a boon the level's jumps don't earn, whatever the jumps", () => {
    expect(hasEarnedBoon(tamperedStart({ boon: "triple" }), GIRDER, 2)).toBe(
      false,
    );
  });
});

describe("readWall", () => {
  it("lays the level's bricks out with the hits kept, where the wall has come to", () => {
    expect(readWall(STORED.start, GIRDER, THREE_ROUNDS)).toEqual(PLAYED.wall);
  });

  it("keeps each brick as the level lays it out where its hits are whole", () => {
    const wall = readWall(STORED.start, GIRDER, THREE_ROUNDS);

    expect(wall?.bricks[0]).toBe(GIRDER.bricks[0]);
  });

  it("reads a wall whose lowest rows have sunk into the floor", () => {
    expect(readWall(tamperedStart(SUNK), GIRDER, THREE_ROUNDS)).not.toBeNull();
  });

  it("reads a wall come down a jump's rows for a round that jumped", () => {
    const run = { ...THREE_ROUNDS, jumps: 1 };

    expect(readWall(tamperedStart(SUNK), GIRDER, run)).not.toBeNull();
  });

  it("drops a wall come down a row less than a jump brings it", () => {
    const run = { ...THREE_ROUNDS, jumps: 1 };
    const start = tamperedStart({ ...SUNK, lowestRow: 1 });

    expect(readWall(start, GIRDER, run)).toBeNull();
  });

  it.each<Spoil>([
    ["hits that aren't a list", { hits: 5 }],
    ["fewer cells than the level's", { hits: STORED.start.hits.slice(1) }],
    ["more cells than the level's", { hits: [...STORED.start.hits, null] }],
    ["a lowest row that isn't whole", { lowestRow: 2.5 }],
    ["a wall come down fewer rows than its rounds bring it", { lowestRow: 3 }],
    ["a brick where the level has none", { hits: hitsWith(2, 1) }],
    ["a brick with more hits than whole", { hits: hitsWith(10, 3) }],
    ["a brick with no hits left", { hits: hitsWith(11, 0) }],
    ["hits that aren't a count", { hits: hitsWith(11, "1") }],
    ["hits on a brick that never breaks", { hits: hitsWith(0, 1) }],
    ["a brick standing on the floor", { lowestRow: 0 }],
    [
      "nothing left the level needs",
      {
        hits: GIRDER.bricks.map((brick) =>
          brick?.kind === "steel" ? 0 : null,
        ),
      },
    ],
  ])("drops a wall of %s", (_, change) => {
    expect(readWall(tamperedStart(change), GIRDER, THREE_ROUNDS)).toBeNull();
  });

  describe("with portals", () => {
    /** A level of two steel bricks twinned as a portal's pair stand in for, over a row of bricks. */
    const TWINNED: Level = {
      boon: "hot",
      bricks: wallFrom(["#......#.", "ooooooooo"]).bricks.map((brick, cell) => {
        if (cell === 9) return brick && { ...brick, twin: 16 };
        return cell === 16 && brick ? { ...brick, twin: 9 } : brick;
      }),
      rows: 2,
    };

    /** What of a run its wall is read against: none of its rounds played yet. */
    const NO_ROUNDS = { depth: 11, rounds: 0, jumps: 0 };

    /** Returns the twins' hits kept, each as given, over a row of bricks. */
    function twins(
      first: number | null,
      second: number | null,
    ): Record<string, unknown> {
      const hits = TWINNED.bricks.map((brick) => brick?.hits ?? null);
      hits[9] = first;
      hits[16] = second;
      return { hits, lowestRow: 1 };
    }

    it.each([
      ["both twins kept", 0, 0],
      ["both twins gone", null, null],
    ] as const)("reads a wall with %s", (_, first, second) => {
      expect(readWall(twins(first, second), TWINNED, NO_ROUNDS)).not.toBeNull();
    });

    it.each([
      ["the first twin gone", null, 0],
      ["the second twin gone", 0, null],
    ] as const)("drops a wall with %s", (_, first, second) => {
      expect(readWall(twins(first, second), TWINNED, NO_ROUNDS)).toBeNull();
    });
  });
});
