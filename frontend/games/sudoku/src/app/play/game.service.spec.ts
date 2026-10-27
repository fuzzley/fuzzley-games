import { TestBed } from "@angular/core/testing";
import { StopwatchService } from "@fz/game-ui/stopwatch";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { at } from "../../rules/cells";
import { digitsIn } from "../../rules/digits";
import { createRandom } from "@fz/core/random";
import { playOn } from "../../testing/game";
import {
  EASY,
  EASY_SOLUTION,
  STALLED,
  rowsOf,
  solvedBut,
  squareAt,
} from "../../testing/grid_picture";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";
import { GAME_RANDOM, GameService } from "./game.service";

/** Eight rows with no digit in them, to draw a row of the player's above. */
const EMPTY = new Array<string>(8).fill(".........");

/** The player's 6 at row 1, column 1, which the solution holds. */
const RIGHT_6 = ["6........", ...EMPTY];

/** The player's 9 at row 1, column 1, where the solution has a 6. */
const WRONG_9 = ["9........", ...EMPTY];

/** The digit `EASY`'s solution puts in a square. */
function solutionAt(index: number): number {
  return Number(EASY_SOLUTION.join("")[index]);
}

/** Returns what the live region last said. */
function said(): string {
  return TestBed.inject(AnnouncerService).message();
}

describe("GameService", () => {
  describe("dealing", () => {
    it("deals a puzzle at the level in the settings", () => {
      TestBed.inject(SettingsService).update({ level: "medium" });

      const game = TestBed.inject(GameService);

      expect(game.level()).toBe("medium");
    });

    it("selects the first blank square", () => {
      const game = TestBed.inject(GameService);

      expect(game.selected()).toBe(game.grid().digits.indexOf(0));
    });

    it("deals without asking while no game is under way", async () => {
      const game = TestBed.inject(GameService);

      const dealt = await game.newGame();

      expect(dealt).toBe(true);
      expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
    });

    it("asks before a new deal loses the game under way", () => {
      const game = playOn();

      void game.newGame();

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new game?",
      );
    });

    it("keeps the game under way when the player backs out", async () => {
      const game = playOn({ digits: solvedBut("r1c1") });
      const before = game.grid();

      const dealing = game.newGame();
      TestBed.inject(ConfirmService).cancel();

      expect(await dealing).toBe(false);
      expect(game.grid()).toBe(before);
    });

    it("deals a new puzzle when the player goes ahead", async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: GAME_RANDOM, useValue: createRandom(7) }],
      });
      const game = playOn();

      const dealing = game.newGame();
      TestBed.inject(ConfirmService).accept();

      expect(await dealing).toBe(true);
      expect(rowsOf(game.grid().puzzle.givens)).not.toEqual([...EASY]);
      expect(game.inProgress()).toBe(false);
    });

    it("starts the same puzzle again, without the player's digits", async () => {
      const game = playOn({ digits: solvedBut("r1c1", "r1c2") });

      const restarting = game.restart();
      TestBed.inject(ConfirmService).accept();

      expect(await restarting).toBe(true);
      expect(rowsOf(game.grid().digits)).toEqual([...EASY]);
    });

    it("deals at another level, and keeps it in the settings", async () => {
      const game = TestBed.inject(GameService);

      await game.changeLevel("hard");

      expect(game.level()).toBe("hard");
      expect(TestBed.inject(SettingsService).settings().level).toBe("hard");
    });

    it("counts a game taken up as under way", () => {
      const game = playOn();

      expect(game.inProgress()).toBe(true);
    });
  });

  describe("moves", () => {
    it("places a digit in the selected square, and says so", () => {
      const game = playOn();
      game.select(squareAt("r1c1"));

      game.enter(6);

      expect(game.grid().digits[0]).toBe(6);
      expect(said()).toBe("6.");
    });

    it("says when a digit repeats", () => {
      const game = playOn();
      game.select(squareAt("r1c1"));

      game.enter(5);

      expect(said()).toBe("5. 5 repeats in row 1.");
    });

    it("adds a note in Notes mode", () => {
      const game = playOn();
      game.select(squareAt("r1c1"));
      game.toggleNotesMode();

      game.enter(6);

      expect(digitsIn(at(game.grid().notes, 0))).toEqual([6]);
      expect(said()).toBe("Note 6.");
    });

    it("takes a digit placed out of the notes of the squares it sees", () => {
      const game = playOn({ notes: { r1c2: "69" } });
      game.select(squareAt("r1c1"));

      game.place(6);

      expect(digitsIn(at(game.grid().notes, squareAt("r1c2")))).toEqual([9]);
    });

    it("leaves the notes alone with the assist off", () => {
      TestBed.inject(SettingsService).update({ clearNotes: false });
      const game = playOn({ notes: { r1c2: "69" } });
      game.select(squareAt("r1c1"));

      game.place(6);

      expect(digitsIn(at(game.grid().notes, squareAt("r1c2")))).toEqual([6, 9]);
    });

    it("erases the selected square", () => {
      const game = playOn({ digits: RIGHT_6 });
      game.select(squareAt("r1c1"));

      game.erase();

      expect(game.grid().digits[0]).toBe(0);
      expect(said()).toBe("Erased.");
    });

    it("takes back the last move, and says so", () => {
      const game = playOn();
      game.select(squareAt("r1c1"));
      game.enter(6);

      game.undo();

      expect(game.grid().digits[0]).toBe(0);
      expect(game.canUndo()).toBe(false);
      expect(said()).toBe("Undone: 6 taken out of row 1, column 1.");
    });

    it("says why a move on a given changes nothing", () => {
      const game = playOn();
      game.select(squareAt("r1c4"));

      game.enter(6);

      expect(said()).toBe("Row 1, column 4 is given.");
    });

    it("says when there is nothing to erase", () => {
      const game = playOn();
      game.select(squareAt("r1c1"));

      game.erase();

      expect(said()).toBe("Nothing to erase.");
    });

    it("stays quiet about a move once the puzzle is solved", () => {
      const game = playOn({ digits: solvedBut("r1c1") });
      game.select(squareAt("r1c1"));
      game.enter(6);

      game.erase();

      expect(said()).toBe("Solved in 0:00.");
    });

    it("counts a fresh deal as played from its first move", () => {
      const game = TestBed.inject(GameService);
      const stats = TestBed.inject(StatsService);

      game.toggleNote(1);
      game.toggleNote(2);

      expect(stats.stats().easy.played).toBe(1);
      expect(game.inProgress()).toBe(true);
    });

    it("selects only a square on the board", () => {
      const game = playOn();
      game.select(squareAt("r5c5"));

      game.select(81);

      expect(game.selected()).toBe(squareAt("r5c5"));
    });
  });

  describe("hints", () => {
    it("selects a wrong digit a hint finds, and says why", () => {
      const game = playOn({ digits: WRONG_9 });

      game.useHint();

      expect(game.hint()).toMatchObject({ kind: "mistake", index: 0 });
      expect(game.selected()).toBe(0);
      expect(said()).toBe(
        "A mistake. The 9 at row 1, column 1 doesn't belong there.",
      );
    });

    it("takes the wrong digit out on the second press", () => {
      const game = playOn({ digits: WRONG_9 });
      game.useHint();

      game.useHint();

      expect(game.grid().digits[0]).toBe(0);
      expect(game.hint()).toBeNull();
    });

    it("adds the note a hint finds missing on the second press", () => {
      const game = playOn({ notes: { r1c2: "1" } });
      game.useHint();

      game.useHint();

      expect(digitsIn(at(game.grid().notes, squareAt("r1c2")))).toEqual([1, 9]);
      expect(said()).toBe("Note 9.");
    });

    it("selects the square logic fills next, with the squares that show why", () => {
      const game = playOn();

      game.useHint();

      const hint = game.hint();
      expect(hint?.kind).toBe("step");
      expect(game.selected()).toBe(hint?.index);
      expect(hint?.digit).toBe(solutionAt(hint?.index ?? -1));
      expect(hint?.shown.length).toBeGreaterThan(0);
    });

    it("fills the square in on the second press", () => {
      const game = playOn();
      game.useHint();
      const hint = game.hint();

      game.useHint();

      expect(game.grid().digits[hint?.index ?? -1]).toBe(hint?.digit);
      expect(game.hint()).toBeNull();
    });

    it("counts each hint", () => {
      const game = playOn();

      game.useHint();

      expect(game.grid().hints).toBe(1);
    });

    it("lets the hint go when the board changes", () => {
      const game = playOn();
      game.useHint();

      game.toggleNote(1);

      expect(game.hint()).toBeNull();
    });

    it("says when logic finds no next step", () => {
      const game = playOn(STALLED);

      game.useHint();

      expect(game.hint()).toBeNull();
      expect(said()).toBe("No hint: logic finds no next step here.");
    });
  });

  describe("solving", () => {
    it("stops the clock, keeps the time and opens the result", () => {
      const game = playOn({ digits: solvedBut("r1c1"), seconds: 95 });

      game.enter(6);

      expect(game.grid().outcome).toBe("solved");
      expect(game.resultOpen()).toBe(true);
      expect(game.newBest()).toBe(true);
      expect(TestBed.inject(StopwatchService).running()).toBe(false);
      expect(TestBed.inject(StatsService).stats().easy).toEqual({
        played: 1,
        solved: 1,
        best: 95,
      });
      expect(said()).toBe("Solved in 1:35.");
    });

    it("sets no best time when a hint helped", () => {
      const game = playOn({ digits: solvedBut("r1c1"), hints: 1 });

      game.enter(6);

      expect(game.newBest()).toBe(false);
      expect(TestBed.inject(StatsService).stats().easy.best).toBeNull();
    });

    it("puts the result away, leaving the board", () => {
      const game = playOn({ digits: solvedBut("r1c1") });
      game.enter(6);

      game.closeResult();

      expect(game.resultOpen()).toBe(false);
      expect(game.grid().outcome).toBe("solved");
    });
  });
});
