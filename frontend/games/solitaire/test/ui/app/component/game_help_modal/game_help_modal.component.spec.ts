// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameHelpModalComponent } from "@/ui/app/component/game_help_modal/game_help_modal.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  queryRequired,
  queryText,
  clickElement,
  query,
} from "@test/support/dom";
import { isDialogOpen, pressEscape } from "@test/support/dialog";

describe("GameHelpModalComponent", () => {
  let fixture: ComponentFixture<GameHelpModalComponent>;
  let docService: GameDocumentationService;
  let catalogService: GameCatalogService;

  beforeEach(async () => {
    localStorage.clear();
    location.hash = "";

    await TestBed.configureTestingModule({
      imports: [GameHelpModalComponent],
      providers: [GameDocumentationService, GameCatalogService],
    }).compileComponents();

    fixture = TestBed.createComponent(GameHelpModalComponent);
    docService = TestBed.inject(GameDocumentationService);
    catalogService = TestBed.inject(GameCatalogService);
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

  describe("showing and hiding", () => {
    it("stays closed until help is asked for", () => {
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("opens when help is asked for", () => {
      openHelp();

      expect(isDialogOpen(fixture)).toBe(true);
      expect(queryText(fixture, ".game-title").length).toBeGreaterThan(0);
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

      queryRequired<HTMLDialogElement>(fixture, "dialog").click();
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
  });

  describe("focus", () => {
    it("moves focus into the dialog when it opens", () => {
      openHelp();

      const dialog = queryRequired(fixture, "dialog");
      expect(dialog.contains(document.activeElement)).toBe(true);
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

      expect(tab("overview").getAttribute("aria-selected")).toBe("true");
      expect(queryText(fixture, ".callout-title")).toContain(
        "Objective & Win Condition",
      );
    });

    it("shows the detailed rules when the rules tab is clicked", () => {
      openHelp();

      clickElement(fixture, '[data-tab="rules"]');
      fixture.detectChanges();

      expect(tab("rules").getAttribute("aria-selected")).toBe("true");
      expect(queryText(fixture, ".rules-grid")).toContain("Board Layout");
    });

    it("offers no variants tab for a game with no options", () => {
      catalogService.select("freecell");
      openHelp();

      expect(query(fixture, '[data-tab="variants"]')).toBeNull();
    });

    it("moves to the next tab on ArrowRight", () => {
      openHelp();
      tab("overview").focus();

      tab("overview").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      fixture.detectChanges();

      expect(tab("rules").getAttribute("aria-selected")).toBe("true");
    });

    it("wraps to the last tab on ArrowLeft from the first", () => {
      catalogService.select("klondike");
      openHelp();
      tab("overview").focus();

      tab("overview").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      fixture.detectChanges();

      expect(tab("variants").getAttribute("aria-selected")).toBe("true");
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

      expect(tab("overview").getAttribute("aria-selected")).toBe("true");
    });

    it("falls back to summary when the new game lacks the tab that was open", () => {
      catalogService.select("klondike");
      openHelp();
      clickElement(fixture, '[data-tab="variants"]');
      docService.closeHelp();
      catalogService.select("freecell");

      openHelp();

      expect(tab("overview").getAttribute("aria-selected")).toBe("true");
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

  it("links out to Wikipedia when the documentation has an article", () => {
    catalogService.select("klondike");
    openHelp();

    expect(query(fixture, ".wiki-badge")?.getAttribute("href")).toContain(
      "wikipedia.org",
    );
  });
});
