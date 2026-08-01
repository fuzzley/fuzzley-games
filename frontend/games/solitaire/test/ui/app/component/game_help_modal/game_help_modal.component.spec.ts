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

describe("GameHelpModalComponent", () => {
  let component: GameHelpModalComponent;
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
    component = fixture.componentInstance;
    docService = TestBed.inject(GameDocumentationService);
    catalogService = TestBed.inject(GameCatalogService);
    fixture.detectChanges();
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

    expect(component.activeTab()).toBe("overview");
    expect(queryText(fixture, ".callout-title")).toContain(
      "Objective & Win Condition",
    );
  });

  it("shows detailed rules when clicking the rules tab", () => {
    docService.openHelp();
    fixture.detectChanges();

    clickElement(fixture, '[data-tab="rules"]');
    fixture.detectChanges();

    expect(component.activeTab()).toBe("rules");
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

  it("renders skeleton container without loaded class when hero image has not loaded", () => {
    docService.openHelp();
    fixture.detectChanges();

    const container = queryRequired(fixture, ".img-skeleton-container");
    const img = queryRequired(fixture, ".screenshot-img");

    expect(container.classList.contains("is-loaded")).toBe(false);
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

  it("clamps tab to summary when opening help for a game without variants after visiting options tab", () => {
    catalogService.select("klondike");
    docService.openHelp();
    fixture.detectChanges();

    clickElement(fixture, '[data-tab="variants"]');
    fixture.detectChanges();
    expect(component.activeTab()).toBe("variants");

    docService.closeHelp();
    fixture.detectChanges();

    catalogService.select("freecell");
    docService.openHelp();
    fixture.detectChanges();

    expect(component.activeTab()).toBe("overview");
  });

  it("resets active tab to overview when modal is reopened", () => {
    docService.openHelp();
    fixture.detectChanges();

    clickElement(fixture, '[data-tab="rules"]');
    fixture.detectChanges();
    expect(component.activeTab()).toBe("rules");

    docService.closeHelp();
    fixture.detectChanges();

    docService.openHelp();
    fixture.detectChanges();

    expect(component.activeTab()).toBe("overview");
  });
});
