import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { pictureOf } from "../../testing/field_picture";
import { pauseAtEnd, playOn } from "../../testing/game";
import { LANDING_MS } from "../board/landing";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";
import { GameService, LOOK_MS } from "./game.service";

/**
 * A field in play. Revealing its top-right corner, a blank, opens the four
 * squares it touches.
 */
const IN_PLAY = ["*..", "...", "..*"];

/** A field one square from won: the bottom-left corner. */
const NEARLY_WON = ["*1_", "121", ".1*"];

describe("GameService", () => {
  afterEach(() => {
    vi.useRealTimers();
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

    it("names the difficulty before a field of another loses the game under way", () => {
      const game = playOn(IN_PLAY);

      void game.changeSettings({ difficulty: "hard" });

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Start a new Hard game?",
        confirmLabel: "New game",
      });
    });

    it("asks the plain question before other lives lose the game under way", () => {
      const game = playOn(IN_PLAY);

      void game.changeSettings({ lives: 5 });

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new game?",
      );
    });

    it("asks to restart the field, not for a new game, before a restart", () => {
      const game = playOn(IN_PLAY);

      void game.restart();

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Restart this field?",
        confirmLabel: "Restart",
      });
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

      expect(TestBed.inject(AnnouncerService).message()).toBe(
        "Revealed 4 squares.",
      );
    });

    it("says it again, differently, when a move does the same", () => {
      const game = playOn(IN_PLAY);
      game.reveal(1);

      game.reveal(3);

      expect(TestBed.inject(AnnouncerService).message()).toBe(
        "Revealed: 1.\u00a0",
      );
    });

    it("charges a life for a mine, and says so", () => {
      const game = playOn(IN_PLAY);

      game.reveal(0);

      expect(game.field().livesLeft).toBe(2);
      expect(TestBed.inject(AnnouncerService).message()).toBe(
        "Mine. 2 lives left.",
      );
    });

    it("remembers the last move: the field before it, and its square", () => {
      const game = playOn(IN_PLAY);
      const before = game.field();

      game.reveal(2);

      expect(game.lastMove()).toEqual({ before, at: 2 });
    });

    it("forgets the last move with a new deal", async () => {
      const game = playOn(NEARLY_WON);
      game.reveal(6);

      await game.newGame();

      expect(game.lastMove()).toBeNull();
    });
  });

  describe("the end of a game", () => {
    let viewport: FakeViewport | null = null;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      viewport?.restore();
      viewport = null;
    });

    it("leaves the board to show how the game ended before the card opens", () => {
      pauseAtEnd(1000);
      const game = playOn(NEARLY_WON);

      game.reveal(6);

      expect(game.ending()).toBe(true);
      expect(game.resultOpen()).toBe(false);
    });

    it("shows how the game ended after the pause once the last life is lost", () => {
      pauseAtEnd(1000);
      const game = playOn(IN_PLAY, { livesLeft: 1 });
      game.reveal(0);

      vi.advanceTimersByTime(1000);

      expect(game.ending()).toBe(false);
      expect(game.resultOpen()).toBe(true);
    });

    it("shows how the game ended after the pause once the field is cleared", () => {
      pauseAtEnd(1000);
      const game = playOn(NEARLY_WON);
      game.reveal(6);

      vi.advanceTimersByTime(1000);

      expect(game.resultOpen()).toBe(true);
    });

    it("cuts the pause short on a move made in it", () => {
      pauseAtEnd(1000);
      const game = playOn(NEARLY_WON);
      game.reveal(6);

      game.flag(0);

      expect(game.resultOpen()).toBe(true);
    });

    it("opens the card in the move that ends the game with no pause", () => {
      pauseAtEnd(0);
      const game = playOn(NEARLY_WON);

      game.reveal(6);

      expect(game.resultOpen()).toBe(true);
    });

    it("opens no card over a game dealt in the pause", async () => {
      pauseAtEnd(1000);
      const game = playOn(NEARLY_WON);
      game.reveal(6);
      await game.newGame();

      vi.advanceTimersByTime(1000);

      expect(game.resultOpen()).toBe(false);
    });

    it("pauses for the board's landings where motion is welcome", () => {
      viewport = installFakeViewport(1280);
      const game = playOn(NEARLY_WON);
      game.reveal(6);

      vi.advanceTimersByTime(LANDING_MS + LOOK_MS - 1);

      expect(game.resultOpen()).toBe(false);
    });

    it("pauses only a moment where motion is unwelcome", () => {
      const game = playOn(NEARLY_WON);
      game.reveal(6);

      vi.advanceTimersByTime(LOOK_MS);

      expect(game.resultOpen()).toBe(true);
    });

    it("puts the result away, leaving the field as it ended", () => {
      pauseAtEnd(0);
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
  });
});
