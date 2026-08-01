// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";

describe("GameDocumentationService", () => {
  let service: GameDocumentationService;
  let catalog: GameCatalogService;

  beforeEach(() => {
    localStorage.clear();
    location.hash = "";

    TestBed.configureTestingModule({
      providers: [GameDocumentationService, GameCatalogService],
    });

    service = TestBed.inject(GameDocumentationService);
    catalog = TestBed.inject(GameCatalogService);
  });

  it("initializes with isOpen = false", () => {
    expect(service.isOpen()).toBe(false);
  });

  it("sets isOpen to true on openHelp()", () => {
    service.openHelp();
    expect(service.isOpen()).toBe(true);
  });

  it("sets isOpen to false on closeHelp()", () => {
    service.openHelp();
    service.closeHelp();
    expect(service.isOpen()).toBe(false);
  });

  it("toggles isOpen on toggleHelp()", () => {
    service.toggleHelp();
    expect(service.isOpen()).toBe(true);
  });

  it("provides documentation for every game entry defined in GAME_CATALOG", () => {
    for (const gameEntry of GAME_CATALOG) {
      const doc = service.getDocumentation(gameEntry.id);
      expect(
        doc,
        `Missing documentation entry for ${gameEntry.id}`,
      ).toBeDefined();
      expect(doc?.title.length).toBeGreaterThan(0);
      expect(doc?.summary.objective.length).toBeGreaterThan(0);
      expect(doc?.summary.winCondition.length).toBeGreaterThan(0);
    }
  });

  it("updates activeGameDoc signal dynamically when catalog selection changes", () => {
    catalog.select("spider");
    expect(service.activeGameDoc()?.title).toContain("Spider");
  });

  it("includes documentation explanations for all GameOptionSpecs defined in catalog", () => {
    for (const gameEntry of GAME_CATALOG) {
      const doc = service.getDocumentation(gameEntry.id);
      for (const optionSpec of gameEntry.options) {
        if (optionSpec.debugOnly) continue;
        const optionDoc = doc?.settingsAndVariants.find(
          (opt) => opt.optionId === optionSpec.id,
        );
        expect(
          optionDoc,
          `Game ${gameEntry.id} option ${optionSpec.id} missing explanation`,
        ).toBeDefined();
      }
    }
  });

  it("matches every documented choice value to a valid option choice in GAME_CATALOG", () => {
    for (const gameEntry of GAME_CATALOG) {
      const doc = service.getDocumentation(gameEntry.id);
      if (!doc) continue;

      for (const optionDoc of doc.settingsAndVariants) {
        const optionSpec = gameEntry.options.find(
          (opt) => opt.id === optionDoc.optionId,
        );
        expect(
          optionSpec,
          `Documented option ${optionDoc.optionId} does not exist in catalog for ${gameEntry.id}`,
        ).toBeDefined();

        for (const choiceDoc of optionDoc.choicesExplanation) {
          const choiceSpec = optionSpec?.choices.find(
            (c) => c.value === choiceDoc.value,
          );
          expect(
            choiceSpec,
            `Documented choice value ${choiceDoc.value} for ${optionDoc.optionId} does not exist in catalog for ${gameEntry.id}`,
          ).toBeDefined();
        }
      }
    }
  });
});
