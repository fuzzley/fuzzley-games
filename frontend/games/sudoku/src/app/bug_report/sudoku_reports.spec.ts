import { TestBed } from "@angular/core/testing";
import { createRandom } from "@fz/core/random";
import {
  BUG_REPORT_SOURCE,
  BugReportService,
  unpackState,
} from "@fz/game-ui/bug_report";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  installCompressionStreams,
  installFakeViewport,
} from "@fz/game-ui/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { at } from "../../rules/cells";
import {
  type Grid,
  erase,
  fillNotes,
  place,
  toggleNote,
} from "../../rules/grid";
import { playOn } from "../../testing/game";
import { gridFrom, solvedBut, squareAt } from "../../testing/grid_picture";
import { GameService } from "../play/game.service";
import { SAVED_GAME_KEY, SavedGameService } from "../play/saved_game.service";
import {
  DEFAULT_SETTINGS,
  SettingsService,
} from "../settings/settings.service";
import { REPORT_TAG, readReportedGame } from "./reported_game";
import { SudokuReports } from "./sudoku_reports";

/** An expert puzzle of the bank's, the one with the fewest givens: 24. */
const EXPERT = [
  "2..3.4...",
  ".3..9.1..",
  "...6...8.",
  ".....7.65",
  "5.......1",
  "32.8.....",
  ".7...9...",
  "..9.6..7.",
  "...5.3..6",
];

/** The longest a phone's browser names itself, near enough. */
const LONG_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 15; SM-S938U Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36 SamsungBrowser/27.0";

/** Returns the game-state field a report's link fills in. */
function gameStateOf(url: URL): string {
  return url.searchParams.get("game-state") ?? "";
}

/** Returns the reports, as a game's bug report takes them. */
function reports(): SudokuReports {
  return TestBed.inject(SudokuReports);
}

/** Returns the game as its report takes it, read back. */
function taken(): ReturnType<typeof readReportedGame> {
  return readReportedGame(reports().capture().value);
}

/**
 * Returns a heavier game than a player is likely to leave: `EXPERT` with
 * every note filled in, then 1,200 moves in all, each a note, a digit or an
 * erase on a blank square picked at random, which packs worse than a
 * player's moves do: past 20 KB of JSON.
 */
function heaviestGame(): Grid {
  const random = createRandom(7);
  const pick = (count: number): number => Math.floor(random() * count);
  let grid = fillNotes(gridFrom(EXPERT, { level: "expert" }));
  const { givens } = grid.puzzle;
  const blanks = givens.flatMap((given, index) => (given === 0 ? [index] : []));
  while (grid.history.length < 1200) {
    const index = at(blanks, pick(blanks.length));
    const digit = 1 + pick(9);
    const move = pick(20);
    if (move < 12) grid = toggleNote(grid, index, digit);
    else if (move < 17) grid = place(grid, index, digit, { clearNotes: true });
    else grid = erase(grid, index);
  }
  return grid;
}

describe("SudokuReports", () => {
  installCompressionStreams();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: BUG_REPORT_SOURCE, useExisting: SudokuReports }],
    });
  });

  it("takes the game as it stands", () => {
    const game = playOn({ seconds: 42 });
    game.select(squareAt("r1c1"));
    game.enter(6);
    game.useHint();
    game.select(squareAt("r9c9"));
    game.toggleNotesMode();

    expect(taken()).toEqual({
      grid: game.grid(),
      seconds: 42,
      selected: squareAt("r9c9"),
      notesMode: true,
      hint: game.hint(),
      settings: DEFAULT_SETTINGS,
      replay: false,
    });
  });

  it("sums up the game it takes", () => {
    const game = playOn({ seconds: 42 });
    game.toggleNotesMode();

    expect(reports().capture().summary).toBe(
      "In play · 0:42 · 45 blank squares · 0 hints · Notes on",
    );
  });

  it("takes a solved puzzle, which the game keeps no save of", () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });
    TestBed.inject(SavedGameService);
    const game = playOn({ digits: solvedBut("r1c1") });

    game.select(squareAt("r1c1"));
    game.enter(6);
    TestBed.tick();

    expect(storage.getItem(SAVED_GAME_KEY)).toBeNull();
    expect(taken().grid.outcome).toBe("solved");
  });

  it("takes a puzzle played again after it was solved", async () => {
    const game = playOn({ digits: solvedBut("r1c1") });
    game.select(squareAt("r1c1"));
    game.enter(6);

    await game.restart();

    expect(taken().replay).toBe(true);
  });

  it("takes the settings", () => {
    playOn();
    TestBed.inject(SettingsService).update({
      level: "hard",
      markMistakes: true,
    });

    expect(taken().settings).toEqual({
      level: "hard",
      markMistakes: true,
      clearNotes: true,
    });
  });

  it("names the level in a line", () => {
    playOn({ givens: EXPERT, level: "expert" });

    expect(reports().game()).toBe("Sudoku · Expert");
  });

  it("lists the settings as the drawer words them", () => {
    playOn();
    TestBed.inject(SettingsService).update({
      level: "hard",
      clearNotes: false,
    });

    expect(reports().settings()).toEqual([
      "Level: Hard",
      "Mark mistakes: Off",
      "Auto-clear notes: Off",
    ]);
  });

  it("lists an assist turned on as On", () => {
    TestBed.inject(SettingsService).update({ markMistakes: true });

    expect(reports().settings()).toContain("Mark mistakes: On");
  });

  describe("in a report's link", () => {
    beforeEach(() => {
      installFakeViewport(390, 844);
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(LONG_USER_AGENT);
      TestBed.configureTestingModule({
        providers: [
          {
            provide: BUILD_INFO,
            useValue: { commit: "549c93a", buildTime: "2031-06-15T09:30:00Z" },
          },
        ],
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fits a game of a few moves whole", async () => {
      const game = playOn();
      game.select(squareAt("r1c1"));
      game.enter(6);
      const state = reports().capture();

      const url = new URL(
        await TestBed.inject(BugReportService).issueUrl(state),
      );

      expect(await unpackState(REPORT_TAG, gameStateOf(url))).toEqual(
        state.value,
      );
    });

    it("fits the heaviest game with the newest moves it can", async () => {
      const grid = heaviestGame();
      const game = TestBed.inject(GameService);
      game.resume(grid, 35_999);
      game.toggleNotesMode();
      const state = reports().capture();

      const url = new URL(
        await TestBed.inject(BugReportService).issueUrl(state),
      );

      const field = gameStateOf(url);
      const kept = readReportedGame(await unpackState(REPORT_TAG, field)).grid;
      const { length } = kept.history;
      expect(url.toString().length).toBeLessThanOrEqual(6000);
      expect(kept.digits).toEqual(grid.digits);
      expect(kept.notes).toEqual(grid.notes);
      expect(kept.history).toEqual(
        grid.history.slice(grid.history.length - length),
      );
      expect(length).toBeGreaterThan(600);
      expect(field).toContain(`· ${length} of 1200 undo steps\n`);
    });
  });
});
