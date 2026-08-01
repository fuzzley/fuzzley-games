// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";
import { GAME_DOCUMENTATION_REGISTRY } from "@/ui/app/provider/game_documentation_data";

describe("GameDocumentationService", () => {
  let service: GameDocumentationService;
  let catalog: GameCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameDocumentationService, GameCatalogService],
    });

    service = TestBed.inject(GameDocumentationService);
    catalog = TestBed.inject(GameCatalogService);
  });

  it("initializes with isOpen = false", () => {
    expect(service.isOpen()).toBe(false);
  });

  it("toggles isOpen signal via openHelp(), closeHelp(), and toggleHelp()", () => {
    service.openHelp();
    expect(service.isOpen()).toBe(true);

    service.closeHelp();
    expect(service.isOpen()).toBe(false);

    service.toggleHelp();
    expect(service.isOpen()).toBe(true);
  });

  it("provides documentation for every game entry defined in GAME_CATALOG", () => {
    for (const gameEntry of GAME_CATALOG) {
      const doc = service.getDocumentation(gameEntry.id);
      expect(doc, `Missing documentation entry for ${gameEntry.id}`).toBeDefined();
      expect(doc?.gameId).toBe(gameEntry.id);
      expect(doc?.title.length).toBeGreaterThan(0);
      expect(doc?.summary.objective.length).toBeGreaterThan(0);
      expect(doc?.summary.winCondition.length).toBeGreaterThan(0);
    }
  });

  it("updates activeGameDoc signal dynamically when catalog selection changes", () => {
    catalog.select("klondike");
    expect(service.activeGameDoc().gameId).toBe("klondike");

    catalog.select("freecell");
    expect(service.activeGameDoc().gameId).toBe("freecell");

    catalog.select("spider");
    expect(service.activeGameDoc().gameId).toBe("spider");
  });

  it("includes documentation explanations for all GameOptionSpecs defined in catalog", () => {
    for (const gameEntry of GAME_CATALOG) {
      const doc = service.getDocumentation(gameEntry.id);
      for (const optionSpec of gameEntry.options) {
        if (optionSpec.debugOnly) continue;
        const optionDoc = doc?.settingsAndVariants.find(
          (opt) => opt.optionId === optionSpec.id
        );
        expect(
          optionDoc,
          `Game ${gameEntry.id} option ${optionSpec.id} missing explanation`
        ).toBeDefined();
      }
    }
  });
});
