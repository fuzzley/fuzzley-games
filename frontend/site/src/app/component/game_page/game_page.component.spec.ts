import { provideRouter } from "@angular/router";
import {
  type RenderResult,
  fireEvent,
  render,
  screen,
} from "@testing-library/angular";
import type { Game } from "../../model/game";
import {
  TEST_CATALOG,
  provideTestCatalog,
  testGame,
} from "../../testing/catalog";
import { GamePageComponent } from "./game_page.component";

describe("GamePageComponent", () => {
  async function renderPage(
    slug: string,
  ): Promise<RenderResult<GamePageComponent>> {
    return render(GamePageComponent, {
      inputs: { slug },
      providers: [provideRouter([]), provideTestCatalog()],
    });
  }

  async function renderGame(game: Game): Promise<void> {
    await render(GamePageComponent, {
      inputs: { slug: game.slug },
      providers: [
        provideRouter([]),
        provideTestCatalog({ ...TEST_CATALOG, games: [game] }),
      ],
    });
  }

  it("opens a hosted game full-page, at its build's address", async () => {
    await renderPage("bakers-game");

    expect(
      screen.getByRole("link", { name: "Play Baker’s Game" }),
    ).toHaveAttribute("href", "/play/solitaire/#/bakers");
  });

  it("opens it from its screenshot too, for the pointer only", async () => {
    await renderPage("bakers-game");

    const stage = screen
      .getByRole("presentation", { hidden: true })
      .closest("a");
    expect(stage).toHaveAttribute("href", "/play/solitaire/#/bakers");
    expect(stage).toHaveAttribute("tabindex", "-1");
    expect(stage).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a hosted game's screenshot", async () => {
    await renderPage("bakers-game");

    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "/play/solitaire/docs/screenshots/bakers/preview.webp",
    );
  });

  it("leaves the stage and its Play button when the screenshot fails to load", async () => {
    await renderPage("bakers-game");
    const screenshot = screen.getByRole("presentation", { hidden: true });
    const stage = screenshot.closest("a");

    fireEvent.error(screenshot);

    expect(screenshot).not.toBeInTheDocument();
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveTextContent("Play Baker’s Game");
  });

  it("shows the next game's screenshot after one failed to load", async () => {
    const { rerender } = await renderPage("bakers-game");
    fireEvent.error(screen.getByRole("presentation", { hidden: true }));

    await rerender({ inputs: { slug: "minesweeper" } });

    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "/play/minesweeper/docs/screenshots/minesweeper/preview.webp",
    );
  });

  it("links back to the game's category", async () => {
    await renderPage("bakers-game");

    expect(screen.getByRole("link", { name: "Solitaire" })).toHaveAttribute(
      "href",
      "/category/solitaire",
    );
  });

  it("says who plays a game and for how long", async () => {
    await renderPage("reversi");

    expect(
      screen.getByText("2 players, about 10 min a game"),
    ).toBeInTheDocument();
  });

  it("says a game is coming soon, with no way to play it", async () => {
    await renderPage("reversi");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Reversi Coming soon",
    );
    expect(screen.queryByRole("link", { name: /^Play/ })).toBeNull();
  });

  it("says a game is still in development, and opens it all the same", async () => {
    await renderGame({ ...testGame("minesweeper"), inDevelopment: true });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Minesweeper In development",
    );
    expect(
      screen.getByText(
        "Minesweeper is still in development: it plays, but it may change as it’s finished.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Play Minesweeper" }),
    ).toHaveAttribute("href", "/play/minesweeper/");
  });

  it("says nothing of development for a finished game", async () => {
    await renderPage("bakers-game");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /^Baker’s Game$/,
    );
    expect(screen.queryByText(/still in development/)).toBeNull();
  });

  it("says when there's no game at the address", async () => {
    await renderPage("hearts");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "There’s no game at this address.",
      }),
    ).toBeInTheDocument();
  });
});
