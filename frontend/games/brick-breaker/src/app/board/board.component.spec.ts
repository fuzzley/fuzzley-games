import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
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
import {
  FRAME_MS,
  SPEC_LEVEL,
  STILL,
  loseBall,
  playToClear,
  playUntil,
  provideSpecLevels,
} from "../../testing/play";
import { FIELD_WIDTH, FIRST_LIVES } from "../../rules/tuning";
import { paintRoles } from "../../testing/roles";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BoardComponent } from "./board.component";

/** Space as a browser sends it, with the key code Phaser's capture reads. */
const SPACE = { key: " ", code: "Space", keyCode: 32 } as const;

/** The longest the scene plays a level for before a spec gives up on it. */
const LEVEL_LIMIT_MS = 10_000;

/** Renders the board beside a button outside it, on a fake canvas. */
async function renderBoard(options: FakeCanvasOptions = {}): Promise<{
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
      providers: [provideFakePhaserCanvas(options), ...provideSpecLevels()],
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

/** Returns the cleared card's sum, each line as its term and its points. */
function tallyLines(): [string, string][] {
  return screen
    .getAllByRole("term")
    .map((term) => [
      term.textContent.trim(),
      term.nextElementSibling?.textContent.trim() ?? "",
    ]);
}

/** Returns the board's game with its run at one of the specs' levels. */
async function renderAt(level: number): Promise<{
  board: HTMLElement;
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
      const { board } = await renderBoard();

      fireEvent.pointerDown(board);

      expect(board).toHaveFocus();
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
  });

  describe("the cards", () => {
    it("name the level, and say how to launch, while the ball waits", async () => {
      await renderBoard();

      expect(screen.getByText("Level 1: Blasts")).toBeInTheDocument();
      expect(
        screen.getByText("Press Space or click to launch."),
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
      const { board, game, detectChanges } = await renderAt(SPEC_LEVEL.steel);
      game.launch();
      game.pause();
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(board).toHaveFocus();
    });

    it("add up a cleared level's points", async () => {
      const { game, detectChanges } = await renderAt(SPEC_LEVEL.blasts);
      playToClear(game);

      game.tick(FRAME_MS, STILL);
      detectChanges();

      expect(screen.getByText("Level 1 cleared")).toBeInTheDocument();
      expect(tallyLines()).toEqual([
        ["Bricks", "1300"],
        ["Streaks", "1300"],
        ["Bonus", "1500"],
      ]);
      expect(screen.getByText("Score 4100")).toBeInTheDocument();
    });

    it("go on to the next level at Next level, handing the board the focus", async () => {
      const { board, game, detectChanges } = await renderAt(SPEC_LEVEL.blasts);
      playToClear(game);
      game.tick(FRAME_MS, STILL);
      detectChanges();

      await userEvent.click(screen.getByRole("button", { name: "Next level" }));

      expect(game.level().number).toBe(SPEC_LEVEL.wide);
      expect(board).toHaveFocus();
    });

    describe("where motion is welcome", () => {
      let viewport: FakeViewport | null = null;

      beforeEach(() => {
        viewport = installFakeViewport(1024, 768);
      });

      afterEach(() => {
        viewport?.restore();
        viewport = null;
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

    /** Runs the scene the board hands its canvas, as Phaser would. */
    async function runBoardScene(): Promise<{
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
        config: { input: { keyboard: { target: board } } },
      });
      scene = run;
      run.advance(FRAME_MS);
      return { board, component, game, run, detectChanges };
    }

    it("publishes where the scene laid the field out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      expect(board.dataset["field"]).toMatch(/^[\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
    });

    it("lays the focus ring where the scene laid the field out", async () => {
      const { board, detectChanges } = await runBoardScene();

      detectChanges();

      const [x, y, width, height] = (board.dataset["field"] ?? "").split(" ");
      // The ring is only drawn, so it has no role to find it by.
      expect(board.querySelector(".ring")).toHaveStyle({
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    });

    it("keeps the scene's pictures for How to play", async () => {
      const { component } = await runBoardScene();

      expect(component.pictures()).not.toBeNull();
    });

    it("launches the ball at Space pressed on the board", async () => {
      const { game, run } = await runBoardScene();

      run.key("keydown", "Space", " ");
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

    it("has the paddle follow a finger where the settings say", async () => {
      const { game, run } = await runBoardScene();
      TestBed.inject(SettingsService).update({ touch: "follow" });

      run.touch("start", 40, 300);
      run.touch("move", 41, 300);
      run.advance(500, FRAME_MS);

      expect(game.frame().field.paddle.x).toBeLessThan(FIELD_WIDTH / 4);
    });

    it("plays a level to its end in the scene's time", async () => {
      const { game, run } = await runBoardScene();
      run.key("keydown", "Space", " ");

      advanceWhilePlaying(run, game);

      expect(game.outcome()).toBe("cleared");
    });
  });
});
