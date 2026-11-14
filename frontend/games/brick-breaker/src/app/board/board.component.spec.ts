import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { readRect } from "@fz/dev/board-page";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import {
  cssRectOf,
  cssRectStyle,
  namedRectsAttribute,
  rectAttribute,
  roomInside,
} from "@fz/phaser/layout";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  FakeResizeObserver,
  type SceneRun,
  browserKey,
  collectErrors,
  provideFakePhaserCanvas,
  resize,
  runShownScene,
  watchResizes,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { figures } from "@fz/ui/testing";
import {
  SPEC_LEVEL,
  STILL,
  loseBall,
  playToClear,
  provideSpecLevels,
} from "../../testing/play";
import { brickKind } from "../../rules/catalog/bricks";
import { paddleTopOf } from "../../rules/paddle/paddle";
import {
  BALL_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FIRST_LIVES,
  TALLEST_FIELD,
} from "../../rules/tuning";
import { paintRoles } from "@fz/style/testing";
import { ROLES } from "../../testing/roles";
import { FIELD_ROLES } from "./field_roles";
import {
  FINGER_ROOM_CSS_PX,
  fieldMetrics,
} from "../../view/field/field_metrics";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BoardComponent, PICTURES_SETTLE_MS } from "./board.component";

const SPACE = browserKey("Space", " ");

/** The longest the scene plays a level for before a spec gives up on it. */
const LEVEL_LIMIT_MS = 10_000;

/** A wide canvas, 1280 by 720 CSS px, which spares the panels room beside the field. */
const WIDE = { width: 1280, height: 720 } as const;

/** An upright phone's canvas, 390 by 772 CSS px, which spares the panels none. */
const UPRIGHT = { width: 390, height: 772 } as const;

/** Renders the board beside a button outside it, on a fake canvas. */
async function renderBoard(options: FakeCanvasOptions = {}): Promise<{
  /** The board's element, `app-board`, which Phaser hears the keys on and the layout check reads. */
  board: HTMLElement;
  /** The application inside it, which takes the focus. */
  application: HTMLElement;
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
      providers: [provideFakePhaserCanvas(options), ...provideSpecLevels()],
    },
  );
  const debug = view.fixture.debugElement.query(By.directive(BoardComponent));
  return {
    board: debug.nativeElement as HTMLElement,
    application: screen.getByRole("application"),
    component: debug.injector.get(BoardComponent),
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

/** Advances the scene a frame at a time while a level is in play, for `LEVEL_LIMIT_MS` at most. */
function advanceWhilePlaying(
  run: SceneRun<HostedScene>,
  game: GameService,
): void {
  for (
    let ms = 0;
    ms < LEVEL_LIMIT_MS && game.outcome() === "playing";
    ms += FRAME_MS
  ) {
    run.advance(FRAME_MS);
  }
}

/** Returns the board's game with its run at one of the specs' levels. */
async function renderAt(level: number): Promise<{
  board: HTMLElement;
  application: HTMLElement;
  game: GameService;
  detectChanges: () => void;
}> {
  const rendered = await renderBoard();
  await rendered.game.startAt(level);
  rendered.detectChanges();
  return rendered;
}

/** Returns the board's game with a run at the steel level that has lost every life. */
async function endedBoard(): Promise<{
  game: GameService;
  detectChanges: () => void;
}> {
  const rendered = await renderAt(SPEC_LEVEL.steel);
  for (let life = 0; life < FIRST_LIVES; life++) loseBall(rendered.game);
  return rendered;
}

describe("BoardComponent", () => {
  beforeEach(() => {
    paintRoles(FIELD_ROLES, ROLES);
  });

  describe("the board", () => {
    it("is named for the level on it, and described by its keys", async () => {
      await renderBoard();

      const board = screen.getByRole("application", {
        name: "Brick Breaker, level 1: Blasts",
      });
      expect(board).toHaveAccessibleDescription(
        /^The left and right arrow keys/,
      );
    });

    it("hears the keys on its own element, through Phaser", async () => {
      const { board, fake } = await renderBoard();

      expect(fake.host.options.config?.input).toMatchObject({
        keyboard: { target: board },
      });
    });

    it("takes the focus for a press on it", async () => {
      const { application } = await renderBoard();

      fireEvent.pointerDown(application);

      expect(application).toHaveFocus();
    });

    it("hides the pointer while a ball is in play", async () => {
      const { board, game, detectChanges } = await renderAt(SPEC_LEVEL.steel);
      game.launch();

      game.tick(FRAME_MS, STILL);
      detectChanges();

      expect(board).toHaveClass("in-play");
    });

    it("shows the pointer while a ball waits on the paddle", async () => {
      const { board } = await renderAt(SPEC_LEVEL.steel);

      expect(board).not.toHaveClass("in-play");
    });

    it("keeps its cards outside the application, read as a page is", async () => {
      const { application } = await renderBoard();

      expect({
        cards: screen.queryAllByText("Level 1: Blasts").length,
        inApplication: within(application).queryByText("Level 1: Blasts"),
      }).toEqual({ cards: 1, inApplication: null });
    });
  });

  describe("the field's height", () => {
    watchResizes();

    it("is all an upright board has room for, with room for a finger under it", async () => {
      const { board, game, detectChanges } = await renderBoard();

      resize(board, 390, 772);
      detectChanges();

      expect({
        height: game.fieldHeight(),
        down: board.style.getPropertyValue("--down"),
        finger: board.style.getPropertyValue("--finger-room"),
      }).toEqual({
        height: TALLEST_FIELD,
        down: String(TALLEST_FIELD),
        finger: String(FINGER_ROOM_CSS_PX),
      });
    });

    it("is all the board has room for as it is first drawn, before the browser reports its size", async () => {
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 390, 772),
      );

      const { game } = await renderBoard();

      expect(game.fieldHeight()).toBe(TALLEST_FIELD);
    });

    it("is all the canvas has room for at the ratio the host renders it at, which holds a large canvas to its budget above 2x", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
      const { board, game, detectChanges } = await renderBoard();

      resize(board, 700, 1100);
      detectChanges();

      // The budget holds the canvas to 2.417x, whose unit leaves room for 38
      // units down; at the display's 2.5, it would leave room for 39.
      expect(game.fieldHeight()).toBe(38);
    });

    it("is the least on a wide board, with no room under it", async () => {
      const { board, game, detectChanges } = await renderBoard();

      resize(board, 1280, 720);
      detectChanges();

      expect({
        height: game.fieldHeight(),
        finger: board.style.getPropertyValue("--finger-room"),
      }).toEqual({ height: FIELD_HEIGHT, finger: "0" });
    });

    it("counts the insets the board declares for the canvas out of its room", async () => {
      const { board, game, detectChanges } = await renderBoard();
      board.style.setProperty("--fz-canvas-inset-bottom", "200px");

      resize(board, 390, 772);
      detectChanges();

      // 772 less the inset, a finger's room, the pixel in hand and the walls
      // leaves 503: 35 units of 14.
      expect(game.fieldHeight()).toBe(35);
    });

    it("draws the waiting paddle in the placeholder as far above a taller field's floor", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, 390, 772);
      detectChanges();

      // The placeholder is only drawn, so it has no role to find it by.
      const paddle = board.querySelector<HTMLElement>(".paddle");
      expect(paddle?.style.getPropertyValue("--paddle-top")).toBe(
        String(paddleTopOf(TALLEST_FIELD)),
      );
    });

    it("keeps the Ready card's foot a ball's width above the ball waiting on a taller field's paddle", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, 390, 772);
      detectChanges();

      // From the field's middle, in units: the ball, two radii, over the
      // paddle, and the card's foot as far again above it.
      expect(Number(board.style.getPropertyValue("--card-foot"))).toBeCloseTo(
        paddleTopOf(TALLEST_FIELD) - 4 * BALL_RADIUS - TALLEST_FIELD / 2,
      );
    });

    it("stops watching the board once it is gone", async () => {
      const { fixture } = await render(BoardComponent, {
        providers: [provideFakePhaserCanvas(), ...provideSpecLevels()],
      });

      fixture.destroy();

      expect(FakeResizeObserver.made.map((made) => made.watched.size)).toEqual([
        0,
      ]);
    });
  });

  describe("the placeholder's pixel ratio", () => {
    watchResizes();

    it("is the display's where the browser can't watch the board", async () => {
      vi.stubGlobal("ResizeObserver", undefined);
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);

      const { board } = await renderBoard();

      expect(board.style.getPropertyValue("--pixel-ratio")).toBe("2");
    });

    it("is the one the canvas renders at, which holds a large canvas to its budget above 2x", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
      const { board, detectChanges } = await renderBoard();

      resize(board, 1707, 960);
      detectChanges();

      expect(board.style.getPropertyValue("--pixel-ratio")).toBe("2");
    });

    it("follows a change of zoom", async () => {
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

      it("follows a change of zoom that leaves the board's device pixels as they were", async () => {
        const { board, detectChanges } = await renderBoard();
        resize(board, 1280, 720, { width: 1280, height: 720 });
        detectChanges();

        // A zoom to 200% halves the board in CSS pixels and leaves its device
        // pixels as they were, which the browser doesn't report.
        vi.spyOn(board, "getBoundingClientRect").mockReturnValue(
          new DOMRect(0, 0, 640, 360),
        );
        viewport.setPixelRatio(2);
        detectChanges();

        expect(board.style.getPropertyValue("--pixel-ratio")).toBe("2");
      });
    });
  });

  describe("the cards", () => {
    it("name the level, and say how to launch, while the ball waits", async () => {
      await renderBoard();

      expect(screen.getByText("Level 1: Blasts")).toBeInTheDocument();
      expect(
        screen.getByText("Press Space or click to launch."),
      ).toBeInTheDocument();
    });

    it("name each kind of brick new in the level, with what it does, as the level opens", async () => {
      await renderAt(SPEC_LEVEL.wide);

      expect(
        screen
          .getAllByText(/^New:/)
          .map((name) => name.parentElement?.textContent.trim()),
      ).toEqual([
        `New: Steel brick. ${brickKind("steel").about}`,
        `New: Gift brick. ${brickKind("gift").about}`,
      ]);
    });

    it("name no kind of brick once a lost ball's next is on the paddle", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.steel);
      loseBall(game);

      playUntil(game, () => STILL, game.serving);
      detectChanges();

      expect(screen.queryByText(/^New:/)).not.toBeInTheDocument();
    });

    it("name no kind of brick where the level brings none in", async () => {
      await renderAt(SPEC_LEVEL.few);

      expect(screen.queryByText(/^New:/)).not.toBeInTheDocument();
    });

    it("name the level while the scene still loads, before it is slow", async () => {
      await renderBoard({ readyAtOnce: false });

      expect(screen.getByText("Level 1: Blasts")).toBeInTheDocument();
    });

    describe("on a touch screen", () => {
      beforeEach(() => {
        installFakeViewport(390, 844).setCoarsePointer(true);
      });

      it("say to tap", async () => {
        await renderBoard();

        expect(screen.getByText("Tap to launch.")).toBeInTheDocument();
      });
    });

    it("show nothing over a ball in play", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.steel);
      game.launch();

      game.tick(FRAME_MS, STILL);
      detectChanges();

      expect(screen.queryByText(/to launch/)).not.toBeInTheDocument();
    });

    it("say how to launch again once a lost ball's next is on the paddle", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.steel);
      loseBall(game);

      playUntil(game, () => STILL, game.serving);
      detectChanges();

      expect(
        screen.getByText("Press Space or click to launch."),
      ).toBeInTheDocument();
    });

    it("say the level is paused, with the score", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.steel);
      game.launch();

      game.pause();
      detectChanges();

      expect(screen.getByText("Paused")).toBeInTheDocument();
      expect(screen.getByText("Score 0")).toBeInTheDocument();
    });

    it("go on at Resume, handing the board the focus", async () => {
      const { application, game, detectChanges } = await renderAt(
        SPEC_LEVEL.steel,
      );
      game.launch();
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(application).toHaveFocus();
    });

    it("add up a cleared level's points", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.blasts);
      playToClear(game);

      game.tick(FRAME_MS, STILL);
      detectChanges();

      expect(screen.getByText("Level 1 cleared")).toBeInTheDocument();
      expect(figures()).toEqual([
        ["Bricks", "500"],
        ["Streaks", "100"],
        ["Bonus", "1,500"],
      ]);
      expect(screen.getByText("Score 2,100")).toBeInTheDocument();
    });

    it("add a line for what double pay added, where a bad capsule paid", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.dare);
      playToClear(game);

      game.tick(FRAME_MS, STILL);
      detectChanges();

      expect(figures()).toEqual([
        ["Bricks", "600"],
        ["Streaks", "100"],
        ["Double pay", "600"],
        ["Bonus", "1,500"],
      ]);
    });

    it("go on to the next level at Next level, handing the board the focus", async () => {
      const { application, game, detectChanges } = await renderAt(
        SPEC_LEVEL.blasts,
      );
      playToClear(game);
      game.tick(FRAME_MS, STILL);
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect(game.level().number).toBe(SPEC_LEVEL.wide);
      expect(application).toHaveFocus();
    });

    describe("where motion is welcome", () => {
      beforeEach(() => {
        installFakeViewport(1024, 768);
      });

      it("say nothing over a cleared level while its last shards fly", async () => {
        const { game, detectChanges } = await renderAt(SPEC_LEVEL.blasts);
        playToClear(game);

        game.tick(FRAME_MS, STILL);
        detectChanges();

        expect(screen.queryByText("Level 1 cleared")).not.toBeInTheDocument();
      });
    });

    it("say nothing over an ended run while its result is to come", async () => {
      const { detectChanges } = await endedBoard();

      detectChanges();

      expect(screen.queryByText("Game over")).not.toBeInTheDocument();
    });

    it("offer a new game once an ended run's result is put away", async () => {
      const { game, detectChanges } = await endedBoard();

      game.closeResult();
      detectChanges();

      expect(screen.getByText("Game over")).toBeInTheDocument();
      expect(screen.getByText("Score 0")).toBeInTheDocument();
    });

    it("call a won run what it is", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.last);
      playToClear(game);

      game.closeResult();
      detectChanges();

      expect(screen.getByText("Every level cleared!")).toBeInTheDocument();
    });

    it("start a new game from the card over an ended run", async () => {
      const { game, detectChanges } = await endedBoard();
      game.closeResult();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "New game" }));

      expect(game.outcome()).toBe("ready");
    });

    it("say in place of the board's own when the board couldn't be drawn, offering to reload, as the app's error handler is told why", async () => {
      const errors = collectErrors();
      const { fake, detectChanges } = await renderBoard({ readyAtOnce: false });

      fake.host.latest.fail();
      await Promise.resolve();
      detectChanges();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "The board couldn't be drawn",
      );
      expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
      expect(screen.queryByText("Level 1: Blasts")).not.toBeInTheDocument();
      expect(errors).toEqual([new Error("The scene couldn't be loaded")]);
    });

    describe("on a slow connection", () => {
      beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("say in place of the board's own that the board is still loading, offering nothing to press", async () => {
        const { detectChanges } = await renderBoard({ readyAtOnce: false });

        vi.advanceTimersByTime(8_000);
        detectChanges();

        expect(screen.getByRole("status")).toHaveTextContent(
          "Still loading the board",
        );
        expect(
          screen.getAllByRole("button").map((button) => button.textContent),
        ).toEqual(["Elsewhere"]);
        expect(screen.queryByText("Level 1: Blasts")).not.toBeInTheDocument();
      });
    });
  });

  describe("the panels", () => {
    watchResizes();

    it("stand beside the field where the room spares them", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, WIDE.width, WIDE.height);
      detectChanges();

      const { panels } = fieldMetrics(
        viewport(WIDE.width, WIDE.height),
        FIELD_HEIGHT,
      );
      expect({
        left: screen.getByRole("region", { name: "The bench" }),
        right: screen.getByRole("region", { name: "In play" }),
      }).toEqual({
        left: expect.toHaveStyle(cssRectStyle(panels!.left)) as unknown,
        right: expect.toHaveStyle(cssRectStyle(panels!.right)) as unknown,
      });
    });

    it("stand nowhere where the room spares them none", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, UPRIGHT.width, UPRIGHT.height);
      detectChanges();

      expect(screen.queryAllByRole("region")).toEqual([]);
    });

    it("stand outside the application, read as a page is", async () => {
      const { board, application, detectChanges } = await renderBoard();

      resize(board, WIDE.width, WIDE.height);
      detectChanges();

      expect({
        panels: screen.getAllByRole("region").length,
        inApplication: within(application).queryAllByRole("region").length,
      }).toEqual({ panels: 2, inApplication: 0 });
    });

    it("show the level in play and what is in play on it", async () => {
      const { board, detectChanges } = await renderAt(SPEC_LEVEL.steel);

      resize(board, WIDE.width, WIDE.height);
      detectChanges();

      const bench = screen.getByRole("region", { name: "The bench" });
      const inPlay = screen.getByRole("region", { name: "In play" });
      expect(within(bench).getByText("Level 3 · Specs")).toBeInTheDocument();
      expect(within(bench).getByText("Few")).toBeInTheDocument();
      expect(within(inPlay).getByText("Steel brick")).toBeInTheDocument();
    });

    it("publish nothing for the layout check before the scene has laid the field out", async () => {
      const { board, detectChanges } = await renderBoard();

      resize(board, WIDE.width, WIDE.height);
      detectChanges();

      expect({
        room: board.dataset["room"],
        panels: board.dataset["panels"],
      }).toEqual({ room: undefined, panels: undefined });
    });
  });

  describe("with the scene it loads", () => {
    /** Runs the scene the board hands its canvas, as Phaser would, on a canvas of a size in CSS px. */
    async function runBoardScene(
      canvas: { width?: number; height?: number } = {},
    ): Promise<{
      board: HTMLElement;
      application: HTMLElement;
      component: BoardComponent;
      game: GameService;
      run: SceneRun<HostedScene>;
      detectChanges: () => void;
      destroy: () => void;
    }> {
      const rendered = await renderBoard();
      const run = await runShownScene(rendered.fake, rendered.board, canvas);
      run.advance(FRAME_MS);
      return { ...rendered, run };
    }

    it("publishes where the scene laid the field out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      expect(readRect(board.getAttribute("data-field"))).not.toBeNull();
    });

    it("lays the focus ring where the scene laid the field out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      const { x, y, width, height } = readRect(
        board.getAttribute("data-field"),
      )!;
      // The ring is only drawn, so it has no role to find it by.
      expect(board.querySelector(".ring")).toHaveStyle({
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    });

    describe("on a board with room for a taller field", () => {
      watchResizes();

      it("lays the field out above a finger's room", async () => {
        // 390 by 700 has room for the tallest field, which, without a finger's
        // room, would lie 35 CSS px above the canvas's bottom.
        const { board, run, detectChanges } = await runBoardScene({
          width: 390,
          height: 700,
        });
        resize(board, 390, 700);

        run.advance(FRAME_MS);
        detectChanges();

        const { y, height } = readRect(board.getAttribute("data-field"))!;
        expect(700 - y - height).toBeGreaterThanOrEqual(FINGER_ROOM_CSS_PX);
      });
    });

    it("keeps the scene's pictures for How to play", async () => {
      const { component } = await runBoardScene();

      expect(component.pictures()).not.toBeNull();
    });

    it("pictures a kind of brick new in the level on the Ready card", async () => {
      const { component, detectChanges } = await runBoardScene();

      detectChanges();

      const card = screen.getByText(
        "Press Space or click to launch.",
      ).parentElement!;
      expect(within(card).getByRole("presentation")).toHaveAttribute(
        "src",
        component.pictures()?.bricks.blast,
      );
    });

    it("hands How to play the pictures the scene encoded until it bakes again", async () => {
      const { component, run } = await runBoardScene();
      const asked = component.pictures();
      run.advance(FRAME_MS);

      const again = component.pictures();

      expect(again).toBe(asked);
    });

    describe("as the scene bakes its atlas again", () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      /** Runs the board's scene, then has the specs move the timers the pictures wait on. */
      async function runTimed(): Promise<{
        component: BoardComponent;
        run: SceneRun<HostedScene>;
        destroy: () => void;
      }> {
        const { component, run, destroy } = await runBoardScene();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        return { component, run, destroy };
      }

      /** Has the scene bake its atlas again, at the unit a canvas of a CSS size holds. */
      function bakeAt(
        run: SceneRun<HostedScene>,
        { width, height }: { readonly width: number; readonly height: number },
      ): void {
        run.game.scale.resize(width, height);
        run.advance(FRAME_MS);
      }

      it("keeps the pictures it has until the atlas settles", async () => {
        const { component, run } = await runTimed();
        const first = component.pictures();
        bakeAt(run, WIDE);

        vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);

        expect(component.pictures()).toBe(first);
      });

      it("takes the pictures of the new atlas once it has settled", async () => {
        const { component, run } = await runTimed();
        const first = component.pictures();
        bakeAt(run, WIDE);

        vi.advanceTimersByTime(PICTURES_SETTLE_MS);

        expect(component.pictures()).not.toEqual(first);
      });

      it("waits again for the atlas to settle each time it is baked", async () => {
        const { component, run } = await runTimed();
        const first = component.pictures();
        bakeAt(run, WIDE);
        vi.advanceTimersByTime(PICTURES_SETTLE_MS / 2);
        bakeAt(run, UPRIGHT);

        vi.advanceTimersByTime(PICTURES_SETTLE_MS - 1);

        expect(component.pictures()).toBe(first);
      });

      it("takes no pictures once the board is gone", async () => {
        const { component, run, destroy } = await runTimed();
        const first = component.pictures();
        bakeAt(run, WIDE);

        destroy();
        vi.advanceTimersByTime(PICTURES_SETTLE_MS);

        expect(component.pictures()).toBe(first);
      });
    });

    /**
     * Runs the board's scene, at a level, on a canvas of a CSS size, the
     * board measured at it, its first frame drawn, before the board shows
     * what the scene laid out. A describe that calls it calls
     * `watchResizes()`.
     */
    async function runSizedScene(
      size: { readonly width: number; readonly height: number },
      level: number = SPEC_LEVEL.blasts,
    ): Promise<{
      board: HTMLElement;
      run: SceneRun<HostedScene>;
      detectChanges: () => void;
    }> {
      const { board, fake, game, detectChanges } = await renderBoard();
      await game.startAt(level);
      resize(board, size.width, size.height);
      const run = await runShownScene(fake, board, size);
      run.advance(FRAME_MS);
      return { board, run, detectChanges };
    }

    describe("on a board whose room spares the panels", () => {
      watchResizes();

      it("publishes the room the scene laid the field out in, inside the canvas's insets", async () => {
        const { board, detectChanges } = await runSizedScene(WIDE);

        detectChanges();

        expect(board.dataset["room"]).toBe(
          rectAttribute(
            cssRectOf(roomInside(viewport(WIDE.width, WIDE.height)), 1),
          ),
        );
      });

      it("publishes where the scene laid the panels out, by their names", async () => {
        const { board, detectChanges } = await runSizedScene(WIDE);

        detectChanges();

        const { panels } = fieldMetrics(
          viewport(WIDE.width, WIDE.height),
          FIELD_HEIGHT,
        );
        expect(board.dataset["panels"]).toBe(
          namedRectsAttribute([
            ["left", panels!.left],
            ["right", panels!.right],
          ]),
        );
      });

      it("publishes that it laid no panels out where the room spares none", async () => {
        const { board, detectChanges } = await runSizedScene(UPRIGHT);

        detectChanges();

        expect(board.dataset["panels"]).toBe("");
      });
    });

    describe("as it shows the scene's pictures", () => {
      watchResizes();

      /**
       * Returns whether the scene encodes its pictures as the board first
       * shows, at a level, on a canvas of a CSS size, the board measured
       * at it.
       */
      async function encodesAt(
        level: number,
        size: { readonly width: number; readonly height: number },
      ): Promise<boolean> {
        const { run, detectChanges } = await runSizedScene(size, level);
        const encode = vi.spyOn(run.scene.textures, "getBase64");

        detectChanges();

        return encode.mock.calls.length > 0;
      }

      it("has the scene encode them where the Ready card names a kind new in the level", async () => {
        expect(await encodesAt(SPEC_LEVEL.blasts, UPRIGHT)).toBe(true);
      });

      it("has the scene encode none where neither the panels nor a new kind shows them", async () => {
        expect(await encodesAt(SPEC_LEVEL.few, UPRIGHT)).toBe(false);
      });

      it("has the scene encode them where the panels show them", async () => {
        expect(await encodesAt(SPEC_LEVEL.few, WIDE)).toBe(true);
      });
    });

    it("launches the ball at Space pressed on the board's application", async () => {
      const { application, game, run } = await runBoardScene();

      fireEvent.keyDown(application, SPACE);
      run.advance(FRAME_MS);

      expect(game.outcome()).toBe("playing");
    });

    it("leaves Space on Resume to the button, down and up", async () => {
      const { game, run, detectChanges } = await runBoardScene();
      game.launch();
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

    it("leaves Space on Next level to the button, down and up", async () => {
      const { game, run, detectChanges } = await runBoardScene();
      playToClear(game);
      game.tick(FRAME_MS, STILL);
      detectChanges();
      const next = screen.getByRole("button", { name: "Next level" });

      const kept = [
        fireEvent.keyDown(next, SPACE),
        fireEvent.keyUp(next, SPACE),
      ];
      run.advance(FRAME_MS);

      expect(kept).toEqual([true, true]);
      expect(game.level().number).toBe(SPEC_LEVEL.blasts);
    });

    it("leaves Space on New game to the button, down and up", async () => {
      const { game, run, detectChanges } = await runBoardScene();
      await game.startAt(SPEC_LEVEL.steel);
      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
      game.closeResult();
      detectChanges();
      const newGame = screen.getByRole("button", { name: "New game" });
      const runs = game.runs();

      const kept = [
        fireEvent.keyDown(newGame, SPACE),
        fireEvent.keyUp(newGame, SPACE),
      ];
      run.advance(FRAME_MS);
      // A new game waits on whether a run would be lost, a moment later.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(kept).toEqual([true, true]);
      expect(game.runs()).toBe(runs);
    });

    it("has the paddle follow a finger where the settings say", async () => {
      const { game, run } = await runBoardScene();
      TestBed.inject(SettingsService).update({ touch: "follow" });

      run.touch("start", 40, 300);
      run.touch("move", 41, 300);
      run.advance(500, FRAME_MS);

      expect(game.frame().field.paddle.x).toBeLessThan(FIELD_WIDTH / 4);
    });

    it("plays no sound where the settings say", async () => {
      const { run } = await runBoardScene();
      TestBed.inject(SettingsService).update({ sound: false });

      run.advance(FRAME_MS);

      expect(run.scene.sound.mute).toBe(true);
    });

    it("plays a level to its end in the scene's time", async () => {
      const { game, run } = await runBoardScene();
      run.key("keydown", "Space", " ");

      advanceWhilePlaying(run, game);

      expect(game.outcome()).toBe("cleared");
    });
  });
});
