import { TestBed } from "@angular/core/testing";
import { fuzzballSvg } from "@fz/style/fuzzball";
import { DEFAULT_THEMES, THEMES, THEME_STORAGE_KEY } from "@fz/style/themes";
import { BROWSER_STORAGE } from "../storage";
import {
  type FakeViewport,
  MemoryStorage,
  installFakeViewport,
  provideMemoryStorage,
} from "../testing";
import { THEME_COLOR_ROLE, ThemeService } from "./theme.service";

/** A store that refuses every write, as a full one does. */
class FullStorage extends MemoryStorage {
  override setItem(): void {
    throw new DOMException("full", "QuotaExceededError");
  }
}

describe("ThemeService", () => {
  let viewport: FakeViewport | null = null;
  let memory: MemoryStorage;

  beforeEach(() => {
    memory = new MemoryStorage();
    document.documentElement.dataset["theme"] = "pastel";
  });

  afterEach(() => {
    viewport?.restore();
    viewport = null;
    document.head.querySelector("#palette")?.remove();
    document.head.querySelector('meta[name="theme-color"]')?.remove();
    for (const icon of document.head.querySelectorAll('link[rel="icon"]')) {
      icon.remove();
    }
  });

  /** Returns the service, over the given store, or one in memory. */
  function service(storage?: Storage | null): ThemeService {
    TestBed.configureTestingModule({
      providers: [
        storage === undefined
          ? provideMemoryStorage(memory)
          : { provide: BROWSER_STORAGE, useValue: storage },
      ],
    });
    return TestBed.inject(ThemeService);
  }

  /** Reports a write to the shared store, as the browser does from another tab. */
  function writeFromAnotherTab(key: string, value: string): void {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
  }

  /** Adds a palette's bar and felt colors, and the browser's theme-color tag. */
  function addPaletteAndToolbarTag(): void {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="palette">[data-theme="midnight"] { --fz-bar: #0e1a2b; --fz-felt: #17605a; }</style>' +
        '<meta name="theme-color" content="#ffffff">',
    );
  }

  /** Adds a palette's accent, and the tab's icon if asked. */
  function addAccent({ withIcon }: { withIcon: boolean }): void {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="palette">[data-theme="midnight"] { --fz-accent: #4cc3ff; }</style>' +
        (withIcon
          ? '<link rel="icon" href="favicon.ico" sizes="32x32">' +
            '<link rel="icon" type="image/svg+xml" href="favicon.svg">'
          : ""),
    );
  }

  /** Adds the bar and felt colors of the palette the page starts in, and of midnight. */
  function addTwoPalettes(): void {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="palette">' +
        '[data-theme="pastel"] { --fz-bar: #f7eef5; --fz-felt: #b8dccb; }' +
        '[data-theme="midnight"] { --fz-bar: #0e1a2b; --fz-felt: #17605a; }' +
        "</style>",
    );
  }

  /** Gives every palette the same accent. */
  function addSharedAccent(): void {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<style id="palette">[data-theme] { --fz-accent: #4cc3ff; }</style>',
    );
  }

  it("starts from the palette theme.js already chose", () => {
    expect(service().current()).toBe("pastel");
  });

  it("falls back to the light default when the page has no valid palette", () => {
    document.documentElement.dataset["theme"] = "neon";

    expect(service().current()).toBe(DEFAULT_THEMES.light);
  });

  it("falls back to the dark default on a system that prefers a dark scheme", () => {
    document.documentElement.dataset["theme"] = "neon";
    viewport = installFakeViewport(1280);
    viewport.setColorScheme("dark");

    expect(service().current()).toBe(DEFAULT_THEMES.dark);
  });

  it("applies a chosen palette to the page", () => {
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.documentElement.dataset["theme"]).toBe("midnight");
  });

  it("offers every palette, the one in use checked", () => {
    const theme = service();

    theme.select("midnight");

    expect(theme.options().map(({ id, checked }) => ({ id, checked }))).toEqual(
      THEMES.map(({ id }) => ({ id, checked: id === "midnight" })),
    );
  });

  it.each([
    ["classic", "Light"],
    ["casino", "Dark"],
  ])("names %s's mode %s", (id, modeName) => {
    const option = service()
      .options()
      .find((each) => each.id === id);

    expect(option?.modeName).toBe(modeName);
  });

  it("remembers a chosen palette", () => {
    service().select("midnight");

    expect(memory.getItem(THEME_STORAGE_KEY)).toBe("midnight");
  });

  it("still applies a palette the browser won't store", () => {
    const theme = service(new FullStorage());

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

  it("colors the browser's own toolbar to match the palette's bar", () => {
    addPaletteAndToolbarTag();
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#0e1a2b",
    );
  });

  it("colors the toolbar from the role an app names instead", () => {
    addPaletteAndToolbarTag();
    TestBed.configureTestingModule({
      providers: [{ provide: THEME_COLOR_ROLE, useValue: "felt" }],
    });
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#17605a",
    );
  });

  it("leaves the toolbar alone for an app that colors it itself", () => {
    addPaletteAndToolbarTag();
    TestBed.configureTestingModule({
      providers: [{ provide: THEME_COLOR_ROLE, useValue: null }],
    });
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#ffffff",
    );
  });

  it("draws the tab's icon in the palette's accent", () => {
    addAccent({ withIcon: true });
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    const href = document
      .querySelector('link[rel="icon"][type="image/svg+xml"]')
      ?.getAttribute("href");
    expect(decodeURIComponent(href ?? "")).toBe(
      `data:image/svg+xml,${fuzzballSvg("#4cc3ff")}`,
    );
  });

  it("leaves the icon for what draws no SVG as it is", () => {
    addAccent({ withIcon: true });
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.querySelector('link[href="favicon.ico"]')).not.toBeNull();
  });

  it("adds no tab icon to a page that links none", () => {
    addAccent({ withIcon: false });
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(document.querySelector('link[rel="icon"]')).toBeNull();
  });

  it("follows the palette in use in a role's color, once it is on the page", () => {
    addTwoPalettes();
    const theme = service();
    const felt = theme.role("felt");

    theme.select("midnight");
    const beforeApplied = felt();
    TestBed.tick();

    expect(beforeApplied).toBe("#b8dccb");
    expect(felt()).toBe("#17605a");
  });

  it("follows the palette in use in the colors of the roles a record names, under its keys, once it is on the page", () => {
    addTwoPalettes();
    const theme = service();
    const colors = theme.roles({ top: "bar", table: "felt" });

    theme.select("midnight");
    const beforeApplied = colors();
    TestBed.tick();

    expect(beforeApplied).toEqual({ top: "#f7eef5", table: "#b8dccb" });
    expect(colors()).toEqual({ top: "#0e1a2b", table: "#17605a" });
  });

  it("keeps the record of the roles' colors while a new palette leaves them as they were", () => {
    addSharedAccent();
    const theme = service();
    const colors = theme.roles({ accent: "accent" });
    const before = colors();

    theme.select("midnight");
    TestBed.tick();

    expect(colors()).toBe(before);
  });

  it("says a dark palette on the page is dark", () => {
    const theme = service();

    theme.select("midnight");
    TestBed.tick();

    expect(theme.mode()).toBe("dark");
  });

  it("says a light palette on the page is light", () => {
    document.documentElement.dataset["theme"] = "midnight";
    const theme = service();

    theme.select("classic");
    TestBed.tick();

    expect(theme.mode()).toBe("light");
  });

  it("keeps the mode of the palette on the page until the new one is applied", () => {
    const theme = service();

    theme.select("midnight");

    expect(theme.mode()).toBe("light");
  });

  it("reads a role no stylesheet sets as empty", () => {
    expect(service().role("felt")()).toBe("");
  });

  it("reads the roles no stylesheet sets as empty, under their keys", () => {
    expect(service().roles({ table: "felt" })()).toEqual({ table: "" });
  });

  it("takes up a palette chosen in another tab", () => {
    const theme = service();

    writeFromAnotherTab(THEME_STORAGE_KEY, "midnight");
    TestBed.tick();

    expect(theme.current()).toBe("midnight");
    expect(document.documentElement.dataset["theme"]).toBe("midnight");
  });

  it("ignores another tab's writes to anything else", () => {
    const theme = service();

    writeFromAnotherTab("fsolitaire-presentation", "midnight");

    expect(theme.current()).toBe("pastel");
  });

  it("ignores another tab's write that names no palette", () => {
    const theme = service();

    writeFromAnotherTab(THEME_STORAGE_KEY, "neon");

    expect(theme.current()).toBe("pastel");
  });

  it("stops following other tabs once the app is gone", () => {
    const theme = service();
    TestBed.resetTestingModule();

    writeFromAnotherTab(THEME_STORAGE_KEY, "midnight");

    expect(theme.current()).toBe("pastel");
  });
});
