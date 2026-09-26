// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  BUG_REPORT_FIELDS,
  BugReportService,
} from "@/ui/app/service/bug_report.service";
import {
  BUG_REPORT_CONFIG,
  type BugReportConfig,
} from "@/ui/app/provider/bug_report_config";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { DEFAULT_CARD_DECK } from "@/engine/render/card_deck";
import { createMockGameModel } from "@test/support/ui/game_mock";
import {
  asCatalog,
  createMockCatalog,
  type MockCatalogHarness,
} from "@test/support/ui/catalog_mock";
import {
  asPresentation,
  createMockPresentation,
} from "@test/support/ui/presentation_mock";
import issueForm from "../../../../.github/ISSUE_TEMPLATE/bug_report.yml?raw";

const CONFIG: BugReportConfig = {
  newIssueUrl: "https://github.com/example/solitaire/issues/new",
  template: "bug_report.yml",
  commit: "0123abc",
};

interface Harness {
  readonly service: BugReportService;
  readonly catalog: MockCatalogHarness;
}

/** Builds the service over the mock catalog, filing against {@link CONFIG}. */
function buildService(config: Partial<BugReportConfig> = {}): Harness {
  const catalog = createMockCatalog(createMockGameModel());

  TestBed.configureTestingModule({
    providers: [
      { provide: GameCatalogService, useValue: asCatalog(catalog.catalog) },
      {
        provide: PresentationSettingsService,
        useValue: asPresentation(createMockPresentation()),
      },
      { provide: BUG_REPORT_CONFIG, useValue: { ...CONFIG, ...config } },
    ],
  });

  return { service: TestBed.inject(BugReportService), catalog };
}

/** One field of the report, as the issue form will receive it. */
function prefilled(service: BugReportService, fieldId: string): string | null {
  return new URL(service.issueUrl()).searchParams.get(fieldId);
}

/** The `id` of every field the issue form declares. */
function formFieldIds(form: string): string[] {
  return [...form.matchAll(/^\s+id:\s*(\S+)\s*$/gm)].map((match) => match[1]);
}

describe("BugReportService", () => {
  it("opens a new issue on the configured form", () => {
    const { service } = buildService();

    const url = new URL(service.issueUrl());

    expect(`${url.origin}${url.pathname}`).toBe(CONFIG.newIssueUrl);
    expect(url.searchParams.get("template")).toBe(CONFIG.template);
  });

  describe("the game", () => {
    it("names the game on the table and the rules a player chose", () => {
      const { service } = buildService();

      // Almost Win Mode is debug-only, so it is left out.
      expect(prefilled(service, BUG_REPORT_FIELDS.game)).toBe(
        "Klondike · Draw Mode: Draw 3",
      );
    });

    it("follows a change of rules", () => {
      const { service, catalog } = buildService();

      catalog.setOption("drawCount", 1);

      expect(prefilled(service, BUG_REPORT_FIELDS.game)).toBe(
        "Klondike · Draw Mode: Draw 1",
      );
    });

    it("names a game with no rules to choose by its name alone", () => {
      const { service, catalog } = buildService();

      catalog.select("freecell");

      expect(prefilled(service, BUG_REPORT_FIELDS.game)).toBe("FreeCell");
    });
  });

  describe("the environment", () => {
    it("says which build filed the report", () => {
      const { service } = buildService();

      expect(prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        "- Build: 0123abc",
      );
    });

    it("says when the build was not a deployed one", () => {
      const { service } = buildService({ commit: null });

      expect(prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        "- Build: local build",
      );
    });

    it("names the browser", () => {
      const { service } = buildService();

      expect(prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        `- Browser: ${navigator.userAgent}`,
      );
    });

    it("gives the size of the window", () => {
      const { service } = buildService();

      expect(prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        `- Window: ${window.innerWidth}×${window.innerHeight}`,
      );
    });

    it("names the cards and the felt on the table", () => {
      const { service } = buildService();

      expect(prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        `- Cards: ${DEFAULT_CARD_DECK} deck, card-back-blue back, green felt`,
      );
    });
  });

  it("fills in only fields the issue form has", () => {
    expect(formFieldIds(issueForm)).toEqual(
      expect.arrayContaining(Object.values(BUG_REPORT_FIELDS)),
    );
  });
});
