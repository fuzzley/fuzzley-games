import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { PhaserCanvasComponent } from "@fz/phaser/canvas";
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
import { PANEL_GAP_CSS_PX, cssRectStyle } from "@fz/phaser/layout";
import { fireEvent, render, screen } from "@testing-library/angular";
import { paintRoles } from "@fz/style/testing";
import type { LevelEntry } from "../../rules/levels/levels";
import { ART_ROLES } from "../../testing/art_frames";
import { GAPPED_LEVELS, SMALL_LEVELS } from "../../testing/small_levels";
import { boardMetrics } from "../../view/board/metrics";
import { BOARD_ROLES } from "../../view/colors/palette";
import { GameService } from "../play/game.service";
import { GAME_LEVELS } from "../tokens";
import { BoardComponent } from "./board.component";

/** How long a frame of the scene takes, in milliseconds. */
const FRAME_MS = 16;

/** Describes the board rendered on a fake canvas, and what a spec reads of it. */
interface RenderedBoard {
  /** The board's element, `app-board`, which hears the keys. */
  readonly host: HTMLElement;
  /** The canvas, which a press on the board lands on, through the grid over it. */
  readonly canvas: HTMLElement;
  /** The element the canvas and the grid lie in. */
  readonly play: HTMLElement;
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
    canvas: fixture.debugElement.query(By.directive(PhaserCanvasComponent))
      .nativeElement as HTMLElement,
    play: fixture.debugElement.query(By.css(".play"))
      .nativeElement as HTMLElement,
    component: fixture.componentInstance,
    game: TestBed.inject(GameService),
    fake: TestBed.inject(FakePhaserCanvas),
    detectChanges,
  };
}

/** Returns the square that holds the grid's one tab stop. */
function tabStop(): HTMLElement | undefined {
  return screen.getAllByRole("gridcell").find((cell) => cell.tabIndex === 0);
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
    it("hears the keys on its own element, through Phaser", async () => {
      const { host, fake } = await renderBoard();

      expect(fake.host.options.config?.input).toMatchObject({
        keyboard: { target: host },
      });
    });

    it("puts the focus on the grid's tab stop for a press on it", async () => {
      const { canvas } = await renderBoard();

      fireEvent.pointerDown(canvas);

      expect(tabStop()).toHaveFocus();
    });

    it("cancels the mouse's press, which would take the focus off the grid", async () => {
      const { canvas } = await renderBoard();

      const notCancelled = fireEvent.mouseDown(canvas);

      expect(notCancelled).toBe(false);
    });

    it("hands the grid's tab stop the focus that lands on the board itself", async () => {
      const { play } = await renderBoard();

      play.focus();

      expect(tabStop()).toHaveFocus();
    });

    it("puts the focus on the grid's tab stop after the next render, as a level begins", async () => {
      const { component, detectChanges } = await renderBoard();

      component.focus();
      detectChanges();

      expect(tabStop()).toHaveFocus();
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
      const { host } = await renderBoard({}, GAPPED_LEVELS);

      expect(host.querySelectorAll(".square.well")).toHaveLength(19);
    });

    it("lies where the scene will lay the board out, on the canvas the board measures", async () => {
      const { host, detectChanges } = await renderBoard({}, GAPPED_LEVELS);

      resize(host, 390, 600);
      detectChanges();

      expect(host.querySelector(".squares")).toHaveStyle(
        cssRectStyle(boardMetrics(viewport(390, 600), 5, 4).css),
      );
    });
  });

  describe("the room left of the board", () => {
    watchResizes();

    it("lies between the canvas's edge and the board, where the room spares no panels", async () => {
      const { host, component, detectChanges } = await renderBoard();

      resize(host, 603, 375);
      detectChanges();

      const { css } = boardMetrics(viewport(603, 375), 5, 5);
      expect(component.besideBoard()).toEqual(
        cssRectStyle({
          x: PANEL_GAP_CSS_PX,
          y: css.y,
          width: css.x - 2 * PANEL_GAP_CSS_PX,
          height: css.height,
        }),
      );
    });

    it("is none where it is too narrow to show anything in", async () => {
      const { host, component, detectChanges } = await renderBoard();

      resize(host, 390, 600);
      detectChanges();

      expect(component.besideBoard()).toBeNull();
    });

    it("is none beside panels", async () => {
      const { host, component, detectChanges } = await renderBoard();

      resize(host, 1280, 728);
      detectChanges();

      expect(component.besideBoard()).toBeNull();
    });
  });

  describe("the grid", () => {
    it("lies over the board where the scene laid it out", async () => {
      const rendered = await renderBoard({}, GAPPED_LEVELS);

      await runSceneOn(rendered, 390, 600);

      expect(rendered.host.querySelector("app-board-grid")).toHaveStyle(
        cssRectStyle(boardMetrics(viewport(390, 600), 5, 4).css),
      );
    });
  });
});
