import { TestBed } from "@angular/core/testing";
import { RouterTestingHarness } from "@angular/router/testing";
import { screen } from "@testing-library/angular";
import { appConfig } from "./app.config";
import { provideTestCatalog } from "./testing/catalog";

describe("routes", () => {
  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideTestCatalog()],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
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
});
