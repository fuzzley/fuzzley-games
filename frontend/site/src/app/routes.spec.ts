import { TestBed } from "@angular/core/testing";
import { RouterTestingHarness } from "@angular/router/testing";
import { screen } from "@testing-library/angular";
import { appConfig } from "./app.config";
import { provideTestCatalog } from "./testing/catalog";

describe("routes", () => {
  beforeEach(() => {
    document.querySelector('link[rel="canonical"]')?.remove();
  });

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideTestCatalog()],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
  }

  function canonicalAddress(): string | undefined {
    return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.href;
  }

  it("titles the home page with the site's name alone", async () => {
    await open("/");

    expect(document.title).toBe("Fuzzley Games");
  });

  it("shows a game's page at its slug, titled after it", async () => {
    await open("/games/klondike");

    expect(
      screen.getByRole("heading", { level: 1, name: "Klondike" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Klondike – Fuzzley Games");
  });

  it("titles an unknown game's address as not found", async () => {
    await open("/games/hearts");

    expect(document.title).toBe("Game not found – Fuzzley Games");
  });

  it("names a game's page as its canonical address", async () => {
    await open("/games/klondike");

    expect(canonicalAddress()).toBe("https://fuzzley.games/games/klondike");
  });

  it("names no canonical address for an unknown game", async () => {
    await open("/games/hearts");

    expect(canonicalAddress()).toBeUndefined();
  });

  it("shows a category's page at its id, titled after it", async () => {
    await open("/category/classics");

    expect(
      screen.getByRole("heading", { level: 1, name: "Classics" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Classics – Fuzzley Games");
  });

  it("titles an unknown category's address as not found", async () => {
    await open("/category/cards");

    expect(document.title).toBe("Category not found – Fuzzley Games");
  });

  it("says there's no page at any other address", async () => {
    await open("/no/such/page");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "There’s no page at this address.",
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Page not found – Fuzzley Games");
  });
});
