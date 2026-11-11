import {
  type RenderResult,
  fireEvent,
  render,
  screen,
} from "@testing-library/angular";
import { testGame } from "../../testing/catalog";
import { GameThumbComponent } from "./game_thumb.component";

describe("GameThumbComponent", () => {
  async function renderThumb(
    slug: string,
    eager?: boolean,
  ): Promise<RenderResult<GameThumbComponent>> {
    return render(GameThumbComponent, {
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

  it("leaves its frame bare when its picture fails to load", async () => {
    await renderThumb("klondike");

    fireEvent.error(screen.getByRole("presentation"));

    expect(screen.queryByRole("presentation")).toBeNull();
  });

  it("shows the next game's picture after one failed to load", async () => {
    const { rerender } = await renderThumb("klondike");
    fireEvent.error(screen.getByRole("presentation"));

    await rerender({ inputs: { game: testGame("reversi") } });

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
