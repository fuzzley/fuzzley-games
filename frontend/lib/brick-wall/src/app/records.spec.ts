import { Injectable, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { isCount, isRecord } from "@fz/core/json";
import type { IdentifiedLevel } from "@fz/core/levels";
import { provideMemoryStorage } from "@fz/ui/testing";
import {
  type Run,
  type RunRules,
  type TakenRound,
  createRun,
  landRound,
  nextLevel,
  startLevel,
  takeRound,
} from "../rules/run";
import type { StatsRules } from "../rules/stats";
import { type RecordsMenu, type RunOpened, RunRecords } from "./records";
import { StoredProgress, StoredStats } from "./stored";

/** Three levels made up for the spec, "a" to "c", numbered 1 to 3. */
const LEVELS: readonly IdentifiedLevel[] = ["a", "b", "c"].map((id) => ({
  data: { id },
}));

/** What the spec's game keeps of a level cleared: its best points and its fewest rounds. */
interface Best {
  readonly points: number;
  readonly rounds: number;
}

/** The spec's game's run: its tally is the points a level's rounds score, and a level cleared within par earns 2 stars, else 1, of 100 points each. */
const RULES: RunRules<number> = {
  pars: { a: { "11": 2 }, b: { "11": 2 }, c: { "11": 2 } },
  untallied: 0,
  tallied: (tally, { points }) => tally + points,
  starsOf: ({ rounds, par }) => (rounds <= par ? 2 : 1),
  starPoints: 100,
};

/** The spec's game's records: a level's best points and fewest rounds, each beaten apart. */
const STATS_RULES: StatsRules<number, Best> = {
  readLevel: (value) =>
    isRecord(value) && isCount(value["points"]) && isCount(value["rounds"])
      ? { points: value["points"], rounds: value["rounds"] }
      : null,
  resultOf: ({ points, rounds }) => ({ points, rounds }),
  merge: (kept, result) => ({
    points: Math.max(kept.points, result.points),
    rounds: Math.min(kept.rounds, result.rounds),
  }),
};

/** The spec's game's records, as its service keeps them. */
@Injectable({ providedIn: "root" })
class Records extends StoredStats<Best, Best> {
  constructor() {
    super({ key: "stats", version: 1 }, LEVELS, STATS_RULES);
  }
}

/** The spec's game's progress, as its service keeps it. */
@Injectable({ providedIn: "root" })
class Progress extends StoredProgress {
  constructor() {
    super({ key: "progress", version: 1 }, LEVELS);
  }
}

/** The spec's game's debug menu: it keeps every run begun off the record but a new one at an open level, and hears each. */
class Menu implements RecordsMenu {
  readonly runOffRecord = signal(false);
  /** How each run began, as the menu heard it, in order. */
  readonly heard: RunOpened[] = [];

  startRun(start: RunOpened): void {
    this.heard.push(start);
    this.runOffRecord.set(
      [start.kept, start.locked, start.certified].includes(true),
    );
  }
}

/** A round that leaves the level on, at 10 points. */
const ON: TakenRound = { points: 10, result: "on" };

/** A round that clears its level, at 20 points. */
const CLEARED: TakenRound = { points: 20, result: "cleared" };

/** A round that loses its level, at 5 points. */
const LOST: TakenRound = { points: 5, result: "lost" };

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
});

/** Returns the records over the spec's stores, and the menu they tell. */
function recordsOf(): { records: RunRecords<number, Best, Best>; menu: Menu } {
  const menu = new Menu();
  const records = new RunRecords({
    stats: TestBed.inject(Records),
    progress: TestBed.inject(Progress),
    levels: LEVELS,
    rules: RULES,
    results: STATS_RULES,
    menu,
  });
  return { records, menu };
}

/** Returns a new run at a level, waiting for its first round. */
function runAt(level = 1): Run<number> {
  return createRun({ id: 1, level, depth: 11 }, LEVELS, RULES);
}

/** Returns a run with a round released, its flight yet to land. */
function released(run: Run<number>, round: TakenRound): Run<number> {
  return takeRound(startLevel(run), round, RULES);
}

/** Returns a run with each round released and landed in turn. */
function played(run: Run<number>, ...rounds: TakenRound[]): Run<number> {
  return rounds.reduce(
    (last, round) => landRound(released(last, round), RULES),
    run,
  );
}

/** Returns the records kept. */
function stats(): ReturnType<Records["stats"]> {
  return TestBed.inject(Records).stats();
}

/** Returns the ids of the levels kept cleared. */
function cleared(): readonly string[] {
  return [...TestBed.inject(Progress).cleared()];
}

describe("RunRecords", () => {
  describe("a run begun", () => {
    it("tells the menu a new run begins at an open level", () => {
      const { records, menu } = recordsOf();

      records.began(runAt(1));

      expect(menu.heard).toEqual([{ locked: false }]);
    });

    it("tells the menu a new run begins at a level the player hasn't opened", () => {
      const { records, menu } = recordsOf();

      records.began(runAt(2));

      expect(menu.heard).toEqual([{ locked: true }]);
    });

    it("tells the menu how a run begins as handed", () => {
      const { records, menu } = recordsOf();

      records.began(runAt(2), { certified: true });

      expect(menu.heard).toEqual([{ certified: true }]);
    });

    it("is off the record as the menu says", () => {
      const { records } = recordsOf();

      records.began(runAt(2));

      expect(records.offRecord()).toBe(true);
    });
  });

  describe("a run started", () => {
    it("counts a run started as its first round is released", () => {
      const { records } = recordsOf();

      records.started(runAt());

      expect(stats().runs).toBe(1);
    });

    it("counts no run started at a later round", () => {
      const { records } = recordsOf();

      records.started(played(runAt(), ON));

      expect(stats().runs).toBe(0);
    });

    it("counts no run started off the record", () => {
      const { records } = recordsOf();
      records.began(runAt(), { kept: true });

      records.started(runAt());

      expect(stats().runs).toBe(0);
    });
  });

  describe("a landing", () => {
    it("keeps a level cleared, its result and the level it opens, and no run's end", () => {
      const { records } = recordsOf();

      const newBest = records.landed(played(runAt(), ON, CLEARED));

      expect({
        levels: stats().levels,
        cleared: cleared(),
        best: stats().best,
        newBest,
      }).toEqual({
        levels: { a: { points: 30 + 2 * RULES.starPoints, rounds: 2 } },
        cleared: ["a"],
        best: 0,
        newBest: false,
      });
    });

    it("keeps nothing of a round that leaves the level on", () => {
      const { records } = recordsOf();

      records.landed(played(runAt(), ON));

      expect([stats(), cleared()]).toEqual([
        { runs: 0, best: 0, furthest: 0, levels: {} },
        [],
      ]);
    });

    it("keeps a lost run's end, returning that it set a new best", () => {
      const { records } = recordsOf();
      const run = played(runAt(), ON, LOST);

      const newBest = records.landed(run);

      expect({ best: stats().best, newBest, cleared: cleared() }).toEqual({
        best: run.score,
        newBest: true,
        cleared: [],
      });
    });

    it("returns no new best for an end that beats none", () => {
      const { records } = recordsOf();
      records.landed(played(runAt(), ON, ON, LOST));

      const newBest = records.landed(played(runAt(), LOST));

      expect(newBest).toBe(false);
    });

    it("keeps a won run's last level and its end", () => {
      const { records } = recordsOf();
      const first = played(runAt(), CLEARED);
      const second = played(nextLevel(first, 11, LEVELS, RULES), CLEARED);
      const won = played(nextLevel(second, 11, LEVELS, RULES), CLEARED);

      const newBest = records.landed(won);

      expect({ cleared: cleared(), best: stats().best, newBest }).toEqual({
        cleared: ["c"],
        best: won.score,
        newBest: true,
      });
    });

    it("keeps nothing off the record", () => {
      const { records } = recordsOf();
      records.began(runAt(), { certified: true });

      const newBest = records.landed(played(runAt(), CLEARED));

      expect({ cleared: cleared(), levels: stats().levels, newBest }).toEqual({
        cleared: [],
        levels: {},
        newBest: false,
      });
    });
  });

  describe("a run left", () => {
    it("keeps what the round it left in the air would have brought as it landed", () => {
      const { records } = recordsOf();

      records.left(released(runAt(), CLEARED));

      expect([cleared(), stats().levels]).toEqual([
        ["a"],
        { a: { points: 20 + 2 * RULES.starPoints, rounds: 1 } },
      ]);
    });

    it("keeps nothing of a run left at rest", () => {
      const { records } = recordsOf();

      records.left(played(runAt(), CLEARED));

      expect(cleared()).toEqual([]);
    });

    it("keeps nothing of a round left in the air off the record", () => {
      const { records } = recordsOf();
      records.began(runAt(), { kept: true });

      records.left(released(runAt(), CLEARED));

      expect(cleared()).toEqual([]);
    });
  });

  describe("a run taken up", () => {
    it("marks the levels it cleared before its own cleared", () => {
      const { records } = recordsOf();
      const second = nextLevel(played(runAt(), CLEARED), 11, LEVELS, RULES);
      const third = nextLevel(played(second, CLEARED), 11, LEVELS, RULES);

      records.takenUp(third);

      expect(cleared()).toEqual(["a", "b"]);
    });

    it("marks only the levels from the one it began at", () => {
      const { records } = recordsOf();
      const third = nextLevel(played(runAt(2), CLEARED), 11, LEVELS, RULES);

      records.takenUp(third);

      expect(cleared()).toEqual(["b"]);
    });

    it("leaves the records as they were", () => {
      const { records } = recordsOf();
      const second = nextLevel(played(runAt(), CLEARED), 11, LEVELS, RULES);

      records.takenUp(second);

      expect(stats()).toEqual({ runs: 0, best: 0, furthest: 0, levels: {} });
    });

    it("marks nothing off the record", () => {
      const { records } = recordsOf();
      records.began(runAt(), { kept: true });
      const second = nextLevel(played(runAt(), CLEARED), 11, LEVELS, RULES);

      records.takenUp(second);

      expect(cleared()).toEqual([]);
    });
  });
});
