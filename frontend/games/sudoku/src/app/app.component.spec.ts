import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../testing/game";
import { squareAt } from "../testing/grid_picture";
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
