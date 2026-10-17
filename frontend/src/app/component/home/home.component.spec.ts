import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import { HomeComponent } from "./home.component";

describe("HomeComponent", () => {
  async function renderHome(q?: string): Promise<void> {
    await render(HomeComponent, {
      inputs: q === undefined ? {} : { q },
      providers: [provideRouter([])],
    });
  }

  function sectionNames(): string[] {
    return screen
      .queryAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent.trim());
  }

  it("shows every category", async () => {
    await renderHome();

    expect(sectionNames()).toEqual(["Solitaire", "Classics"]);
  });

  it("links each category to its full list", async () => {
    await renderHome();

    expect(
      screen
        .getAllByRole("link", { name: /^See all/ })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/category/solitaire", "/category/classics"]);
  });

  it("keeps only the sections with matches when searching", async () => {
    await renderHome("whitehead");

    expect(sectionNames()).toEqual(["Solitaire"]);
    const solitaire = screen.getByRole("region", { name: "Solitaire" });
    expect(
      within(solitaire).getByRole("link", { name: /^Klondike/ }),
    ).toBeInTheDocument();
  });

  it("counts the matches out of every game", async () => {
    await renderHome("whitehead");

    expect(screen.getByText("1 of 44 games")).toBeInTheDocument();
  });

  it("offers a way back when nothing matches", async () => {
    await renderHome("chess");

    expect(sectionNames()).toEqual([]);
    expect(screen.getByText("No games match “chess”.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Show all games" }),
    ).toHaveAttribute("href", "/");
  });
});
