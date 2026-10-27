import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type GameOptions, playOn } from "../../testing/game";
import { solvedBut } from "../../testing/grid_picture";
import { GameService } from "../play/game.service";
import { ResultComponent } from "./result.component";

/**
 * Renders the card, then solves `EASY` 1:35 in by its last square, waits
 * for the card to open, and returns the user.
 */
async function renderSolved(
  options: GameOptions = {},
): Promise<{ user: UserEvent }> {
  await render(ResultComponent);
  const game = playOn({ digits: solvedBut("r1c1"), seconds: 95, ...options });
  game.select(0);
  game.enter(6);
  await screen.findByRole("alertdialog");
  return { user: userEvent.setup() };
}

/** Returns the value a figure on the card gives, by its term. */
function figure(term: string): string {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  return name?.nextElementSibling?.textContent.trim() ?? "";
}

describe("ResultComponent", () => {
  it("opens over a solved puzzle", async () => {
    await renderSolved();

    expect(
      screen.getByRole("alertdialog", { name: "Solved!" }),
    ).toHaveAccessibleDescription("Easy");
  });

  it("shows the time, the best time and the puzzles solved", async () => {
    await renderSolved();

    expect(figure("Time")).toBe("1:35");
    expect(figure("Best")).toBe("1:35");
    expect(figure("Solved")).toBe("1 of 1");
  });

  it("says when the time is a new best", async () => {
    await renderSolved();

    expect(screen.getByText("New best time")).toBeInTheDocument();
  });

  it("shows the hints used in place of the best time, and why", async () => {
    await renderSolved({ hints: 2 });

    expect(figure("Hints")).toBe("2");
    expect(
      screen.getByText("Solved with 2 hints, so no best time."),
    ).toBeInTheDocument();
    expect(screen.queryByText("New best time")).not.toBeInTheDocument();
  });

  it("opens on New Game", async () => {
    await renderSolved();

    expect(screen.getByRole("button", { name: "New Game" })).toHaveFocus();
  });

  it("deals a new puzzle from New Game, and closes", async () => {
    const { user } = await renderSolved();

    await user.click(screen.getByRole("button", { name: "New Game" }));

    expect(TestBed.inject(GameService).grid().outcome).toBe("playing");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes, leaving the solved board to look at", async () => {
    const { user } = await renderSolved();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(TestBed.inject(GameService).grid().outcome).toBe("solved");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("stays shut while the game is under way", async () => {
    const { fixture } = await render(ResultComponent);

    playOn();
    await fixture.whenStable();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
