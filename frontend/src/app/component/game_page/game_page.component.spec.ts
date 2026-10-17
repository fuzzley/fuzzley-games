import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { provideTestCatalog } from "../../testing/catalog";
import { GamePageComponent } from "./game_page.component";

describe("GamePageComponent", () => {
  async function renderPage(slug: string): Promise<void> {
    await render(GamePageComponent, {
      inputs: { slug },
      providers: [provideRouter([]), provideTestCatalog()],
    });
  }

  it("opens a hosted game full-page, at its build's address", async () => {
    await renderPage("bakers-game");

    const links = screen.getAllByRole("link", { name: "Play Baker’s Game" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/play/solitaire/#/bakers",
      "/play/solitaire/#/bakers",
    ]);
  });

  it("shows a hosted game's screenshot", async () => {
    await renderPage("bakers-game");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/play/solitaire/docs/screenshots/bakers/preview.webp",
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
