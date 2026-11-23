import { computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { createRun, startLevel, takeRound } from "@fz/brick-wall/rules/run";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { LEVELS } from "../../rules/levels/levels";
import type { RoundStart } from "../../rules/round/round";
import { RUN_RULES, type Run, levelOf, openingOf } from "../../rules/run/run";
import { type TakenUp, saveGame } from "../../rules/run/saved_game";
import {
  KEPT_GAME,
  type KeptGame,
  SavedGameService,
} from "./saved_game.service";

// When the run is written and how it is taken up is
// `@fz/brick-wall/app/stored`'s `keepRun()`, whose spec holds it: this one
// holds the game's key and its readers.

/** Where the run under way is kept, in its own words, so a rename fails. */
const SAVED_GAME_KEY = "brick-fuzz-pop-game";

/** The id of the run the game begins with, as the page loads. */
const FIRST_ID = 7;

/** Returns a run on the first level, on a field 11 deep, waiting to be started. */
function newRun(): Run {
  return createRun({ id: FIRST_ID, level: 1, depth: 11 }, LEVELS, RUN_RULES);
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

  /** Starts the run's level and releases a round that breaks nothing, which brings the wall down a row. */
  release(): void {
    const start = this.nextStart();
    this.nextStart.set({
      ...start,
      wall: { ...start.wall, lowestRow: start.wall.lowestRow - 1 },
    });
    this.run.set(
      takeRound(
        startLevel(this.run()),
        { points: 0, jumped: false, result: "on" },
        RUN_RULES,
      ),
    );
  }
}

/** Returns where a run's level opens. */
function openingFor(run: Run): RoundStart {
  return openingOf(run, levelOf(run, LEVELS));
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
  it("keeps a run as a round is released, as the rules' saveGame() keeps it", () => {
    const game = released();

    expect(stored()).toEqual(keptNow(game));
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

  it("takes up nothing the rules' restoreGame() can't trust, and starts afresh", () => {
    store({ version: 1, levelId: "gone", level: 1 });

    const game = load();

    expect(game.run()).toEqual(newRun());
  });
});
