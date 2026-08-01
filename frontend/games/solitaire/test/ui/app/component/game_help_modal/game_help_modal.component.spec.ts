// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  afterEach(() => {
    document.body.style.overflow = "";
    vi.useRealTimers();
  });

  it("is hidden when docService.isOpen is false", () => {
    const backdrop = query(fixture, ".modal-backdrop");
    expect(backdrop).toBeNull();
  });

  it("renders modal dialog when docService.isOpen is true", () => {
    docService.openHelp();
    fixture.detectChanges();

    const dialog = queryRequired(fixture, ".modal-dialog");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(queryText(fixture, ".game-title")).toContain("Klondike Solitaire");
  });

  it("defaults to the summary tab on open", () => {
    docService.openHelp();
    fixture.detectChanges();

    const overviewTab = queryRequired(fixture, '[data-tab="overview"]');
    expect(overviewTab.classList.contains("active")).toBe(true);
    expect(queryText(fixture, ".callout-title")).toContain(
      "Objective & Win Condition",
    );
  });

  it("shows detailed rules when clicking the rules tab", () => {
    docService.openHelp();
    fixture.detectChanges();

    clickElement(fixture, '[data-tab="rules"]');
    fixture.detectChanges();

    const rulesTab = queryRequired(fixture, '[data-tab="rules"]');
    expect(rulesTab.classList.contains("active")).toBe(true);
    expect(queryText(fixture, ".rules-grid")).toContain("Board Layout");
  });

  it("does not render a screenshots tab button", () => {
    docService.openHelp();
    fixture.detectChanges();

    const tabsNav = queryRequired(fixture, ".modal-tabs");
    expect(tabsNav.textContent).not.toContain("Screenshots");
  });

  it("does not render options tab button for games with no options", () => {
    catalogService.select("freecell");
    docService.openHelp();
    fixture.detectChanges();

    const variantsTab = query(fixture, '[data-tab="variants"]');
    expect(variantsTab).toBeNull();
  });

  it("renders Wikipedia badge link when wikipediaUrl is defined", () => {
    catalogService.select("klondike");
    docService.openHelp();
    fixture.detectChanges();

    const wikiBadge = query(fixture, ".wiki-badge");
    expect(wikiBadge).not.toBeNull();
    expect(wikiBadge?.getAttribute("href")).toContain("wikipedia.org");
  });

  it("closes modal when clicking close button", () => {
    docService.openHelp();
    fixture.detectChanges();

    clickElement(fixture, ".btn-modal-close");
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(false);
    expect(query(fixture, ".modal-backdrop")).toBeNull();
  });

  it("closes modal when clicking the backdrop", () => {
    docService.openHelp();
    fixture.detectChanges();

    const backdrop = queryRequired(fixture, ".modal-backdrop");
    backdrop.click();
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(false);
  });

  it("does not close modal when clicking inside modal-dialog content", () => {
    docService.openHelp();
    fixture.detectChanges();

    const dialog = queryRequired(fixture, ".modal-dialog");
    dialog.click();
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(true);
  });

  it("closes modal when pressing Escape key while open", () => {
    docService.openHelp();
    fixture.detectChanges();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(false);
  });

  it("does nothing when pressing Escape key while already closed", () => {
    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(false);
  });

  it("locks body scroll to hidden when modal is open and restores it when closed", () => {
    docService.openHelp();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe("hidden");

    docService.closeHelp();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe("");
  });

  it("focuses close button when modal opens", () => {
    vi.useFakeTimers();
    docService.openHelp();
    fixture.detectChanges();
    vi.advanceTimersByTime(10);

    const closeBtn = queryRequired(fixture, ".btn-modal-close");
    expect(document.activeElement).toBe(closeBtn);
  });

  it("restores focus to previous active element on close", () => {
    const triggerButton = document.createElement("button");
    document.body.appendChild(triggerButton);
    triggerButton.focus();

    docService.openHelp();
    fixture.detectChanges();

    docService.closeHelp();
    fixture.detectChanges();

    expect(document.activeElement).toBe(triggerButton);
    document.body.removeChild(triggerButton);
  });

  it("traps Tab focus to last element when Shift+Tab pressed on first focusable item", () => {
    vi.useFakeTimers();
    docService.openHelp();
    fixture.detectChanges();
    vi.advanceTimersByTime(10);

    const dialogEl = queryRequired(fixture, ".modal-dialog");
    const focusables = Array.from(
      dialogEl.querySelectorAll<HTMLElement>(
        "button, a[href], input, select, textarea, [tabindex]",
      ),
    ).filter((el) => el.tabIndex !== -1 && !el.hasAttribute("disabled"));

    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    firstFocusable.focus();

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(tabEvent);

    expect(document.activeElement).toBe(lastFocusable);
  });

  it("navigates tabs using ArrowRight and ArrowLeft keydown events and moves DOM focus", () => {
    vi.useFakeTimers();
    docService.openHelp();
    fixture.detectChanges();

    const summaryTab = queryRequired(fixture, '[data-tab="overview"]');
    summaryTab.focus();

    const arrowRight = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
    });
    summaryTab.dispatchEvent(arrowRight);
    fixture.detectChanges();

    const rulesTab = queryRequired(fixture, '[data-tab="rules"]');
    expect(rulesTab.classList.contains("active")).toBe(true);
    vi.advanceTimersByTime(10);

    expect(document.activeElement).toBe(rulesTab);
  });

  it("renders skeleton container without loaded or failed class when hero image has not loaded", () => {
    docService.openHelp();
    fixture.detectChanges();

    const container = queryRequired(fixture, ".img-skeleton-container");
    const img = queryRequired(fixture, ".screenshot-img");

    expect(container.classList.contains("is-loaded")).toBe(false);
    expect(container.classList.contains("is-failed")).toBe(false);
    expect(img.classList.contains("loaded")).toBe(false);
  });

  it("marks skeleton container and image as loaded when image load event fires", () => {
    docService.openHelp();
    fixture.detectChanges();

    const img = queryRequired(fixture, ".screenshot-img");
    img.dispatchEvent(new Event("load"));
    fixture.detectChanges();

    const container = queryRequired(fixture, ".img-skeleton-container");
    expect(container.classList.contains("is-loaded")).toBe(true);
    expect(img.classList.contains("loaded")).toBe(true);
  });

  it("marks skeleton container as failed when image error event fires", () => {
    docService.openHelp();
    fixture.detectChanges();

    const img = queryRequired(fixture, ".screenshot-img");
    img.dispatchEvent(new Event("error"));
    fixture.detectChanges();

    const container = queryRequired(fixture, ".img-skeleton-container");
    expect(container.classList.contains("is-failed")).toBe(true);
    expect(queryText(fixture, ".screenshot-failed-text")).toContain(
      "Screenshot unavailable",
    );
  });

  it("resets active tab to summary when opening modal for a game without variants after visiting options", () => {
    catalogService.select("klondike");
    docService.openHelp();
    fixture.detectChanges();
    clickElement(fixture, '[data-tab="variants"]');
    docService.closeHelp();
    catalogService.select("freecell");

    docService.openHelp();
    fixture.detectChanges();

    const overviewTab = queryRequired(fixture, '[data-tab="overview"]');
    expect(overviewTab.classList.contains("active")).toBe(true);
  });

  it("resets active tab to summary when modal is reopened", () => {
    docService.openHelp();
    fixture.detectChanges();
    clickElement(fixture, '[data-tab="rules"]');
    docService.closeHelp();

    docService.openHelp();
    fixture.detectChanges();

    const overviewTab = queryRequired(fixture, '[data-tab="overview"]');
    expect(overviewTab.classList.contains("active")).toBe(true);
  });
});
