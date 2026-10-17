import { render, screen } from "@testing-library/angular";
import { findGame } from "../../provider/game_catalog";
import { GameThumbComponent } from "./game_thumb.component";

describe("GameThumbComponent", () => {
  async function renderThumb(slug: string): Promise<HTMLElement> {
    const { container } = await render(GameThumbComponent, {
      inputs: { game: findGame(slug)! },
    });
    return container;
  }

  it("shows the screenshot of a game the site hosts", async () => {
    await renderThumb("spider");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/play/solitaire/docs/screenshots/spider/thumb.webp",
    );
  });

  it("draws a game still to come", async () => {
    const container = await renderThumb("sudoku");

    expect(screen.queryByRole("presentation")).toBeNull();
    expect(container.querySelectorAll("svg line").length).toBeGreaterThan(0);
  });
});
