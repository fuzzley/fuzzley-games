// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  BUG_REPORT_CONFIG,
  BugReportService,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { THEME_COLOR_ROLE } from "@fz/ui/theme";
import type { AppliedMove } from "@/engine/tableau/moves/move";
import type { GameSnapshot } from "@/engine/tableau/session/game_snapshot";
import { DEFAULT_DESKTOP_CARD_DECK } from "@/engine/render/deck/card_deck";
import {
  SolitaireReportSource,
  provideSolitaireReports,
} from "@/ui/app/bug_report/solitaire_report_source";
import { readGamePosition } from "@/ui/app/model/game_position";
import type { GameOptionValues } from "@/ui/app/provider/game_catalog";
import { provideAppRouter } from "@/ui/app/routes";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { GameMetricsService } from "@/ui/app/service/game_metrics.service";

/** Says what the page shows of the game on the table. */
interface Shown {
  readonly game: string;
  readonly rules: GameOptionValues;
  /** The board the canvas draws, with the moves undo can take back. */
  readonly snapshot: GameSnapshot;
  readonly score: number;
  readonly moves: number;
}

/** Returns the collection's reports, over the game a spec has left. */
function reports(): SolitaireReportSource {
  return TestBed.inject(SolitaireReportSource);
}

/** Returns the catalog, which holds the game on the table. */
function catalog(): GameCatalogService {
  return TestBed.inject(GameCatalogService);
}

/** Returns what the page shows of the game on the table. */
function shown(): Shown {
  TestBed.tick();
  const metrics = TestBed.inject(GameMetricsService);
  return {
    game: catalog().selectedId(),
    rules: catalog().optionValues(),
    snapshot: catalog().session().game.snapshot(),
    score: metrics.score(),
    moves: metrics.moves(),
  };
}

/**
 * Returns `moves` moves among the piles of a dealt game, each carrying a
 * run of one to three of its cards, as a long game's undo history holds.
 */
function longHistory(snapshot: GameSnapshot, moves: number): AppliedMove[] {
  const piles = snapshot.piles.map((pile) => pile.id);
  const cards = snapshot.deal;
  return Array.from({ length: moves }, (_, index): AppliedMove => {
    const run = (index % 3) + 1;
    const first = (index * 7) % (cards.length - run);
    return {
      kind: "move",
      transfers: [
        {
          cardIds: cards.slice(first, first + run),
          fromPileId: piles[index % piles.length],
          toPileId: piles[(index + 3) % piles.length],
          faceUpBefore: true,
        },
      ],
      scoreDelta: index % 5,
      flippedCardIds: index % 4 === 0 ? [cards[first]] : [],
    };
  });
}

/**
 * Puts Klondike on the table by Draw 1, dealt afresh, then arranges a game
 * under way there: `moves` moves to undo, at a score of its own.
 */
function klondikeUnderWay(moves: number, score = 35): void {
  catalog().load("klondike", { drawCount: 1 });
  const dealt = catalog().session().game.snapshot();
  catalog()
    .session()
    .game.restore({ ...dealt, history: longHistory(dealt, moves), score });
  TestBed.tick();
}

/** Resolves to what a question's asker made of it, once the player says yes. */
function sayingYes<T>(asking: Promise<T>): Promise<T> {
  TestBed.inject(ConfirmService).accept();
  return asking;
}

describe("SolitaireReportSource", () => {
  installCompressionStreams();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // The routed component hosts a Phaser canvas.
        provideAppRouter(),
        provideFakePhaserCanvas(),
        provideSolitaireReports(),
        // As main.ts provides it, so the palette asks the page nothing.
        { provide: THEME_COLOR_ROLE, useValue: null },
        // A deployed build's stamp, as long as the link ever carries.
        {
          provide: BUILD_INFO,
          useValue: {
            commit: "0123456",
            buildTime: "2026-11-22T12:00:00.000Z",
          },
        },
      ],
    });
    // Following the table from the first game, as the shell does.
    TestBed.inject(GameMetricsService);
  });

  it("files reports as the collection's, under its tag", () => {
    expect({ title: reports().title, tag: reports().tag }).toEqual({
      title: "Solitaire Collection",
      tag: "fs1",
    });
  });

  describe("the game", () => {
    it("names the game on the table and the rules a player chose", () => {
      catalog().load("klondike", { drawCount: 3, scoring: 1, almostWin: 1 });

      // Almost Win Mode is debug-only, so it is left out.
      expect(reports().game()).toBe(
        "Klondike · Variant: Klondike · Draw: Draw 3 · Scoring: Vegas",
      );
    });

    it("names a game with no rules to choose by its name alone", () => {
      catalog().load("freecell", {});

      expect(reports().game()).toBe("FreeCell");
    });
  });

  it("names the cards and the felt on the table", () => {
    expect(reports().settings()).toEqual([
      `Cards: ${DEFAULT_DESKTOP_CARD_DECK} deck (auto style), card-back-blue back, theme felt`,
    ]);
  });

  describe("the state", () => {
    it("takes the game on the table, its rules and its position", () => {
      klondikeUnderWay(4);

      expect(reports().capture()).toMatchObject({
        summary: "Score 35 · 4 moves",
        value: {
          gameId: "klondike",
          options: catalog().optionValues(),
          snapshot: catalog().session().game.snapshot(),
        },
      });
    });

    it("reads back as it was packed", async () => {
      klondikeUnderWay(4);
      const { value } = reports().capture();

      const read = readGamePosition(
        await unpackState("fs1", await packState("fs1", value)),
      );

      expect(read).toEqual(value);
    });

    it("fits the largest, a two-deck game far along, in the link with its newest undo steps", async () => {
      catalog().load("spider", {});
      const dealt = catalog().session().game.snapshot();
      catalog()
        .session()
        .game.restore({ ...dealt, history: longHistory(dealt, 1000) });
      const state = reports().capture();

      const link = await TestBed.inject(BugReportService).issueUrl(state);

      const field = new URL(link).searchParams.get("game-state") ?? "";
      const read = readGamePosition(await unpackState("fs1", field));
      const position = readGamePosition(state.value);
      const { history } = position.snapshot;
      const kept = read.snapshot.history.length;
      expect(link.length).toBeLessThanOrEqual(
        TestBed.inject(BUG_REPORT_CONFIG).maxUrlChars,
      );
      expect(kept).toBeGreaterThan(100);
      expect(field.split("\n")[0]).toBe(
        `Score ${dealt.score} · 1000 moves · ${kept} of 1000 undo steps`,
      );
      expect(read).toEqual({
        ...position,
        snapshot: { ...dealt, history: history.slice(1000 - kept) },
      });
    });
  });

  describe("a state loaded", () => {
    /**
     * Takes the state as a report does, packs it and reads it back, then
     * starts another game, by other rules, as the one who loads it may have.
     */
    async function reportAndPlayOn(): Promise<unknown> {
      const packed = await packState("fs1", reports().capture().value);
      catalog().load("freecell", {});
      klondikeUnderWay(2, 0);
      catalog().load("klondike", { drawCount: 3 });
      return unpackState("fs1", packed);
    }

    it("shows the game as it was reported", async () => {
      klondikeUnderWay(6);
      const reported = shown();
      const state = await reportAndPlayOn();

      await sayingYes(reports().load(state));

      expect(shown()).toEqual(reported);
    });

    it("loads the whole game-state field of a report", async () => {
      klondikeUnderWay(6);
      const reported = shown();
      const packed = await packState("fs1", reports().capture().value);
      catalog().load("freecell", {});

      const loaded = await TestBed.inject(BugReportService).load(
        `Score 35 · 6 moves\n\n\`\`\`\n${packed}\n\`\`\`\n`,
      );

      expect(loaded).toBe(true);
      expect(shown()).toEqual(reported);
    });

    it("asks before loading over a game in progress", async () => {
      klondikeUnderWay(6);
      const state = await reportAndPlayOn();
      klondikeUnderWay(2);

      void reports().load(state);

      expect(TestBed.inject(ConfirmService).prompt()).toMatchObject({
        title: "Load this game?",
        message: "You'll lose the game in progress.",
        confirmLabel: "Load",
      });
    });

    it("leaves the game in progress where the player says no", async () => {
      klondikeUnderWay(6);
      const state = await reportAndPlayOn();
      klondikeUnderWay(2);
      const before = shown();

      const loading = reports().load(state);
      TestBed.inject(ConfirmService).cancel();

      expect(await loading).toBe(false);
      expect(shown()).toEqual(before);
    });

    it("refuses a state that doesn't fit, naming its part, before asking", async () => {
      klondikeUnderWay(2);

      const loading = reports().load({ gameId: "klondike", options: {} });

      await expect(loading).rejects.toThrow(
        "position.snapshot is not an object.",
      );
      expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
    });
  });
});
