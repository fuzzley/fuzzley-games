import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AnnouncerService } from "@fz/ui/announcer";
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

    expect(screen.getByText("1 of 4 games")).toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    await renderHome("chess");

    expect(sectionNames()).toEqual([]);
    expect(screen.getByText("No games match.")).toBeInTheDocument();
  });

  it("offers a way back when nothing matches", async () => {
    await renderHome("chess");

    expect(
      screen.getByRole("link", { name: "Show all games" }),
    ).toHaveAttribute("href", "/");
  });

  describe("what it announces", () => {
    function announced(): string {
      return TestBed.inject(AnnouncerService).message();
    }

    it("announces what a search found", async () => {
      await renderHome("whitehead");

      expect(announced()).toBe("1 of 4 games");
    });

    it("announces each new search", async () => {
      const { fixture } = await renderHome();

      fixture.componentRef.setInput("q", "chess");
      await fixture.whenStable();

      expect(announced()).toBe("No games match.");
    });

    it("falls silent once the search is cleared", async () => {
      const { fixture } = await renderHome("whitehead");

      fixture.componentRef.setInput("q", "");
      await fixture.whenStable();

      expect(announced()).toBe("");
    });

    it("leaves nothing for the next page to say", async () => {
      const { fixture } = await renderHome("whitehead");

      fixture.destroy();

      expect(announced()).toBe("");
    });
  });
});
