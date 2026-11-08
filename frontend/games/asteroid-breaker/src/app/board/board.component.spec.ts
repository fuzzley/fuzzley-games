import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import { NO_INSETS } from "@fz/phaser/insets";
import {
  type CssRect,
  type Viewport,
  canvasPixelRatio,
} from "@fz/phaser/layout";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  type SceneRun,
  provideFakePhaserCanvas,
  runScene,
} from "@fz/phaser/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import type { WaveEntry } from "../../rules/waves/waves";
import { cacheSounds, humsIn } from "../../testing/belt_board";
import {
  FRAME_MS,
  ROOMY,
  SPACE,
  SPEC_WAVE,
  clearIn,
  clearToNext,
  loseShip,
  pauseIn,
  playToClear,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { paintRoles } from "../../testing/roles";
import { CLEARED_BUZZ, LOST_BUZZ } from "../../view/effects/haptics";
import {
  type BoardSetting,
  type PixelRect,
  deckLayout,
  fieldMetrics,
  fieldShape,
} from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { type Settings, SettingsService } from "../settings/settings.service";
import { BoardComponent } from "./board.component";

/** The longest the scene plays a wave for before a spec gives up on it. */
const WAVE_LIMIT_MS = 30_000;

/** How the board lays the field out on a compact touch screen, its deck showing. */
const TOUCH: BoardSetting = { ...ROOMY, marginCss: 12, deck: true };

/** A canvas of 1280 by 720 CSS px, at one device pixel to one, with no insets. */
const CANVAS_1280: Viewport = {
  width: 1280,
  height: 720,
  pixelRatio: 1,
  insets: NO_INSETS,
};

/**
 * A canvas wider than a field of the longest shape fills: 2400 by 720 CSS px,
 * at one device pixel to one.
 */
const WIDE_CANVAS: Viewport = { ...CANVAS_1280, width: 2400 };

/** A field of the narrowest shape, the first wave's before the board is measured. */
const SQUARE = { width: FIELD_SHORT_SIDE, height: FIELD_SHORT_SIDE };

/**
 * Stands in for the browser's `ResizeObserver`, which jsdom lacks: the spec
 * says when what it watches was laid out anew.
 */
class FakeResizeObserver implements ResizeObserver {
  /** Every one made since the spec stood them in. */
  static made: FakeResizeObserver[] = [];
  readonly watched = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.made.push(this);
  }

  observe(target: Element): void {
    this.watched.add(target);
  }

  unobserve(target: Element): void {
    this.watched.delete(target);
  }

  disconnect(): void {
    this.watched.clear();
  }

  /** Tells it what it watches was laid out anew, if it watches anything. */
  resized(): void {
    if (this.watched.size > 0) this.callback([], this);
  }
}

/** Stands the fake `ResizeObserver` in for the specs of the describe it is called in. */
function watchResizes(): void {
  beforeEach(() => {
    FakeResizeObserver.made = [];
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}

/** Lays the board out at a size in CSS px, as a browser would, and tells what watches it. */
function resize(board: HTMLElement, width: number, height: number): void {
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, width, height),
  );
  for (const observer of FakeResizeObserver.made) observer.resized();
}

/**
 * Returns where the scene lays the first wave's field out on a canvas of a
 * size in CSS px, at a pixel ratio, 1 unless given, inside its insets.
 */
function fieldOn(
  width: number,
  height: number,
  board: BoardSetting,
  {
    pixelRatio = 1,
    insets = NO_INSETS,
  }: Partial<Omit<Viewport, "width" | "height">> = {},
): CssRect {
  const canvas = {
    width: width * pixelRatio,
    height: height * pixelRatio,
    pixelRatio,
    insets,
  };
  return fieldMetrics(canvas, board, fieldShape(canvas, board, SQUARE)).css;
}

/**
 * Returns a rectangle on a canvas at one device pixel to a CSS pixel as the
 * layout check reads it: "x y width height".
 */
function wordsOf({ x, y, width, height }: PixelRect): string {
  return `${String(x)} ${String(y)} ${String(width)} ${String(height)}`;
}

/** Returns the styles that lay an element over a rectangle, as the board writes them. */
function placedOver(rect: CssRect): Record<string, string> {
  return {
    left: `${String(rect.x)}px`,
    top: `${String(rect.y)}px`,
    width: `${String(rect.width)}px`,
    height: `${String(rect.height)}px`,
  };
}

/** Renders the board beside a button outside it, on a fake canvas. */
async function renderBoard(
  options: FakeCanvasOptions = {},
  waves?: readonly WaveEntry[],
): Promise<{
  board: HTMLElement;
  component: BoardComponent;
  game: GameService;
  fake: FakePhaserCanvas;
  detectChanges: () => void;
}> {
  const view = await render(
    `<app-board /><button type="button">Elsewhere</button>`,
    {
      imports: [BoardComponent],
      providers: [provideFakePhaserCanvas(options), ...provideSpecWaves(waves)],
    },
  );
  return {
    board: screen.getByRole("application"),
    component: view.fixture.debugElement
      .query(By.directive(BoardComponent))
      .injector.get(BoardComponent),
    game: TestBed.inject(GameService),
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges: () => {
      view.detectChanges();
    },
  };
}

/** Returns the board's game with its run at one of the specs' waves, waiting for its first move. */
async function renderAt(wave: number): Promise<{
  board: HTMLElement;
  game: GameService;
  detectChanges: () => void;
}> {
  const rendered = await renderBoard();
  await rendered.game.startAt(wave);
  rendered.detectChanges();
  return rendered;
}

/** Returns the board's game with its run's wave started by a first move. */
async function startedAt(wave: number): Promise<{
  board: HTMLElement;
  game: GameService;
  detectChanges: () => void;
}> {
  const rendered = await renderAt(wave);
  rendered.game.tick(FRAME_MS, shoot(rendered.game));
  rendered.detectChanges();
  return rendered;
}

/** Changes the player's settings, once the board is rendered. */
function useSettings(change: Partial<Settings>): void {
  TestBed.inject(SettingsService).update(change);
}

describe("BoardComponent", () => {
  describe("the board", () => {
    it("is named for the wave on it, and described by its keys", async () => {
      await renderBoard();

      const board = screen.getByRole("application", {
        name: "Asteroid Breaker, wave 1: Pebble",
      });
      expect(board).toHaveAccessibleDescription(
        /^The left and right arrow keys/,
      );
    });

    it("hears the keys on its own element, through Phaser, and keeps the right button's menu shut", async () => {
      const { board, fake } = await renderBoard();

      expect(fake.host.options.config).toMatchObject({
        disableContextMenu: true,
        input: { keyboard: { target: board } },
      });
    });

    it("takes the focus for a press on it", async () => {
      const { board } = await renderBoard();

      fireEvent.pointerDown(board);

      expect(board).toHaveFocus();
    });

    it("marks the pointer as the ship's aim while a ship flies", async () => {
      const { board } = await startedAt(SPEC_WAVE.gift);

      expect(board).toHaveClass("in-play");
    });

    it("shows the plain pointer while the wave waits for its first move", async () => {
      const { board } = await renderAt(SPEC_WAVE.gift);

      expect(board).not.toHaveClass("in-play");
    });

    it("shows the plain pointer while the next wave waits for its first move", async () => {
      const { board, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      clearToNext(game);
      detectChanges();

      expect(board).not.toHaveClass("in-play");
    });

    describe("on a compact screen", () => {
      let viewport: FakeViewport | null = null;

      beforeEach(() => {
        viewport = installFakeViewport(390, 844);
      });

      afterEach(() => {
        viewport?.restore();
        viewport = null;
      });

      it("keeps its cards the margin in that the scene keeps the field", async () => {
        const { board } = await renderBoard();

        expect(board.style.getPropertyValue("--margin")).toBe(
          `${String(TOUCH.marginCss)}px`,
        );
      });
    });

    it("lets nothing go on while the scene is still loading", async () => {
      const { game } = await renderBoard({ readyAtOnce: false });

      expect(game.drawn()).toBe(false);
    });
  });

  describe("the placeholder", () => {
    watchResizes();

    it("draws the empty field where the scene will lay it out", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, 1280, 720);
      detectChanges();

      // The placeholder is only drawn, so it has no role to find it by.
      expect(board.querySelector(".field")).toHaveStyle(
        placedOver(fieldOn(1280, 720, ROOMY)),
      );
    });

    it("lays the cards over the field, before the scene has drawn it", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, 1280, 720);
      detectChanges();

      // The card's element is only the layer a card shows in, with no role.
      expect(board.querySelector("app-board-card")).toHaveStyle(
        placedOver(fieldOn(1280, 720, ROOMY)),
      );
    });

    it("draws the empty field clear of the insets the board declares for the canvas", async () => {
      const { board, detectChanges } = await renderBoard();
      board.style.setProperty("--fz-canvas-inset-top", "120px");

      resize(board, 1280, 720);
      detectChanges();

      expect(board.querySelector(".field")).toHaveStyle(
        placedOver(
          fieldOn(1280, 720, ROOMY, {
            insets: { ...NO_INSETS, top: 120 },
          }),
        ),
      );
    });

    it("draws the empty field in CSS pixels on a screen of two device pixels to one", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
      const { board, detectChanges } = await renderBoard();

      resize(board, 1280, 720);
      detectChanges();

      expect(board.querySelector(".field")).toHaveStyle(
        placedOver(
          fieldOn(1280, 720, ROOMY, { pixelRatio: canvasPixelRatio(2) }),
        ),
      );
    });

    it("publishes the pixel ratio it lays the empty field out at, as the canvas renders at", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);

      const { board } = await renderBoard();

      expect(board.style.getPropertyValue("--pixel-ratio")).toBe(
        String(canvasPixelRatio(2)),
      );
    });

    it("draws the empty field clear of the deck where the settings always show it", async () => {
      const { board, detectChanges } = await renderBoard();
      useSettings({ deck: "always" });

      resize(board, 1280, 720);
      detectChanges();

      expect(board.querySelector(".field")).toHaveStyle(
        placedOver(fieldOn(1280, 720, { ...ROOMY, deck: true })),
      );
    });

    describe("on a touch screen", () => {
      let viewport: FakeViewport | null = null;

      beforeEach(() => {
        viewport = installFakeViewport(390, 844);
        viewport.setCoarsePointer(true);
      });

      afterEach(() => {
        viewport?.restore();
        viewport = null;
      });

      it("draws the empty field clear of the deck", async () => {
        const { board, detectChanges } = await renderBoard();

        resize(board, 390, 780);
        detectChanges();

        expect(board.querySelector(".field")).toHaveStyle(
          placedOver(fieldOn(390, 780, TOUCH)),
        );
      });

      it("draws the empty field with no deck where the settings never show it", async () => {
        const { board, detectChanges } = await renderBoard();
        useSettings({ deck: "never" });

        resize(board, 390, 780);
        detectChanges();

        expect(board.querySelector(".field")).toHaveStyle(
          placedOver(fieldOn(390, 780, { ...TOUCH, deck: false })),
        );
      });
    });

    it("lays the cards over the field as the board is first drawn, before the browser reports its size", async () => {
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 1280, 720),
      );

      const { board } = await renderBoard();

      // The card's element is only the layer a card shows in, with no role.
      expect(board.querySelector("app-board-card")).toHaveStyle(
        placedOver(fieldOn(1280, 720, ROOMY)),
      );
    });

    it("stretches a paused field to the room it measures, before the scene lays it out", async () => {
      const { board, game, detectChanges } = await renderBoard();
      pauseIn(game);

      resize(board, 1280, 720);
      detectChanges();

      expect(game.frame().field.torus).toEqual(
        fieldShape(CANVAS_1280, ROOMY, SQUARE),
      );
    });

    it("shapes the waiting field for the room it measures, before the scene lays it out", async () => {
      const { board, game, detectChanges } = await renderBoard();

      resize(board, 1280, 720);
      detectChanges();

      expect(game.frame().field.torus).toEqual(
        fieldShape(CANVAS_1280, ROOMY, SQUARE),
      );
    });

    it("stops watching the board once it is gone", async () => {
      const { fixture } = await render(BoardComponent, {
        providers: [provideFakePhaserCanvas(), ...provideSpecWaves()],
      });

      fixture.destroy();

      expect(FakeResizeObserver.made.map((made) => made.watched.size)).toEqual([
        0,
      ]);
    });
  });

  describe("its card", () => {
    it("is told the ship flies by the keys, on a screen with no touch", async () => {
      await renderBoard();

      expect(
        screen.getByText("Arrows or W A D to fly, Space to fire."),
      ).toBeInTheDocument();
    });

    describe("on a touch screen", () => {
      let viewport: FakeViewport | null = null;

      beforeEach(() => {
        viewport = installFakeViewport(390, 844);
        viewport.setCoarsePointer(true);
      });

      afterEach(() => {
        viewport?.restore();
        viewport = null;
      });

      it("is told the ship flies by the deck", async () => {
        await renderBoard();

        expect(
          screen.getByText("Steer with the left pad, fire with the right."),
        ).toBeInTheDocument();
      });

      it("is told which side the settings put the stick on, and that the ship fires by itself", async () => {
        const { detectChanges } = await renderBoard();

        useSettings({ stickOnRight: true, fireByItself: true });
        detectChanges();

        expect(
          screen.getByText(
            "Steer with the right pad; the ship fires by itself.",
          ),
        ).toBeInTheDocument();
      });
    });

    it("hands the board back the focus as Resume goes on", async () => {
      const { board, game, detectChanges } = await startedAt(SPEC_WAVE.gift);
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect(board).toHaveFocus();
    });

    it("hands the board back the focus as Next wave goes on", async () => {
      const { board, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      clearIn(game);
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Next wave" }));

      expect(board).toHaveFocus();
    });

    it("is told the board couldn't be drawn", async () => {
      const { fake, detectChanges } = await renderBoard({ readyAtOnce: false });

      fake.host.latest.fail();
      await Promise.resolve();
      detectChanges();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "The board couldn't be drawn",
      );
    });

    describe("on a slow connection", () => {
      beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("is told the board is still loading", async () => {
        const { detectChanges } = await renderBoard({ readyAtOnce: false });

        vi.advanceTimersByTime(8_000);
        detectChanges();

        expect(screen.getByRole("status")).toHaveTextContent(
          "Still loading the board",
        );
      });
    });
  });

  describe("haptics", () => {
    let vibrate: ReturnType<typeof vi.fn<(pattern: VibratePattern) => boolean>>;

    beforeEach(() => {
      vibrate = vi.fn<(pattern: VibratePattern) => boolean>(() => true);
      Object.defineProperty(navigator, "vibrate", {
        value: vibrate,
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, "vibrate");
    });

    it("buzz the phone once, firmly, as a ship is lost", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);

      loseShip(game);
      detectChanges();

      expect(vibrate.mock.calls).toEqual([[LOST_BUZZ]]);
    });

    it("buzz the phone twice, lightly, as a wave is cleared", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      playToClear(game);
      detectChanges();

      expect(vibrate.mock.calls).toEqual([[CLEARED_BUZZ]]);
    });

    it("buzz nothing where the settings turn the haptics off", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);
      useSettings({ haptics: false });

      loseShip(game);
      detectChanges();

      expect(vibrate).not.toHaveBeenCalled();
    });

    it("buzz nothing for a ship lost while they were off, as they come back on", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);
      useSettings({ haptics: false });
      loseShip(game);
      detectChanges();

      useSettings({ haptics: true });
      detectChanges();

      expect(vibrate).not.toHaveBeenCalled();
    });

    it("buzz nothing, and go on, where the phone can't buzz", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.pebble);
      Reflect.deleteProperty(navigator, "vibrate");

      loseShip(game);
      detectChanges();

      expect(game.ships()).toBe(2);
    });
  });

  describe("with the scene it loads", () => {
    let scene: SceneRun<HostedScene> | null = null;

    beforeEach(() => {
      paintRoles();
    });

    afterEach(() => {
      scene?.destroy();
      scene = null;
      document.documentElement.removeAttribute("style");
    });

    /**
     * Runs the scene the board hands its canvas, as Phaser would, on a canvas
     * of a size in CSS px.
     */
    async function runBoardScene(
      canvas: { width?: number; height?: number } = {},
    ): Promise<{
      board: HTMLElement;
      component: BoardComponent;
      game: GameService;
      run: SceneRun<HostedScene>;
      detectChanges: () => void;
    }> {
      const { board, component, game, fake, detectChanges } =
        await renderBoard();
      const make = await fake.host.latest.source();
      const run = await runScene(make, {
        ...canvas,
        config: { input: { keyboard: { target: board } } },
      });
      scene = run;
      run.advance(FRAME_MS);
      return { board, component, game, run, detectChanges };
    }

    it("publishes where the scene laid the field out, and lays the focus ring there", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      const [x, y, width, height] = (board.dataset["field"] ?? "").split(" ");
      // The ring is only drawn, so it has no role to find it by.
      expect(board.querySelector(".ring")).toHaveStyle({
        left: `${String(x)}px`,
        top: `${String(y)}px`,
        width: `${String(width)}px`,
        height: `${String(height)}px`,
      });
    });

    it("publishes the field's shape in its units as the scene laid it out, its short side 40", async () => {
      const { board, detectChanges } = await runBoardScene({
        width: 1280,
        height: 720,
      });

      detectChanges();

      const [, , width = 0, height = 0] = (board.dataset["field"] ?? "")
        .split(" ")
        .map(Number);
      const across = Number(board.style.getPropertyValue("--across"));
      const down = Number(board.style.getPropertyValue("--down"));
      expect({
        unit: height / down,
        short: Math.min(across, down),
      }).toEqual({
        unit: expect.closeTo(width / across, 6) as unknown,
        short: FIELD_SHORT_SIDE,
      });
    });

    it("publishes the room the scene laid the field out in, inside its frame, wider than a field of the longest shape", async () => {
      const { board, game, detectChanges } = await runBoardScene({
        width: WIDE_CANVAS.width,
        height: WIDE_CANVAS.height,
      });

      detectChanges();

      const { room } = fieldMetrics(
        WIDE_CANVAS,
        ROOMY,
        game.frame().field.torus,
      );
      expect(board.dataset["room"]).toBe(wordsOf(room));
    });

    it("publishes where the deck's zones lie, by their names, where the deck shows", async () => {
      const { board, game, run, detectChanges } = await runBoardScene({
        width: 1280,
        height: 720,
      });

      useSettings({ deck: "always" });
      run.advance(FRAME_MS);
      run.advance(FRAME_MS);
      detectChanges();

      const deck = deckLayout(
        CANVAS_1280,
        { ...ROOMY, deck: true },
        game.frame().field.torus,
      );
      if (!deck) throw new Error("The deck shows on a canvas of 1280 by 720.");
      expect(board.dataset["deck"]).toBe(
        `stick ${wordsOf(deck.stick)}, buttons ${wordsOf(deck.buttons)}`,
      );
    });

    it("publishes no deck where it doesn't show", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      expect(board.dataset["deck"]).toBeUndefined();
    });

    it("hands the game the room the scene laid the field out in", async () => {
      const { game } = await runBoardScene({ width: 1280, height: 720 });

      expect(game.frame().field.torus.width).toBeGreaterThan(FIELD_SHORT_SIDE);
    });

    describe("as the board is measured", () => {
      watchResizes();

      it("leaves the field's shape to the scene once the scene has laid it out", async () => {
        const { board, game, detectChanges } = await runBoardScene({
          width: 1280,
          height: 720,
        });
        detectChanges();
        const { torus } = game.frame().field;

        resize(board, 390, 780);
        detectChanges();

        expect(game.frame().field.torus).toEqual(torus);
      });
    });

    it("lays the field out again for no setting but those it is laid out by", async () => {
      const { game, run } = await runBoardScene();
      const setRoom = vi.spyOn(game, "setRoom");

      useSettings({ haptics: false });
      run.advance(FRAME_MS);

      expect(setRoom).not.toHaveBeenCalled();
    });

    it("lets the scene be heard while the settings want sound", async () => {
      const { run } = await runBoardScene();

      run.advance(FRAME_MS);

      expect(run.scene.sound.mute).toBe(false);
    });

    it("mutes the scene while the settings turn the sound off", async () => {
      const { run } = await runBoardScene();
      useSettings({ sound: false });

      run.advance(FRAME_MS);

      expect(run.scene.sound.mute).toBe(true);
    });

    it("has the scene hum nothing before the ship thrusts", async () => {
      const { run } = await runBoardScene();
      cacheSounds(run.scene);

      run.advance(FRAME_MS);

      expect(humsIn(run.scene)).toBe(0);
    });

    it("has the scene hum while the ship thrusts", async () => {
      const { run } = await runBoardScene();
      cacheSounds(run.scene);

      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(FRAME_MS);
      run.advance(FRAME_MS);

      expect(humsIn(run.scene)).toBe(1);
    });

    it("has the scene hum no more as the wave pauses, the thrust still held", async () => {
      const { game, run } = await runBoardScene();
      cacheSounds(run.scene);
      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(FRAME_MS);
      run.advance(FRAME_MS);

      game.pause();
      run.advance(FRAME_MS);

      expect(humsIn(run.scene)).toBe(0);
    });

    it("keeps the scene's pictures for How to play", async () => {
      const { component } = await runBoardScene();

      expect(component.pictures()).not.toBeNull();
    });

    it("hands How to play the pictures the scene encoded until it bakes again", async () => {
      const { component, run } = await runBoardScene();
      const asked = component.pictures();
      run.advance(FRAME_MS);

      const again = component.pictures();

      expect(again).toBe(asked);
    });

    it("hands How to play new pictures once the scene bakes again", async () => {
      const { component, run } = await runBoardScene();
      const asked = component.pictures();
      run.game.scale.resize(1600, 1000);
      run.advance(FRAME_MS);

      const again = component.pictures();

      expect(again).not.toEqual(asked);
    });

    it("starts the wave at a key that flies the ship", async () => {
      const { game, run } = await runBoardScene();

      run.key("keydown", "Space", " ");
      run.advance(FRAME_MS);

      expect(game.outcome()).toBe("playing");
    });

    it("leaves Space on Resume to the button, down and up", async () => {
      const { game, run, detectChanges } = await runBoardScene();
      run.key("keydown", "Space", " ");
      run.advance(FRAME_MS);
      run.key("keyup", "Space", " ");
      game.pause();
      detectChanges();
      const resume = screen.getByRole("button", { name: "Resume" });

      const kept = [
        fireEvent.keyDown(resume, SPACE),
        fireEvent.keyUp(resume, SPACE),
      ];
      run.advance(FRAME_MS);

      expect(kept).toEqual([true, true]);
      expect(game.outcome()).toBe("paused");
    });

    it("plays a wave to its end in the scene's time, by the keys", async () => {
      const { game, run } = await runBoardScene();
      run.key("keydown", "ArrowLeft", "ArrowLeft");
      run.key("keydown", "Space", " ");

      for (
        let ms = 0;
        ms < WAVE_LIMIT_MS && game.outcome() !== "cleared" && !game.ended();
        ms += FRAME_MS
      ) {
        run.advance(FRAME_MS);
      }

      expect(game.outcome()).toBe("cleared");
    });
  });
});
