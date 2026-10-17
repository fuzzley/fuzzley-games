import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import { provideTestCatalog } from "../../testing/catalog";
import { CategoryComponent } from "./category.component";

describe("CategoryComponent", () => {
  async function renderCategory(id: string): Promise<void> {
    await render(CategoryComponent, {
      inputs: { id },
      providers: [provideRouter([]), provideTestCatalog()],
    });
  }

  it("names the category and says what it holds", async () => {
    await renderCategory("classics");

    expect(
      screen.getByRole("heading", { level: 1, name: "Classics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Puzzles and board games beyond cards."),
    ).toBeInTheDocument();
  });

  it("lists every game in the category, in order", async () => {
    await renderCategory("classics");

    expect(
      screen
        .getAllByRole("link", { name: /^(Minesweeper|Reversi)/ })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/games/minesweeper"]);
    expect(screen.getByText("Reversi")).toBeInTheDocument();
  });

  it("counts its games", async () => {
    await renderCategory("solitaire");

    expect(screen.getByText("2 games")).toBeInTheDocument();
  });

  it("links back to every game", async () => {
    await renderCategory("solitaire");

    expect(screen.getByRole("link", { name: "All games" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("says when there's no category at the address", async () => {
    await renderCategory("cards");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "There’s no category at this address.",
      }),
    ).toBeInTheDocument();
  });
});
