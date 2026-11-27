import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import { boardFrom } from "../testing/board_picture";
import { MOVE_FIXTURES } from "../testing/move_fixtures";
import {
  type Board,
  type Canvas,
  type FakeShell,
  playOf,
  startBoard as startOn,
  stillPlayOf,
} from "../testing/scene_shell";
import { gridOf } from "../testing/shown_board";
import { type BoardMetrics, boardMetrics } from "../view/board/metrics";

/** Runs the scene on the bunch's board, 3 squares by 3, set up as a spec says. */
function startBoard(
  setUp?: (shell: FakeShell) => void,
  canvas?: Canvas,
): Promise<Board> {
  return startOn(MOVE_FIXTURES.bunch, setUp, canvas);
}

/** Returns where a board so many squares across and down lies on a canvas, at one pixel to a CSS pixel. */
function metricsOn(
  { width, height }: Canvas,
  across = 3,
  down = 3,
  insets: Insets = NO_INSETS,
): BoardMetrics {
  return boardMetrics({ width, height, pixelRatio: 1, insets }, across, down);
}

/** The canvas a board runs on unless a spec gives another. */
const CANVAS: Canvas = { width: 400, height: 400 };

describe("FuzzFluxScene", () => {
  it("says it is ready once it has drawn its first frame", async () => {
    const { run } = await startBoard();

    expect(run.ready).toBe(true);
  });

  describe("its clock", () => {
    it("hands the shell its clock each frame, and how far the play stands into its timeline", async () => {
      const { shell, run } = await startBoard();

      run.advance(32, 16);

      expect(shell.ticks.slice(-2)).toEqual([
        { nowMs: 32, playedMs: 32 },
        { nowMs: 48, playedMs: 48 },
      ]);
    });

    it("plays a new play from the frame that meets it", async () => {
      const { shell, run } = await startBoard();

      shell.shown = playOf(MOVE_FIXTURES.bunch);
      run.advance(32, 16);

      expect(shell.ticks.at(-1)).toEqual({ nowMs: 48, playedMs: 32 });
    });
  });

  describe("the layout", () => {
    it("tells the shell where the board lies, inside the chrome", async () => {
      const insets = { top: 48, right: 0, bottom: 0, left: 0 };

      const { shell } = await startBoard((board) => {
        board.chrome = insets;
      });

      expect(shell.layouts).toEqual([metricsOn(CANVAS, 3, 3, insets)]);
    });

    it("lays the board out again under new chrome", async () => {
      const { shell, run } = await startBoard();
      const insets = { top: 0, right: 0, bottom: 64, left: 0 };

      shell.chrome = insets;
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(metricsOn(CANVAS, 3, 3, insets));
    });

    it("lays the board out again for a board of another size", async () => {
      const { shell, run } = await startBoard();

      shell.shown = stillPlayOf(
        gridOf(boardFrom({ pieces: ["bgbr", "rbrg"] })),
      );
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(metricsOn(CANVAS, 4, 2));
    });

    it("lays the board out again as the canvas changes size", async () => {
      const { shell, run } = await startBoard();

      run.game.scale.resize(300, 500);
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        metricsOn({ width: 300, height: 500 }),
      );
    });

    it("keeps its layout while the canvas has no room, as a hidden board's", async () => {
      const { shell, run } = await startBoard();

      run.game.scale.resize(0, 0);
      run.advance(16);

      expect(shell.layouts).toEqual([metricsOn(CANVAS)]);
    });

    it("lays the board out again once the canvas has room again", async () => {
      const { shell, run } = await startBoard();
      run.game.scale.resize(0, 0);
      run.advance(16);

      run.game.scale.resize(300, 300);
      run.advance(16);

      expect(shell.layouts.at(-1)).toEqual(
        metricsOn({ width: 300, height: 300 }),
      );
    });

    it("lays the board out on a canvas with no room as the scene starts, as it has no layout to keep", async () => {
      const { shell } = await startBoard(undefined, { width: 0, height: 0 });

      expect(shell.layouts).toEqual([metricsOn({ width: 0, height: 0 })]);
    });

    it("lays the board out once while nothing changes", async () => {
      const { shell, run } = await startBoard();

      run.advance(64, 16);

      expect(shell.layouts).toHaveLength(1);
    });
  });
});
