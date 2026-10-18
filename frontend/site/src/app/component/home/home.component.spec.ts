import { provideRouter } from "@angular/router";
import {
  type RenderResult,
  render,
  screen,
  within,
} from "@testing-library/angular";
import { provideTestCatalog } from "../../testing/catalog";
import { HomeComponent } from "./home.component";

describe("HomeComponent", () => {
  function renderHome(q?: string): Promise<RenderResult<HomeComponent>> {
    return render(HomeComponent, {
      inputs: q === undefined ? {} : { q },
      providers: [provideRouter([]), provideTestCatalog()],
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

  it("counts each section's games", async () => {
    await renderHome();

    expect(screen.getAllByText("2 games")).toHaveLength(2);
  });

  it("counts a section of one game as one game", async () => {
    await renderHome("whitehead");

    expect(screen.getByText("1 game")).toBeInTheDocument();
  });

  it("names the search it shows results for", async () => {
    await renderHome("whitehead");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Results for “whitehead”",
      }),
    ).toBeInTheDocument();
  });

  it("counts the matches out of every game", async () => {
    await renderHome("whitehead");

    expect(screen.getByRole("status")).toHaveTextContent("1 of 4 games");
  });

  it("says when nothing matches", async () => {
    await renderHome("chess");

    expect(sectionNames()).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("No games match.");
  });

  it("offers a way back when nothing matches", async () => {
    await renderHome("chess");

    expect(
      screen.getByRole("link", { name: "Show all games" }),
    ).toHaveAttribute("href", "/");
  });

  it("announces a search from a status already in the page", async () => {
    const { fixture } = await renderHome();
    const status = screen.getByRole("status");

    fixture.componentRef.setInput("q", "whitehead");
    await fixture.whenStable();

    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("1 of 4 games");
  });
});
