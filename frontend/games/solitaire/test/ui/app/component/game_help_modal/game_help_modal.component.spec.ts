// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameHelpModalComponent } from "@/ui/app/component/game_help_modal/game_help_modal.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import {
  queryRequired,
  queryText,
  clickElement,
  query,
} from "@test/support/dom";
import { clickBackdrop, isDialogOpen, pressEscape } from "@test/support/dialog";

describe("GameHelpModalComponent", () => {
  let fixture: ComponentFixture<GameHelpModalComponent>;
  let docService: GameDocumentationService;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(GameHelpModalComponent);

    fixture = TestBed.createComponent(GameHelpModalComponent);
    docService = TestBed.inject(GameDocumentationService);
    fixture.detectChanges();
  });

  /** Opens the modal and renders it. */
  function openHelp(): void {
    docService.openHelp();
    fixture.detectChanges();
  }

  /** The tab button for a named tab. */
  function tab(name: string): HTMLElement {
    return queryRequired(fixture, `[data-tab="${name}"]`);
  }

  /** Which tab is currently selected. */
  function selectedTab(): string | null {
    return (
      query(fixture, '[role="tab"][aria-selected="true"]')?.getAttribute(
        "data-tab",
      ) ?? null
    );
  }

  describe("showing and hiding", () => {
    it("stays closed until help is asked for", () => {
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("opens on the documentation for the game on the table", () => {
      openHelp();

      expect(isDialogOpen(fixture)).toBe(true);
      expect(queryText(fixture, ".game-title")).toBe("Test Klondike");
    });

    it("closes when the close button is clicked", () => {
      openHelp();

      clickElement(fixture, ".btn-modal-close");
      fixture.detectChanges();

      expect(docService.isOpen()).toBe(false);
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("closes on Escape", () => {
      openHelp();

      pressEscape();
      fixture.detectChanges();

      expect(docService.isOpen()).toBe(false);
    });

    it("closes when the backdrop outside the panel is clicked", () => {
      openHelp();

      clickBackdrop(fixture);
      fixture.detectChanges();

      expect(docService.isOpen()).toBe(false);
    });

    it("stays open when the panel itself is clicked", () => {
      openHelp();

      queryRequired(fixture, ".modal-dialog").click();
      fixture.detectChanges();

      expect(docService.isOpen()).toBe(true);
    });

    it("does nothing when Escape is pressed while already closed", () => {
      pressEscape();
      fixture.detectChanges();

      expect(docService.isOpen()).toBe(false);
    });

    it("says so for a game with no documentation written yet", () => {
      harness.catalog.catalog.select("scorpion");
      openHelp();

      expect(queryText(fixture, ".callout-title")).toContain(
        "Documentation Unavailable",
      );
    });
  });

  describe("focus", () => {
    it("moves focus into the dialog when it opens", () => {
      openHelp();

      expect(
        queryRequired(fixture, "dialog").contains(document.activeElement),
      ).toBe(true);
    });

    it("lands on the close button rather than the outbound Wikipedia link", () => {
      openHelp();

      expect(document.activeElement).toBe(
        queryRequired(fixture, ".btn-modal-close"),
      );
    });

    it("restores focus to whatever opened it", () => {
      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();

      openHelp();
      docService.closeHelp();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });
  });

  describe("tabs", () => {
    it("opens on the summary tab", () => {
      openHelp();

      expect(selectedTab()).toBe("overview");
      expect(queryText(fixture, ".objective-text")).toContain(
        "Move every card to the foundations.",
      );
    });

    it("shows the detailed rules when the rules tab is clicked", () => {
      openHelp();

      clickElement(fixture, '[data-tab="rules"]');
      fixture.detectChanges();

      expect(selectedTab()).toBe("rules");
      expect(queryText(fixture, ".rules-grid")).toContain(
        "Seven tableau columns.",
      );
    });

    it("explains each choice on the variants tab", () => {
      openHelp();

      clickElement(fixture, '[data-tab="variants"]');
      fixture.detectChanges();

      // Joined to the catalog: the label comes from the rule the game
      // declares, the explanation from the documentation.
      expect(queryText(fixture, ".choice-badge")).toBe("Draw 1");
      expect(queryText(fixture, ".choice-effect")).toBe(
        "Turns one card at a time.",
      );
    });

    it("offers no variants tab for a game with no options", () => {
      harness.catalog.catalog.select("freecell");
      openHelp();

      expect(query(fixture, '[data-tab="variants"]')).toBeNull();
    });

    it("moves to the next tab on ArrowRight", () => {
      openHelp();

      tab("overview").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      fixture.detectChanges();

      expect(selectedTab()).toBe("rules");
    });

    it("wraps to the last tab on ArrowLeft from the first", () => {
      openHelp();

      tab("overview").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      fixture.detectChanges();

      expect(selectedTab()).toBe("variants");
    });

    it("moves focus to the tab it selects", () => {
      openHelp();

      tab("overview").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      fixture.detectChanges();

      expect(document.activeElement).toBe(tab("rules"));
    });

    it("keeps the tablist to one tab stop, as a tablist should", () => {
      openHelp();

      clickElement(fixture, '[data-tab="rules"]');
      fixture.detectChanges();

      expect(tab("overview").getAttribute("tabindex")).toBe("-1");
      expect(tab("rules").getAttribute("tabindex")).toBe("0");
    });

    it("returns to the summary tab when reopened", () => {
      openHelp();
      clickElement(fixture, '[data-tab="rules"]');
      docService.closeHelp();
      fixture.detectChanges();

      openHelp();

      expect(selectedTab()).toBe("overview");
    });

    it("falls back to summary when the new game lacks the tab that was open", () => {
      openHelp();
      clickElement(fixture, '[data-tab="variants"]');
      docService.closeHelp();
      harness.catalog.catalog.select("freecell");

      openHelp();

      expect(selectedTab()).toBe("overview");
    });
  });

  describe("the hero screenshot", () => {
    it("shows neither loaded nor failed before the image resolves", () => {
      openHelp();

      const container = queryRequired(fixture, ".img-skeleton-container");
      expect(container.classList.contains("is-loaded")).toBe(false);
      expect(container.classList.contains("is-failed")).toBe(false);
    });

    it("marks itself loaded once the image arrives", () => {
      openHelp();

      queryRequired(fixture, ".screenshot-img").dispatchEvent(
        new Event("load"),
      );
      fixture.detectChanges();

      expect(
        queryRequired(fixture, ".img-skeleton-container").classList.contains(
          "is-loaded",
        ),
      ).toBe(true);
    });

    it("says so when the image cannot be loaded", () => {
      openHelp();

      queryRequired(fixture, ".screenshot-img").dispatchEvent(
        new Event("error"),
      );
      fixture.detectChanges();

      expect(queryText(fixture, ".screenshot-failed-text")).toContain(
        "Screenshot unavailable",
      );
    });
  });

  describe("the Wikipedia link", () => {
    it("is offered when the documentation names an article", () => {
      openHelp();

      expect(query(fixture, ".wiki-badge")?.getAttribute("href")).toContain(
        "wikipedia.org",
      );
    });

    it("opens safely, without handing the new tab an opener", () => {
      openHelp();

      expect(query(fixture, ".wiki-badge")?.getAttribute("rel")).toContain(
        "noopener",
      );
    });

    it("is absent when the documentation names none", () => {
      harness.catalog.catalog.select("freecell");
      openHelp();

      expect(query(fixture, ".wiki-badge")).toBeNull();
    });
  });
});
