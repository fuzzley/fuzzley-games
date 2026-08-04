// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { COMPACT_MAX_WIDTH_PX } from "@/ui/app/service/viewport.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import {
  installFakeViewport,
  type FakeViewport,
} from "@test/support/ui/viewport";
import {
  clickElement,
  query,
  queryAll,
  queryRequired,
  queryText,
} from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";

/** A window with room for every action, and one without. */
const WIDE = COMPACT_MAX_WIDTH_PX + 200;
const NARROW = COMPACT_MAX_WIDTH_PX - 200;

describe("HeaderBarComponent", () => {
  let fixture: ComponentFixture<HeaderBarComponent>;
  let harness: UiHarness;
  let viewport: FakeViewport;

  beforeEach(async () => {
    viewport = installFakeViewport(WIDE);
    harness = await configureUiTestBed(HeaderBarComponent, {
      score: 120,
      moves: 10,
    });

    fixture = TestBed.createComponent(HeaderBarComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    viewport.restore();
  });

  /** The undo button, whichever state it is in. */
  function undoButton(): HTMLButtonElement {
    return queryRequired<HTMLButtonElement>(fixture, "button[title*='Undo']");
  }

  /** Narrows the window past the width the header compacts at. */
  function narrow(): void {
    viewport.setWidth(NARROW);
    fixture.detectChanges();
  }

  describe("the heading", () => {
    it("names the application and the game on the table", () => {
      expect([
        queryText(fixture, "h1 .wordmark"),
        queryText(fixture, "h1 .brand-game"),
      ]).toEqual(["fSolitaire", "Klondike"]);
    });

    it("follows the game as it is changed", () => {
      harness.catalog.select("freecell");
      fixture.detectChanges();

      expect(queryText(fixture, "h1 .brand-game")).toBe("FreeCell");
    });
  });

  describe("the metrics", () => {
    it("reports what the game currently reads", () => {
      expect([
        queryText(fixture, ".score-card .value"),
        queryText(fixture, ".moves-card .value"),
        queryText(fixture, ".timer-card .value"),
      ]).toEqual(["120", "10", "00:00"]);
    });

    it("announces score and moves as they change, with their labels", () => {
      const live = queryAll(fixture, "[role='status']");

      expect(live.map((card) => card.className.split(" ")[1])).toEqual([
        "score-card",
        "moves-card",
      ]);
      // Without this the announcement is a bare number, which says that
      // something changed but not what.
      expect(
        live.every((card) => card.getAttribute("aria-atomic") === "true"),
      ).toBe(true);
    });

    it("leaves the timer silent, since a stopwatch that interrupts every second is unusable", () => {
      expect(
        queryRequired(fixture, ".timer-card").getAttribute("role"),
      ).toBeNull();
    });

    it("follows the game as it changes", () => {
      harness.model.state.score = 350;
      harness.model.state.moves = 25;
      fixture.detectChanges();

      expect([
        queryText(fixture, ".score-card .value"),
        queryText(fixture, ".moves-card .value"),
      ]).toEqual(["350", "25"]);
    });
  });

  describe("undo", () => {
    it("is disabled with nothing to take back", () => {
      expect(undoButton().disabled).toBe(true);
    });

    it("is enabled once the game has history", () => {
      harness.model.state.undoDepth = 1;
      fixture.detectChanges();

      expect(undoButton().disabled).toBe(false);
    });

    it("takes the move back on the game when clicked", () => {
      harness.model.state.undoDepth = 1;
      fixture.detectChanges();

      undoButton().click();

      expect(harness.model.undo).toHaveBeenCalledOnce();
    });
  });

  describe("the lifecycle actions", () => {
    // This fixture has ten moves on the board, so both of these are
    // destructive and ask before going ahead.

    it("asks before restarting, rather than throwing the game away", async () => {
      clickElement(fixture, "button[title*='Restart']");
      await flushMicrotasks();

      expect(TestBed.inject(ConfirmationService).isOpen()).toBe(true);
      expect(harness.model.restartGame).not.toHaveBeenCalled();
    });

    it("restarts once that prompt is accepted", async () => {
      clickElement(fixture, "button[title*='Restart']");
      await flushMicrotasks();

      TestBed.inject(ConfirmationService).accept();
      await flushMicrotasks();

      expect(harness.model.restartGame).toHaveBeenCalledOnce();
    });

    it("deals a new game once its prompt is accepted", async () => {
      clickElement(fixture, "button[title*='New Game']");
      await flushMicrotasks();

      TestBed.inject(ConfirmationService).accept();
      await flushMicrotasks();

      expect(harness.model.startNewGame).toHaveBeenCalledOnce();
    });

    it("opens the rules", () => {
      clickElement(fixture, "button[title*='How to Play']");

      expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    });

    it("asks the shell to open settings", () => {
      const openSettings = vi.fn();
      fixture.componentInstance.openSettings.subscribe(openSettings);

      clickElement(fixture, ".btn-settings");

      expect(openSettings).toHaveBeenCalledOnce();
    });
  });

  describe("the overflow menu", () => {
    /** Opens the menu on an already-narrowed header. */
    function openMenu(): void {
      clickElement(fixture, ".btn-overflow");
      fixture.detectChanges();
    }

    /** The labels of the actions currently inside the menu. */
    function menuLabels(): string[] {
      return queryAll(fixture, ".overflow-item").map(
        (item) => item.textContent?.trim() ?? "",
      );
    }

    beforeEach(() => {
      narrow();
    });

    it("takes the actions the bar has no room for out of it", () => {
      expect([
        query(fixture, "button[title*='Restart']"),
        query(fixture, ".btn-help"),
      ]).toEqual([null, null]);
    });

    it("holds them behind one button instead of dropping them", () => {
      openMenu();

      expect(menuLabels()).toEqual(["Restart", "How to Play"]);
    });

    it("stays shut until it is asked for", () => {
      expect([
        query(fixture, ".overflow-menu"),
        queryRequired(fixture, ".btn-overflow").getAttribute("aria-expanded"),
      ]).toEqual([null, "false"]);
    });

    it("says that it is open once it is", () => {
      openMenu();

      expect(
        queryRequired(fixture, ".btn-overflow").getAttribute("aria-expanded"),
      ).toBe("true");
    });

    it("asks before restarting from the menu", async () => {
      openMenu();

      clickElement(fixture, ".overflow-item");
      await flushMicrotasks();

      expect(TestBed.inject(ConfirmationService).isOpen()).toBe(true);
    });

    it("opens the rules from the menu", () => {
      openMenu();

      clickElement(fixture, ".overflow-item:last-child");

      expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    });

    it("closes once an action has been taken", () => {
      openMenu();

      clickElement(fixture, ".overflow-item:last-child");
      fixture.detectChanges();

      expect(query(fixture, ".overflow-menu")).toBeNull();
    });

    it("closes when the board behind it is tapped", () => {
      openMenu();

      clickElement(fixture, ".overflow-backdrop");
      fixture.detectChanges();

      expect(query(fixture, ".overflow-menu")).toBeNull();
    });

    it("closes on Escape from anywhere inside it", () => {
      openMenu();

      queryRequired(fixture, ".overflow-item").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      fixture.detectChanges();

      expect(query(fixture, ".overflow-menu")).toBeNull();
    });

    it("puts focus on the first action as it opens", () => {
      openMenu();

      expect(document.activeElement).toBe(query(fixture, ".overflow-item"));
    });

    it("hands focus back to the button it was opened from", () => {
      openMenu();

      queryRequired(fixture, ".overflow-item").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      fixture.detectChanges();

      expect(document.activeElement).toBe(query(fixture, ".btn-overflow"));
    });

    it("gives the actions back to the bar when the window is widened", () => {
      openMenu();

      viewport.setWidth(WIDE);
      fixture.detectChanges();

      expect(query(fixture, ".btn-overflow")).toBeNull();
      expect(query(fixture, "button[title*='Restart']")).not.toBeNull();
    });
  });
});
