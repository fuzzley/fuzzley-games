import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { findGame } from "../../provider/game_catalog";
import { GameTileComponent } from "./game_tile.component";

describe("GameTileComponent", () => {
  async function renderTile(slug: string): Promise<void> {
    await render(GameTileComponent, {
      inputs: { game: findGame(slug)! },
      providers: [provideRouter([])],
    });
  }

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

  it("shows a game still to come with no link, and says so", async () => {
    await renderTile("sudoku");

    expect(screen.queryAllByRole("link")).toEqual([]);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
