import { TestBed } from "@angular/core/testing";
import { StopwatchService } from "@fz/game-ui/stopwatch";
import { render, screen, waitFor, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../testing/game";
import { solvedBut, squareAt } from "../testing/grid_picture";
import { AppComponent } from "./app.component";
import type { GameService } from "./play/game.service";

/**
 * Renders the game over `EASY`, a 6 placed at row 1, column 1, and returns
 * the user and the game.
 */
async function renderPlayed(): Promise<{ user: UserEvent; game: GameService }> {
  const { fixture } = await render(AppComponent);
  const game = playOn();
  game.select(squareAt("r1c1"));
  game.enter(6);
  await fixture.whenStable();
  return { user: userEvent.setup(), game };
}

describe("AppComponent", () => {
  it("names the game in the page's heading", async () => {
    await render(AppComponent);

    expect(
      screen.getByRole("heading", { level: 1, name: "Sudoku" }),
    ).toBeInTheDocument();
  });

  it("links home to Fuzzley Games", async () => {
    await render(AppComponent);

    expect(screen.getByRole("link", { name: /Fuzzley Games/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("puts the board and the pad in the page's main landmark", async () => {
    await render(AppComponent);

    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByRole("grid"));
    expect(main).toContainElement(
      screen.getByRole("group", { name: "Digits" }),
    );
  });

  it("opens How to play from the bar, and goes back to the bar on closing", async () => {
    const { user } = await renderPlayed();
    const help = screen.getByRole("button", { name: "How to play" });
    await user.click(help);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(help).toHaveFocus();
  });

  it("opens the settings from the bar", async () => {
    const { user } = await renderPlayed();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("shows the result once the puzzle is solved", async () => {
    const { fixture } = await render(AppComponent);
    const game = playOn({ digits: solvedBut("r1c1") });
    game.select(0);

    game.enter(6);
    await fixture.whenStable();

    expect(
      await screen.findByRole("alertdialog", { name: "Solved!" }),
    ).toBeInTheDocument();
  });

  it("gives the board the focus after New Game from the card", async () => {
    const { fixture } = await render(AppComponent);
    const game = playOn({ digits: solvedBut("r1c1") });
    game.select(0);
    game.enter(6);
    await fixture.whenStable();
    const card = await screen.findByRole("alertdialog");

    await userEvent.click(
      within(card).getByRole("button", { name: "New Game" }),
    );

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
    });
  });

  it("gives the board the focus as the page loads", async () => {
    await render(AppComponent);

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
    });
  });

  it("gives the board the focus after New Game from the bar, once the question closes", async () => {
    const { user } = await renderPlayed();
    await user.click(screen.getByRole("button", { name: "New Game" }));
    const question = await screen.findByRole("alertdialog");

    await user.click(
      within(question).getByRole("button", { name: "New game" }),
    );

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
    });
  });

  it("gives the board the focus after a level change, once the settings close", async () => {
    const { user } = await renderPlayed();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("radio", { name: /Medium/ }));
    const question = await screen.findByRole("alertdialog");
    await user.click(
      within(question).getByRole("button", { name: "New game" }),
    );

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
    });
  });

  it("stops the clock while How to play covers the board", async () => {
    const { user } = await renderPlayed();

    await user.click(screen.getByRole("button", { name: "How to play" }));

    expect(TestBed.inject(StopwatchService).running()).toBe(false);
  });

  it("takes back a move on Ctrl+Z, wherever the focus is", async () => {
    const { user, game } = await renderPlayed();

    await user.keyboard("{Control>}z{/Control}");

    expect(game.grid().digits[0]).toBe(0);
  });

  it("leaves Ctrl+Z to a dialog that is open", async () => {
    const { user, game } = await renderPlayed();
    void game.newGame();
    await screen.findByRole("alertdialog");

    await user.keyboard("{Control>}z{/Control}");

    expect(game.grid().digits[0]).toBe(6);
  });

  it("hands the focus to the selected square after a press on the pad", async () => {
    const { user } = await renderPlayed();

    await user.click(screen.getByRole("button", { name: "Erase" }));

    expect(
      await screen.findByRole("gridcell", { name: "Blank", selected: true }),
    ).toHaveFocus();
  });
});
