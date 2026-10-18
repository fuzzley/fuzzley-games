import { render, screen } from "@testing-library/angular";
import { testGame } from "../../testing/catalog";
import { GameThumbComponent } from "./game_thumb.component";

describe("GameThumbComponent", () => {
  async function renderThumb(slug: string, eager?: boolean): Promise<void> {
    await render(GameThumbComponent, {
      inputs:
        eager === undefined
          ? { game: testGame(slug) }
          : { game: testGame(slug), eager },
    });
  }

  it("shows the screenshot of a game the site hosts", async () => {
    await renderThumb("klondike");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/play/solitaire/docs/screenshots/klondike/thumb.webp",
    );
  });

  it("shows the drawing of a game still to come", async () => {
    await renderThumb("reversi");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/thumbnails/reversi.svg",
    );
  });

  it("loads its picture once it nears the screen", async () => {
    await renderThumb("klondike");

    expect(screen.getByRole("presentation")).toHaveAttribute("loading", "lazy");
  });

  it("loads its picture at once when asked to", async () => {
    await renderThumb("klondike", true);

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "loading",
      "eager",
    );
  });
});
