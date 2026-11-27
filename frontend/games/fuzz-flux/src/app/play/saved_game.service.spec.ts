import { TestBed } from "@angular/core/testing";
import { itemAt } from "@fz/core/records";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { squareOf } from "../../rules/board/cells";
import { ELEMENT_RULES, WIND_RULE } from "../../rules/elements/element_rules";
import {
  type LevelInPlay,
  levelDealt,
  movePlayed,
} from "../../rules/run/saved_game";
import { BoardFrames } from "../../testing/board_frames";
import { BLUE_LINE, SMALL_LEVELS } from "../../testing/small_levels";
import { DebugService } from "../debug/debug.service";
import { ProgressService } from "../stats/progress.service";
import { GAME_LEVELS } from "../tokens";
import { GameService } from "./game.service";
import { SavedGameService } from "./saved_game.service";
import { gridOf } from "./shown";
import { VIEW_KIT } from "./view_kit";

/** Where the level in play is kept, in its own words, so a rename fails. */
const SAVED_GAME_KEY = "fuzz-flux-game";

/** Returns a store holding a saved game, as a visit before kept it. */
function keeping(saved: unknown): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(SAVED_GAME_KEY, JSON.stringify(saved));
  return storage;
}

/** Returns what a store holds of the saved game, or null for none. */
function kept(storage: MemoryStorage): unknown {
  return JSON.parse(storage.getItem(SAVED_GAME_KEY) ?? "null");
}

/** Returns the game as the page opens on the small levels, its saved game taken up from a store, the board's view handed it. */
function openPage(storage: MemoryStorage): GameService {
  TestBed.configureTestingModule({
    providers: [
      provideMemoryStorage(storage),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
    ],
  });
  TestBed.inject(SavedGameService);
  const game = TestBed.inject(GameService);
  game.useView(VIEW_KIT);
  return game;
}

/** Returns a level of the small levels, by its number, in play on its first deal as the line of blue's move leaves it. */
function afterBlueLine(level: number): LevelInPlay {
  const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };
  const dealt = levelDealt(itemAt(SMALL_LEVELS, level - 1), 1, rules);
  return movePlayed(dealt, BLUE_LINE, rules).inPlay;
}

/** Plays a level of the small levels, by its number, opened first by the level before it cleared, so it is played on the record. */
async function startOpenLevel(game: GameService, level: number): Promise<void> {
  const before = itemAt(SMALL_LEVELS, level - 2);
  TestBed.inject(ProgressService).recordCleared(before.data.id);
  await game.startLevel(level);
}

/** Makes the line of blue's move on the board by two taps, as a player would. */
function playBlueLine(game: GameService): void {
  new BoardFrames(game).tap(
    squareOf(BLUE_LINE.from, 5),
    squareOf(BLUE_LINE.to, 5),
  );
}

describe("SavedGameService", () => {
  it("keeps the level in play as a move is made", async () => {
    const storage = new MemoryStorage();
    const game = openPage(storage);
    await startOpenLevel(game, 3);

    playBlueLine(game);
    TestBed.tick();

    expect(kept(storage)).toEqual({
      version: 1,
      level: "3",
      deal: 1,
      moves: [[12, 13]],
    });
  });

  it("keeps a level begun before a move is made on it", async () => {
    const storage = new MemoryStorage();
    const game = openPage(storage);

    await startOpenLevel(game, 2);
    TestBed.tick();

    expect(kept(storage)).toEqual({
      version: 1,
      level: "2",
      deal: 1,
      moves: [],
    });
  });

  it("keeps a level played off the record marked so", async () => {
    const storage = new MemoryStorage();
    const game = openPage(storage);

    await game.playDeal(2);
    TestBed.tick();

    expect(kept(storage)).toEqual({
      version: 1,
      level: "1",
      deal: 2,
      moves: [],
      offRecord: true,
    });
  });

  it("keeps a level ended no more", () => {
    const storage = keeping({ version: 1, level: "1", deal: 1, moves: [] });
    const game = openPage(storage);

    playBlueLine(game);
    TestBed.tick();

    expect(kept(storage)).toBeNull();
  });

  it("takes up the level kept as the page loads, its moves replayed", () => {
    const storage = keeping({
      version: 1,
      level: "3",
      deal: 1,
      moves: [[12, 13]],
    });

    const game = openPage(storage);

    expect({
      level: game.state().level.number,
      moves: game.inPlay().moves,
      movesLeft: game.state().movesLeft,
    }).toEqual({ level: 3, moves: [BLUE_LINE], movesLeft: 5 });
  });

  it("lays the level taken up on the board at rest after its last move", () => {
    const storage = keeping({
      version: 1,
      level: "3",
      deal: 1,
      moves: [[12, 13]],
    });

    const game = openPage(storage);

    expect(game.play()).toMatchObject({
      grid: gridOf(afterBlueLine(3).game),
      timeline: { restMs: 0 },
    });
  });

  it("takes up a level kept off the record off it", () => {
    const storage = keeping({
      version: 1,
      level: "1",
      deal: 2,
      moves: [],
      offRecord: true,
    });

    openPage(storage);

    expect(TestBed.inject(DebugService).offRecord()).toBe(true);
  });

  it("takes up a level kept unmarked on the record", () => {
    const storage = keeping({ version: 1, level: "1", deal: 2, moves: [] });

    openPage(storage);

    expect(TestBed.inject(DebugService).offRecord()).toBe(false);
  });

  it("drops a saved game it can't trust, and opens on the first level", () => {
    const storage = keeping({ version: 1, level: "99", deal: 1, moves: [] });

    const game = openPage(storage);

    expect(game.inPlay()).toMatchObject({ level: { number: 1 }, moves: [] });
  });

  it("drops a saved game of another version", () => {
    const storage = keeping({ version: 2, level: "3", deal: 1, moves: [] });

    const game = openPage(storage);

    expect(game.state().level.number).toBe(1);
  });
});
