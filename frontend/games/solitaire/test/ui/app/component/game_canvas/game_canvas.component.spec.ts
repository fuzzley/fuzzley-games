// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameCanvasComponent } from "@/ui/app/component/game_canvas/game_canvas.component";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import { query, queryAll, queryText } from "@test/support/dom";

/** One Phaser host the component built, and what it was handed. */
interface StartedHost {
  parent: HTMLElement;
  destroyed: boolean;
  makeScene: () => void;
}

/**
 * The hosts started so far, and the ready callback the board was given.
 *
 * Module state, because `vi.mock` factories are hoisted above everything and
 * cannot close over anything declared per-test. Reset in `beforeEach`.
 */
const started: StartedHost[] = [];
let readyCallback: (() => void) | undefined;

vi.mock("@/ui/app/provider/board_catalog", () => ({
  makeBoardScene: (
    _gameId: string,
    _game: unknown,
    _presentation: unknown,
    onReady?: () => void,
  ) => {
    readyCallback = onReady;
    return {};
  },
}));

vi.mock("@/engine/render/phaser/phaser_host", () => ({
  PhaserHost: class {
    private readonly record: StartedHost;

    constructor(
      _window: Window,
      parent: HTMLElement,
      makeBoardScene: () => void,
    ) {
      this.record = { parent, destroyed: false, makeScene: makeBoardScene };
    }

    start() {
      started.push(this.record);
      this.record.makeScene();
    }

    destroy() {
      this.record.destroyed = true;
    }
  },
}));

describe("GameCanvasComponent", () => {
  let fixture: ComponentFixture<GameCanvasComponent>;
  let catalog: GameCatalogService;

  beforeEach(async () => {
    localStorage.clear();
    location.hash = "";
    started.length = 0;
    readyCallback = undefined;

    await TestBed.configureTestingModule({
      imports: [GameCanvasComponent],
      providers: [GameCatalogService],
    }).compileComponents();

    catalog = TestBed.inject(GameCatalogService);
    fixture = TestBed.createComponent(GameCanvasComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    delete window.fsolitaire;
    vi.useRealTimers();
  });

  /** Reports the board ready, as a built scene does. */
  function boardReady(): void {
    readyCallback?.();
    fixture.detectChanges();
  }

  /** Whether the loading overlay is currently covering the board. */
  function isLoading(): boolean {
    return (
      query(fixture, ".loading-overlay")?.classList.contains("hidden") === false
    );
  }

  describe("the Phaser host", () => {
    it("starts exactly one game", () => {
      expect(started.length).toBe(1);
    });

    it("mounts the game into its own container element", () => {
      expect(started[0].parent).toBe(query(fixture, ".canvas-container"));
    });

    it("destroys the game when the host is torn down", () => {
      fixture.destroy();

      expect(started[0].destroyed).toBe(true);
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

    it("uncovers it once the scene is ready", () => {
      boardReady();

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

    it("marks the board busy while it builds", () => {
      expect(
        query(fixture, ".canvas-container")?.getAttribute("aria-busy"),
      ).toBe("true");
    });

    it("stops marking it busy once it is ready", () => {
      boardReady();

      expect(
        query(fixture, ".canvas-container")?.getAttribute("aria-busy"),
      ).toBe("false");
    });

    it("returns when a different game is chosen", () => {
      boardReady();

      catalog.select("spider");
      fixture.detectChanges();

      expect(isLoading()).toBe(true);
      expect(queryText(fixture, ".loading-text")).toContain("Loading Spider");
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
