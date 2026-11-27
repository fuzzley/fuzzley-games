import { TestBed } from "@angular/core/testing";
import type { HostedScene } from "@fz/phaser/host";
import {
  type FakeCanvasOptions,
  FakePhaserCanvas,
  provideFakePhaserCanvas,
  resize,
  type SceneRun,
  runShownScene,
  watchResizes,
} from "@fz/phaser/testing";
import { viewport } from "@fz/phaser/testing/pure";
import { cssRectStyle } from "@fz/phaser/layout";
import { fireEvent, render, screen } from "@testing-library/angular";
import { levelsOf } from "@fz/core/levels";
import { paintRoles } from "@fz/style/testing";
import { levelSetOf } from "../../rules/levels/level";
import type { LevelEntry } from "../../rules/levels/levels";
import { ART_ROLES } from "../../testing/art_frames";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { boardMetrics } from "../../view/board/metrics";
import { BOARD_ROLES } from "../../view/colors/palette";
import { GameService } from "../play/game.service";
import { GAME_LEVELS } from "../tokens";
import { BoardComponent } from "./board.component";

/** How long a frame of the scene takes, in milliseconds. */
const FRAME_MS = 16;

/** A level on a board 5 squares across and 4 down, its bottom left square a gap, so the board's width, height and gaps can't be mistaken for one another. */
const GAPPED: readonly LevelEntry[] = levelsOf([
  levelSetOf({
    id: "gapped",
    name: "Gapped",
    about: "A level for the board's specs.",
    levels: [
      {
        id: 1,
        set: "gapped",
        name: "Gap",
        idea: "A board wider than it is tall, with a gap.",
        kinds: ["blue", "red", "amber", "green"],
        board: ["rgarg", "garga", "bbabr", "_rgag"],
        deals: [1],
        stars: [0, 2, 4],
        moves: 5,
        goals: [{ type: "gather", kind: "blue", count: 3 }],
      },
    ],
  }),
]);

/** Describes the board rendered on a fake canvas, and what a spec reads of it. */
interface RenderedBoard {
  /** The board's element, `app-board`, which hears the keys. */
  readonly host: HTMLElement;
  /** The application inside it, which takes the focus. */
  readonly board: HTMLElement;
  readonly component: BoardComponent;
  readonly game: GameService;
  readonly fake: FakePhaserCanvas;
  readonly detectChanges: () => void;
}

/** Renders the board on a fake canvas, the game on the small levels, or on others. */
async function renderBoard(
  canvas: FakeCanvasOptions = {},
  levels: readonly LevelEntry[] = SMALL_LEVELS,
): Promise<RenderedBoard> {
  const { fixture, detectChanges } = await render(BoardComponent, {
    providers: [
      provideFakePhaserCanvas(canvas),
      { provide: GAME_LEVELS, useValue: levels },
    ],
  });
  await fixture.whenStable();
  return {
    host: fixture.nativeElement as HTMLElement,
    board: screen.getByRole("application"),
    component: fixture.componentInstance,
    game: TestBed.inject(GameService),
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges,
  };
}

/** Runs the scene the board loads, for real, on a canvas of a CSS size, the page painted in the art's palette, its first frame drawn, renders what that changes, and returns the scene's run. */
async function runSceneOn(
  rendered: RenderedBoard,
  width: number,
  height: number,
): Promise<SceneRun<HostedScene>> {
  paintRoles(BOARD_ROLES, ART_ROLES);
  const run = await runShownScene(rendered.fake, rendered.host, {
    width,
    height,
  });
  run.advance(FRAME_MS);
  rendered.detectChanges();
  return run;
}

describe("BoardComponent", () => {
  describe("the board", () => {
    it("is named for the level on it, and described by its keys", async () => {
      await renderBoard();

      const board = screen.getByRole("application", {
        name: "Fuzz Flux, level 1: Quick clear",
      });
      expect(board).toHaveAccessibleDescription(
        /^Arrow keys: move the ring, or swap the fuzzball you hold that way\. /,
      );
    });

    it("is named for the next level as it begins", async () => {
      const { game, detectChanges } = await renderBoard();

      await game.startLevel(3);
      detectChanges();

      expect(
        screen.getByRole("application", {
          name: "Fuzz Flux, level 3: Show me",
        }),
      ).toBeInTheDocument();
    });

    it("hears the keys on its own element, through Phaser", async () => {
      const { host, fake } = await renderBoard();

      expect(fake.host.options.config?.input).toMatchObject({
        keyboard: { target: host },
      });
    });

    it("takes the focus for a press on it", async () => {
      const { board } = await renderBoard();

      fireEvent.pointerDown(board);

      expect(board).toHaveFocus();
    });

    it("takes the focus after the next render, as a level begins", async () => {
      const { board, component, detectChanges } = await renderBoard();

      component.focus();
      detectChanges();

      expect(board).toHaveFocus();
    });
  });

  describe("the scene", () => {
    it("tells the game the board is drawn once the scene is", async () => {
      const { game } = await renderBoard();

      expect(game.drawn()).toBe(true);
    });

    it("leaves the game waiting while the scene loads", async () => {
      const { game } = await renderBoard({ readyAtOnce: false });

      expect(game.drawn()).toBe(false);
    });

    it("hands the game the view's parts as it is made, the level laid on its board", async () => {
      const rendered = await renderBoard();

      await runSceneOn(rendered, 390, 600);

      expect(rendered.game.play().grid).toBe(rendered.game.state().grid);
    });

    it("plays the keys pressed on the board, through the ring", async () => {
      const rendered = await renderBoard();
      const run = await runSceneOn(rendered, 390, 600);

      run.key("keydown", "ArrowRight", "ArrowRight");
      run.advance(FRAME_MS);

      expect(rendered.game.ring().square).toEqual({ x: 1, y: 0 });
    });

    it("hands on the pictures of the pieces it bakes", async () => {
      const rendered = await renderBoard();

      await runSceneOn(rendered, 390, 600);

      expect(rendered.component.pictures()?.().kinds.blue).toMatch(
        /^data:image\/png/,
      );
    });
  });

  describe("the placeholder", () => {
    watchResizes();

    it("draws a well on each of the level's squares, and none on a gap", async () => {
      const { host } = await renderBoard({}, GAPPED);

      expect(host.querySelectorAll(".square.well")).toHaveLength(19);
    });

    it("lies where the scene will lay the board out, on the canvas the board measures", async () => {
      const { host, detectChanges } = await renderBoard({}, GAPPED);

      resize(host, 390, 600);
      detectChanges();

      expect(host.querySelector(".squares")).toHaveStyle(
        cssRectStyle(boardMetrics(viewport(390, 600), 5, 4).css),
      );
    });
  });

  describe("the focus ring", () => {
    it("lies round the board where the scene laid it out", async () => {
      const rendered = await renderBoard({}, GAPPED);

      await runSceneOn(rendered, 390, 600);

      expect(rendered.host.querySelector(".ring")).toHaveStyle(
        cssRectStyle(boardMetrics(viewport(390, 600), 5, 4).css),
      );
    });
  });
});
