// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { InjectionToken } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameCanvasComponent } from "@/ui/app/component/game_canvas/game_canvas.component";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { query, queryAll } from "@test/support/dom";

/** Records every game the component constructs, and what it was handed. */
const started: {
  parent: HTMLElement;
  destroyed: boolean;
  makeScene: () => void;
}[] = [];

let readyCallback: (() => void) | undefined;

vi.mock("@/ui/app/provider/board_catalog", () => ({
  GAME_BOARD_SCENE: new InjectionToken("GAME_BOARD_SCENE", {
    providedIn: "root",
    factory: () => ({}),
  }),
  makeBoardScene: (
    _game: unknown,
    _presentation: unknown,
    onReady?: () => void,
  ) => {
    readyCallback = onReady;
    return {};
  },
}));

vi.mock("@/games/klondike/klondike", () => ({
  Klondike: class {
    private readonly record: {
      parent: HTMLElement;
      destroyed: boolean;
      makeScene: () => void;
    };

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
    delete window.klondike;
  });

  it("starts exactly one game", () => {
    expect(started.length).toBe(1);
  });

  it("mounts the game into its own canvasHost container element", () => {
    const container = query(fixture, ".canvas-container");
    expect(started[0].parent).toBe(container);
  });

  it("exposes the running game for console debugging", () => {
    expect(window.klondike).toBeDefined();
  });

  it("destroys the game when the host is torn down", () => {
    fixture.destroy();
    expect(started[0].destroyed).toBe(true);
  });

  it("stops exposing the game once it is destroyed", () => {
    fixture.destroy();
    expect(window.klondike).toBeUndefined();
  });

  it("shows loading overlay before ready callback fires", () => {
    const overlay = query(fixture, ".loading-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.classList.contains("hidden")).toBe(false);
  });

  it("hides the loading overlay once ready is signaled asynchronously", () => {
    readyCallback?.();
    fixture.detectChanges();

    const overlay = query(fixture, ".loading-overlay");
    expect(overlay).toBeNull();
  });

  it("displays the game name badge during loading", () => {
    const textElement = query(fixture, ".loading-text");
    expect(textElement?.textContent).toContain("Loading Klondike");
  });

  it("renders the layout grid slots matching TableLayoutSpec slot count", () => {
    const slots = queryAll(fixture, ".skeleton-slot");
    expect(slots.length).toBe(7 + 1 + 1 + 4); // 7 tableau, 1 stock, 1 waste, 4 foundations
  });

  it("re-shows loading overlay when switching games in catalog", () => {
    readyCallback?.();
    fixture.detectChanges();

    catalog.select("spider");
    fixture.detectChanges();

    const overlay = query(fixture, ".loading-overlay");
    expect(overlay).not.toBeNull();
    expect(query(fixture, ".loading-text")?.textContent).toContain(
      "Loading Spider",
    );
  });
});
