import { TestBed } from "@angular/core/testing";
import { inject } from "@angular/core";
import { createRandom } from "@fz/core/random";
import {
  BUG_REPORT_SOURCE,
  BugReportService,
  type BugReportSource,
  unpackState,
} from "@fz/game-ui/bug_report";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  installCompressionStreams,
  installFakeViewport,
} from "@fz/game-ui/testing";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { render, screen } from "@testing-library/angular";
import { CUSTOM_SIDE, type FieldSize, maxMines } from "../../rules/difficulty";
import { type Field, type Square, layoutOf } from "../../rules/field";
import { fieldFrom } from "../../testing/field_picture";
import { pauseAtEnd, playOn } from "../../testing/game";
import { AppComponent } from "../app.component";
import { GameService } from "../play/game.service";
import { SAVED_GAME_KEY, SavedGameService } from "../play/saved_game.service";
import { SettingsService } from "../settings/settings.service";
import { MinesweeperReports } from "./minesweeper_reports";
import { REPORT_TAG, readReportedGame } from "./reported_game";

/** A game under way: 2 mines, 1 square of ground and 2 numbers open. */
const IN_PLAY = ["*1_", ".21", "..*"];

/** A field wider than it is tall, which an upright screen turns. */
const WIDE = ["*1___", "11___"];

/** The longest a phone's browser names itself, near enough. */
const LONG_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 15; SM-S938U Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36 SamsungBrowser/27.0";

/** Returns the reports, as a game's bug report takes them. */
function reports(): MinesweeperReports {
  return TestBed.inject(MinesweeperReports);
}

/** Returns the game as its report takes it, read back. */
function taken(): ReturnType<typeof readReportedGame> {
  return readReportedGame(reports().capture().value);
}

/**
 * Returns the most a field can put in a state: the largest Custom field,
 * with as many mines as it can hide, its open, flagged and hidden squares
 * strewn at random, which packs worse than any field a player leaves, and 4
 * of 5 lives lost.
 */
function largestField(): Field {
  const side = CUSTOM_SIDE.max;
  const size: FieldSize = {
    rows: side,
    cols: side,
    mines: maxMines(side, side),
  };
  const total = size.rows * size.cols;
  const random = createRandom(9);
  const mines = new Array<boolean>(total).fill(false);
  for (let placed = 0; placed < size.mines;) {
    const at = Math.floor(random() * total);
    if (!mines[at]) {
      mines[at] = true;
      placed++;
    }
  }
  let tripped = 0;
  const squares = mines.map((mine): Square => {
    const pick = random();
    if (mine && tripped < 4 && pick < 0.1) {
      tripped++;
      return "tripped";
    }
    if (pick < 0.5) return "hidden";
    return mine || pick < 0.75 ? "flagged" : "revealed";
  });
  return {
    size,
    seed: 4_294_967_295,
    layout: layoutOf(size, mines),
    squares,
    lives: 5,
    livesLeft: 5 - tripped,
    outcome: "playing",
  };
}

describe("MinesweeperReports", () => {
  installCompressionStreams();

  it("takes the game as it stands", () => {
    const game = playOn(IN_PLAY, { seconds: 42, difficulty: "easy" });
    game.toggleFlagMode();

    expect(taken()).toEqual({
      field: fieldFrom(IN_PLAY),
      difficulty: "easy",
      seconds: 42,
      flagMode: true,
      lives: 3,
      custom: { rows: 20, cols: 20, mines: 100 },
      turned: false,
      scroll: { left: 0, top: 0 },
    });
  });

  it("sums up the game it takes", () => {
    const game = playOn(IN_PLAY, { seconds: 42 });
    game.toggleFlagMode();

    expect(reports().capture().summary).toBe(
      "In play · 0:42 · 3 of 3 lives · 2 mines left · Flag mode on",
    );
  });

  it("takes a lost game, which the game keeps no save of", () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideMemoryStorage(storage)],
    });
    pauseAtEnd(0);
    TestBed.inject(SavedGameService);
    const game = playOn(IN_PLAY, { lives: 1 });

    game.reveal(0);
    TestBed.tick();

    expect(storage.getItem(SAVED_GAME_KEY)).toBeNull();
    expect(taken().field.outcome).toBe("lost");
  });

  it("takes the lives and the Custom field a new game is dealt from", () => {
    playOn(IN_PLAY);
    TestBed.inject(SettingsService).update({
      lives: 5,
      custom: { rows: 12, cols: 24, mines: 60 },
    });

    expect(taken()).toMatchObject({
      lives: 5,
      custom: { rows: 12, cols: 24, mines: 60 },
    });
  });

  it("takes how far the stage is scrolled", async () => {
    await render(AppComponent);
    const stage = screen.getByRole("main");
    stage.scrollLeft = 120;
    stage.scrollTop = 48;

    expect(taken().scroll).toEqual({ left: 120, top: 48 });
  });

  it("takes the board as turned where it stands on end, upright", async () => {
    installFakeViewport(390, 844);
    const { fixture } = await render(AppComponent);
    playOn(WIDE);
    await fixture.whenStable();

    expect(screen.getByRole("grid")).toHaveAccessibleName(
      "Minefield, 5 rows by 2 columns",
    );
    expect(taken().turned).toBe(true);
  });

  it("takes the board as unturned where it lies flat, on its side", async () => {
    installFakeViewport(844, 390);
    const { fixture } = await render(AppComponent);
    playOn(WIDE);
    await fixture.whenStable();

    expect(screen.getByRole("grid")).toHaveAccessibleName(
      "Minefield, 2 rows by 5 columns",
    );
    expect(taken().turned).toBe(false);
  });

  it("names the difficulty in a line", () => {
    playOn(IN_PLAY, { difficulty: "hard" });

    expect(reports().game()).toBe("Minesweeper · Hard");
  });

  it("names a Custom field with its size", () => {
    playOn(IN_PLAY, { difficulty: "custom" });

    expect(reports().game()).toBe("Minesweeper · Custom · 3 × 3, 2 mines");
  });

  it("lists the settings as the drawer words them", () => {
    expect(reports().settings()).toEqual([
      "Difficulty: Medium",
      "Custom: 20 × 20, 100 mines",
      "Lives: 3",
    ]);
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
          {
            provide: BUG_REPORT_SOURCE,
            useFactory: (): BugReportSource => {
              const source = inject(MinesweeperReports);
              return {
                title: source.title,
                tag: source.tag,
                game: () => source.game(),
                settings: () => source.settings(),
                capture: () => source.capture(),
                load: () => Promise.resolve(false),
              };
            },
          },
        ],
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fits the largest state whole", async () => {
      const field = largestField();
      TestBed.inject(SettingsService).update({
        difficulty: "custom",
        custom: field.size,
        lives: 5,
      });
      const game = TestBed.inject(GameService);
      game.resume(field, 35_999, "custom");
      game.toggleFlagMode();
      const state = reports().capture();

      const url = new URL(
        await TestBed.inject(BugReportService).issueUrl(state),
      );

      expect(url.toString().length).toBeLessThanOrEqual(6000);
      expect(
        await unpackState(REPORT_TAG, url.searchParams.get("game-state") ?? ""),
      ).toEqual(state.value);
    });
  });
});
