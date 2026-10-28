// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { GameCanvasComponent } from "@/ui/app/component/game_canvas/game_canvas.component";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/view/presentation";
import { NO_INSETS } from "@fz/phaser/insets";
import {
  type FakeCanvasHost,
  FakePhaserCanvas,
  provideFakePhaserCanvas,
} from "@fz/phaser/testing";
import { query, queryAll, queryText } from "@test/support/dom";

/**
 * What the latest board was built with.
 *
 * Module state, because `vi.mock` factories are hoisted above everything and
 * cannot close over anything declared per-test. Reset in `beforeEach`.
 */
let built: { gameId: string; game: unknown; onReady?: () => void } | undefined;

vi.mock("@/ui/app/provider/board_catalog", () => ({
  makeBoardScene: (
    gameId: string,
    game: unknown,
    { onReady }: { onReady?: () => void },
  ) => {
    built = { gameId, game, onReady };
    return {};
  },
}));

describe("GameCanvasComponent", () => {
  let fixture: ComponentFixture<GameCanvasComponent>;
  let catalog: GameCatalogService;

  beforeEach(async () => {
    localStorage.clear();
    location.hash = "";
    built = undefined;

    await TestBed.configureTestingModule({
      imports: [GameCanvasComponent],
      providers: [
        GameCatalogService,
        provideFakePhaserCanvas({ readyAtOnce: false }),
      ],
    }).compileComponents();

    catalog = TestBed.inject(GameCatalogService);
    fixture = TestBed.createComponent(GameCanvasComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    delete window.fsolitaire;
    vi.useRealTimers();
  });

  /** Returns every Phaser host the canvas has made. */
  function hosts(): readonly FakeCanvasHost[] {
    return TestBed.inject(FakePhaserCanvas).hosts;
  }

  /** Returns the one Phaser host the canvas has made. */
  function host(): FakeCanvasHost {
    return TestBed.inject(FakePhaserCanvas).host;
  }

  /** Reports the board ready, as a built scene does. */
  async function boardReady(): Promise<void> {
    host().latest.ready();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Builds the latest board the canvas was shown, as Phaser does. */
  async function buildBoard(ready = vi.fn()): Promise<void> {
    const make = await host().latest.source();
    make({ insets: () => NO_INSETS, ready });
  }

  /**
   * Returns whether the loading overlay is covering the board, which the
   * canvas, whose styles jsdom doesn't have, does while it is loading.
   */
  function isLoading(): boolean {
    return (
      query(fixture, "fz-phaser-canvas")?.getAttribute("data-state") ===
      "loading"
    );
  }

  /** Returns the element the board is drawn in, as assistive technology sees it. */
  function board(): Element | null {
    return query(fixture, "[role=img]");
  }

  describe("the Phaser host", () => {
    it("starts exactly one game", () => {
      expect(hosts().length).toBe(1);
    });

    it("names the game, on the default felt until the board applies the player's", () => {
      expect(host().options).toEqual({
        title: "fSolitaire",
        background: DEFAULT_BACKGROUND_COLOR,
      });
    });

    it("builds the board of the game on the table", async () => {
      await buildBoard();

      expect({ gameId: built?.gameId, game: built?.game }).toEqual({
        gameId: "klondike",
        game: catalog.session().game,
      });
    });

    it("lets the board say it is ready", async () => {
      const ready = vi.fn();
      await buildBoard(ready);

      built?.onReady?.();

      expect(ready).toHaveBeenCalledOnce();
    });

    it("destroys the game when the host is torn down", () => {
      fixture.destroy();

      expect(host().destroyed).toBe(true);
    });

    it("shows the next game's board in the same game", () => {
      catalog.select("spider");

      fixture.detectChanges();

      // One game for the component's life, so every deal reuses its WebGL
      // context instead of leaving the old one for the garbage collector.
      expect(
        hosts().map(({ destroyed, shown }) => ({
          destroyed,
          boardsShown: shown.length,
        })),
      ).toEqual([{ destroyed: false, boardsShown: 2 }]);
    });

    it("reads the chrome's insets again when the stock changes side", async () => {
      const before = host().insetsRefreshed;

      TestBed.inject(PresentationSettingsService).setStockSide("right");
      fixture.detectChanges();
      await fixture.whenStable();

      // The rail on a sideways phone moves to the other edge without a resize.
      expect(host().insetsRefreshed).toBeGreaterThan(before);
    });

    it("keeps the board when the player chooses another deck", () => {
      TestBed.inject(PresentationSettingsService).setDesktopCardDeck("classic");

      fixture.detectChanges();

      // The board swaps the deck in itself; a new board would deal again.
      expect(hosts().map(({ shown }) => shown.length)).toEqual([1]);
    });

    it("exposes the running game for console debugging in development", () => {
      expect(window.fsolitaire).toBe(catalog.session().game);
    });

    it("stops exposing the game once it is destroyed", () => {
      fixture.destroy();

      expect(window.fsolitaire).toBeUndefined();
    });
  });

  describe("the loading overlay", () => {
    it("covers the board until the scene reports itself ready", () => {
      expect(isLoading()).toBe(true);
    });

    it("uncovers it once the scene is ready", async () => {
      await boardReady();

      expect(isLoading()).toBe(false);
    });

    it("names the game being dealt", () => {
      expect(queryText(fixture, ".loading-text")).toContain("Loading Klondike");
    });

    it("draws a placeholder for every pile the board will have", () => {
      expect(queryAll(fixture, ".skeleton-slot").length).toBe(
        KLONDIKE_LAYOUT.slots.length,
      );
    });

    it("describes the board as an image, not an application", () => {
      // `role="application"` suppresses a screen reader's browse mode and is
      // only honest once there is a keyboard interface to replace it with.
      expect(board()?.getAttribute("role")).toBe("img");
    });

    it("names the board after the game", () => {
      expect(board()?.getAttribute("aria-label")).toBe("Klondike board");
    });

    it("marks the board busy while it builds", () => {
      expect(board()?.getAttribute("aria-busy")).toBe("true");
    });

    it("stops marking it busy once it is ready", async () => {
      await boardReady();

      expect(board()?.getAttribute("aria-busy")).toBe("false");
    });

    it("returns when a different game is chosen", async () => {
      await boardReady();

      catalog.select("spider");
      fixture.detectChanges();

      expect(isLoading()).toBe(true);
      expect(queryText(fixture, ".loading-text")).toContain("Loading Spider");
    });
  });

  describe("the deck badge", () => {
    /** Returns whether the deck swap badge is showing. */
    function isSwappingDeck(): boolean {
      return (
        query(fixture, ".deck-badge")?.classList.contains("hidden") === false
      );
    }

    /** Says a deck is being fetched, as the board does. */
    function deckLoading(): void {
      TestBed.inject(PresentationSettingsService).reportCardDeckStatus({
        kind: "loading",
        deckId: "classic",
      });
      fixture.detectChanges();
    }

    it("stays out of the way while the table is up to date", () => {
      expect(isSwappingDeck()).toBe(false);
    });

    it("appears while a deck is on its way", () => {
      deckLoading();

      // The board stays playable through a swap, so this is a badge in the
      // corner rather than the overlay that covers the table for a deal.
      expect(isSwappingDeck()).toBe(true);
    });

    it("names the deck being fetched", () => {
      deckLoading();

      expect(queryText(fixture, ".deck-badge")).toContain("Loading Classic");
    });

    it("goes away once the board has drawn it", () => {
      const presentation = TestBed.inject(PresentationSettingsService);
      deckLoading();

      presentation.reportCardDeckStatus({ kind: "drawn", deckId: "classic" });
      fixture.detectChanges();

      expect(isSwappingDeck()).toBe(false);
    });

    it("goes away when the deck cannot be fetched at all", () => {
      const presentation = TestBed.inject(PresentationSettingsService);
      deckLoading();

      presentation.reportCardDeckStatus({
        kind: "unavailable",
        deckId: "classic",
      });
      fixture.detectChanges();

      // The drawer is where a player is told why; the badge only ever says
      // something is on its way, and by now nothing is.
      expect(isSwappingDeck()).toBe(false);
    });
  });

  describe("when a board never reports itself ready", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // A fresh fixture, so the timeout is armed while the timers are fake.
      fixture = TestBed.createComponent(GameCanvasComponent);
      fixture.detectChanges();
      vi.advanceTimersByTime(8000);
      fixture.detectChanges();
    });

    it("stops covering the board rather than spinning forever", () => {
      expect(isLoading()).toBe(false);
    });

    it("says what went wrong", () => {
      expect(queryText(fixture, ".loading-text")).toContain(
        "Board initialization timed out",
      );
    });
  });
});
