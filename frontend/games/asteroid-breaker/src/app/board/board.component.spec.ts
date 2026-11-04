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
import { STILL } from "../../rules/ship";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import type { WaveEntry } from "../../rules/waves";
import {
  FRAME_MS,
  SPEC_WAVE,
  STRAY_WAVES,
  bringStraysHome,
  clearToNext,
  endRun,
  loseShip,
  playToClear,
  playUntil,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { paintRoles } from "../../testing/roles";
import {
  type BoardSetting,
  fieldMetrics,
  fieldShape,
} from "../../view/field_metrics";
import { CLEARED_BUZZ, LOST_BUZZ } from "../../view/haptics";
import { CLEARED_MS } from "../../view/timing";
import { GameService } from "../play/game.service";
import { type Settings, SettingsService } from "../settings/settings.service";
import { BoardComponent } from "./board.component";

/** Space as a browser sends it, with the key code Phaser's capture reads. */
const SPACE = { key: " ", code: "Space", keyCode: 32 } as const;

/** The longest the scene plays a wave for before a spec gives up on it. */
const WAVE_LIMIT_MS = 30_000;

/** How the board lays the field out on a roomy screen with no touch. */
const ROOMY: BoardSetting = {
  marginCss: 24,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** How the board lays the field out on a compact touch screen, its deck showing. */
const TOUCH: BoardSetting = { ...ROOMY, marginCss: 12, deck: true };

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

/** Starts the wave in play, then pauses it, for the Paused card. */
function pauseIn(game: GameService): void {
  game.tick(FRAME_MS, shoot(game));
  game.pause();
}

/** Clears the wave in play, until the Cleared card shows. */
function clearIn(game: GameService): void {
  playToClear(game);
  playUntil(game, () => STILL, game.clearedOpen);
}

/** Ends the run, and puts its result away, for the Ended card. */
function endIn(game: GameService): void {
  endRun(game);
  playUntil(game, () => STILL, game.resultOpen);
  game.closeResult();
}

/** Returns the cleared card's sum, each line as its term and its points. */
function tallyLines(): [string, string][] {
  return screen
    .getAllByRole("term")
    .map((term) => [
      term.textContent.trim(),
      term.nextElementSibling?.textContent.trim() ?? "",
    ]);
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

      // The layer only places the cards, so it has no role to find it by.
      expect(board.querySelector(".cards")).toHaveStyle(
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

  describe("the cards", () => {
    it("name the wave, and say how to fly by the keys, while it waits", async () => {
      await renderBoard();

      expect(screen.getByText("Wave 1: Pebble")).toBeInTheDocument();
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

      it("say how to fly by the deck", async () => {
        await renderBoard();

        expect(
          screen.getByText("Steer with the left pad, fire with the right."),
        ).toBeInTheDocument();
      });

      it.each<[string, Partial<Settings>, string]>([
        [
          "with the stick on the right",
          { stickOnRight: true },
          "Steer with the right pad, fire with the left.",
        ],
        [
          "firing by itself",
          { fireByItself: true },
          "Steer with the left pad; the ship fires by itself.",
        ],
        [
          "with the stick on the right, firing by itself",
          { stickOnRight: true, fireByItself: true },
          "Steer with the right pad; the ship fires by itself.",
        ],
      ])("say how to fly by the deck %s", async (_, change, words) => {
        const { detectChanges } = await renderBoard();

        useSettings(change);
        detectChanges();

        expect(screen.getByText(words)).toBeInTheDocument();
      });
    });

    it("say the ship fires by itself, where the settings have it", async () => {
      const { detectChanges } = await renderBoard();

      useSettings({ fireByItself: true });
      detectChanges();

      expect(
        screen.getByText("Arrows or W A D to fly; the ship fires by itself."),
      ).toBeInTheDocument();
    });

    it("show nothing over a ship in flight", async () => {
      await startedAt(SPEC_WAVE.gift);

      expect(screen.queryByText(/to fly/)).not.toBeInTheDocument();
    });

    it("say the wave is paused, with the score", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.gift);

      game.pause();
      detectChanges();

      expect(screen.getByText("Paused")).toBeInTheDocument();
      expect(screen.getByText("Score 0")).toBeInTheDocument();
    });

    it("draw the strays waiting at home on a paused wave, and say how many", async () => {
      const { game, detectChanges } = await renderBoard({}, STRAY_WAVES);
      bringStraysHome(game, 2);

      game.pause();
      detectChanges();

      const home = screen.getByText("2 fuzzballs waiting at home");
      expect(home.querySelectorAll("app-pilot")).toHaveLength(2);
    });

    it("say nothing of home on a paused wave with no one waiting there", async () => {
      const { game, detectChanges } = await startedAt(SPEC_WAVE.gift);

      game.pause();
      detectChanges();

      expect(screen.queryByText(/waiting at home/)).not.toBeInTheDocument();
    });

    it("go on at Resume, handing the board the focus", async () => {
      const { board, game, detectChanges } = await startedAt(SPEC_WAVE.gift);
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(board).toHaveFocus();
    });

    it("add up a cleared wave's points", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      clearIn(game);
      detectChanges();

      expect(tallyLines()).toEqual([
        ["Rocks", "40"],
        ["Chains", "0"],
        ["Strays brought home", "0"],
        ["Wave cleared", "500"],
        ["No ship lost", "500"],
      ]);
    });

    it("say a move or a shot goes on to the next wave", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      clearIn(game);
      detectChanges();

      expect(screen.getByText("Move or fire for wave 2.")).toBeInTheDocument();
    });

    it("go on to the next wave at the cleared card's button, handing the board the focus", async () => {
      const { board, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      clearIn(game);
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Next wave" }));

      expect(game.wave().number).toBe(SPEC_WAVE.gift);
      expect(board).toHaveFocus();
    });

    it("name the next wave while it waits for its first move", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      clearToNext(game);
      detectChanges();

      expect(screen.getByText("Wave 2: Gift")).toBeInTheDocument();
    });

    it.each([
      ["Resume", pauseIn],
      ["Next wave", clearIn],
      ["New game", endIn],
    ])(
      "keep the keys on %s from the board, which would fly the ship",
      async (name, show) => {
        const { board, game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
        show(game);
        detectChanges();
        const heard = vi.fn();
        board.addEventListener("keydown", heard);

        fireEvent.keyDown(screen.getByRole("button", { name }), SPACE);

        expect(heard).not.toHaveBeenCalled();
      },
    );

    describe("where motion is welcome", () => {
      let viewport: FakeViewport | null = null;

      beforeEach(() => {
        viewport = installFakeViewport(1024, 768);
      });

      afterEach(() => {
        viewport?.restore();
        viewport = null;
      });

      it("say nothing over a cleared wave while its last shards fly", async () => {
        const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
        playToClear(game);

        game.tick(CLEARED_MS / 2, STILL);
        detectChanges();

        expect(screen.queryByText("Wave 1 cleared")).not.toBeInTheDocument();
      });
    });

    it("say nothing over an ended run while its result is to come", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      endRun(game);
      detectChanges();

      expect(screen.queryByText("Lost on wave 1")).not.toBeInTheDocument();
    });

    it("offer a new game once an ended run's result is put away", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);

      endIn(game);
      detectChanges();

      expect(screen.getByText("Lost on wave 1")).toBeInTheDocument();
      expect(screen.getByText("Score 0")).toBeInTheDocument();
    });

    it("start a new game from the card over an ended run", async () => {
      const { game, detectChanges } = await renderAt(SPEC_WAVE.pebble);
      endIn(game);
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "New game" }));

      expect(game.outcome()).toBe("ready");
    });

    it("say when the board couldn't be drawn, offering to reload", async () => {
      const { fake, detectChanges } = await renderBoard({ readyAtOnce: false });

      fake.host.latest.fail();
      await Promise.resolve();
      detectChanges();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "The board couldn't be drawn",
      );
      expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
    });

    describe("on a slow connection", () => {
      beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("say the board is still loading, offering nothing to press", async () => {
        const { detectChanges } = await renderBoard({ readyAtOnce: false });

        vi.advanceTimersByTime(8_000);
        detectChanges();

        expect(screen.getByRole("status")).toHaveTextContent(
          "Still loading the board",
        );
        expect(
          screen.getAllByRole("button").map((button) => button.textContent),
        ).toEqual(["Elsewhere"]);
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

    /** Runs the scene the board hands its canvas, as Phaser would, on a canvas of a size in CSS px. */
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

    it("hands the game the room the scene laid the field out in", async () => {
      const { game } = await runBoardScene({ width: 1280, height: 720 });

      expect(game.frame().field.torus.width).toBeGreaterThan(FIELD_SHORT_SIDE);
    });

    it("keeps the scene's pictures for How to play", async () => {
      const { component } = await runBoardScene();

      expect(component.pictures()).not.toBeNull();
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
