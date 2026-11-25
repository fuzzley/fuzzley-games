import { parOf } from "@fz/brick-wall/rules/par";
import { levelAt } from "@fz/brick-wall/rules/progress";
import { takeRound } from "@fz/brick-wall/rules/run";
import type { Kept, RunKeeping } from "@fz/brick-wall/rules/saved_wall";
import { LEVELS, type Level, levelStart, parseLevel } from "../levels/levels";
import type { RoundStart } from "../round/round";
import type { Brick } from "../wall/wall";
import { RUN_RULES, type Run } from "./run";
import {
  hasEarnedBoon,
  hasSoundCrew,
  hasSoundPlace,
  readCounts,
  readStart,
  restoreGame,
  saveGame,
} from "./saved_game";
import { starPoints } from "./scoring";
import { PARS, starsFor } from "./stars";

/** A change a browser might make to what storage keeps, named for the specs. */
type Spoil = readonly [string, Readonly<Record<string, unknown>>];

/** Girder, level 5: its wall's lowest row steel, the row over it bricks and two tough ones. */
const GIRDER: Level = parseLevel(levelAt(LEVELS, 5).data);

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

/** The run under way and {@link PLAYED} as storage keeps them, every key written out in the order it keeps them, so renaming or moving one fails. */
const STORED = {
  levelId: "girder",
  level: 5,
  firstLevel: 3,
  depth: 11,
  rounds: 3,
  jumps: 0,
  banked: 3000,
  stars: 5,
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

/** What of a run its round's start is read against, three rounds into Girder on a field 11 deep, none of them a jump. */
const THREE_ROUNDS = { depth: 11, rounds: 3, tally: { jumps: 0 } };

/** Jumps a run kept may count that its rounds and points can't hold, each failing `readCounts()`. */
const JUMP_SPOILS: readonly Spoil[] = [
  ["jumps that aren't a number", { jumps: "0" }],
  ["jumps below nothing", { jumps: -1 }],
  ["more jumps than rounds", { jumps: 4 }],
  [
    "fewer points on the level than its jumps scored",
    { jumps: 3, score: 3299 },
  ],
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
    par: parOf("girder", 11, PARS),
    rounds: 3,
    tally: { jumps: 0 },
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

/** Returns the run kept with some of its round's start's values changed. */
function tamperedStart(change: Readonly<Record<string, unknown>>): Kept {
  return { ...STORED.start, ...change };
}

/** Returns a value as storage would read it back. */
function readBack(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

/** Returns the jumps a run kept counts, read against the rounds and points it holds. */
function countsRead(value: Kept): unknown {
  return readCounts(value, {
    rounds: Number(value["rounds"]),
    banked: Number(value["banked"]),
    score: Number(value["score"]),
  });
}

describe("saveGame", () => {
  it("keeps a run under way and where its next round starts, every key by its name, in the order storage keeps them", () => {
    const saved = saveGame(runUnderWay(), PLAYED, LEVELS, KEEPING);

    expect(JSON.stringify(saved)).toBe(JSON.stringify(STORED));
  });

  it("keeps a run whose level was just cleared at the start of the next, on the field's depth, no jump counted", () => {
    const run = runUnderWay({
      tally: { jumps: 1 },
      score: 4100,
      outcome: "cleared",
    });

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING);

    expect(saved).toEqual({
      levelId: "zip-line",
      level: 6,
      firstLevel: 3,
      depth: 12,
      rounds: 0,
      jumps: 0,
      banked: 4100,
      stars: 5,
      score: 4100,
      tuned: false,
      start: null,
    });
  });

  it("keeps a round in flight that clears its level as it lands, with the stars its tiers earn", () => {
    const run = takeRound(
      runUnderWay(),
      {
        points: 10,
        jumped: false,
        result: "cleared",
      },
      RUN_RULES,
    );

    const saved = saveGame(run, PLAYED, LEVELS, KEEPING);

    expect(saved).toMatchObject({
      level: 6,
      banked: 3460 + starPoints(starsFor(4, run.par)),
      stars: 5 + starsFor(4, run.par),
      start: null,
    });
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
      par: parOf("zip-line", 12, PARS),
      rounds: 0,
      banked: 4100,
      outcome: "paused",
    });
  });

  it.each<[string, unknown]>([
    ["more stars than three a level cleared", tampered({ stars: 7 })],
    ["fewer points banked than its stars brought", tampered({ banked: 999 })],
    [
      "a start the game can't trust",
      tampered({ start: tamperedStart({ x: 0 }) }),
    ],
  ])("drops a run of %s", (_, value) => {
    expect(restoreGame(value, LEVELS, 9)).toBeNull();
  });

  it.each(JUMP_SPOILS)("drops a run of %s", (_, change) => {
    expect(restoreGame(tampered(change), LEVELS, 9)).toBeNull();
  });
});

describe("readCounts", () => {
  it("reads the jumps a run kept counts", () => {
    expect(countsRead(STORED)).toEqual({ jumps: 0 });
  });

  it("reads as many jumps as rounds", () => {
    expect(countsRead(tampered({ jumps: 3 }))).toEqual({ jumps: 3 });
  });

  it("reads jumps whose points the level holds, and no more", () => {
    const jumped = tampered({ banked: 1000, jumps: 3, score: 1300 });

    expect(countsRead(jumped)).toEqual({ jumps: 3 });
  });

  it.each(JUMP_SPOILS)("drops %s", (_, change) => {
    expect(countsRead(tampered(change))).toBeNull();
  });
});

describe("readStart", () => {
  it("reads where a round starts as kept", () => {
    expect(readStart(STORED.start, GIRDER, THREE_ROUNDS)).toEqual(PLAYED);
  });

  it("reads a wall come down a jump's rows for a round that jumped", () => {
    const start = tamperedStart({ ...SUNK, boon: "hot" });
    const run = { ...THREE_ROUNDS, tally: { jumps: 1 } };

    expect(readStart(start, GIRDER, run)?.wall.lowestRow).toBe(0);
  });

  it("drops a wall come down a row less than its jump brings it", () => {
    const start = tamperedStart({ ...SUNK, lowestRow: 1, boon: "hot" });
    const run = { ...THREE_ROUNDS, tally: { jumps: 1 } };

    expect(readStart(start, GIRDER, run)).toBeNull();
  });

  it.each([...PLACE_SPOILS, ...CREW_SPOILS, ...BOON_SPOILS])(
    "drops a start of %s",
    (_, change) => {
      expect(readStart(tamperedStart(change), GIRDER, THREE_ROUNDS)).toBeNull();
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
        hits: GIRDER.bricks.map((brick) =>
          brick?.kind === "steel" ? 0 : null,
        ),
      },
    ],
  ])("drops a start the saved wall's checks fail: %s", (_, change) => {
    expect(readStart(tamperedStart(change), GIRDER, THREE_ROUNDS)).toBeNull();
  });

  it("drops something that isn't a start", () => {
    expect(readStart([], GIRDER, THREE_ROUNDS)).toBeNull();
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
