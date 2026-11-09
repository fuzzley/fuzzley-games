import { TestBed } from "@angular/core/testing";
import { readRect } from "@fz/dev/board-page";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  FakeResizeObserver,
  type SceneRun,
  collectErrors,
  provideFakePhaserCanvas,
  resize,
  runScene,
  watchResizes,
} from "@fz/phaser/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { stepMs } from "../../rules/speed";
import { playToTheEnd, provideFixedSeed } from "../../testing/play";
import { GameService } from "../play/game.service";
import { BoardComponent } from "./board.component";

/** Space as a browser sends it, with the key code Phaser's capture reads. */
const SPACE = { key: " ", code: "Space", keyCode: 32 } as const;

/** The colors the page gives the board, as a palette's stylesheet would. */
const ROLES = {
  panel: "#f1f3f5",
  text: "#1f2328",
  accent: "#2a7a3a",
  danger: "#c0392b",
};

/**
 * Renders the board beside a button outside it, on a fake canvas, with the
 * arrows beside it where `arrows` says, and waits for its scene to be drawn,
 * unless `readyAtOnce` is false.
 */
async function renderBoard(
  options: FakeCanvasOptions = {},
  arrows = false,
): Promise<{
  board: HTMLElement;
  game: GameService;
  fake: FakePhaserCanvas;
  detectChanges: () => void;
}> {
  const view = await render(
    `<app-board [arrows]="${String(arrows)}" /><button type="button">Elsewhere</button>`,
    {
      imports: [BoardComponent],
      providers: [provideFakePhaserCanvas(options), provideFixedSeed()],
    },
  );
  await view.fixture.whenStable();
  return {
    board: screen.getByRole("application"),
    game: TestBed.inject(GameService),
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges: () => {
      view.detectChanges();
    },
  };
}

describe("BoardComponent", () => {
  describe("the board", () => {
    it("is named for its size, and described by its keys", async () => {
      await renderBoard();

      const board = screen.getByRole("application", {
        name: "Snake, 17 by 17",
      });
      expect(board).toHaveAccessibleDescription(/^The arrow keys/);
    });

    it("hears the keys on its own element, through Phaser", async () => {
      const { board, fake } = await renderBoard();

      expect(fake.host.options.config?.input).toMatchObject({
        keyboard: { target: board },
      });
    });

    it("takes the focus for a press on it", async () => {
      const { board } = await renderBoard();

      fireEvent.pointerDown(board);

      expect(board).toHaveFocus();
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

    it("is the canvas's as the board is first drawn, before the browser reports its size", async () => {
      vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2.5);
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 1707, 960),
      );

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
      let viewport: FakeViewport | null = null;

      beforeEach(() => {
        viewport = installFakeViewport(1280, 720);
      });

      afterEach(() => {
        viewport?.restore();
        viewport = null;
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
        viewport?.setPixelRatio(2);
        detectChanges();

        expect(board.style.getPropertyValue("--pixel-ratio")).toBe("2");
      });
    });

    it("stops being followed once the board is gone", async () => {
      const { fixture } = await render(BoardComponent, {
        providers: [provideFakePhaserCanvas(), provideFixedSeed()],
      });

      fixture.destroy();

      expect(FakeResizeObserver.made.map((made) => made.watched.size)).toEqual([
        0,
      ]);
    });
  });

  describe("the cards", () => {
    it("say how to start while the run waits", async () => {
      await renderBoard();

      expect(
        screen.getByText("Press an arrow key, or swipe, to start."),
      ).toBeInTheDocument();
    });

    it("say how to start while the scene still loads, before it is slow", async () => {
      await renderBoard({ readyAtOnce: false });

      expect(
        screen.getByText("Press an arrow key, or swipe, to start."),
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

      it("say to swipe or press an arrow, with the arrows beside the board", async () => {
        await renderBoard({}, true);

        expect(
          screen.getByText("Swipe, or press an arrow, to start."),
        ).toBeInTheDocument();
      });

      it("say to swipe, without them", async () => {
        await renderBoard();

        expect(screen.getByText("Swipe to start.")).toBeInTheDocument();
      });
    });

    it("say the run is paused, with its score", async () => {
      const { game, detectChanges } = await renderBoard();
      game.turn("up");

      game.pause();
      detectChanges();

      expect(screen.getByText("Paused")).toBeInTheDocument();
      expect(screen.getByText("Score 0")).toBeInTheDocument();
    });

    it("go on at Resume, handing the board the focus", async () => {
      const { board, game, detectChanges } = await renderBoard();
      game.turn("up");
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(board).toHaveFocus();
    });

    it("show nothing over a run under way", async () => {
      const { game, detectChanges } = await renderBoard();

      game.turn("up");
      detectChanges();

      expect(screen.queryByText(/to start|Paused/)).not.toBeInTheDocument();
    });

    it("say nothing over an ended run while its result is to come", async () => {
      const { game, detectChanges } = await renderBoard();
      game.turn("up");
      playToTheEnd(game);

      detectChanges();

      expect(screen.queryByText("Game over")).not.toBeInTheDocument();
    });

    it("offer a new game once an ended run's result is put away", async () => {
      const { game, detectChanges } = await renderBoard();
      game.turn("up");
      playToTheEnd(game);

      game.closeResult();
      detectChanges();

      expect(screen.getByText("Game over")).toBeInTheDocument();
      expect(screen.getByText("Score 0")).toBeInTheDocument();
    });

    it("start a new game from the card over an ended run", async () => {
      const { game, detectChanges } = await renderBoard();
      game.turn("up");
      playToTheEnd(game);
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
      expect(
        screen.queryByText("Press an arrow key, or swipe, to start."),
      ).not.toBeInTheDocument();
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
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(
          screen.getAllByRole("button").map((button) => button.textContent),
        ).toEqual(["Elsewhere"]);
        expect(
          screen.queryByText("Press an arrow key, or swipe, to start."),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("with the scene it loads", () => {
    let scene: SceneRun<HostedScene> | null = null;

    beforeEach(() => {
      for (const [role, color] of Object.entries(ROLES)) {
        document.documentElement.style.setProperty(`--fz-${role}`, color);
      }
    });

    afterEach(() => {
      scene?.destroy();
      scene = null;
      document.documentElement.removeAttribute("style");
    });

    /** Runs the scene the board hands its canvas, as Phaser would. */
    async function runBoardScene(): Promise<{
      board: HTMLElement;
      game: GameService;
      run: SceneRun<HostedScene>;
      detectChanges: () => void;
    }> {
      const { board, game, fake, detectChanges } = await renderBoard();
      const make = await fake.host.latest.source();
      const run = await runScene(make, {
        config: { input: { keyboard: { target: board } } },
      });
      scene = run;
      run.advance(16);
      return { board, game, run, detectChanges };
    }

    it("publishes where the scene laid the board out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      expect(readRect(board.getAttribute("data-board"))).not.toBeNull();
    });

    it("lays the focus ring where the scene laid the board out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      const { x, y, width, height } = readRect(
        board.getAttribute("data-board"),
      )!;
      // The ring is only drawn, so it has no role to find it by.
      expect(board.querySelector(".ring")).toHaveStyle({
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    });

    it("starts the run at a key pressed on the board", async () => {
      const { game, run } = await runBoardScene();

      run.key("keydown", "ArrowUp");
      run.advance(16);

      expect(game.outcome()).toBe("playing");
    });

    it.each([
      ["Space", " "],
      ["Enter", "{Enter}"],
    ])(
      "goes on at %s on Resume, handing the board the focus",
      async (_, keys) => {
        const { board, game, run, detectChanges } = await runBoardScene();
        game.turn("up");
        game.pause();
        detectChanges();
        screen.getByRole("button", { name: "Resume" }).focus();

        await userEvent.keyboard(keys);
        run.advance(16);

        expect(game.outcome()).toBe("playing");
        expect(board).toHaveFocus();
      },
    );

    it("leaves Space on New game to the button, down and up", async () => {
      const { game, run, detectChanges } = await runBoardScene();
      game.turn("up");
      playToTheEnd(game);
      game.closeResult();
      detectChanges();
      const newGame = screen.getByRole("button", { name: "New game" });
      const runs = game.runs();

      // Sent as events, since the scene's own Space starts a run too: what
      // the button changes is that the scene never hears it.
      const kept = [
        fireEvent.keyDown(newGame, SPACE),
        fireEvent.keyUp(newGame, SPACE),
      ];
      run.advance(16);
      // A new game waits on whether a run would be lost, a moment later.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(kept).toEqual([true, true]);
      expect(game.runs()).toBe(runs);
    });

    it("moves the run on in the scene's time", async () => {
      const { game, run } = await runBoardScene();
      game.turn("up");

      run.advance(stepMs("normal", 0) + 16);

      expect(game.run().steps).toBe(1);
    });
  });
});
