// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ErrorHandler } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { ConfirmService } from "@fz/ui/confirm";
import { BugReportService } from "@fz/game-ui/bug_report";
import { GameBrowserService } from "@/ui/app/service/game_browser.service";
import { SolitaireReportSource } from "@/ui/app/bug_report/solitaire_report_source";
import { By } from "@angular/platform-browser";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import {
  COMPACT_MAX_WIDTH_PX,
  HOME_BUTTON_MIN_WIDTH_PX,
  WORDMARK_MIN_WIDTH_PX,
} from "@fz/game-ui/breakpoints";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import {
  type FakeViewport,
  installCompressionStreams,
  installFakeViewport,
} from "@fz/game-ui/testing";
import {
  clickElement,
  query,
  queryAll,
  queryRequired,
  queryText,
  rootElement,
} from "@test/support/dom";
import { within } from "@testing-library/dom";
import { flushMicrotasks } from "@test/support/async";

/** A window with room for every action, and one without. */
const WIDE = COMPACT_MAX_WIDTH_PX + 200;
const NARROW = COMPACT_MAX_WIDTH_PX - 200;

describe("HeaderBarComponent", () => {
  let fixture: ComponentFixture<HeaderBarComponent>;
  let harness: UiHarness;
  let viewport: FakeViewport;

  // A report started packs the game for its link.
  installCompressionStreams();

  beforeEach(async () => {
    viewport = installFakeViewport(WIDE);
    harness = await configureUiTestBed(HeaderBarComponent, {
      score: 120,
      moves: 10,
    });

    fixture = TestBed.createComponent(HeaderBarComponent);
    fixture.detectChanges();
  });

  /** Returns the undo button, whichever state it is in. */
  function undoButton(): HTMLButtonElement {
    return queryRequired(fixture, "button[title*='Undo']", HTMLButtonElement);
  }

  /** Narrows the window past the width the header compacts at. */
  function narrow(): void {
    viewport.setWidth(NARROW);
    fixture.detectChanges();
  }

  /** Resizes the window and lets the header follow. */
  function resize(width: number, height: number): void {
    viewport.setSize(width, height);
    fixture.detectChanges();
  }

  /** Returns the game bar the header is built on. */
  function gameBar(): GameBarComponent {
    return fixture.debugElement.query(By.directive(GameBarComponent))
      .componentInstance as GameBarComponent;
  }

  /** Returns the link home in the bar, outside the overflow menu. */
  function homeLink(): HTMLAnchorElement | null {
    return query(
      fixture,
      "header a[href='/']:not([role='menuitem'])",
      HTMLAnchorElement,
    );
  }

  /** Resolves to the title of the bug report that opens. */
  async function openedReport(): Promise<string | undefined> {
    const reports = TestBed.inject(BugReportService);
    await vi.waitFor(() => {
      expect(reports.report()).not.toBeNull();
    });
    return reports.report()?.title;
  }

  describe("the heading", () => {
    it("names the game on the table", () => {
      expect(queryText(fixture, "h1")).toBe("Klondike");
    });

    it("follows the game as it is changed", () => {
      harness.catalog.select("freecell");
      fixture.detectChanges();

      expect(queryText(fixture, "h1")).toBe("FreeCell");
    });
  });

  describe("the link home", () => {
    it("is the wordmark where the bar has room for it", () => {
      resize(WORDMARK_MIN_WIDTH_PX, 900);

      expect(homeLink()?.textContent.trim()).toBe("Fuzzley Games");
    });

    it("is the home button below the wordmark's width, still named Fuzzley Games", () => {
      resize(WORDMARK_MIN_WIDTH_PX - 1, 900);

      expect([homeLink()?.textContent.trim(), homeLink()?.title]).toEqual([
        "",
        "Fuzzley Games",
      ]);
    });

    it("is the home button on a phone", () => {
      resize(390, 844);

      expect(homeLink()?.title).toBe("Fuzzley Games");
    });

    it("leaves the bar on the narrowest phones", () => {
      resize(HOME_BUTTON_MIN_WIDTH_PX - 1, 640);

      expect(homeLink()).toBeNull();
    });
  });

  describe("the bar's placement", () => {
    it("runs across the top of a roomy screen", () => {
      expect(gameBar().placement()).toBe("top");
    });

    it("docks at the bottom of a phone held upright", () => {
      harness.presentation.formFactor.set("phone-portrait");
      resize(390, 844);

      expect([gameBar().placement(), gameBar().reversed()]).toEqual([
        "bottom",
        false,
      ]);
    });

    it("swaps ends on an upright phone with the stock at the left", () => {
      harness.presentation.setStockSide("left");
      resize(390, 844);

      expect(gameBar().reversed()).toBe(true);
    });

    it("is a rail down the left of a phone on its side", () => {
      harness.presentation.setStockSide("right");
      resize(844, 390);

      expect(gameBar().placement()).toBe("start");
    });

    it("stands the rail at the right with the stock at the left", () => {
      harness.presentation.setStockSide("left");
      resize(844, 390);

      expect(gameBar().placement()).toBe("end");
    });

    it("is compact on a compact screen", () => {
      narrow();

      expect(gameBar().compact()).toBe(true);
    });
  });

  describe("the game switcher", () => {
    it("shows the game on the table", () => {
      expect(queryText(fixture, ".switcher-name")).toBe("Klondike");
    });

    it("names the game, then what it does, for a screen reader", () => {
      expect(
        queryRequired(fixture, ".game-switcher").getAttribute("aria-label"),
      ).toBe("Klondike, choose a game");
    });

    it("says that it opens a dialog", () => {
      expect(
        queryRequired(fixture, ".game-switcher").getAttribute("aria-haspopup"),
      ).toBe("dialog");
    });

    it("names its keyboard shortcut", () => {
      expect(
        queryRequired(fixture, ".game-switcher").getAttribute(
          "aria-keyshortcuts",
        ),
      ).toBe("Control+K Meta+K");
    });

    it("teaches its keyboard shortcut in its tooltip", () => {
      expect(queryRequired(fixture, ".game-switcher").title).toBe(
        "Choose a game (Ctrl K)",
      );
    });

    it("opens the game browser", () => {
      clickElement(fixture, ".game-switcher");

      expect(TestBed.inject(GameBrowserService).isOpen()).toBe(true);
    });

    it("stays in the bar on a narrow screen", () => {
      narrow();

      expect(query(fixture, ".game-switcher")).not.toBeNull();
    });
  });

  describe("the metrics", () => {
    it("reports what the game currently reads", () => {
      expect([
        queryText(fixture, ".score-card .value"),
        queryText(fixture, ".moves-card .value"),
        queryText(fixture, ".timer-card .value"),
      ]).toEqual(["120", "10", "0:00"]);
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
      harness.model.state.update({ score: 350 });
      harness.model.state.update({ moves: 25 });
      fixture.detectChanges();

      expect([
        queryText(fixture, ".score-card .value"),
        queryText(fixture, ".moves-card .value"),
      ]).toEqual(["350", "25"]);
    });
  });

  describe("the buttons with a tooltip", () => {
    // A browser reads a tooltip that says what an `aria-label` says again,
    // as the description.
    it.each(["Undo", "Restart", "How to play", "Settings"])(
      "gives %s no label beside its tooltip, so its name is read once",
      (name) => {
        expect(
          within(rootElement(fixture))
            .getByRole("button", { name })
            .hasAttribute("aria-label"),
        ).toBe(false);
      },
    );
  });

  describe("undo", () => {
    it("is dimmed with nothing to take back, and never disabled", () => {
      expect([
        undoButton().getAttribute("aria-disabled"),
        undoButton().disabled,
      ]).toEqual(["true", false]);
    });

    it("does nothing when pressed with nothing to take back", () => {
      undoButton().click();

      expect(harness.model.undo).not.toHaveBeenCalled();
    });

    it("is no longer dimmed once the game has history", () => {
      harness.model.state.update({ undoDepth: 1 });
      fixture.detectChanges();

      expect(undoButton().hasAttribute("aria-disabled")).toBe(false);
    });

    it("takes the move back on the game when clicked", () => {
      harness.model.state.update({ undoDepth: 1 });
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

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
      expect(harness.model.restartGame).not.toHaveBeenCalled();
    });

    it("restarts once that prompt is accepted", async () => {
      clickElement(fixture, "button[title*='Restart']");
      await flushMicrotasks();

      TestBed.inject(ConfirmService).accept();
      await flushMicrotasks();

      expect(harness.model.restartGame).toHaveBeenCalledOnce();
    });

    it("deals a new game once its prompt is accepted", async () => {
      clickElement(fixture, "button[aria-label='New game']");
      await flushMicrotasks();

      TestBed.inject(ConfirmService).accept();
      await flushMicrotasks();

      expect(harness.model.startNewGame).toHaveBeenCalledOnce();
    });

    it("opens the rules", () => {
      clickElement(fixture, "button[title='How to play']");

      expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    });

    it("reports a bug from an icon beside the rules", async () => {
      clickElement(fixture, ".btn-bug-report");

      expect(await openedReport()).toBe("[Solitaire Collection] ");
    });

    it("hands what goes wrong with a report to the app's error handler", async () => {
      const problem = new Error("The game can't be taken.");
      vi.spyOn(
        TestBed.inject(SolitaireReportSource),
        "capture",
      ).mockImplementation(() => {
        throw problem;
      });
      const handled = vi
        .spyOn(TestBed.inject(ErrorHandler), "handleError")
        .mockImplementation(() => undefined);

      clickElement(fixture, ".btn-bug-report");

      await vi.waitFor(() => {
        expect(handled).toHaveBeenCalledWith(problem);
      });
    });

    it("names the icon-only bug report button once, by its tooltip", () => {
      const button = within(rootElement(fixture)).getByRole("button", {
        name: "Report a bug",
      });

      expect(button.getAttribute("aria-label")).toBeNull();
    });

    it("asks the shell to open settings", () => {
      const openSettings = vi.fn();
      fixture.componentInstance.openSettings.subscribe(openSettings);

      clickElement(fixture, "button[title='Settings']");

      expect(openSettings).toHaveBeenCalledOnce();
    });
  });

  describe("the overflow menu", () => {
    /** Opens the menu on an already-narrowed header. */
    function openMenu(): void {
      clickElement(fixture, "button[title='More actions']");
      fixture.detectChanges();
    }

    /** Returns the labels of the items currently inside the menu. */
    function menuLabels(): string[] {
      return queryAll(fixture, "[role='menuitem']").map((item) =>
        item.textContent.trim(),
      );
    }

    /** Chooses the item with this label from the open menu. */
    function choose(label: string): void {
      const item = queryAll(fixture, "[role='menuitem']").find(
        (each) => each.textContent.trim() === label,
      );
      item?.click();
      fixture.detectChanges();
    }

    beforeEach(() => {
      narrow();
    });

    it("is not in the bar of a roomy screen", () => {
      viewport.setWidth(WIDE);
      fixture.detectChanges();

      expect(query(fixture, "button[title='More actions']")).toBeNull();
    });

    it("takes the actions the bar has no room for out of it", () => {
      expect([
        query(fixture, "button[title*='Restart']"),
        query(fixture, ".btn-help"),
        query(fixture, ".btn-bug-report"),
        query(fixture, "button[title='Settings']"),
      ]).toEqual([null, null, null, null]);
    });

    it("holds them behind one button instead of dropping them", () => {
      openMenu();

      expect(menuLabels()).toEqual([
        "Restart",
        "How to play",
        "Report a bug",
        "Settings",
      ]);
    });

    it("leads with the link home on the narrowest phones", () => {
      resize(HOME_BUTTON_MIN_WIDTH_PX - 1, 640);

      openMenu();

      expect([
        menuLabels()[0],
        query(fixture, "a[role='menuitem']")?.getAttribute("href"),
      ]).toEqual(["Fuzzley Games", "/"]);
    });

    it("asks before restarting from the menu", async () => {
      openMenu();

      choose("Restart");
      await flushMicrotasks();

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("opens the rules from the menu", () => {
      openMenu();

      choose("How to play");

      expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    });

    it("reports a bug from the menu", async () => {
      openMenu();

      choose("Report a bug");

      expect(await openedReport()).toBe("[Solitaire Collection] ");
    });

    it("asks the shell to open settings from the menu", () => {
      const openSettings = vi.fn();
      fixture.componentInstance.openSettings.subscribe(openSettings);
      openMenu();

      choose("Settings");

      expect(openSettings).toHaveBeenCalledOnce();
    });

    it("closes once an action has been taken", () => {
      openMenu();

      choose("How to play");

      expect(
        queryRequired(fixture, "button[title='More actions']").getAttribute(
          "aria-expanded",
        ),
      ).toBe("false");
    });

    it("gives the actions back to the bar when the window is widened", () => {
      openMenu();

      viewport.setWidth(WIDE);
      fixture.detectChanges();

      expect(query(fixture, "button[title='More actions']")).toBeNull();
      expect(query(fixture, "button[title*='Restart']")).not.toBeNull();
    });
  });
});
