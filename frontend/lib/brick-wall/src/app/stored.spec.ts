import { Injectable, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { isCount, isRecord, isWhole } from "@fz/core/json";
import type { IdentifiedLevel } from "@fz/core/levels";
import {
  MemoryStorage,
  provideMemoryStorage,
  setPageVisibility,
} from "@fz/ui/testing";
import { isDepth } from "../rules/field";
import type { Pars } from "../rules/par";
import {
  type LevelEnding,
  type Run,
  type RunRules,
  type TakenRound,
  createRun,
  landRound,
  nextLevel,
  pause,
  startLevel,
  takeRound,
} from "../rules/run";
import {
  type SavedRules,
  type TakenUp,
  restoreRun,
  saveRun,
} from "../rules/saved_wall";
import type { EndedRun, StatsRules } from "../rules/stats";
import { type KeptRun, type RunReaders, StoredStats, keepRun } from "./stored";

/** Three levels made up for the spec, "a" to "c", numbered 1 to 3. */
const LEVELS: readonly IdentifiedLevel[] = ["a", "b", "c"].map((id) => ({
  data: { id },
}));

/** What the spec's game keeps of a level cleared: its best points. */
interface Best {
  readonly points: number;
}

/** The spec's game's records: a level's best points, read as a count, beaten by more. */
const STATS_RULES: Pick<StatsRules<unknown, Best>, "readLevel" | "merge"> = {
  readLevel: (value) =>
    isRecord(value) && isCount(value["points"])
      ? { points: value["points"] }
      : null,
  merge: (kept, result) => (result.points > kept.points ? result : kept),
};

/** Where the spec's game keeps its records. */
const STATS_AT = { key: "stats", version: 3 };

/** Where the spec's game keeps its run under way. */
const RUN_AT = { key: "run", version: 4 };

/** The spec's game's records, as its service keeps them. */
@Injectable({ providedIn: "root" })
class Records extends StoredStats<Best, Best> {
  constructor() {
    super(STATS_AT, LEVELS, STATS_RULES);
  }
}

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

/** Stores an entry under a key as a player's browser would hold it. */
function store(key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

/** Returns what is stored under a key, as a player's browser holds it, or null. */
function stored(key: string): unknown {
  return JSON.parse(storage.getItem(key) ?? "null");
}

/** Starts the page again over what the browser keeps. */
function reload(): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
}

/** Returns a run ended at a score and a level. */
function ended(score: number, level: number): EndedRun {
  return { score, level };
}

describe("StoredStats", () => {
  it("starts a new player with no runs and no records", () => {
    expect(TestBed.inject(Records).stats()).toEqual({
      runs: 0,
      best: 0,
      furthest: 0,
      levels: {},
    });
  });

  it("counts a run started", () => {
    const records = TestBed.inject(Records);

    records.recordStart();
    records.recordStart();

    expect(records.stats().runs).toBe(2);
  });

  it("keeps an ended run's score and level as the best and the furthest", () => {
    const records = TestBed.inject(Records);
    records.recordStart();

    records.recordEnd(ended(4400, 3));

    expect(records.stats()).toEqual({
      runs: 1,
      best: 4400,
      furthest: 3,
      levels: {},
    });
  });

  it("calls a score above every run's before a new best, asking before it keeps it", () => {
    const records = TestBed.inject(Records);

    const newBests = [500, 600, 550, 600].map((score) =>
      records.recordEnd(ended(score, 1)),
    );

    expect(newBests).toEqual([true, true, false, false]);
  });

  it("keeps what a level cleared brings its record, as the game beats it", () => {
    const records = TestBed.inject(Records);

    records.recordLevel("b", { points: 4000 });
    records.recordLevel("b", { points: 3000 });

    expect(records.stats().levels).toEqual({ b: { points: 4000 } });
  });

  it("stores nothing for a level cleared that beats none of its record", () => {
    const records = TestBed.inject(Records);
    records.recordLevel("b", { points: 4000 });
    const elsewhere = { version: 3, runs: 0, best: 0, furthest: 0, levels: {} };
    store("stats", elsewhere);

    records.recordLevel("b", { points: 3000 });

    expect(stored("stats")).toEqual(elsewhere);
  });

  it("keeps the records under the game's key and version, for the next visit", () => {
    TestBed.inject(Records).recordLevel("c", { points: 1200 });

    reload();

    expect([TestBed.inject(Records).stats().levels, stored("stats")]).toEqual([
      { c: { points: 1200 } },
      expect.objectContaining({ version: 3 }),
    ]);
  });

  it("reads the records stored, for the levels the game has", () => {
    store("stats", {
      version: 3,
      runs: 2,
      best: 900,
      furthest: 3,
      levels: { b: { points: 4100 }, gone: { points: 100 } },
    });

    expect(TestBed.inject(Records).stats()).toEqual({
      runs: 2,
      best: 900,
      furthest: 3,
      levels: { b: { points: 4100 } },
    });
  });

  it("reads none of the records stored in another version", () => {
    store("stats", { version: 2, runs: 2, best: 900, furthest: 3, levels: {} });

    expect(TestBed.inject(Records).stats().runs).toBe(0);
  });
});

/** What the spec's game tallies of a level: the rounds that jumped the wall, which none of its rounds does. */
interface Tally {
  readonly jumps: number;
}

/** Where a round of the spec's game starts: the field's depth, and the row its wall stands in. */
interface Start {
  readonly depth: number;
  readonly row: number;
}

/** Each level's par on a field 11 deep. */
const PARS: Pars = { a: { "11": 3 }, b: { "11": 4 }, c: { "11": 5 } };

/** The spec's game's run: a star a level, worth 100, its jumps tallied. */
const RUN_RULES: RunRules<Tally> = {
  pars: PARS,
  untallied: { jumps: 0 },
  tallied: (tally) => tally,
  starsOf: () => 1,
  starPoints: 100,
};

/** The spec's game's saved game: where a round starts kept as it is, read back as a depth and a whole row. */
const SAVED_RULES: SavedRules<Tally, Start, Start> = {
  mostStars: 1,
  keptStart: (start) => start,
  readTally: ({ jumps }, { rounds }) =>
    isCount(jumps) && jumps <= rounds ? { jumps } : null,
  openingOf: ({ depth }) => ({ depth, row: 5 }),
  readStart: (value) => {
    if (!isRecord(value)) return null;
    const { depth, row } = value;
    return isDepth(depth) && isWhole(row) ? { depth, row } : null;
  },
};

/** Every rule the spec's saved game is handed. */
const RULES = { ...RUN_RULES, ...SAVED_RULES };

/** How the spec's game keeps its run and reads it back, as its saved game hands them. */
const READERS: RunReaders<Tally, Start> = {
  save: (run, next, keeping) => saveRun(run, next, LEVELS, keeping, RULES),
  restore: (saved, id) => restoreRun(saved, LEVELS, id, RULES),
};

/** The id of the run the game begins with, as the page loads. */
const FIRST_ID = 7;

/** Returns a run on the first level, on a field 11 deep, waiting to be started. */
function newRun(id = FIRST_ID): Run<Tally> {
  return createRun({ id, level: 1, depth: 11 }, LEVELS, RUN_RULES);
}

/** Returns a round that ends its level as `ending` says, or leaves it on. */
function roundTo(ending: LevelEnding | null = null): TakenRound {
  return { points: 0, result: ending ?? "on" };
}

/** Holds what the saved game reads of the spec's game, in signals a spec sets. */
class FakeGame implements KeptRun<Tally, Start> {
  readonly run = signal(newRun());
  readonly nextStart = signal<Start>({ depth: 11, row: 5 });
  readonly tuned = signal(false);
  readonly outcome = computed(() => this.run().outcome);
  readonly runs = signal(0);
  /** The run as it stood once the level started, before the round in flight was taken in, which a drop takes it into again. */
  private started = this.run();

  takeUp({ run, start, tuned }: TakenUp<Tally, Start>): void {
    this.run.set(run);
    this.nextStart.set(start);
    this.tuned.set(tuned);
  }

  /** Starts the run's level and releases a round, which brings the wall down a row, ending the level as `ending` says once it lands. */
  release(ending: LevelEnding | null = null): void {
    const run =
      this.run().outcome === "ready" ? startLevel(this.run()) : this.run();
    this.started = run;
    this.downARow();
    this.run.set(takeRound(run, roundTo(ending), RUN_RULES));
  }

  /** Drops the round in flight: takes it into the run as it stood before its release again, leaving the level on, the wall down another row. */
  drop(): void {
    this.downARow();
    this.run.set(takeRound(this.started, roundTo(), RUN_RULES));
  }

  /** Brings the wall where the next round starts down a row. */
  private downARow(): void {
    const { depth, row } = this.nextStart();
    this.nextStart.set({ depth, row: row - 1 });
  }
}

/** Returns what the game would keep now, as it is stored. */
function keptNow(game: FakeGame): unknown {
  const saved = saveRun(
    game.run(),
    game.nextStart(),
    LEVELS,
    { tuned: game.tuned() },
    RULES,
  );
  return JSON.parse(JSON.stringify({ ...saved, version: 4 }));
}

/** Loads the page over what the browser keeps: a new game, its run kept as the app keeps it. */
function load(): FakeGame {
  const game = new FakeGame();
  reload();
  TestBed.runInInjectionContext(() => {
    keepRun(RUN_AT, game, READERS);
  });
  TestBed.tick();
  return game;
}

/** Returns the game with a round of its first level released, and kept. */
function released(): FakeGame {
  const game = load();
  game.release();
  TestBed.tick();
  return game;
}

describe("keepRun", () => {
  it("keeps nothing of a run with no round played", () => {
    load();

    expect(stored("run")).toBeNull();
  });

  it("keeps a run under the game's key and version as a round is released", () => {
    const game = released();

    expect(stored("run")).toEqual(keptNow(game));
  });

  it("keeps each round as it is released, the level under way", () => {
    const game = released();

    game.release();
    TestBed.tick();

    expect(stored("run")).toEqual(keptNow(game));
  });

  it("keeps the run again as a drop changes where the next round starts, though its rounds and stage stay as they were", () => {
    const game = released();
    game.release("cleared");
    TestBed.tick();

    game.drop();
    TestBed.tick();

    expect(stored("run")).toEqual(keptNow(game));
  });

  it("keeps the run at its moments, not as it goes off the record between them", () => {
    const game = released();
    const kept = stored("run");

    game.tuned.set(true);
    TestBed.tick();

    expect(stored("run")).toEqual(kept);
  });

  it("keeps the run as the page is hidden, wherever it stands", () => {
    const game = released();
    game.tuned.set(true);

    setPageVisibility("hidden");

    expect(stored("run")).toEqual(keptNow(game));
  });

  it("keeps the run as it changes course, such as a pause", () => {
    const game = released();
    game.tuned.set(true);

    game.run.set(pause(game.run()));
    TestBed.tick();

    expect(stored("run")).toEqual(keptNow(game));
  });

  it("keeps a new run as it begins, forgetting the last, though it stands as the last did", () => {
    const game = released();
    const cleared = landRound(
      takeRound(startLevel(newRun()), roundTo("cleared"), RUN_RULES),
      RUN_RULES,
    );
    game.run.set(nextLevel(cleared, 11, LEVELS, RUN_RULES));
    TestBed.tick();

    game.run.set(newRun(FIRST_ID + 1));
    game.runs.set(1);
    TestBed.tick();

    expect(stored("run")).toBeNull();
  });

  it("forgets a run as the round that loses it is released, before it lands", () => {
    const game = released();

    game.release("lost");
    TestBed.tick();

    expect(stored("run")).toBeNull();
  });

  it("takes a kept run up as the page loads, paused, under the id after the game's, with where its next round starts", () => {
    const before = released();
    const keptRun = before.run();
    const keptStart = before.nextStart();

    const game = load();

    expect({
      run: game.run(),
      start: game.nextStart(),
      tuned: game.tuned(),
    }).toEqual({
      run: { ...keptRun, id: FIRST_ID + 1, outcome: "paused" },
      start: keptStart,
      tuned: false,
    });
  });

  it("takes up whether the kept run was played off the record", () => {
    const before = released();
    before.tuned.set(true);
    setPageVisibility("hidden");

    const game = load();

    expect(game.tuned()).toBe(true);
  });

  it("takes up nothing the game's reader can't trust, and starts afresh", () => {
    store("run", { version: 4, levelId: "gone", level: 1 });

    const game = load();

    expect(game.run()).toEqual(newRun());
  });

  it("takes up nothing kept in another version", () => {
    const before = released();
    store("run", { ...(keptNow(before) as object), version: 3 });

    const game = load();

    expect(game.run()).toEqual(newRun());
  });
});
