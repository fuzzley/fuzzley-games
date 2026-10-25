import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { pictureOf } from "../../testing/field_picture";
import { playOn } from "../../testing/game";
import { GameService } from "./game.service";
import { SettingsService } from "./settings.service";
import { StatsService } from "./stats.service";

/**
 * A field in play. Revealing its top-right corner, a blank, opens the four
 * squares it touches.
 */
const IN_PLAY = ["*..", "...", "..*"];

/** A field one square from won: the bottom-left corner. */
const NEARLY_WON = ["*1_", "121", ".1*"];

/** Sets the page's visibility, as switching tabs does, and says so. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("GameService", () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, "visibilityState");
  });

  describe("dealing", () => {
    it("deals the field and the lives the settings give", () => {
      TestBed.inject(SettingsService).update({ difficulty: "easy", lives: 2 });

      const game = TestBed.inject(GameService);

      expect(game.field().size).toEqual({ rows: 9, cols: 9, mines: 10 });
      expect(game.field().lives).toBe(2);
    });

    it("opens ground on the first reveal", () => {
      const game = TestBed.inject(GameService);

      game.reveal(40);

      expect(game.field().squares[40]).toBe("revealed");
      expect(game.field().outcome).toBe("playing");
    });

    it("deals a new field without asking while no game is under way", async () => {
      const game = TestBed.inject(GameService);

      const dealt = await game.newGame();

      expect(dealt).toBe(true);
      expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
    });

    it("asks before a new field loses the game under way", () => {
      const game = playOn(IN_PLAY);

      void game.newGame();

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new game?",
      );
    });

    it("keeps the game under way when the player backs out", async () => {
      const game = playOn(IN_PLAY);

      const dealing = game.newGame();
      TestBed.inject(ConfirmService).cancel();

      expect(await dealing).toBe(false);
      expect(pictureOf(game.field())).toEqual(IN_PLAY);
    });

    it("deals a new field when the player goes ahead", async () => {
      const game = playOn(IN_PLAY);

      const dealing = game.newGame();
      TestBed.inject(ConfirmService).accept();

      expect(await dealing).toBe(true);
      expect(game.field().outcome).toBe("ready");
      expect(game.field().layout).toBeNull();
    });

    it("starts the same field again on a restart, its mines where they were", async () => {
      const game = playOn(IN_PLAY);
      game.reveal(2);

      const restarting = game.restart();
      TestBed.inject(ConfirmService).accept();
      await restarting;

      expect(pictureOf(game.field())).toEqual(IN_PLAY);
      expect(game.field().outcome).toBe("ready");
    });

    it("deals a game from settings it changes", async () => {
      const game = TestBed.inject(GameService);

      await game.changeSettings({ difficulty: "hard" });

      expect(TestBed.inject(SettingsService).settings().difficulty).toBe(
        "hard",
      );
      expect(game.difficulty()).toBe("hard");
      expect(game.field().size).toEqual({ rows: 16, cols: 30, mines: 99 });
    });
  });

  describe("moves", () => {
    it("reveals a square on a click or tap", () => {
      const game = playOn(IN_PLAY);

      game.play(2);

      expect(pictureOf(game.field())).toEqual(["*1_", ".21", "..*"]);
    });

    it("flags a square on a click or tap in Flag mode", () => {
      const game = playOn(IN_PLAY);
      game.toggleFlagMode();

      game.play(2);

      expect(pictureOf(game.field())).toEqual(["*.f", "...", "..*"]);
    });

    it("counts the mines not yet flagged", () => {
      const game = playOn(IN_PLAY);

      game.flag(0);

      expect(game.minesLeft()).toBe(1);
    });

    it("says what a move did", () => {
      const game = playOn(IN_PLAY);

      game.reveal(2);

      expect(game.announcement()).toBe("Revealed 4 squares.");
    });

    it("says it again, differently, when a move does the same", () => {
      const game = playOn(IN_PLAY);
      game.reveal(1);

      game.reveal(3);

      expect(game.announcement()).toBe("Revealed: 1. ");
    });

    it("charges a life for a mine, and says so", () => {
      const game = playOn(IN_PLAY);

      game.reveal(0);

      expect(game.field().livesLeft).toBe(2);
      expect(game.announcement()).toBe("Mine. 2 lives left.");
    });

    it("shows how the game ended once the last life is lost", () => {
      const game = playOn(IN_PLAY, { livesLeft: 1 });

      game.reveal(0);

      expect(game.field().outcome).toBe("lost");
      expect(game.resultOpen()).toBe(true);
    });

    it("shows how the game ended once the field is cleared", () => {
      const game = playOn(NEARLY_WON);

      game.reveal(6);

      expect(game.field().outcome).toBe("won");
      expect(game.resultOpen()).toBe(true);
    });

    it("puts the result away, leaving the field as it ended", () => {
      const game = playOn(NEARLY_WON);
      game.reveal(6);

      game.closeResult();

      expect(game.resultOpen()).toBe(false);
      expect(game.field().outcome).toBe("won");
    });
  });

  describe("stats", () => {
    it("counts a game once its first square is revealed", () => {
      const game = TestBed.inject(GameService);

      game.reveal(40);

      expect(TestBed.inject(StatsService).stats().medium.played).toBe(1);
    });

    it("counts a win at the game's difficulty, with its time", () => {
      const game = playOn(NEARLY_WON, { difficulty: "easy", seconds: 42 });

      game.reveal(6);

      expect(TestBed.inject(StatsService).stats().easy).toMatchObject({
        won: 1,
        best: 42,
      });
    });

    it("tells a new best time", () => {
      const game = playOn(NEARLY_WON, { difficulty: "easy", seconds: 42 });

      game.reveal(6);

      expect(game.newBest()).toBe(true);
    });

    it("tells a time slower than the best", () => {
      TestBed.inject(StatsService).recordWin("easy", 30);
      const game = playOn(NEARLY_WON, { difficulty: "easy", seconds: 42 });

      game.reveal(6);

      expect(game.newBest()).toBe(false);
    });
  });

  describe("the clock", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("waits for the first reveal", () => {
      const game = TestBed.inject(GameService);

      vi.advanceTimersByTime(3000);

      expect(game.seconds()).toBe(0);
    });

    it("counts the seconds of a game under way", () => {
      const game = playOn(IN_PLAY);

      vi.advanceTimersByTime(3000);

      expect(game.seconds()).toBe(3);
    });

    it("counts on from where a game was left", () => {
      const game = playOn(IN_PLAY, { seconds: 74 });

      vi.advanceTimersByTime(1000);

      expect(game.seconds()).toBe(75);
    });

    it("stops when the game is over", () => {
      const game = playOn(NEARLY_WON, { seconds: 10 });
      game.reveal(6);

      vi.advanceTimersByTime(3000);

      expect(game.seconds()).toBe(10);
    });

    it("stops while the page is out of sight", () => {
      const game = playOn(IN_PLAY);
      setVisibility("hidden");

      vi.advanceTimersByTime(3000);

      expect(game.seconds()).toBe(0);
    });

    it("goes on when the page is back in sight", () => {
      const game = playOn(IN_PLAY);
      setVisibility("hidden");
      setVisibility("visible");

      vi.advanceTimersByTime(2000);

      expect(game.seconds()).toBe(2);
    });
  });
});
