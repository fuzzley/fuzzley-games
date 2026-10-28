import { TestBed } from "@angular/core/testing";
import type { HostedScene } from "@fz/phaser/host";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  type SceneRun,
  provideFakePhaserCanvas,
  runScene,
} from "@fz/phaser/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { stepMs } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { BoardComponent } from "./board.component";

/** The colors the page gives the board, as a palette's stylesheet would. */
const ROLES = {
  panel: "#f1f3f5",
  text: "#1f2328",
  accent: "#2a7a3a",
  danger: "#c0392b",
};

/** Renders the board beside a button outside it, on a fake canvas. */
async function renderBoard(options: FakeCanvasOptions = {}): Promise<{
  board: HTMLElement;
  game: GameService;
  fake: FakePhaserCanvas;
  detectChanges: () => void;
}> {
  const view = await render(
    `<app-board /><button type="button">Elsewhere</button>`,
    {
      imports: [BoardComponent],
      providers: [provideFakePhaserCanvas(options)],
    },
  );
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

  describe("the cards", () => {
    it("say how to start while the run waits", async () => {
      await renderBoard();

      expect(
        screen.getByText("Press an arrow key, or swipe, to start."),
      ).toBeInTheDocument();
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
  });

  describe("pausing", () => {
    it("pauses the run as the focus leaves the board", async () => {
      const { board, game } = await renderBoard();
      board.focus();
      game.turn("up");

      await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));

      expect(game.outcome()).toBe("paused");
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

      expect(board.dataset["board"]).toMatch(/^[\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
    });

    it("lays the focus ring where the scene laid the board out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      const [x, y, width, height] = (board.dataset["board"] ?? "").split(" ");
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

    it("moves the run on in the scene's time", async () => {
      const { game, run } = await runBoardScene();
      game.turn("up");

      run.advance(stepMs("normal", 0) + 16);

      expect(game.run().steps).toBe(1);
    });
  });
});
