import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { Direction } from "../../rules/geometry";
import { endedGame, provideSeededRuns, wonGame } from "../../testing/play";
import type { GameService } from "../play/game.service";
import { ResultComponent } from "./result.component";

/**
 * Renders the card, then plays a run one way to its end, each run from the
 * same seed, and waits for the card to open: at once, as jsdom asks for no
 * motion.
 */
async function renderEnded(
  play: () => GameService = () => endedGame(),
): Promise<{ user: UserEvent; game: GameService }> {
  await render(ResultComponent, { providers: [provideSeededRuns()] });
  const game = play();
  game.tick(16);
  await screen.findByRole("alertdialog");
  return { user: userEvent.setup(), game };
}

/** Returns a run played one way to its end. */
function endedBy(direction: Direction): () => GameService {
  return () => endedGame(direction);
}

/** Returns the value a figure on the card gives, by its term. */
function figure(term: string): string {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  return name?.nextElementSibling?.textContent.trim() ?? "";
}

describe("ResultComponent", () => {
  it("opens over a run that crashed, saying why", async () => {
    await renderEnded();

    expect(
      screen.getByRole("alertdialog", { name: "Game over" }),
    ).toHaveAccessibleDescription("Ran into the wall, at Normal speed");
  });

  it("shows the score, the best and the snake's length", async () => {
    await renderEnded(endedBy("right"));

    expect([figure("Score"), figure("Best"), figure("Length")]).toEqual([
      "1",
      "1",
      "4",
    ]);
  });

  it("says when the run set a new best", async () => {
    await renderEnded(endedBy("right"));

    expect(screen.getByText("New best")).toBeInTheDocument();
  });

  it("says nothing of a best a run didn't beat", async () => {
    await renderEnded();

    expect(screen.queryByText("New best")).not.toBeInTheDocument();
  });

  it("opens over a run that filled the board", async () => {
    await renderEnded(wonGame);

    expect(
      screen.getByRole("alertdialog", { name: "You filled the board!" }),
    ).toHaveAccessibleDescription("Every square filled, at Normal speed");
  });

  it("opens on New Game, which starts a new run", async () => {
    const { user, game } = await renderEnded();

    await user.keyboard("{Enter}");

    expect(game.outcome()).toBe("ready");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("starts a run at another speed", async () => {
    const { user, game } = await renderEnded();

    await user.click(screen.getByRole("button", { name: "Fast" }));

    expect(game.run()).toMatchObject({ speed: "fast", outcome: "ready" });
  });

  it("puts itself away at Close, leaving the board as it was", async () => {
    const { user, game } = await renderEnded();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(game.resultOpen()).toBe(false);
    expect(game.outcome()).toBe("over");
  });
});
