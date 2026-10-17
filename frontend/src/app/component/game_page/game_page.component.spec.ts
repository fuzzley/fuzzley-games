import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { GamePageComponent } from "./game_page.component";

describe("GamePageComponent", () => {
  async function renderPage(slug: string): Promise<void> {
    await render(GamePageComponent, {
      inputs: { slug },
      providers: [provideRouter([])],
    });
  }

  it("opens a hosted game full-page, at its build's address", async () => {
    await renderPage("bakers-dozen");

    const links = screen.getAllByRole("link", { name: "Play Baker’s Dozen" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/play/solitaire/#/bakersdozen",
      "/play/solitaire/#/bakersdozen",
    ]);
  });

  it("shows a hosted game's screenshot", async () => {
    await renderPage("bakers-dozen");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "/play/solitaire/docs/screenshots/bakersdozen/preview.webp",
    );
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
