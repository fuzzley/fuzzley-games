import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import type { Game } from "../../model/game";
import {
  TEST_CATALOG,
  provideTestCatalog,
  testGame,
} from "../../testing/catalog";
import { GameTileComponent } from "./game_tile.component";

describe("GameTileComponent", () => {
  async function renderTile(slug: string): Promise<void> {
    await renderGame(testGame(slug));
  }

  async function renderGame(game: Game): Promise<void> {
    await render(GameTileComponent, {
      inputs: { game },
      providers: [
        provideRouter([]),
        provideTestCatalog({ ...TEST_CATALOG, games: [game] }),
      ],
    });
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("links a hosted game to its page", async () => {
    await renderTile("klondike");

    expect(screen.getByRole("link", { name: /^Klondike/ })).toHaveAttribute(
      "href",
      "/games/klondike",
    );
  });

  it("links a hosted game straight to its build", async () => {
    await renderTile("klondike");

    expect(screen.getByRole("link", { name: "Play Klondike" })).toHaveAttribute(
      "href",
      "/play/solitaire/#/klondike",
    );
  });

  it("says who plays a game and for how long", async () => {
    await renderTile("reversi");

    expect(screen.getByText("2 players")).toBeInTheDocument();
    expect(screen.getByText("10 min")).toBeInTheDocument();
  });

  it("shows a game still to come with no link, and says so", async () => {
    await renderTile("reversi");

    expect(screen.queryAllByRole("link")).toEqual([]);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("badges a game added lately as new", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05"));

    await renderGame({ ...testGame("klondike"), added: "2026-11-02" });

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("gives a game the site opened with no badge", async () => {
    await renderTile("klondike");

    expect(screen.queryByText("New")).toBeNull();
  });
});
