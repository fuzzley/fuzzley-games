// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { DebugPanelComponent } from "@/ui/app/component/debug_panel/debug_panel.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { BugReportService } from "@/ui/app/service/bug_report.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import {
  clickElement,
  query,
  queryAll,
  queryRequired,
  queryText,
} from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";
import { clickBackdrop, isDialogOpen, pressEscape } from "@test/support/dialog";
import { DESKTOP_CARD_DECKS } from "@/engine/render/card_deck";

describe("SettingsDrawerComponent", () => {
  let fixture: ComponentFixture<SettingsDrawerComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(SettingsDrawerComponent);

    fixture = TestBed.createComponent(SettingsDrawerComponent);
    fixture.detectChanges();
  });

  /** Opens the drawer and renders it. */
  function openDrawer(): void {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
  }

  /** Watches the drawer's close request. */
  function onClose(): ReturnType<typeof vi.fn> {
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);
    return spy;
  }

  /** Returns the drawer's own rule buttons, excluding the debug panel's. */
  function ruleButtons(): HTMLElement[] {
    return queryAll(
      fixture,
      ".drawer-content > app-option-group:not(.card-style) .segment-btn",
    );
  }

  describe("showing and hiding", () => {
    it("stays closed until asked to open", () => {
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("opens when the open input is set", () => {
      openDrawer();

      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("asks to close when the close button is clicked", () => {
      openDrawer();
      const closed = onClose();

      clickElement(fixture, ".btn-close");

      expect(closed).toHaveBeenCalledOnce();
    });

    it("asks to close when the backdrop is clicked", () => {
      openDrawer();
      const closed = onClose();

      clickBackdrop(fixture);

      expect(closed).toHaveBeenCalledOnce();
    });

    it("asks to close on Escape", () => {
      openDrawer();
      const closed = onClose();

      pressEscape();

      expect(closed).toHaveBeenCalledOnce();
    });
  });

  describe("the game's rules", () => {
    it("renders whichever ones the game on the table offers", () => {
      openDrawer();

      expect(ruleButtons().map((button) => button.textContent?.trim())).toEqual(
        ["Draw 1", "Draw 3"],
      );
    });

    it("marks the chosen one as checked, not merely highlighted", () => {
      openDrawer();

      expect(ruleButtons()[1].getAttribute("aria-checked")).toBe("true");
    });

    it("changes the rule when another choice is clicked", async () => {
      openDrawer();

      ruleButtons()[0].click();
      await flushMicrotasks();

      expect(harness.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });
  });

  describe("the card back", () => {
    it("changes when one is picked", () => {
      openDrawer();

      clickElement(fixture, ".card-back-selector button:nth-child(2)");

      expect(harness.presentation.cardBackStyle()).toBe("card-back-red");
    });

    it("marks the chosen one as checked", () => {
      openDrawer();

      clickElement(fixture, ".card-back-selector button:nth-child(2)");
      fixture.detectChanges();

      expect(
        queryAll(fixture, ".card-back-selector button")[1].getAttribute(
          "aria-checked",
        ),
      ).toBe("true");
    });
  });

  describe("the card style", () => {
    /** Returns the style buttons, in the order they are offered. */
    function styleButtons(): HTMLElement[] {
      return queryAll(fixture, "app-option-group.card-style .segment-btn");
    }

    /** Returns the line describing the style that is checked. */
    function styleDescription(): string {
      return queryText(fixture, "app-option-group.card-style .setting-desc");
    }

    it("offers auto, mobile and desktop cards", () => {
      openDrawer();

      expect(
        styleButtons().map((button) => button.textContent?.trim()),
      ).toEqual(["Auto", "Mobile", "Desktop"]);
    });

    it("checks the style the player has", () => {
      harness.presentation.cardStyle.set("desktop");
      openDrawer();

      expect(
        styleButtons().map((button) => button.getAttribute("aria-checked")),
      ).toEqual(["false", "false", "true"]);
    });

    it("changes when one is picked", () => {
      openDrawer();

      styleButtons()[1].click();

      expect(harness.presentation.cardStyle()).toBe("mobile");
    });

    it("describes the style that is checked", () => {
      openDrawer();
      const autoDescription = styleDescription();

      harness.presentation.cardStyle.set("mobile");
      fixture.detectChanges();

      expect(styleDescription()).not.toBe(autoDescription);
    });
  });

  describe("the desktop decks", () => {
    /** Returns the deck buttons, in the order they are offered. */
    function deckButtons(): Element[] {
      return queryAll(fixture, ".card-deck-selector button");
    }

    it("offers every desktop deck", () => {
      openDrawer();

      expect(deckButtons().length).toBe(DESKTOP_CARD_DECKS.length);
    });

    it("changes when one is picked", () => {
      openDrawer();

      clickElement(fixture, ".card-deck-selector button:nth-child(1)");

      expect(harness.presentation.desktopCardDeck()).toBe(
        DESKTOP_CARD_DECKS[0].id,
      );
    });

    it("marks the chosen one as checked", () => {
      openDrawer();

      clickElement(fixture, ".card-deck-selector button:nth-child(1)");
      fixture.detectChanges();

      expect(
        deckButtons().map((button) => button.getAttribute("aria-checked")),
      ).toEqual(["true", "false", "false"]);
    });

    it("draws a preview no two decks share", () => {
      openDrawer();

      // The preview alone tells the decks apart, so no two may draw the same.
      const previews = deckButtons().map(
        (button) => button.querySelector(".card-deck-preview")?.innerHTML,
      );

      expect(new Set(previews).size).toBe(previews.length);
    });

    it("marks as many cards in the preview as the deck marks", () => {
      openDrawer();

      const pipCounts = deckButtons().map(
        (button) => button.querySelectorAll(".card-deck-preview-pip").length,
      );

      // None, the court alone, then both cards in the preview.
      expect(pipCounts).toEqual([0, 1, 2]);
    });

    it("marks the deck being fetched as busy", () => {
      harness.presentation.pendingCardDeck.set("classic");
      openDrawer();

      // A deck can take seconds to load, so the drawer says it is on its way.
      expect(
        deckButtons().map((button) => button.getAttribute("aria-busy")),
      ).toEqual(["true", "false", "false"]);
    });

    it("shows a spinner beside the deck being fetched, and no other", () => {
      harness.presentation.pendingCardDeck.set("classic");
      openDrawer();

      const spinners = deckButtons().map(
        (button) => button.querySelectorAll(".card-deck-spinner").length,
      );
      expect(spinners).toEqual([1, 0, 0]);
    });

    it("waits on nothing when the table is up to date", () => {
      openDrawer();

      expect(queryAll(fixture, ".card-deck-spinner")).toEqual([]);
    });

    it("says why the deck on the table is not the one chosen", () => {
      harness.presentation.cardDeckProblem.set("Couldn't load Classic.");
      openDrawer();

      expect(queryText(fixture, ".card-deck-problem")).toBe(
        "Couldn't load Classic.",
      );
    });

    it("are hidden while mobile cards are drawn", () => {
      harness.presentation.cardStyle.set("mobile");
      openDrawer();

      expect(query(fixture, ".card-deck-selector")).toBeNull();
    });

    it("come back once desktop cards are chosen", () => {
      harness.presentation.cardStyle.set("mobile");
      openDrawer();

      harness.presentation.cardStyle.set("desktop");
      fixture.detectChanges();

      expect(deckButtons().length).toBe(DESKTOP_CARD_DECKS.length);
    });

    it("leave the problem in view while they are hidden", () => {
      // The mobile deck can fail to load too.
      harness.presentation.cardStyle.set("mobile");
      harness.presentation.cardDeckProblem.set("Couldn't load Mobile.");
      openDrawer();

      expect(queryText(fixture, ".card-deck-problem")).toBe(
        "Couldn't load Mobile.",
      );
    });
  });

  describe("the table theme", () => {
    it("changes when a swatch is picked", () => {
      openDrawer();

      clickElement(fixture, ".theme-option[aria-label='Royal Velvet']");

      expect(harness.presentation.theme()).toBe("purple");
    });

    it("names each swatch, which is otherwise just a colour", () => {
      openDrawer();

      expect(
        queryAll(fixture, ".theme-option").map((button) =>
          button.getAttribute("aria-label"),
        ),
      ).toEqual([
        "Emerald Felt",
        "Deep Ocean",
        "Midnight Charcoal",
        "Royal Velvet",
      ]);
    });
  });

  describe("reporting a bug", () => {
    /** Returns the link to a new bug report. */
    function reportLink(): HTMLAnchorElement {
      return queryRequired<HTMLAnchorElement>(fixture, ".btn-report");
    }

    it("links to a new report describing the game on the table", async () => {
      const service = TestBed.inject(BugReportService);
      openDrawer();

      await fixture.whenStable();
      fixture.detectChanges();

      expect(reportLink().href).toBe(await service.issueUrl(service.draft()));
    });

    it("follows a rule changed while the drawer is open", async () => {
      openDrawer();
      await fixture.whenStable();

      harness.catalog.setOption("drawCount", 1);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(new URL(reportLink().href).searchParams.get("game")).toBe(
        "Klondike · Draw Mode: Draw 1",
      );
    });

    it("has nowhere to lead while the drawer is closed", () => {
      expect(reportLink().hasAttribute("href")).toBe(false);
    });

    it("opens the report in a new tab, leaving the board where it is", () => {
      openDrawer();

      expect(reportLink().target).toBe("_blank");
      expect(reportLink().relList.contains("noopener")).toBe(true);
    });
  });

  describe("the debug panel", () => {
    it("is offered for a game with no debug rules, to load a report", () => {
      harness.catalog.select("freecell");

      openDrawer();

      expect(query(fixture, "app-debug-panel")).not.toBeNull();
    });

    it("closes the drawer once a reported game is loaded", () => {
      openDrawer();
      const closed = onClose();
      const panel = fixture.debugElement.query(
        By.directive(DebugPanelComponent),
      ).componentInstance as DebugPanelComponent;

      panel.loaded.emit();

      expect(closed).toHaveBeenCalledOnce();
    });
  });

  it("opens the rules and closes itself out of the way", () => {
    openDrawer();
    const closed = onClose();

    clickElement(fixture, ".drawer-content .btn-secondary");

    expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    expect(closed).toHaveBeenCalledOnce();
  });
});
