import { render, screen } from "@testing-library/angular";
import { testGame } from "../../testing/catalog";
import { GameThumbComponent } from "./game_thumb.component";

describe("GameThumbComponent", () => {
  async function renderThumb(slug: string): Promise<HTMLElement> {
    const { container } = await render(GameThumbComponent, {
      inputs: { game: testGame(slug) },
    });
    return container;
  }

  it("shows the screenshot of a game the site hosts", async () => {
    await renderThumb("klondike");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/play/solitaire/docs/screenshots/klondike/thumb.webp",
    );
  });

  it("draws a game still to come", async () => {
    const container = await renderThumb("reversi");

    expect(screen.queryByRole("presentation")).toBeNull();
    expect(container.querySelectorAll("svg circle").length).toBeGreaterThan(0);
  });
});
