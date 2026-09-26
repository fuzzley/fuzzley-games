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
import { decodePosition } from "@/ui/app/model/game_position";
import { DEFAULT_CARD_DECK } from "@/engine/render/card_deck";
import type { GameSnapshot } from "@/engine/tableau/game_snapshot";
import type { AppliedMove } from "@/engine/tableau/move";
import {
  createMockGameModel,
  type MockGameModel,
  type MockGameModelOverrides,
} from "@test/support/ui/game_mock";
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
  maxUrlChars: 6000,
};

interface Harness {
  readonly service: BugReportService;
  readonly catalog: MockCatalogHarness;
  readonly model: MockGameModel;
}

/** Builds the service over the mock catalog, filing against {@link CONFIG}. */
function buildService(
  config: Partial<BugReportConfig> = {},
  game: MockGameModelOverrides = {},
): Harness {
  const model = createMockGameModel(game);
  const catalog = createMockCatalog(model);

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

  return { service: TestBed.inject(BugReportService), catalog, model };
}

/** The link the service builds for the game on the table. */
function reportUrl(service: BugReportService): Promise<string> {
  return service.issueUrl(service.draft());
}

/** One field of the report, as the issue form will receive it. */
async function prefilled(
  service: BugReportService,
  fieldId: string,
): Promise<string> {
  return new URL(await reportUrl(service)).searchParams.get(fieldId) ?? "";
}

/** A snapshot with a long history of distinct actions, newest last. */
function longHistory(actions: number): GameSnapshot {
  const history = Array.from({ length: actions }, (_, index): AppliedMove => ({
    kind: "move",
    transfers: [
      {
        cardIds: [`card-${index}`],
        fromPileId: `tableau-${index % 7}`,
        toPileId: `tableau-${(index + 3) % 7}`,
        faceUpBefore: true,
      },
    ],
    scoreDelta: index,
    flippedCardIds: [],
  }));
  return {
    piles: [],
    score: 0,
    moves: actions,
    history,
    deal: [],
    extra: null,
  };
}

/** The `id` of every field the issue form declares. */
function formFieldIds(form: string): string[] {
  return [...form.matchAll(/^\s+id:\s*(\S+)\s*$/gm)].map((match) => match[1]);
}

describe("BugReportService", () => {
  it("opens a new issue on the configured form", async () => {
    const { service } = buildService();

    const url = new URL(await reportUrl(service));

    expect(`${url.origin}${url.pathname}`).toBe(CONFIG.newIssueUrl);
    expect(url.searchParams.get("template")).toBe(CONFIG.template);
  });

  describe("the game", () => {
    it("names the game on the table and the rules a player chose", async () => {
      const { service } = buildService();

      // Almost Win Mode is debug-only, so it is left out.
      expect(await prefilled(service, BUG_REPORT_FIELDS.game)).toBe(
        "Klondike · Draw Mode: Draw 3",
      );
    });

    it("follows a change of rules", async () => {
      const { service, catalog } = buildService();

      catalog.setOption("drawCount", 1);

      expect(await prefilled(service, BUG_REPORT_FIELDS.game)).toBe(
        "Klondike · Draw Mode: Draw 1",
      );
    });

    it("names a game with no rules to choose by its name alone", async () => {
      const { service, catalog } = buildService();

      catalog.select("freecell");

      expect(await prefilled(service, BUG_REPORT_FIELDS.game)).toBe("FreeCell");
    });
  });

  describe("the environment", () => {
    it("says which build filed the report", async () => {
      const { service } = buildService();

      expect(await prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        "- Build: 0123abc",
      );
    });

    it("says when the build was not a deployed one", async () => {
      const { service } = buildService({ commit: null });

      expect(await prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        "- Build: local build",
      );
    });

    it("names the browser", async () => {
      const { service } = buildService();

      expect(await prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        `- Browser: ${navigator.userAgent}`,
      );
    });

    it("gives the size of the window", async () => {
      const { service } = buildService();

      expect(await prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        `- Window: ${window.innerWidth}×${window.innerHeight}`,
      );
    });

    it("names the cards and the felt on the table", async () => {
      const { service } = buildService();

      expect(await prefilled(service, BUG_REPORT_FIELDS.environment)).toContain(
        `- Cards: ${DEFAULT_CARD_DECK} deck, card-back-blue back, green felt`,
      );
    });
  });

  describe("the game state", () => {
    it("attaches the game on the table, its rules and its snapshot", async () => {
      const { service, model } = buildService();

      const field = await prefilled(service, BUG_REPORT_FIELDS.gameState);

      expect(await decodePosition(field)).toEqual({
        gameId: "klondike",
        options: { drawCount: 3, almostWin: 0 },
        snapshot: model.snapshot(),
      });
    });

    it("sums up what it attaches", async () => {
      const { service } = buildService({}, { score: 35, moves: 12 });

      expect(await prefilled(service, BUG_REPORT_FIELDS.gameState)).toContain(
        "Score 35 · 12 moves · 0 of 0 undo steps",
      );
    });

    it("keeps the link within the limit when the history is long", async () => {
      const { service, model } = buildService({ maxUrlChars: 2500 });
      model.snapshot.mockReturnValue(longHistory(300));

      const url = await reportUrl(service);

      expect(url.length).toBeLessThanOrEqual(2500);
    });

    it("keeps the newest of a history too long to attach whole", async () => {
      const { service, model } = buildService({ maxUrlChars: 2500 });
      const snapshot = longHistory(300);
      model.snapshot.mockReturnValue(snapshot);

      const field = await prefilled(service, BUG_REPORT_FIELDS.gameState);

      const kept = (await decodePosition(field)).snapshot.history;
      expect(kept.length).toBeGreaterThan(0);
      expect(kept.length).toBeLessThan(300);
      expect(kept).toEqual(snapshot.history.slice(300 - kept.length));
    });

    it("says how much of a long history it kept", async () => {
      const { service, model } = buildService({ maxUrlChars: 2500 });
      model.snapshot.mockReturnValue(longHistory(300));

      expect(await prefilled(service, BUG_REPORT_FIELDS.gameState)).toMatch(
        /· \d+ of 300 undo steps/,
      );
    });

    it("says so when not even the board fits", async () => {
      const { service } = buildService({ maxUrlChars: 0 });

      expect(await prefilled(service, BUG_REPORT_FIELDS.gameState)).toBe(
        "The game state was too large to attach.",
      );
    });
  });

  it("fills in only fields the issue form has", () => {
    expect(formFieldIds(issueForm)).toEqual(
      expect.arrayContaining(Object.values(BUG_REPORT_FIELDS)),
    );
  });
});
