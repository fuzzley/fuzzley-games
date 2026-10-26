import { provideRouter } from "@angular/router";
import { type RenderResult, render, screen } from "@testing-library/angular";
import { provideTestCatalog } from "../../testing/catalog";
import { NotFoundComponent } from "./not_found.component";

describe("NotFoundComponent", () => {
  beforeEach(() => {
    document.querySelector('link[rel="canonical"]')?.remove();
  });

  function renderPage(
    kind?: "page" | "game" | "category",
  ): Promise<RenderResult<NotFoundComponent>> {
    return render(NotFoundComponent, {
      inputs: kind ? { kind } : {},
      providers: [provideRouter([]), provideTestCatalog()],
    });
  }

  function robots(): string | null | undefined {
    return document
      .querySelector('meta[name="robots"]')
      ?.getAttribute("content");
  }

  function canonical(): string | undefined {
    return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.href;
  }

  it("says there's no page at the address", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "There’s no page at this address.",
      }),
    ).toBeInTheDocument();
  });

  it("says what kind of thing the address was meant to show", async () => {
    await renderPage("category");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "There’s no category at this address.",
      }),
    ).toBeInTheDocument();
  });

  it("offers every category instead", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "Classics" })).toHaveAttribute(
      "href",
      "/category/classics",
    );
  });

  it("offers every game instead", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "See all games" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("asks search engines not to index the address", async () => {
    await renderPage();

    expect(robots()).toBe("noindex");
  });

  it("withdraws that once the page is gone", async () => {
    const { fixture } = await renderPage();

    fixture.destroy();

    expect(robots()).toBeUndefined();
  });

  it("names no canonical address", async () => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://fuzzley.games/no/such/page";
    document.head.append(link);

    await renderPage();

    expect(canonical()).toBeUndefined();
  });

  it("names the address again once the page is gone", async () => {
    const { fixture } = await renderPage();

    fixture.destroy();

    expect(canonical()).toBe("https://fuzzley.games/");
  });
});
