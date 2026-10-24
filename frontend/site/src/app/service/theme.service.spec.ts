import { TestBed } from "@angular/core/testing";
import { THEME_STORAGE_KEY } from "@fz/style/themes";
import { BROWSER_STORAGE } from "./browser_storage";
import { ThemeService } from "./theme.service";

describe("ThemeService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset["theme"] = "pastel";
  });

  afterEach(() => {
    document.head.querySelector("#palette")?.remove();
    document.head.querySelector('meta[name="theme-color"]')?.remove();
  });

  /** Returns the service, with the browser's storage replaced if given. */
  function service(storage?: Storage | null): ThemeService {
    if (storage !== undefined) {
      TestBed.configureTestingModule({
        providers: [{ provide: BROWSER_STORAGE, useValue: storage }],
      });
    }
    return TestBed.inject(ThemeService);
  }

  /** Returns a store that refuses every write, as a full one does. */
  function fullStorage(): Storage {
    const storage = Object.create(localStorage) as Storage;
    storage.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    return storage;
  }

  it("starts from the palette theme.js already chose", () => {
    expect(service().current()).toBe("pastel");
  });

  it("falls back to the light default when the page has no valid palette", () => {
    document.documentElement.dataset["theme"] = "neon";

    expect(service().current()).toBe("classic");
  });

  it("applies a chosen palette to the page", () => {
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.documentElement.dataset["theme"]).toBe("midnight");
  });

  it("remembers a chosen palette", () => {
    service().select("midnight");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("midnight");
  });

  it("still applies a palette the browser won't store", () => {
    const theme = service(fullStorage());

    theme.select("casino");
    TestBed.tick();

    expect(document.documentElement.dataset["theme"]).toBe("casino");
  });

  it("still applies a palette where there is no storage at all", () => {
    const theme = service(null);

    theme.select("casino");
    TestBed.tick();

    expect(document.documentElement.dataset["theme"]).toBe("casino");
  });

  it("colors the browser's own bar to match the palette's", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="palette">[data-theme="midnight"] { --fz-bar: #0e1a2b; }</style>' +
        '<meta name="theme-color" content="#ffffff">',
    );
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#0e1a2b",
    );
  });
});
