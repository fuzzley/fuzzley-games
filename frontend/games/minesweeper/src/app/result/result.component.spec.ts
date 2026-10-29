import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { pictureOf } from "../../testing/field_picture";
import { type GameOptions, pauseAtEnd, playOn } from "../../testing/game";
import { GameService } from "../play/game.service";
import { STATS_KEY } from "../stats/stats.service";
import { ResultComponent } from "./result.component";

/** A field one square from won: the bottom-left corner. */
const NEARLY_WON = ["*1_", "121", ".1*"];

/**
 * A field one mine from lost, its bottom-left corner, with a mine flagged and
 * another stepped on.
 */
const NEARLY_LOST = ["x1_", "231", "*.F"];

/** Stores stats as a player's browser would hold them, before the app reads them. */
function storeStats(stats: object): void {
  localStorage.setItem(STATS_KEY, JSON.stringify({ version: 1, ...stats }));
}

/**
 * Renders the card, then plays a field to its end with its last move, with
 * no pause before the card.
 */
async function finish(
  picture: readonly string[],
  lastMove: number,
  options: GameOptions = {},
): Promise<UserEvent> {
  pauseAtEnd(0);
  const { fixture } = await render(ResultComponent);
  playOn(picture, options).reveal(lastMove);
  await fixture.whenStable();
  return userEvent.setup();
}

/** Returns each figure the card shows, as its term and value. */
function figures(): [string, string][] {
  return screen
    .getAllByRole("term")
    .map((dt) => [
      dt.textContent.trim(),
      dt.nextElementSibling?.textContent.trim() ?? "",
    ]);
}

describe("ResultComponent", () => {
  it("stays shut while the game is under way", async () => {
    await render(ResultComponent);

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  describe("after a win", () => {
    it("says the field is cleared", async () => {
      await finish(NEARLY_WON, 6);

      expect(
        screen.getByRole("alertdialog", { name: "Field cleared!" }),
      ).toBeInTheDocument();
    });

    it("is described by the field won", async () => {
      await finish(NEARLY_WON, 6, { difficulty: "easy" });

      expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(
        "Easy · 3 × 3 · 2 mines",
      );
    });

    it("shows the time, the lives left and the games won", async () => {
      storeStats({ easy: { played: 2, won: 0, best: null } });

      await finish(NEARLY_WON, 6, {
        difficulty: "easy",
        seconds: 133,
        livesLeft: 2,
      });

      expect(figures()).toEqual([
        ["Time", "2:13"],
        ["Lives left", "2 of 3"],
        ["Won", "1 of 2"],
      ]);
    });

    it("tells a new best time", async () => {
      await finish(NEARLY_WON, 6, { difficulty: "easy" });

      expect(screen.getByText("New best time")).toBeInTheDocument();
    });

    it("tells nothing of a time slower than the best", async () => {
      storeStats({ easy: { played: 1, won: 1, best: 10 } });

      await finish(NEARLY_WON, 6, { difficulty: "easy", seconds: 20 });

      expect(screen.queryByText("New best time")).toBeNull();
    });

    it("opens on New Game", async () => {
      await finish(NEARLY_WON, 6);

      expect(screen.getByRole("button", { name: "New Game" })).toHaveFocus();
    });
  });

  describe("after a loss", () => {
    it("says the lives ran out", async () => {
      await finish(NEARLY_LOST, 6, { livesLeft: 1 });

      expect(
        screen.getByRole("alertdialog", { name: "Out of lives" }),
      ).toBeInTheDocument();
    });

    it("is described by how much of the field was cleared", async () => {
      await finish(NEARLY_LOST, 6, { livesLeft: 1 });

      expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(
        "You cleared 83% of the field.",
      );
    });

    it("shows the time, the mines found and the best time", async () => {
      storeStats({ medium: { played: 1, won: 1, best: 95 } });

      await finish(NEARLY_LOST, 6, { livesLeft: 1, seconds: 221 });

      expect(figures()).toEqual([
        ["Time", "3:41"],
        ["Mines found", "3 of 3"],
        ["Best", "1:35"],
      ]);
    });

    it("shows the games won where there is no best time", async () => {
      await finish(NEARLY_LOST, 6, { livesLeft: 1 });

      expect(figures()[2]).toEqual(["Won", "0 of 0"]);
    });
  });

  describe("its actions", () => {
    it("deals a new game, and goes", async () => {
      const user = await finish(NEARLY_WON, 6);

      await user.click(screen.getByRole("button", { name: "New Game" }));

      expect(TestBed.inject(GameService).field().layout).toBeNull();
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("plays the same field again, its mines where they were", async () => {
      const user = await finish(NEARLY_WON, 6);

      await user.click(
        screen.getByRole("button", { name: "Play this field again" }),
      );

      expect(pictureOf(TestBed.inject(GameService).field())).toEqual([
        "*..",
        "...",
        "..*",
      ]);
    });

    it("goes, leaving the board as it ended", async () => {
      const user = await finish(NEARLY_WON, 6);

      await user.click(
        screen.getByRole("button", { name: "Close and look at the board" }),
      );

      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(TestBed.inject(GameService).field().outcome).toBe("won");
    });

    it("goes on Escape", async () => {
      const user = await finish(NEARLY_WON, 6);

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
  });
});
