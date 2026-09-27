// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameBrowserComponent } from "@/ui/app/component/game_browser/game_browser.component";
import { GameBrowserService } from "@/ui/app/service/game_browser.service";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import type { MockGameModelOverrides } from "@test/support/ui/game_mock";
import {
  installFakeViewport,
  type FakeViewport,
} from "@test/support/ui/viewport";
import { query, queryAll, queryRequired, queryText } from "@test/support/dom";
import { isDialogOpen, pressEscape } from "@test/support/dialog";
import { flushMicrotasks } from "@test/support/async";

/** A width with room for the list and the preview side by side. */
const WIDE = 1280;

/** A phone's width, which shows the list and the preview one at a time. */
const NARROW = 390;

describe("GameBrowserComponent", () => {
  let fixture: ComponentFixture<GameBrowserComponent>;
  let harness: UiHarness;
  let browser: GameBrowserService;
  let viewport: FakeViewport;

  // jsdom lays nothing out, so it has no scrolling to do.
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  afterAll(() => {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  });

  afterEach(() => {
    viewport.restore();
  });

  /** Builds the browser at a width, over a game in the given state. */
  async function build(
    width = WIDE,
    game: MockGameModelOverrides = {},
  ): Promise<void> {
    viewport = installFakeViewport(width);
    harness = await configureUiTestBed(GameBrowserComponent, game);
    fixture = TestBed.createComponent(GameBrowserComponent);
    browser = TestBed.inject(GameBrowserService);
    fixture.detectChanges();
  }

  /** Opens the browser and renders it. */
  function open(): void {
    browser.open();
    fixture.detectChanges();
  }

  /** Returns the search field. */
  function searchField(): HTMLInputElement {
    return queryRequired<HTMLInputElement>(fixture, ".search-input");
  }

  /** Types into the search field, replacing what was there. */
  function type(text: string): void {
    const field = searchField();
    field.value = text;
    field.dispatchEvent(new Event("input"));
    fixture.detectChanges();
  }

  /** Presses a key in the search field. */
  function press(key: string): void {
    searchField().dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
  }

  /** Returns the listed games' names, as a screen reader hears them. */
  function listed(): string[] {
    return queryAll(fixture, '[role="option"]').map(
      (row) => row.getAttribute("aria-label") ?? "",
    );
  }

  /** Returns the row the search field points at, by its accessible name. */
  function active(): string | null {
    const id = searchField().getAttribute("aria-activedescendant");
    return id
      ? (query(fixture, `#${id}`)?.getAttribute("aria-label") ?? null)
      : null;
  }

  /** Returns the row whose accessible name starts with the given name. */
  function row(name: string): HTMLElement {
    const found = queryAll(fixture, '[role="option"]').find((r) =>
      r.getAttribute("aria-label")?.startsWith(name),
    );
    if (!found) throw new Error(`No row is named ${name}.`);
    return found;
  }

  /** Clicks a filter chip by its label. */
  function chip(label: string): HTMLButtonElement {
    const found = queryAll<HTMLButtonElement>(fixture, ".chip").find(
      (c) => c.textContent?.trim() === label,
    );
    if (!found) throw new Error(`No filter is labelled ${label}.`);
    return found;
  }

  /** Returns a choice of a rule in the preview, by its label. */
  function segment(label: string): HTMLElement {
    const found = queryAll(fixture, ".segment-btn").find(
      (b) => b.textContent?.trim() === label,
    );
    if (!found) throw new Error(`No choice is labelled ${label}.`);
    return found;
  }

  /** Clicks something and lets the action it starts finish. */
  async function click(element: HTMLElement): Promise<void> {
    element.click();
    await flushMicrotasks();
    fixture.detectChanges();
  }

  describe("opening", () => {
    beforeEach(() => build());

    it("stays closed until opened", () => {
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("puts focus in the search field", () => {
      open();

      expect(document.activeElement).toBe(searchField());
    });

    it("lists every game, family by family", () => {
      open();

      const headings = queryAll(fixture, ".section-heading").map((h) =>
        h.textContent?.trim(),
      );

      expect(headings).toEqual(["Test builders", "Test cells"]);
    });

    it("says the search covers every game", () => {
      open();

      expect(searchField().placeholder).toBe("Search 3 games");
    });

    it("starts on the game on the table", () => {
      open();

      expect(active()).toBe("Klondike, Easy–Medium, playing now");
    });

    it("shows the game on the table in the preview", () => {
      open();

      expect(queryText(fixture, ".title")).toBe("Klondike");
    });

    it("clears a search left from before", () => {
      open();
      type("free");
      browser.close();
      fixture.detectChanges();

      open();

      expect(searchField().value).toBe("");
    });
  });

  describe("searching", () => {
    beforeEach(async () => {
      await build();
      open();
    });

    it("narrows the list to the matches", () => {
      type("free");

      expect(listed()).toEqual(["FreeCell, Hard, 2 decks"]);
    });

    it("points the search field at the best match", () => {
      type("free");

      expect(active()).toBe("FreeCell, Hard, 2 decks");
    });

    it("marks where the name matched", () => {
      type("cell");

      expect(queryText(fixture, ".row-name mark")).toBe("Cell");
    });

    it("moves down the list with the arrow keys", () => {
      press("ArrowDown");

      expect(active()).toBe("Test Nearly Won, variant of Klondike, Easy");
    });

    it("stops at the top of the list", () => {
      type("");
      press("ArrowUp");

      expect(active()).toBe("Klondike, Easy–Medium, playing now");
    });

    it("stops at the bottom of the list", () => {
      press("ArrowDown");
      press("ArrowDown");

      press("ArrowDown");

      expect(active()).toBe("FreeCell, Hard, 2 decks");
    });

    it("clears the search on a first Escape, and stays open", () => {
      type("free");

      press("Escape");

      expect(searchField().value).toBe("");
      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("closes on Escape once the search is clear", () => {
      pressEscape();
      fixture.detectChanges();

      expect(browser.isOpen()).toBe(false);
    });

    it("says so when nothing matches", () => {
      type("xyzzy");

      expect(queryText(fixture, ".empty-message")).toContain("xyzzy");
    });

    it("shows every game again from an empty search", async () => {
      type("xyzzy");

      await click(queryRequired(fixture, ".empty .btn"));

      expect(listed()).toHaveLength(3);
    });

    it("announces how many games match once typing pauses", async () => {
      type("free");

      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(queryText(fixture, '[aria-live="polite"]')).toBe("1 game.");
      });
    });
  });

  describe("filtering", () => {
    beforeEach(async () => {
      await build();
      open();
    });

    it("keeps the games a chosen filter allows", async () => {
      await click(chip("Hard"));

      expect(listed()).toEqual(["FreeCell, Hard, 2 decks"]);
    });

    it("says which filters are on", async () => {
      await click(chip("Hard"));

      expect(chip("Hard").getAttribute("aria-pressed")).toBe("true");
    });

    it("widens the list for a second choice of the same facet", async () => {
      await click(chip("Hard"));

      await click(chip("Easy"));

      expect(listed()).toHaveLength(3);
    });

    it("turns every filter off with Clear", async () => {
      await click(chip("Hard"));

      await click(chip("Clear"));

      expect(listed()).toHaveLength(3);
    });

    it("offers Clear only while a filter is on", () => {
      expect(query(fixture, ".chip-clear")).toBeNull();
    });
  });

  describe("recent games", () => {
    it("lists them once there are two", async () => {
      localStorage.setItem(
        "fsolitaire-recent-games",
        JSON.stringify([{ gameId: "freecell", values: {} }]),
      );
      await build();
      TestBed.flushEffects();
      open();

      const headings = queryAll(fixture, ".section-heading").map((h) =>
        h.textContent?.trim(),
      );

      expect(headings[0]).toBe("Recent");
    });

    it("leaves them out while a filter is on", async () => {
      localStorage.setItem(
        "fsolitaire-recent-games",
        JSON.stringify([{ gameId: "freecell", values: {} }]),
      );
      await build();
      TestBed.flushEffects();
      open();

      await click(chip("Hard"));

      expect(listed()).toEqual(["FreeCell, Hard, 2 decks"]);
    });

    it("names the rules a recent game was played by", async () => {
      localStorage.setItem(
        "fsolitaire-recent-games",
        JSON.stringify([{ gameId: "freecell", values: {} }]),
      );
      await build();
      TestBed.flushEffects();
      open();

      expect(queryText(fixture, ".row-rules")).toBe("· Draw 3");
    });
  });

  describe("playing", () => {
    it("plays the best match on Enter, and closes", async () => {
      await build();
      open();
      type("free");

      press("Enter");
      await flushMicrotasks();

      expect(harness.catalog.catalog.selectedId()).toBe("freecell");
      expect(browser.isOpen()).toBe(false);
    });

    it("plays a game on a double click", async () => {
      await build();
      open();

      row("FreeCell").dispatchEvent(new MouseEvent("dblclick"));
      await flushMicrotasks();

      expect(harness.catalog.catalog.selectedId()).toBe("freecell");
    });

    it("plays a named variant by the rules that make it", async () => {
      await build();
      open();
      await click(row("Test Nearly Won"));

      await click(queryRequired(fixture, ".btn-play"));

      expect(harness.catalog.catalog.optionValues()["almostWin"]).toBe(1);
    });

    it("offers to deal afresh once a rule is changed in the preview", async () => {
      await build();
      open();

      await click(segment("Draw 1"));

      expect(queryText(fixture, ".btn-play")).toBe("Deal with these rules");
    });

    it("plays a game by the rules changed in the preview", async () => {
      await build();
      open();
      await click(segment("Draw 1"));

      await click(queryRequired(fixture, ".btn-play"));

      expect(harness.catalog.catalog.optionValues()["drawCount"]).toBe(1);
    });

    it("offers to keep playing the game on the table", async () => {
      await build();
      open();

      expect(queryText(fixture, ".btn-play")).toBe("Keep playing");
    });

    it("just closes when the game on the table is kept", async () => {
      await build(WIDE, { moves: 4 });
      open();

      await click(queryRequired(fixture, ".btn-play"));

      expect(browser.isOpen()).toBe(false);
      expect(harness.catalog.load).not.toHaveBeenCalled();
    });

    it("stays open when the player keeps the game under way", async () => {
      await build(WIDE, { moves: 4 });
      open();
      await click(row("FreeCell"));
      await click(queryRequired(fixture, ".btn-play"));

      TestBed.inject(ConfirmationService).cancel();
      await flushMicrotasks();

      expect(browser.isOpen()).toBe(true);
      expect(harness.catalog.catalog.selectedId()).toBe("klondike");
    });

    it("opens the rules of the game in the preview", async () => {
      await build();
      open();
      await click(row("FreeCell"));

      await click(queryRequired(fixture, ".actions .btn-secondary"));

      expect(TestBed.inject(GameDocumentationService).shownGameId()).toBe(
        "freecell",
      );
    });
  });

  describe("the preview", () => {
    beforeEach(async () => {
      await build();
      open();
    });

    it("says how the game plays, from its rules page", () => {
      expect(queryText(fixture, ".overview")).toBe("A test overview.");
    });

    it("offers the rules a player picks, and not the development aids", () => {
      const labels = queryAll(fixture, "app-option-group .setting-label").map(
        (label) => label.textContent?.trim(),
      );

      expect(labels).toEqual(["Draw Mode"]);
    });

    it("follows the row the player moves to", () => {
      press("ArrowDown");

      expect(queryText(fixture, ".title")).toBe("Test Nearly Won");
    });

    it("offers no back button beside the list", () => {
      expect(query(fixture, ".btn-back")).toBeNull();
    });
  });

  describe("on a narrow screen", () => {
    beforeEach(async () => {
      await build(NARROW);
      open();
    });

    it("leaves focus out of the search field, keeping the keyboard away", () => {
      expect(document.activeElement).not.toBe(searchField());
    });

    it("shows a tapped game as a page of its own", async () => {
      await click(row("FreeCell"));

      expect(
        queryRequired(fixture, ".browser").classList.contains("showing-detail"),
      ).toBe(true);
    });

    it("moves focus to the game's name on showing it", async () => {
      await click(row("FreeCell"));
      await fixture.whenStable();

      expect(document.activeElement).toBe(queryRequired(fixture, ".title"));
    });

    it("goes back to the list with the back button", async () => {
      await click(row("FreeCell"));

      await click(queryRequired(fixture, ".btn-back"));

      expect(
        queryRequired(fixture, ".browser").classList.contains("showing-detail"),
      ).toBe(false);
    });

    it("goes back to the list on Escape, rather than closing", async () => {
      await click(row("FreeCell"));

      pressEscape();
      fixture.detectChanges();

      expect(browser.isOpen()).toBe(true);
      expect(
        queryRequired(fixture, ".browser").classList.contains("showing-detail"),
      ).toBe(false);
    });
  });
});
