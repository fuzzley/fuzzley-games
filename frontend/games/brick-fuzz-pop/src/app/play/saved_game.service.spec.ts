import { computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  MemoryStorage,
  provideMemoryStorage,
  setPageVisibility,
} from "@fz/ui/testing";
import { LEVELS } from "../../rules/levels/levels";
import type { RoundResult, RoundStart } from "../../rules/round/round";
import {
  type Run,
  createRun,
  landRound,
  levelOf,
  nextLevel,
  openingOf,
  pause,
  startLevel,
  takeRound,
} from "../../rules/run/run";
import { type TakenUp, saveGame } from "../../rules/run/saved_game";
import {
  KEPT_GAME,
  type KeptGame,
  SavedGameService,
} from "./saved_game.service";

/** Where the run under way is kept, in its own words, so a rename fails. */
const SAVED_GAME_KEY = "brick-fuzz-pop-game";

/** The id of the run the game begins with, as the page loads. */
const FIRST_ID = 7;

/** Returns a run on the first level, on a field 11 deep, waiting to be started. */
function newRun(id = FIRST_ID): Run {
  return createRun({ id, level: 1, depth: 11 }, LEVELS);
}

/** Returns a run with its first level cleared and its second waiting for the first move. */
function onLevelTwo(): Run {
  const cleared = landRound(
    takeRound(startLevel(newRun()), {
      points: 0,
      jumped: false,
      result: "cleared",
    }),
  );
  return nextLevel(cleared, cleared.depth, LEVELS);
}

/** Returns where a run's level opens. */
function openingFor(run: Run): RoundStart {
  return openingOf(run, levelOf(run, LEVELS));
}

/** Returns a start with its wall come down a row, as a round that broke nothing leaves it. */
function downARow(start: RoundStart): RoundStart {
  return {
    ...start,
    wall: { ...start.wall, lowestRow: start.wall.lowestRow - 1 },
  };
}

/** Holds what the saved game reads of the game, as `GameService` will, in signals a spec sets. */
class FakeGame implements KeptGame {
  readonly run = signal(newRun());
  readonly nextStart = signal(openingFor(newRun()));
  readonly tuned = signal(false);
  readonly outcome = computed(() => this.run().outcome);
  readonly runs = signal(0);

  takeUp({ run, start, tuned }: TakenUp): void {
    this.run.set(run);
    this.nextStart.set(start);
    this.tuned.set(tuned);
  }

  /** Starts the run's level and releases a round that breaks nothing, as the game does at a release, ending the level as `result` says once it lands. */
  release(result: RoundResult = "on"): void {
    const run =
      this.run().outcome === "ready" ? startLevel(this.run()) : this.run();
    this.nextStart.set(downARow(this.nextStart()));
    this.run.set(takeRound(run, { points: 0, jumped: false, result }));
  }
}

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

/** Stores a game as a player's browser would hold it. */
function store(value: unknown): void {
  storage.setItem(SAVED_GAME_KEY, JSON.stringify(value));
}

/** Returns the game as stored, or null. */
function stored(): unknown {
  return JSON.parse(storage.getItem(SAVED_GAME_KEY) ?? "null");
}

/** Returns what the game would keep now, as it is stored. */
function keptNow(game: FakeGame): unknown {
  const saved = saveGame(game.run(), game.nextStart(), LEVELS, {
    tuned: game.tuned(),
  });
  return JSON.parse(JSON.stringify({ version: 1, ...saved }));
}

/** Loads the page over what the browser keeps: a new game, with the saved game started, as the app does. */
function load(): FakeGame {
  const game = new FakeGame();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideMemoryStorage(storage),
      { provide: KEPT_GAME, useValue: game },
    ],
  });
  TestBed.inject(SavedGameService);
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

describe("SavedGameService", () => {
  it("keeps nothing of a run with no round played", () => {
    load();

    expect(stored()).toBeNull();
  });

  it("keeps a run as a round is released", () => {
    const game = released();

    expect(stored()).toEqual(keptNow(game));
  });

  it("keeps each round as it is released, the level under way", () => {
    const game = released();

    game.release();
    TestBed.tick();

    expect(stored()).toEqual(keptNow(game));
  });

  it("keeps the run, not each change of where the next round starts", () => {
    const game = released();
    const kept = stored();

    game.nextStart.set(downARow(game.nextStart()));
    TestBed.tick();

    expect(stored()).toEqual(kept);
  });

  it("keeps the run as the page is hidden, wherever it stands", () => {
    const game = released();
    game.tuned.set(true);

    setPageVisibility("hidden");

    expect(stored()).toEqual(keptNow(game));
  });

  it("keeps the run as it changes course, such as a pause", () => {
    const game = released();
    game.tuned.set(true);

    game.run.set(pause(game.run()));
    TestBed.tick();

    expect(stored()).toEqual(keptNow(game));
  });

  it("keeps a new run as it begins, forgetting the last, though it stands as the last did", () => {
    const game = released();
    game.run.set(onLevelTwo());
    TestBed.tick();

    game.run.set(newRun(FIRST_ID + 1));
    game.runs.set(1);
    TestBed.tick();

    expect(stored()).toBeNull();
  });

  it("forgets a run as the round that loses it is released, before it lands", () => {
    const game = released();

    game.release("lost");
    TestBed.tick();

    expect(stored()).toBeNull();
  });

  it("keeps a run as the round that clears its level is released, on the next level, before it lands", () => {
    const game = released();

    game.release("cleared");
    TestBed.tick();

    expect(stored()).toMatchObject({ level: 2, rounds: 0, start: null });
  });

  it("forgets a run once it has ended", () => {
    const game = released();

    game.run.set(
      landRound(
        takeRound(game.run(), { points: 0, jumped: false, result: "lost" }),
      ),
    );
    TestBed.tick();

    expect(stored()).toBeNull();
  });

  it("takes a kept run up as the page loads, paused, under a new id, with where its next round starts", () => {
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

  it("takes up whether the kept run was played on retuned numbers", () => {
    const before = released();
    before.tuned.set(true);
    setPageVisibility("hidden");

    const game = load();

    expect(game.tuned()).toBe(true);
  });

  it("takes up nothing it can't trust, and starts afresh", () => {
    store({ version: 1, levelId: "gone", level: 1 });

    const game = load();

    expect(game.run()).toEqual(newRun());
  });

  it("takes up nothing kept in another version", () => {
    const before = released();
    store({ ...(keptNow(before) as object), version: 2 });

    const game = load();

    expect(game.run()).toEqual(newRun());
  });
});
