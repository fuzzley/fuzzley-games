import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { readRect } from "@fz/dev/board-page";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import { NO_INSETS } from "@fz/phaser/insets";
import {
  type CssRect,
  type PixelRect,
  type Viewport,
  canvasPixelRatio,
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
} from "@fz/phaser/layout";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  FakeResizeObserver,
  type SceneRun,
  cacheSounds,
  collectErrors,
  provideFakePhaserCanvas,
  resize,
  runScene,
  runShownScene,
  watchResizes,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { fireEvent, render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import type { WaveEntry } from "../../rules/waves/waves";
import { SOUNDS_KEY } from "../../scene/belt_scene";
import { humsIn } from "../../testing/belt_board";
import {
  FRAME_MS,
  ROOMY,
  SPACE,
  SPEC_WAVE,
  clearIn,
  clearToNext,
  pauseIn,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { paintRoles } from "@fz/style/testing";
import { ROLES } from "../../testing/roles";
import { FIELD_ROLES } from "./field_roles";
import type { PointsLettering } from "../../view/art/points_art";
import {
  type BoardSetting,
  FRAME_CSS_PX,
  MARGIN_CSS_PX,
  deckLayout,
  fieldMetrics,
  fieldShape,
} from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { type Settings, SettingsService } from "../settings/settings.service";
import { BoardComponent, POINTS_FACE_WAIT_MS } from "./board.component";

/** The longest the scene plays a wave for before a spec gives up on it. */
const WAVE_LIMIT_MS = 30_000;

/** How the board lays the field out on a compact touch screen, its deck showing. */
const TOUCH: BoardSetting = {
  ...ROOMY,
  marginCss: MARGIN_CSS_PX.compact,
  deck: true,
};

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
  const canvas = viewport(width, height, pixelRatio, insets);
  return fieldMetrics(canvas, board, fieldShape(canvas, board, SQUARE)).css;
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
  destroy: () => void;
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
    destroy: () => {
      view.fixture.destroy();
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

    describe("as the scene keeps the field", () => {
      // jsdom answers no media query, so its screen is a roomy one.
      it.each([
        {
          screen: "compact",
          size: (): void => {
            installFakeViewport(390, 844);
          },
          margin: MARGIN_CSS_PX.compact,
        },
        {
          screen: "roomy",
          size: (): void => undefined,
          margin: MARGIN_CSS_PX.roomy,
        },
      ])(
        "keeps its cards the margin in that the scene keeps the field on a $screen screen",
        async ({ size, margin }) => {
          size();
          const { board } = await renderBoard();

          expect(board.style.getPropertyValue("--margin")).toBe(
            `${String(margin)}px`,
          );
        },
      );

      it("frames the placeholder's field as thick as the scene frames it", async () => {
        const { board } = await renderBoard();

        expect(board.style.getPropertyValue("--frame")).toBe(
          `${String(FRAME_CSS_PX)}px`,
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
        cssRectStyle(fieldOn(1280, 720, ROOMY)),
      );
    });

    it("lays the cards over the field, before the scene has drawn it", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, 1280, 720);
      detectChanges();

      // The card's element is only the layer a card shows in, with no role.
      expect(board.querySelector("app-board-card")).toHaveStyle(
        cssRectStyle(fieldOn(1280, 720, ROOMY)),
      );
    });

    it("draws the empty field clear of the insets the board declares for the canvas", async () => {
      const { board, detectChanges } = await renderBoard();
      board.style.setProperty("--fz-canvas-inset-top", "120px");

      resize(board, 1280, 720);
      detectChanges();

      expect(board.querySelector(".field")).toHaveStyle(
        cssRectStyle(
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
        cssRectStyle(
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

    it("draws the empty field at the ratio the canvas renders at, which holds a large canvas to its budget above 2x", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
      const { board, detectChanges } = await renderBoard();

      resize(board, 1707, 960);
      detectChanges();

      expect(board.querySelector(".field")).toHaveStyle(
        cssRectStyle(fieldOn(1707, 960, ROOMY, { pixelRatio: 2 })),
      );
    });

    it("publishes the ratio the canvas renders at, which holds a large canvas to its budget above 2x", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
      const { board, detectChanges } = await renderBoard();

      resize(board, 1707, 960);
      detectChanges();

      expect(board.style.getPropertyValue("--pixel-ratio")).toBe("2");
    });

    it("draws the empty field again at the new ratio as the page is zoomed", async () => {
      const { board, detectChanges } = await renderBoard();
      resize(board, 1707, 960);
      detectChanges();

      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
      resize(board, 683, 384, { width: 1708, height: 960 });
      detectChanges();

      // In whole device pixels at 2.5, a field 631.2 CSS px wide; at 1, 631.
      expect(board.querySelector(".field")).toHaveStyle(
        cssRectStyle(fieldOn(683, 384, ROOMY, { pixelRatio: 2.5 })),
      );
    });

    it("publishes the new ratio as the page is zoomed", async () => {
      const { board, detectChanges } = await renderBoard();
      resize(board, 1280, 720);
      detectChanges();

      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
      resize(board, 640, 360);
      detectChanges();

      expect(board.style.getPropertyValue("--pixel-ratio")).toBe("2");
    });

    describe("as the page is zoomed", () => {
      let viewport: FakeViewport;

      beforeEach(() => {
        viewport = installFakeViewport(1280, 720);
      });

      it("draws the empty field again at the new ratio, though the board's device pixels stay as they were", async () => {
        const { board, detectChanges } = await renderBoard();
        resize(board, 1280, 720, { width: 1280, height: 720 });
        detectChanges();

        // A zoom to 250% shrinks the board in CSS pixels and leaves its
        // device pixels as they were, which the browser doesn't report.
        vi.spyOn(board, "getBoundingClientRect").mockReturnValue(
          new DOMRect(0, 0, 512, 288),
        );
        viewport.setPixelRatio(2.5);
        detectChanges();

        expect(board.querySelector(".field")).toHaveStyle(
          cssRectStyle(fieldOn(512, 288, ROOMY, { pixelRatio: 2.5 })),
        );
      });
    });

    it("draws the empty field clear of the deck where the settings always show it", async () => {
      const { board, detectChanges } = await renderBoard();
      useSettings({ deck: "always" });

      resize(board, 1280, 720);
      detectChanges();

      expect(board.querySelector(".field")).toHaveStyle(
        cssRectStyle(fieldOn(1280, 720, { ...ROOMY, deck: true })),
      );
    });

    describe("on a touch screen", () => {
      beforeEach(() => {
        installFakeViewport(390, 844).setCoarsePointer(true);
      });

      it("draws the empty field clear of the deck", async () => {
        const { board, detectChanges } = await renderBoard();

        resize(board, 390, 780);
        detectChanges();

        expect(board.querySelector(".field")).toHaveStyle(
          cssRectStyle(fieldOn(390, 780, TOUCH)),
        );
      });

      it("draws the empty field with no deck where the settings never show it", async () => {
        const { board, detectChanges } = await renderBoard();
        useSettings({ deck: "never" });

        resize(board, 390, 780);
        detectChanges();

        expect(board.querySelector(".field")).toHaveStyle(
          cssRectStyle(fieldOn(390, 780, { ...TOUCH, deck: false })),
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
        cssRectStyle(fieldOn(1280, 720, ROOMY)),
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
      beforeEach(() => {
        installFakeViewport(390, 844).setCoarsePointer(true);
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

    it("names the wave while the scene still loads, before it is slow", async () => {
      await renderBoard({ readyAtOnce: false });

      expect(screen.getByText("Wave 1: Pebble")).toBeInTheDocument();
    });

    it("gives way to the canvas's, which says the board couldn't be drawn, offering to reload, as the app's error handler is told why", async () => {
      const errors = collectErrors();
      const { fake, detectChanges } = await renderBoard({ readyAtOnce: false });

      fake.host.latest.fail();
      await Promise.resolve();
      detectChanges();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "The board couldn't be drawn",
      );
      expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
      expect(screen.queryByText("Wave 1: Pebble")).not.toBeInTheDocument();
      expect(errors).toEqual([new Error("The scene couldn't be loaded")]);
    });

    describe("on a slow connection", () => {
      beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("gives way to the canvas's, which says the board is still loading", async () => {
        const { detectChanges } = await renderBoard({ readyAtOnce: false });

        vi.advanceTimersByTime(8_000);
        detectChanges();

        expect(screen.getByRole("status")).toHaveTextContent(
          "Still loading the board",
        );
        expect(screen.queryByText("Wave 1: Pebble")).not.toBeInTheDocument();
      });
    });
  });

  describe("with the scene it loads", () => {
    beforeEach(() => {
      paintRoles(FIELD_ROLES, ROLES);
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
      const run = await runShownScene(fake, board, canvas);
      run.advance(FRAME_MS);
      return { board, component, game, run, detectChanges };
    }

    describe("the points' font", () => {
      afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
      });

      /** Returns how a scene the board made last lettered the points. */
      async function letteringOf(
        hosted: HostedScene,
      ): Promise<PointsLettering | null> {
        const { BeltScene } = await import("../../scene/belt_scene");
        if (!(hosted instanceof BeltScene)) throw new Error("Not the belt.");
        return hosted.kit.points.lettering;
      }

      it("has the scene write the points in the board's font", async () => {
        const { board, fake } = await renderBoard();
        board.style.fontFamily = "Board Sans";
        const run = await runShownScene(fake, board);

        run.advance(FRAME_MS);

        expect((await letteringOf(run.scene))?.family).toBe("Board Sans");
      });

      it("makes the scene only once the page has loaded the points' face", async () => {
        const steps: string[] = [];
        vi.spyOn(document.fonts, "load").mockImplementation(async (font) => {
          // Once the scene's code has loaded, so a board that didn't wait
          // would make the scene first.
          await import("../../scene/belt_scene");
          await new Promise((resolve) => setTimeout(resolve));
          steps.push(`loaded ${font}`);
          return [];
        });
        const { board, fake } = await renderBoard();
        board.style.fontFamily = "Board Sans";

        await fake.host.latest.source();
        steps.push("made");

        expect(steps).toEqual(["loaded 700 1px Board Sans", "made"]);
      });

      it("makes the scene without the points' face once it has waited long enough for it", async () => {
        vi.spyOn(document.fonts, "load").mockReturnValue(
          new Promise(() => undefined),
        );
        const { fake } = await renderBoard();
        await import("../../scene/belt_scene");
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        let made = false;
        const making = Promise.resolve(fake.host.latest.source()).then(() => {
          made = true;
        });
        await vi.advanceTimersByTimeAsync(POINTS_FACE_WAIT_MS - 1);
        const early = made;

        await vi.advanceTimersByTimeAsync(1);
        await making;

        expect({ early, made }).toEqual({ early: false, made: true });
      });

      /**
       * Runs the scene a board made once it had waited long enough for the
       * points' face, which the page has yet to load, and returns how it
       * lettered them, and what the spec does as the page loads it.
       */
      async function waitedForTheFace(): Promise<{
        run: SceneRun<HostedScene>;
        lettering: PointsLettering | null;
        destroy: () => void;
        loadTheFace: (found: boolean) => Promise<void>;
      }> {
        let load: () => void = () => undefined;
        vi.spyOn(document.fonts, "load").mockReturnValue(
          new Promise((resolve) => {
            load = () => {
              resolve([]);
            };
          }),
        );
        const check = vi.spyOn(document.fonts, "check").mockReturnValue(false);
        const { fake, destroy } = await renderBoard();
        await import("../../scene/belt_scene");
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const making = Promise.resolve(fake.host.latest.source());
        await vi.advanceTimersByTimeAsync(POINTS_FACE_WAIT_MS);
        const make = await making;
        vi.useRealTimers();
        const run = await runScene(make);
        onTestFinished(() => {
          run.destroy();
        });
        run.advance(FRAME_MS);
        return {
          run,
          lettering: await letteringOf(run.scene),
          destroy,
          loadTheFace: async (found) => {
            check.mockReturnValue(found);
            load();
            await new Promise((resolve) => setTimeout(resolve));
          },
        };
      }

      it("has the scene write the points anew once the page loads the points' face late", async () => {
        const { run, lettering, loadTheFace } = await waitedForTheFace();
        await loadTheFace(true);

        run.advance(FRAME_MS);

        expect(await letteringOf(run.scene)).not.toBe(lettering);
      });

      it("goes on writing the points as they are where the page's late load doesn't bring the face", async () => {
        const { run, lettering, loadTheFace } = await waitedForTheFace();
        await loadTheFace(false);

        run.advance(FRAME_MS);

        expect(await letteringOf(run.scene)).toBe(lettering);
      });

      it("stops waiting for the points' face once the board is gone", async () => {
        const { run, lettering, destroy, loadTheFace } =
          await waitedForTheFace();
        destroy();
        await loadTheFace(true);

        run.advance(FRAME_MS);

        expect(await letteringOf(run.scene)).toBe(lettering);
      });
    });

    it("publishes where the scene laid the field out, and lays the focus ring there", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      const field = readRect(board.getAttribute("data-field"));
      // The ring is only drawn, so it has no role to find it by.
      expect(board.querySelector(".ring")).toHaveStyle(cssRectStyle(field!));
    });

    it("publishes the field's shape in its units as the scene laid it out, its short side 40", async () => {
      const { board, detectChanges } = await runBoardScene({
        width: 1280,
        height: 720,
      });

      detectChanges();

      const { width, height } = readRect(board.getAttribute("data-field"))!;
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
      expect(board.dataset["room"]).toBe(rectAttribute(room));
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
        namedRectsAttribute([
          ["stick", deck.stick],
          ["buttons", deck.buttons],
        ]),
      );
    });

    it("publishes the room and the deck's zones in CSS pixels on a canvas of two device pixels to one", async () => {
      const { board, game, run, detectChanges } = await runBoardScene({
        width: 1280,
        height: 720,
      });
      useSettings({ deck: "always" });

      // As a browser zoomed in has it: the canvas as many device pixels, each
      // CSS pixel two of them.
      run.game.scale.setZoom(1 / 2);
      run.advance(FRAME_MS);
      run.advance(FRAME_MS);
      detectChanges();

      const canvas = { ...CANVAS_1280, pixelRatio: 2 };
      const setting = { ...ROOMY, deck: true };
      const { torus } = game.frame().field;
      const deck = deckLayout(canvas, setting, torus);
      if (!deck) throw new Error("The deck shows on a canvas of 1280 by 720.");
      const css = (rect: PixelRect): CssRect => cssRectOf(rect, 2);
      expect({
        room: board.dataset["room"],
        deck: board.dataset["deck"],
      }).toEqual({
        room: rectAttribute(css(fieldMetrics(canvas, setting, torus).room)),
        deck: namedRectsAttribute([
          ["stick", css(deck.stick)],
          ["buttons", css(deck.buttons)],
        ]),
      });
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
      cacheSounds(run.scene, SOUNDS_KEY);

      run.advance(FRAME_MS);

      expect(humsIn(run.scene)).toBe(0);
    });

    it("has the scene hum while the ship thrusts", async () => {
      const { run } = await runBoardScene();
      cacheSounds(run.scene, SOUNDS_KEY);

      run.key("keydown", "ArrowUp", "ArrowUp");
      run.advance(FRAME_MS);
      run.advance(FRAME_MS);

      expect(humsIn(run.scene)).toBe(1);
    });

    it("has the scene hum no more as the wave pauses, the thrust still held", async () => {
      const { game, run } = await runBoardScene();
      cacheSounds(run.scene, SOUNDS_KEY);
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
