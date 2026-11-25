import { parOf } from "@fz/brick-wall/rules/par";
import { levelAt } from "@fz/brick-wall/rules/progress";
import { takeRound } from "@fz/brick-wall/rules/run";
import type { Kept, RunKeeping } from "@fz/brick-wall/rules/saved_wall";
import warmUpMarks from "../../testing/warm_up_marks.json";
import type { Brick } from "../catalog/kinds";
import type { RoundStart } from "../flight/events";
import { LEVELS, type Level, parseLevel } from "../levels/levels";
import { type Run, levelStart, runRulesOf } from "./run";
import {
  hasEarnedShot,
  hasSoundPlace,
  readStart,
  readTally,
  restoreGame,
  saveGame,
} from "./saved_game";
import { starPoints } from "./scoring";
import type { Marks } from "./stars";

/** A change a browser might make to what storage keeps, named for the specs. */
type Spoil = readonly [string, Readonly<Record<string, unknown>>];

/** Warm-up's marks, as a fixture of `marks/warm-up.json` holds them: Girders' par on a field 11 deep is 5, and its rally mark 20. */
const MARKS: Marks = warmUpMarks;

/** Girders, level 7: its wall's lowest row two tough bricks, the row over it steel and two more. */
const GIRDERS: Level = parseLevel(levelAt(LEVELS, 7).data);

/** What of the run the shell keeps beside it, as most specs have it: nothing tuned. */
const KEEPING: RunKeeping = { tuned: false };

/** Returns Girders' bricks as three rounds left them: the first tough brick of its lowest row broken, the other worn to a hit. */
function playedBrick(brick: Brick | null, cell: number): Brick | null {
  if (cell === 2) return null;
  return cell === 6 && brick ? { ...brick, hits: 1 } : brick;
}

/** Where Girders' fourth round starts: its wall come down three rows from where it opened on a field 11 deep, now 12 deep. */
const PLAYED: RoundStart = {
  wall: { bricks: GIRDERS.bricks.map(playedBrick), rows: 15, lowestRow: 2 },
  depth: 12,
  x: 3.25,
  hot: false,
};

/** The run under way and {@link PLAYED} as storage keeps them, every key written out in the order it keeps them, so renaming or moving one fails. */
const STORED = {
  levelId: "girders",
  level: 7,
  firstLevel: 3,
  depth: 11,
  rounds: 3,
  jumps: 0,
  earned: 1,
  bestRally: 12,
  banked: 3000,
  stars: 5,
  score: 3450,
  tuned: false,
  start: {
    hits: PLAYED.wall.bricks.map((brick) => brick?.hits ?? null),
    lowestRow: 2,
    depth: 12,
    x: 3.25,
    hot: false,
  },
};

/** {@link STORED}'s round start with its wall's lowest row sunk into the floor, as a jump brings it there. */
const SUNK = {
  hits: STORED.start.hits.map((kept, cell) => (cell < 9 ? null : kept)),
  lowestRow: 0,
};

/** What of a run its round's start is read against, three rounds into Girders on a field 11 deep, none of them a jump. */
const THREE_ROUNDS = {
  depth: 11,
  rounds: 3,
  tally: { jumps: 0, earned: 1, bestRally: 12 },
};

/** Tallies a run kept may hold that its rounds and points can't, each failing `readTally()`. */
const TALLY_SPOILS: readonly Spoil[] = [
  ["jumps that aren't a number", { jumps: "0" }],
  ["floor bounces below nothing", { earned: -1 }],
  ["a best rally that isn't a whole number", { bestRally: 12.5 }],
  ["more jumps than rounds", { jumps: 4, score: 3850 }],
  [
    "fewer points on the level than its best rally and its floor bounce scored",
    { score: 3329 },
  ],
  [
    "fewer points on the level than its jumps would add",
    { jumps: 2, score: 3529 },
  ],
];

/** Places a fuzzball kept may wait at that none can, each failing `hasSoundPlace()`. */
const PLACE_SPOILS: readonly Spoil[] = [
  ["nearer the left wall than a fuzzball waits", { x: 0.25 }],
  ["nearer the right wall than a fuzzball waits", { x: 8.75 }],
  ["a place that isn't a number", { x: "4.5" }],
];

/** Shots a round's start kept may carry that the run hasn't earned, each failing `hasEarnedShot()`. */
const SHOT_SPOILS: readonly Spoil[] = [
  ["a hot shot with no jump to earn it", { hot: true }],
  ["a shot that is neither hot nor plain", { hot: "true" }],
  ["no word on the shot", { hot: null }],
];

/** Returns a run on Girders, three rounds in, as the moves would bring it there from level 3. */
function runUnderWay(change: Partial<Run> = {}): Run {
  return {
    id: 4,
    lastLevel: LEVELS.length,
    firstLevel: 3,
    level: 7,
    depth: 11,
    par: parOf("girders", 11, MARKS.par),
    rounds: 3,
    tally: { jumps: 0, earned: 1, bestRally: 12 },
    banked: 3000,
    stars: 5,
    score: 3450,
    ending: null,
    outcome: "playing",
    ...change,
  };
}

/** Returns the run kept with some of its values changed, as a browser might come to hold it. */
function tampered(change: Readonly<Record<string, unknown>>): Kept {
  return { ...STORED, ...change };
}

/** Returns the round's start kept with some of its values changed. */
function tamperedStart(change: Readonly<Record<string, unknown>>): Kept {
  return { ...STORED.start, ...change };
}

/** Returns a value as storage would read it back. */
function readBack(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

/** Returns the tally a run kept holds, read against the rounds and points it keeps. */
function tallyRead(value: Kept): unknown {
  return readTally(value, {
    rounds: Number(value["rounds"]),
    banked: Number(value["banked"]),
    score: Number(value["score"]),
  });
}

describe("saveGame", () => {
  it("keeps a run under way and where its next round starts, every key by its name, in the order storage keeps them", () => {
    const saved = saveGame(runUnderWay(), PLAYED, LEVELS, KEEPING, MARKS);

    expect(JSON.stringify(saved)).toBe(JSON.stringify(STORED));
  });

  it("keeps a run whose level was just cleared at the start of the next, on the field's depth, nothing tallied", () => {
    const run = runUnderWay({ score: 4100, outcome: "cleared" });

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING, MARKS);

    expect(saved).toEqual({
      levelId: "attic",
      level: 8,
      firstLevel: 3,
      depth: 12,
      rounds: 0,
      jumps: 0,
      earned: 0,
      bestRally: 0,
      banked: 4100,
      stars: 5,
      score: 4100,
      tuned: false,
      start: null,
    });
  });

  it("keeps a round in flight that clears its level as it lands, with the stars it earned: within par, short of the rally mark", () => {
    const round = {
      points: 10,
      result: "cleared",
      rally: 1,
      earned: 0,
      jumped: false,
    } as const;
    const run = takeRound(runUnderWay(), round, runRulesOf(LEVELS, MARKS));

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING, MARKS);

    expect(saved).toMatchObject({
      level: 8,
      banked: 3460 + starPoints(2),
      stars: 7,
      start: null,
    });
  });
});

describe("restoreGame", () => {
  it("takes up a run kept, paused, under a new id, and where its next round starts", () => {
    expect(restoreGame(STORED, LEVELS, 9, MARKS)).toEqual({
      run: runUnderWay({ id: 9, outcome: "paused" }),
      start: PLAYED,
      tuned: false,
    });
  });

  it("takes up what it kept, as storage reads it back", () => {
    const run = runUnderWay();
    const kept = readBack(
      saveGame(run, PLAYED, LEVELS, { tuned: true }, MARKS),
    );

    expect(restoreGame(kept, LEVELS, 9, MARKS)).toEqual({
      run: { ...run, id: 9, outcome: "paused" },
      start: PLAYED,
      tuned: true,
    });
  });

  it("takes up a hot shot a jump earned", () => {
    const start = tamperedStart({ ...SUNK, hot: true });

    const takenUp = restoreGame(
      tampered({ jumps: 1, start }),
      LEVELS,
      9,
      MARKS,
    );

    expect(takenUp?.start.hot).toBe(true);
  });

  it("works its par out from the marks it is given", () => {
    const marks = { ...MARKS, par: { girders: { "11": 4 } } };

    expect(restoreGame(STORED, LEVELS, 9, marks)?.run.par).toBe(4);
  });

  it("lays a level with no round played out afresh, on the depth it began on", () => {
    const value = tampered({
      depth: 14,
      rounds: 0,
      earned: 0,
      bestRally: 0,
      score: 3000,
      start: null,
    });

    expect(restoreGame(value, LEVELS, 9, MARKS)?.start).toEqual(
      levelStart(GIRDERS, 14),
    );
  });

  it("takes up a level just cleared, as it kept it, at the start of the next", () => {
    const cleared = runUnderWay({ score: 4100, outcome: "cleared" });
    const kept = readBack(saveGame(cleared, PLAYED, LEVELS, KEEPING, MARKS));

    const takenUp = restoreGame(kept, LEVELS, 9, MARKS);

    expect(takenUp?.run).toEqual({
      ...cleared,
      id: 9,
      level: 8,
      depth: 12,
      par: parOf("attic", 12, MARKS.par),
      rounds: 0,
      tally: { jumps: 0, earned: 0, bestRally: 0 },
      banked: 4100,
      outcome: "paused",
    });
  });

  it("takes up a run that earned all three stars of every level it cleared", () => {
    expect(
      restoreGame(tampered({ stars: 12 }), LEVELS, 9, MARKS)?.run.stars,
    ).toBe(12);
  });

  it.each<[string, unknown]>([
    ["more stars than three a level cleared", tampered({ stars: 13 })],
    ["fewer points banked than its stars brought", tampered({ banked: 999 })],
    [
      "a start the game can't trust",
      tampered({ start: tamperedStart({ x: 0 }) }),
    ],
  ])("drops a run of %s", (_, value) => {
    expect(restoreGame(value, LEVELS, 9, MARKS)).toBeNull();
  });

  it.each(TALLY_SPOILS)("drops a run of %s", (_, change) => {
    expect(restoreGame(tampered(change), LEVELS, 9, MARKS)).toBeNull();
  });
});

describe("readTally", () => {
  it("reads what a run kept tallied of its level", () => {
    expect(tallyRead(STORED)).toEqual({ jumps: 0, earned: 1, bestRally: 12 });
  });

  it("reads as many jumps as rounds", () => {
    const jumped = tampered({ jumps: 3, score: 3750 });

    expect(tallyRead(jumped)).toEqual({ jumps: 3, earned: 1, bestRally: 12 });
  });

  it("reads a tally whose points the level holds, and no more", () => {
    const least = tampered({ jumps: 1, score: 3430 });

    expect(tallyRead(least)).toEqual({ jumps: 1, earned: 1, bestRally: 12 });
  });

  it("drops a tally that lacks a count", () => {
    const { bestRally: _, ...lacking } = STORED;

    expect(tallyRead(lacking)).toBeNull();
  });

  it.each(TALLY_SPOILS)("drops %s", (_, change) => {
    expect(tallyRead(tampered(change))).toBeNull();
  });
});

describe("readStart", () => {
  it("reads where a round starts as kept", () => {
    expect(readStart(STORED.start, GIRDERS, THREE_ROUNDS)).toEqual(PLAYED);
  });

  it("reads a wall come down a jump's rows, with the hot shot the jump earned", () => {
    const start = tamperedStart({ ...SUNK, hot: true });
    const run = { ...THREE_ROUNDS, tally: { ...THREE_ROUNDS.tally, jumps: 1 } };

    expect(readStart(start, GIRDERS, run)).toMatchObject({
      wall: { lowestRow: 0 },
      hot: true,
    });
  });

  it("drops a wall come down a row less than its jump brings it", () => {
    const start = tamperedStart({ ...SUNK, lowestRow: 1, hot: true });
    const run = { ...THREE_ROUNDS, tally: { ...THREE_ROUNDS.tally, jumps: 1 } };

    expect(readStart(start, GIRDERS, run)).toBeNull();
  });

  it.each([...PLACE_SPOILS, ...SHOT_SPOILS])(
    "drops a start of %s",
    (_, change) => {
      expect(
        readStart(tamperedStart(change), GIRDERS, THREE_ROUNDS),
      ).toBeNull();
    },
  );

  it.each<Spoil>([
    ["a depth no field has", { depth: 10 }],
    [
      "a wall come down fewer rows than its rounds bring it from where it opened on the depth its level began on",
      { lowestRow: 3 },
    ],
    [
      "a wall with nothing left the level needs",
      {
        hits: GIRDERS.bricks.map((brick) =>
          brick?.kind === "steel" ? 0 : null,
        ),
      },
    ],
  ])("drops a start the saved wall's checks fail: %s", (_, change) => {
    expect(readStart(tamperedStart(change), GIRDERS, THREE_ROUNDS)).toBeNull();
  });

  it("drops something that isn't a start", () => {
    expect(readStart([], GIRDERS, THREE_ROUNDS)).toBeNull();
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

describe("hasEarnedShot", () => {
  it("holds a plain shot, whatever the jumps", () => {
    expect(hasEarnedShot(STORED.start, 0)).toBe(true);
  });

  it("holds a hot shot after a jump", () => {
    expect(hasEarnedShot(tamperedStart({ hot: true }), 1)).toBe(true);
  });

  it.each(SHOT_SPOILS)("fails %s", (_, change) => {
    expect(hasEarnedShot(tamperedStart(change), 0)).toBe(false);
  });
});
