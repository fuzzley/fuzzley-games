import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { CanonicalLink } from "./canonical_link.service";

@Component({ template: "" })
class BlankPage {}

describe("CanonicalLink", () => {
  beforeEach(() => {
    document.querySelector('link[rel="canonical"]')?.remove();
  });

  async function open(
    url: string,
  ): Promise<{ canonicalLink: CanonicalLink; harness: RouterTestingHarness }> {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: "**", component: BlankPage }])],
    });
    const canonicalLink = TestBed.inject(CanonicalLink);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return { canonicalLink, harness };
  }

  function canonical(): string | undefined {
    return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.href;
  }

  it("names the page's address on the site", async () => {
    await open("/games/klondike");

    expect(canonical()).toBe("https://fuzzley.games/games/klondike");
  });

  it("leaves the search out of the address", async () => {
    await open("/?q=spider");

    expect(canonical()).toBe("https://fuzzley.games/");
  });

  it("keeps one link as the page changes", async () => {
    const { harness } = await open("/games/klondike");

    await harness.navigateByUrl("/category/classics");

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(canonical()).toBe("https://fuzzley.games/category/classics");
  });

  it("withholds the link while a page asks it to", async () => {
    const { canonicalLink } = await open("/games/klondike");

    canonicalLink.withhold();

    expect(canonical()).toBeUndefined();
  });

  it("keeps withholding it on the next page", async () => {
    const { canonicalLink, harness } = await open("/games/klondike");
    canonicalLink.withhold();

    await harness.navigateByUrl("/category/classics");

    expect(canonical()).toBeUndefined();
  });

  it("puts the link back once the page lets go", async () => {
    const { canonicalLink } = await open("/games/klondike");
    const restore = canonicalLink.withhold();

    restore();

    expect(canonical()).toBe("https://fuzzley.games/games/klondike");
  });

  it("withholds the link until every page lets go", async () => {
    const { canonicalLink } = await open("/games/klondike");
    const restoreFirst = canonicalLink.withhold();
    canonicalLink.withhold();

    restoreFirst();

    expect(canonical()).toBeUndefined();
  });
});
