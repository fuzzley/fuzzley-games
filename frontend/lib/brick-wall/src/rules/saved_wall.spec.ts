import { isCount, isFiniteNumber, isRecord } from "@fz/core/json";
import { type Legend, levelOpening, wallFrom } from "./level_picture";
import type { Pars } from "./par";
import {
  type Run,
  type RunRules,
  type TakenRound,
  createRun,
  pause,
  startLevel,
  takeRound,
} from "./run";
import {
  type Kept,
  type KeptWall,
  type SavedRules,
  type WallPlay,
  hasDepth,
  hasKnownLevel,
  hasSoundScore,
  keptWallOf,
  readSavedRun,
  readStars,
  readWall,
  restoreRun,
  saveRun,
  savedRunOf,
} from "./saved_wall";
import type { Wall, WallRules } from "./wall";

/** Kinds of brick made up for the specs, gates coming in pairs of twins. */
type Kind = "pebble" | "flint" | "slate" | "gate";

/** A change a browser might make to what storage keeps, named for the specs. */
type Spoil = readonly [string, Readonly<Record<string, unknown>>];

/** What the spec's game tallies of a level's rounds: how many jumped the wall, and its longest streak. */
interface Tally {
  readonly jumps: number;
  readonly longest: number;
}

/** Where a round of the spec's game starts: its wall, the depth it is played on, and where its fuzzball waits. */
interface Start {
  readonly wall: Wall<Kind>;
  readonly depth: number;
  readonly x: number;
}

/** Where a round of the spec's game starts as its saved game keeps it. */
interface KeptStart extends KeptWall {
  readonly depth: number;
  readonly x: number;
}

/** The legend the specs draw their level in. */
const LEGEND: Legend<Kind> = {
  none: ".",
  bricks: {
    p: { kind: "pebble", hits: 1, plates: 0 },
    f: { kind: "flint", hits: 3, plates: 0 },
    "#": { kind: "slate", hits: 0, plates: 0 },
    "@": { kind: "gate", hits: 0, plates: 0 },
  },
  twinMarks: ["@"],
  tintOf: () => 0,
};

/** Which of the spec's kinds a level needs broken: every one but slate and gates. */
const WALL_RULES: Pick<WallRules<Kind>, "needed"> = {
  needed: (kind) => kind === "pebble" || kind === "flint",
};

/**
 * The spec's level: a row of slate at its foot, a row of pebbles over it,
 * and a flint and a pebble between two gates, twins, over those.
 */
const LEVEL = wallFrom(["@..fp..@.", "ppppppppp", "#########"], LEGEND);

/** Five levels made up for the spec, "a" to "e", numbered 1 to 5. */
const LEVELS = ["a", "b", "c", "d", "e"].map((id) => ({ data: { id } }));

/** Each level's par on the depths the specs play. */
const PARS: Pars = Object.fromEntries(
  ["a", "b", "c", "d", "e"].map((id) => [id, { "11": 4, "12": 5, "14": 6 }]),
);

/** A round of the spec's game as its run takes it in. */
interface Played extends TakenRound {
  readonly jumped: boolean;
  readonly streak: number;
}

/** The spec's game's run rules: two stars for a level cleared within par, else one, each worth 100. */
const RUN_RULES: RunRules<Tally, Played> = {
  pars: PARS,
  untallied: { jumps: 0, longest: 0 },
  tallied: ({ jumps, longest }, { jumped, streak }) => ({
    jumps: jumps + (jumped ? 1 : 0),
    longest: Math.max(longest, streak),
  }),
  starsOf: ({ rounds, par }) => (rounds <= par ? 2 : 1),
  starPoints: 100,
};

/** Returns where a round of the spec's game starts as kept, read back, against the spec's level. */
function readStart(value: unknown, run: Run<Tally>): Start | null {
  if (!isRecord(value) || !hasDepth(value)) return null;
  const { depth, x } = value;
  const played = {
    depth: run.depth,
    rounds: run.rounds,
    jumps: run.tally.jumps,
  };
  const wall = readWall(value, LEVEL, played, WALL_RULES);
  return wall !== null && isFiniteNumber(x) ? { wall, depth, x } : null;
}

/** The spec's game's saved-game rules. */
const SAVED_RULES: SavedRules<Tally, KeptStart, Start> = {
  mostStars: 2,
  keptStart: ({ wall, depth, x }) => ({ ...keptWallOf(wall), depth, x }),
  readTally: (value, { rounds }) => {
    const { jumps, longest } = value;
    return isCount(jumps) && jumps <= rounds && isCount(longest)
      ? { jumps, longest }
      : null;
  },
  openingOf: (run) => ({ ...levelOpening(LEVEL, run.depth), depth: run.depth }),
  readStart,
};

/** Every rule the spec's saved game is handed. */
const RULES = { ...RUN_RULES, ...SAVED_RULES };

/** The spec's level three rounds in on a field 11 deep, none of them a jump: its wall come down three rows from row 5, where it opened, a pebble broken and the flint worn to two hits. */
const PLAYED: Start = {
  wall: {
    bricks: LEVEL.bricks.map((brick, cell) => {
      if (cell === 9) return null;
      return cell === 21 && brick !== null ? { ...brick, hits: 2 } : brick;
    }),
    rows: 3,
    lowestRow: 2,
  },
  depth: 12,
  x: 3.25,
};

/** The run three rounds into level 3 and {@link PLAYED} as storage keeps them, every key written out, so renaming one fails. */
const STORED = {
  levelId: "c",
  level: 3,
  firstLevel: 1,
  depth: 11,
  rounds: 3,
  jumps: 0,
  longest: 6,
  banked: 900,
  stars: 4,
  score: 1250,
  tuned: false,
  start: {
    hits: PLAYED.wall.bricks.map((brick) => brick?.hits ?? null),
    lowestRow: 2,
    depth: 12,
    x: 3.25,
  },
};

/** What of a run its wall is read against, three rounds into the level on a field 11 deep, none of them a jump. */
const THREE_ROUNDS: WallPlay = { depth: 11, rounds: 3, jumps: 0 };

/** {@link STORED}'s wall with its lowest row, of slate, sunk into the floor. */
const SUNK = {
  hits: STORED.start.hits.map((kept, cell) => (cell < 9 ? null : kept)),
  lowestRow: 0,
};

/** Levels a run kept may name that the game doesn't have so, each failing `hasKnownLevel()`. */
const KNOWN_LEVEL_SPOILS: readonly Spoil[] = [
  ["a level that isn't a number", { level: "3" }],
  ["a level before the first", { level: 0 }],
  ["a level past the last", { level: 6 }],
  ["a level past the last, with no id", { level: 6, levelId: undefined }],
  ["another level's id", { levelId: "b" }],
  ["an id that isn't one", { levelId: 3 }],
  ["a first level that isn't a number", { firstLevel: "1" }],
  ["a first level before the first", { firstLevel: 0 }],
  ["a first level after the level in play", { firstLevel: 4 }],
];

/** Depths a value kept may hold that no field has, each failing `hasDepth()`. */
const DEPTH_SPOILS: readonly Spoil[] = [
  ["a depth shallower than any field", { depth: 10 }],
  ["a depth deeper than any field", { depth: 23 }],
  ["a depth that isn't whole", { depth: 11.5 }],
  ["a depth that isn't a number", { depth: "11" }],
];

/** Rounds a run kept may hold that no level plays, each failing `readSavedRun()` itself. */
const ROUND_SPOILS: readonly Spoil[] = [
  ["rounds that aren't a number", { rounds: "3" }],
  ["rounds below nothing", { rounds: -1 }],
  ["rounds that aren't whole", { rounds: 2.5 }],
];

/** Stars a run kept may hold that its levels cleared can't have earned, each failing `readStars()`. */
const STAR_SPOILS: readonly Spoil[] = [
  ["stars that aren't a number", { stars: "4" }],
  ["stars that aren't whole", { stars: 3.5 }],
  ["fewer stars than one for each level cleared", { stars: 1 }],
  ["more stars than the most for each level cleared", { stars: 5 }],
  ["stars with no level cleared", { firstLevel: 3 }],
];

/** Points a run kept may hold that don't add up, each failing `hasSoundScore()`. */
const SCORE_SPOILS: readonly Spoil[] = [
  ["points banked that aren't a number", { banked: "900" }],
  ["a score that isn't a number", { score: null }],
  ["a score below the points banked", { score: 899 }],
  ["fewer points banked than its stars brought", { banked: 399, score: 399 }],
  ["points banked with no star earned", { firstLevel: 3, stars: 0 }],
  ["points on a level with no round played", { rounds: 0 }],
];

/** Tallies a run kept may hold that the spec's game can't trust, each failing its `readTally()`. */
const TALLY_SPOILS: readonly Spoil[] = [
  ["more jumps than rounds", { jumps: 4 }],
  ["a streak that isn't a number", { longest: "6" }],
];

/** Returns the run kept with some of its values changed, as a browser might come to hold it. */
function tampered(change: Readonly<Record<string, unknown>>): Kept {
  return { ...STORED, ...change };
}

/** Returns the run kept with some of its wall's values changed. */
function tamperedStart(change: Readonly<Record<string, unknown>>): Kept {
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

/** Returns the stars a run kept has earned, given the levels it says it cleared. */
function starsRead(value: Kept): number | null {
  const cleared = Number(value["level"]) - Number(value["firstLevel"]);
  return readStars(value, cleared, 2);
}

/** Returns whether a run kept holds a sound score, given the stars it says it earned and its rounds. */
function scoreHolds(value: Kept): boolean {
  return hasSoundScore(
    value,
    Number(value["stars"]),
    Number(value["rounds"]),
    RUN_RULES,
  );
}

/** Returns a run three rounds into level 3, as the moves would bring it there from level 1. */
function runUnderWay(change: Partial<Run<Tally>> = {}): Run<Tally> {
  return {
    id: 4,
    lastLevel: 5,
    firstLevel: 1,
    level: 3,
    depth: 11,
    par: 4,
    rounds: 3,
    tally: { jumps: 0, longest: 6 },
    banked: 900,
    stars: 4,
    score: 1250,
    ending: null,
    outcome: "playing",
    ...change,
  };
}

describe("keptWallOf", () => {
  it("keeps each brick's hits by its wall cell, and where its lowest row stands", () => {
    expect(keptWallOf(PLAYED.wall)).toEqual({
      hits: STORED.start.hits,
      lowestRow: 2,
    });
  });
});

describe("readWall", () => {
  it("lays the level's bricks out with the hits kept, where the wall has come to", () => {
    expect(readWall(STORED.start, LEVEL, THREE_ROUNDS, WALL_RULES)).toEqual(
      PLAYED.wall,
    );
  });

  it("keeps each brick as the level lays it out where its hits are whole", () => {
    const wall = readWall(STORED.start, LEVEL, THREE_ROUNDS, WALL_RULES);

    expect(wall?.bricks[10]).toBe(LEVEL.bricks[10]);
  });

  it("reads a wall whose lowest rows have sunk into the floor", () => {
    const wall = readWall(tamperedStart(SUNK), LEVEL, THREE_ROUNDS, WALL_RULES);

    expect(wall).not.toBeNull();
  });

  it("reads a wall come down a jump's rows for a round that jumped", () => {
    const played = { ...THREE_ROUNDS, jumps: 1 };

    const wall = readWall(tamperedStart(SUNK), LEVEL, played, WALL_RULES);

    expect(wall).not.toBeNull();
  });

  it("drops a wall come down a row less than a jump brings it", () => {
    const played = { ...THREE_ROUNDS, jumps: 1 };
    const start = tamperedStart({ ...SUNK, lowestRow: 1 });

    expect(readWall(start, LEVEL, played, WALL_RULES)).toBeNull();
  });

  it("reads a wall on the depth its level began on, which sets where it opened", () => {
    const played = { ...THREE_ROUNDS, depth: 14 };
    const start = tamperedStart({ lowestRow: 3 });

    expect(readWall(start, LEVEL, played, WALL_RULES)).not.toBeNull();
  });

  it.each<Spoil>([
    ["hits that aren't a list", { hits: 5 }],
    ["fewer cells than the level's", { hits: STORED.start.hits.slice(1) }],
    ["more cells than the level's", { hits: [...STORED.start.hits, null] }],
    ["a lowest row that isn't whole", { lowestRow: 1.5 }],
    ["a wall come down fewer rows than its rounds bring it", { lowestRow: 3 }],
    ["a brick where the level has none", { hits: hitsWith(19, 1) }],
    ["a brick with more hits than whole", { hits: hitsWith(21, 4) }],
    ["a brick with no hits left", { hits: hitsWith(10, 0) }],
    ["hits that aren't a count", { hits: hitsWith(10, "1") }],
    ["hits that aren't whole", { hits: hitsWith(21, 1.5) }],
    ["hits on a brick that never breaks", { hits: hitsWith(0, 1) }],
    ["a brick standing on the floor", { lowestRow: 0 }],
    [
      "nothing left the level needs",
      {
        hits: LEVEL.bricks.map((brick) =>
          brick?.kind === "slate" || brick?.kind === "gate" ? 0 : null,
        ),
      },
    ],
    ["the first twin gone", { hits: hitsWith(18, null) }],
    ["the second twin gone", { hits: hitsWith(25, null) }],
  ])("drops a wall of %s", (_, change) => {
    const start = tamperedStart(change);

    expect(readWall(start, LEVEL, THREE_ROUNDS, WALL_RULES)).toBeNull();
  });

  it("reads a wall with both twins gone", () => {
    const hits = STORED.start.hits.map((kept, cell) =>
      cell === 18 || cell === 25 ? null : kept,
    );

    const wall = readWall(
      tamperedStart({ hits }),
      LEVEL,
      THREE_ROUNDS,
      WALL_RULES,
    );

    expect(wall).not.toBeNull();
  });
});

describe("savedRunOf", () => {
  it("keeps every key of the frame, the game's tally beside the rounds, in the order storage keeps them", () => {
    const kept = savedRunOf(
      runUnderWay(),
      SAVED_RULES.keptStart(PLAYED),
      LEVELS,
      false,
    );

    expect(JSON.stringify(kept)).toBe(JSON.stringify(STORED));
  });

  it("takes no tally with a field named as one of the frame's", () => {
    const run = { ...runUnderWay(), tally: { jumps: 0, depth: 14 } };

    // @ts-expect-error -- the tally's depth would overwrite the frame's.
    const kept = savedRunOf(run, null, LEVELS, false);

    expect(kept).toHaveProperty("depth", 14);
  });

  it("names the level in play by the id the game gives its number", () => {
    const kept = savedRunOf(runUnderWay({ level: 5 }), null, LEVELS, true);

    expect(kept).toMatchObject({ levelId: "e", tuned: true, start: null });
  });
});

describe("saveRun", () => {
  /** What of the run the shell keeps beside it, as most specs have it: nothing tuned. */
  const KEEPING = { tuned: false };

  it("keeps a run under way and where its next round starts", () => {
    expect(saveRun(runUnderWay(), PLAYED, LEVELS, KEEPING, RULES)).toEqual(
      STORED,
    );
  });

  it("keeps whether the run was tuned", () => {
    const saved = saveRun(
      runUnderWay(),
      PLAYED,
      LEVELS,
      { tuned: true },
      RULES,
    );

    expect(saved?.tuned).toBe(true);
  });

  it("keeps a level with no round played as one to lay out afresh", () => {
    const run = runUnderWay({ rounds: 0, score: 900, outcome: "paused" });

    const saved = saveRun(run, PLAYED, LEVELS, KEEPING, RULES);

    expect(saved).toMatchObject({ level: 3, rounds: 0, start: null });
  });

  it("keeps a run whose level was just cleared at the start of the next, on the next start's depth, nothing tallied", () => {
    const run = runUnderWay({ score: 1450, stars: 6, outcome: "cleared" });

    const saved = saveRun(run, PLAYED, LEVELS, KEEPING, RULES);

    expect(saved).toEqual({
      levelId: "d",
      level: 4,
      firstLevel: 1,
      depth: 12,
      rounds: 0,
      jumps: 0,
      longest: 0,
      banked: 1450,
      stars: 6,
      score: 1450,
      tuned: false,
      start: null,
    });
  });

  it("keeps a round in flight that clears its level as it lands, at the start of the next", () => {
    const round = {
      points: 50,
      result: "cleared",
      jumped: false,
      streak: 2,
    } as const;
    const run = takeRound(runUnderWay(), round, RUN_RULES);

    const saved = saveRun(run, PLAYED, LEVELS, KEEPING, RULES);

    expect(saved).toMatchObject({
      level: 4,
      banked: 1250 + 50 + 2 * 100,
      stars: 4 + 2,
      start: null,
    });
  });

  it("keeps a paused round in flight that clears its level as it lands", () => {
    const round = {
      points: 50,
      result: "cleared",
      jumped: false,
      streak: 2,
    } as const;
    const run = pause(takeRound(runUnderWay(), round, RUN_RULES));

    const saved = saveRun(run, PLAYED, LEVELS, KEEPING, RULES);

    expect(saved).toMatchObject({ level: 4, start: null });
  });

  it("keeps nothing of a run whose round in flight loses its level", () => {
    const round = {
      points: 0,
      result: "lost",
      jumped: false,
      streak: 0,
    } as const;
    const run = takeRound(runUnderWay(), round, RUN_RULES);

    expect(saveRun(run, PLAYED, LEVELS, KEEPING, RULES)).toBeNull();
  });

  it.each<[string, Run<Tally>]>([
    [
      "waiting for its first level's first move",
      createRun({ id: 1, level: 3, depth: 11 }, LEVELS, RUN_RULES),
    ],
    [
      "under way on its first level with no round played",
      startLevel(createRun({ id: 1, level: 3, depth: 11 }, LEVELS, RUN_RULES)),
    ],
    [
      "paused on its first level with no round played",
      pause(
        startLevel(
          createRun({ id: 1, level: 3, depth: 11 }, LEVELS, RUN_RULES),
        ),
      ),
    ],
    ["over", runUnderWay({ outcome: "over" })],
    ["won", runUnderWay({ level: 5, outcome: "won" })],
  ])("keeps nothing of a run %s", (_, run) => {
    expect(saveRun(run, PLAYED, LEVELS, KEEPING, RULES)).toBeNull();
  });
});

describe("restoreRun", () => {
  it("takes up a run kept, paused, under a new id, and where its next round starts", () => {
    expect(restoreRun(STORED, LEVELS, 9, RULES)).toEqual({
      run: runUnderWay({ id: 9, outcome: "paused" }),
      start: PLAYED,
      tuned: false,
    });
  });

  it("takes up what it kept, as storage reads it back", () => {
    const run = runUnderWay({ tally: { jumps: 0, longest: 11 } });
    const kept = readBack(saveRun(run, PLAYED, LEVELS, { tuned: true }, RULES));

    expect(restoreRun(kept, LEVELS, 9, RULES)).toEqual({
      run: { ...run, id: 9, outcome: "paused" },
      start: PLAYED,
      tuned: true,
    });
  });

  it("lays a level with no round played out afresh, as the game opens it on the depth it began on", () => {
    const value = tampered({ depth: 14, rounds: 0, score: 900, start: null });

    expect(restoreRun(value, LEVELS, 9, RULES)?.start).toEqual({
      ...levelOpening(LEVEL, 14),
      depth: 14,
    });
  });

  it("takes up a level just cleared, as it kept it, at the start of the next", () => {
    const cleared = runUnderWay({ score: 1450, stars: 6, outcome: "cleared" });
    const kept = readBack(
      saveRun(cleared, PLAYED, LEVELS, { tuned: false }, RULES),
    );

    const takenUp = restoreRun(kept, LEVELS, 9, RULES);

    expect(takenUp?.run).toEqual({
      ...cleared,
      id: 9,
      level: 4,
      depth: 12,
      par: 5,
      rounds: 0,
      tally: { jumps: 0, longest: 0 },
      banked: 1450,
      outcome: "paused",
    });
  });

  it("takes up a run kept before it counted stars, as having earned one a level cleared", () => {
    const before = readBack(tampered({ stars: undefined, banked: 300 }));

    expect(restoreRun(before, LEVELS, 9, RULES)?.run.stars).toBe(2);
  });

  it.each<[string, unknown]>([
    ["something that isn't a run", 5],
    ["a run that can't be trusted", tampered({ level: 0 })],
    ["a tuning that isn't a yes or a no", tampered({ tuned: "no" })],
    ["a level with rounds played and no start", tampered({ start: null })],
    [
      "a start of a level with no round played",
      tampered({ rounds: 0, score: 900 }),
    ],
    ["a start that isn't one", tampered({ start: 5 })],
    ["no start at all", tampered({ start: undefined })],
    [
      "a start the game can't trust",
      tampered({ start: tamperedStart({ x: "3" }) }),
    ],
  ])("drops %s", (_, value) => {
    expect(restoreRun(value, LEVELS, 9, RULES)).toBeNull();
  });
});

describe("readSavedRun", () => {
  it("reads the run kept, paused, under a new id, its par worked out afresh", () => {
    expect(readSavedRun(STORED, LEVELS, 9, RULES)).toEqual(
      runUnderWay({ id: 9, outcome: "paused" }),
    );
  });

  it("works its par out from the pars it is handed", () => {
    const rules = { ...RULES, pars: { ...PARS, c: { "11": 7 } } };

    expect(readSavedRun(STORED, LEVELS, 9, rules)?.par).toBe(7);
  });

  it("hands the game's reader of its tally the frame's rounds and points", () => {
    const frames: unknown[] = [];

    readSavedRun(STORED, LEVELS, 9, {
      ...RULES,
      readTally: (value, frame) => {
        frames.push(frame);
        return SAVED_RULES.readTally(value, frame);
      },
    });

    expect(frames).toEqual([{ rounds: 3, banked: 900, score: 1250 }]);
  });

  it("drops a run whose stars it can't read, rather than reading them as none", () => {
    const spoiled = tampered({ stars: "4", banked: 0, score: 350 });

    expect(readSavedRun(spoiled, LEVELS, 9, RULES)).toBeNull();
  });

  it.each([
    ...KNOWN_LEVEL_SPOILS,
    ...DEPTH_SPOILS,
    ...ROUND_SPOILS,
    ...STAR_SPOILS,
    ...SCORE_SPOILS,
    ...TALLY_SPOILS,
  ])("drops a run of %s", (_, change) => {
    expect(readSavedRun(tampered(change), LEVELS, 9, RULES)).toBeNull();
  });
});

describe("hasKnownLevel", () => {
  it("holds a run kept to the level the game has under its number", () => {
    expect(hasKnownLevel(STORED, LEVELS)).toBe(true);
  });

  it("holds a run kept on its first level", () => {
    expect(hasKnownLevel(tampered({ firstLevel: 3 }), LEVELS)).toBe(true);
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

describe("readStars", () => {
  it("reads the stars a run kept has earned", () => {
    expect(starsRead(STORED)).toBe(4);
  });

  it.each([2, 3])("reads %i stars for two levels cleared", (stars) => {
    expect(starsRead(tampered({ stars }))).toBe(stars);
  });

  it("reads no stars for a run kept on its first level", () => {
    expect(starsRead(tampered({ firstLevel: 3, stars: 0 }))).toBe(0);
  });

  it("reads a run kept before it counted stars as having earned one a level cleared", () => {
    expect(starsRead(tampered({ stars: undefined }))).toBe(2);
  });

  it.each(STAR_SPOILS)("drops %s", (_, change) => {
    expect(starsRead(tampered(change))).toBeNull();
  });
});

describe("hasSoundScore", () => {
  it("holds a run kept to its points", () => {
    expect(scoreHolds(STORED)).toBe(true);
  });

  it("holds a run kept with no round played and nothing scored on its level", () => {
    expect(scoreHolds(tampered({ rounds: 0, score: 900 }))).toBe(true);
  });

  it("holds a run kept on its first level with nothing banked", () => {
    const first = tampered({ firstLevel: 3, stars: 0, banked: 0 });

    expect(scoreHolds(first)).toBe(true);
  });

  it("holds a run kept with just its stars' points banked and nothing more scored", () => {
    expect(scoreHolds(tampered({ banked: 400, score: 400 }))).toBe(true);
  });

  it.each(SCORE_SPOILS)("fails a run of %s", (_, change) => {
    expect(scoreHolds(tampered(change))).toBe(false);
  });
});
