// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { InjectionToken } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameCanvasComponent } from "@/ui/app/component/game_canvas/game_canvas.component";

/** Records every game the component constructs, and what it was handed. */
const started: { parent: HTMLElement; destroyed: boolean; makeScene: () => void }[] = [];

// The board catalog is the only thing here that names Phaser, whose module
// init does not survive jsdom. What this component does with a scene is the
// subject; building a real one is not.
vi.mock("@/ui/app/provider/board_catalog", () => ({
  GAME_BOARD_SCENE: new InjectionToken("GAME_BOARD_SCENE", {
    providedIn: "root",
    factory: () => ({}),
  }),
  makeBoardScene: (_game: unknown, _presentation: unknown, onReady?: () => void) => {
    onReady?.();
    return {};
  },
}));

vi.mock("@/games/klondike/klondike", () => ({
  Klondike: class {
    private readonly record: { parent: HTMLElement; destroyed: boolean; makeScene: () => void };

    constructor(_window: Window, parent: HTMLElement, makeBoardScene: () => void) {
      this.record = { parent, destroyed: false, makeScene: makeBoardScene };
    }

    start() {
      started.push(this.record);
      // Simulate Phaser starting and triggering scene creation
      this.record.makeScene();
    }

    destroy() {
      this.record.destroyed = true;
    }
  },
}));

describe("GameCanvasComponent", () => {
  let fixture: ComponentFixture<GameCanvasComponent>;

  beforeEach(async () => {
    started.length = 0;

    await TestBed.configureTestingModule({
      imports: [GameCanvasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameCanvasComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    delete window.klondike;
  });

  it("starts exactly one game", () => {
    expect(started.length).toBe(1);
  });

  it("mounts the game into its own host element", () => {
    expect(started[0].parent).toBe(fixture.nativeElement);
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

  it("renders the loading placeholder element with proper accessibility attributes", () => {
    const overlay: HTMLElement | null = fixture.nativeElement.querySelector(".loading-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("role")).toBe("status");
  });

  it("hides the loading overlay once initialization ready is signaled", () => {
    const component = fixture.componentInstance;
    expect(component.isInitializing()).toBe(false);

    const overlay: HTMLElement | null = fixture.nativeElement.querySelector(".loading-overlay");
    expect(overlay?.classList.contains("hidden")).toBe(true);
  });

  it("displays the game name badge during loading", () => {
    const component = fixture.componentInstance;
    component.isInitializing.set(true);
    fixture.detectChanges();

    const textElement: HTMLElement | null = fixture.nativeElement.querySelector(".loading-text");
    expect(textElement?.textContent).toContain("Loading Klondike...");
  });
});
