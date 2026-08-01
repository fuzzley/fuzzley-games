// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameHelpModalComponent } from "@/ui/app/component/game_help_modal/game_help_modal.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { queryRequired, queryText, clickElement } from "@test/support/dom";

describe("GameHelpModalComponent", () => {
  let component: GameHelpModalComponent;
  let fixture: ComponentFixture<GameHelpModalComponent>;
  let docService: GameDocumentationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameHelpModalComponent],
      providers: [GameDocumentationService, GameCatalogService],
    }).compileComponents();

    fixture = TestBed.createComponent(GameHelpModalComponent);
    component = fixture.componentInstance;
    docService = TestBed.inject(GameDocumentationService);
    fixture.detectChanges();
  });

  it("is hidden when docService.isOpen is false", () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".modal-backdrop")).toBeNull();
  });

  it("renders modal dialog when docService.isOpen is true", () => {
    docService.openHelp();
    fixture.detectChanges();

    const dialog = queryRequired(fixture, ".modal-dialog");
    expect(dialog).not.toBeNull();
    expect(queryText(fixture, ".game-title")).toContain("Klondike Solitaire");
  });

  it("switches tabs between Summary, Detailed Rules, and Options", () => {
    docService.openHelp();
    fixture.detectChanges();

    // Default tab is 'overview'
    expect(component.activeTab()).toBe("overview");
    expect(queryText(fixture, ".callout-title")).toContain("Objective & Win Condition");

    // Click Detailed Rules tab
    const el = fixture.nativeElement as HTMLElement;
    const tabs = el.querySelectorAll<HTMLButtonElement>(".tab-btn");
    tabs[1].click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe("rules");
    expect(queryText(fixture, ".rules-grid")).not.toBeNull();
  });

  it("does not render a screenshots tab button", () => {
    docService.openHelp();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>(".tab-btn"));
    const tabTexts = tabs.map((t) => t.textContent?.trim());
    expect(tabTexts.some((text) => text?.includes("Screenshots"))).toBe(false);
  });

  it("closes modal when clicking close button", () => {
    docService.openHelp();
    fixture.detectChanges();

    clickElement(fixture, ".btn-modal-close");
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector(".modal-backdrop")).toBeNull();
  });

  it("closes modal when pressing Escape key", () => {
    docService.openHelp();
    fixture.detectChanges();

    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(docService.isOpen()).toBe(false);
  });

  it("renders skeleton container without loaded class when image has not loaded", () => {
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

  it("resets active tab to overview when opening help for a game without variants after visiting options tab on a game with variants", () => {
    const catalogService = TestBed.inject(GameCatalogService);
    catalogService.select("klondike"); // Game with variants
    docService.openHelp();
    fixture.detectChanges();

    // Select Options & Variants tab
    const el = fixture.nativeElement as HTMLElement;
    const tabs = el.querySelectorAll<HTMLButtonElement>(".tab-btn");
    tabs[2].click();
    fixture.detectChanges();
    expect(component.activeTab()).toBe("variants");

    // Close help modal
    docService.closeHelp();
    fixture.detectChanges();

    // Switch to FreeCell (no variants) and open help
    catalogService.select("freecell");
    docService.openHelp();
    fixture.detectChanges();

    expect(component.activeTab()).toBe("overview");
    expect(queryText(fixture, ".callout-title")).toContain("Objective & Win Condition");
  });

  it("resets active tab to overview when closing modal", () => {
    docService.openHelp();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const tabs = el.querySelectorAll<HTMLButtonElement>(".tab-btn");
    tabs[1].click();
    fixture.detectChanges();
    expect(component.activeTab()).toBe("rules");

    docService.closeHelp();
    fixture.detectChanges();

    expect(component.activeTab()).toBe("overview");
  });
});
