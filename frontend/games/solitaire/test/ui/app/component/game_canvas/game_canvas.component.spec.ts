// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { InjectionToken } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameCanvasComponent } from "@/ui/app/component/game_canvas/game_canvas.component";

/** Records every game the component constructs, and what it was handed. */
const started: { parent: HTMLElement; destroyed: boolean }[] = [];

// The board catalog is the only thing here that names Phaser, whose module
// init does not survive jsdom. What this component does with a scene is the
// subject; building a real one is not.
vi.mock("@/ui/app/provider/board_catalog", () => ({
  GAME_BOARD_SCENE: new InjectionToken("GAME_BOARD_SCENE", {
    providedIn: "root",
    factory: () => ({}),
  }),
}));

vi.mock("@/games/klondike/solitaire", () => ({
  Solitaire: class {
    private readonly record: { parent: HTMLElement; destroyed: boolean };

    constructor(_window: Window, parent: HTMLElement) {
      this.record = { parent, destroyed: false };
    }

    start() {
      started.push(this.record);
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
    delete window.solitaire;
  });

  it("starts exactly one game", () => {
    expect(started.length).toBe(1);
  });

  it("mounts the game into its own host element", () => {
    expect(started[0].parent).toBe(fixture.nativeElement);
  });

  it("exposes the running game for console debugging", () => {
    expect(window.solitaire).toBeDefined();
  });

  it("destroys the game when the host is torn down", () => {
    fixture.destroy();

    expect(started[0].destroyed).toBe(true);
  });

  it("stops exposing the game once it is destroyed", () => {
    fixture.destroy();

    expect(window.solitaire).toBeUndefined();
  });
});
