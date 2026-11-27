import { colorsOf, commandsOf } from "@fz/phaser/testing";
import { itemAt } from "@fz/core/records";
import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  layoutOf,
  DARK,
  playOf,
  playTo,
  startBoard,
  stillPlayOf,
} from "../../testing/scene_shell";
import { gridOf } from "../../testing/shown_board";
import { FRAMES } from "../../view/art/frame_names";
import { bakedScale } from "../../view/art/frames";
import { ART_PALETTE } from "../../testing/art_frames";

/** Returns which squares' images of the board show, in reading order. */
function shownOf(
  images: readonly { readonly visible: boolean }[],
): readonly boolean[] {
  return images.map(({ visible }) => visible);
}

/** Returns the frame each square's dust shows, or null where it shows none, of the first so many. */
function dustOf(board: Board, squares: number): readonly (string | null)[] {
  return board.scene.board.dusts
    .slice(0, squares)
    .map((dust) => (dust.visible ? dust.frame.name : null));
}

/** Returns whether the rim covers a point of the canvas. */
function rimCovers(board: Board, x: number, y: number): boolean {
  return commandsOf(board.scene.board.rim).some(
    (command) =>
      command.kind === "fillRect" &&
      command.x <= x &&
      x < command.x + command.width &&
      command.y <= y &&
      y < command.y + command.height,
  );
}

describe("BoardPainter", () => {
  it("sets a well at each square's middle", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const metrics = layoutOf(board);

    const well = itemAt(board.scene.board.wells, 5);

    expect([well.x, well.y, well.frame.name]).toEqual([
      metrics.x + 2.5 * metrics.square,
      metrics.y + 1.5 * metrics.square,
      FRAMES.square,
    ]);
  });

  it("shows a well at the board's square, though the art caps the square the atlas is baked for", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch, undefined, {
      width: 1600,
      height: 1600,
    });
    const metrics = layoutOf(board);
    const baked = bakedScale({ unit: metrics.square, pixelRatio: 1 });

    const well = itemAt(board.scene.board.wells, 0);

    expect({ capped: baked.unit < metrics.square, scale: well.scaleX }).toEqual(
      { capped: true, scale: metrics.square / baked.unit },
    );
  });

  it("shows a well for each square of the board, none for a gap and none past its squares", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);

    playTo(board, stillPlayOf(gridOf(boardFrom(["b_b", "rbr"]))), 16);

    expect(shownOf(board.scene.board.wells).slice(0, 8)).toEqual([
      true,
      false,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("shows the dust each square holds as the move starts", async () => {
    const board = await startBoard(MOVE_FIXTURES.dustSwept);

    expect(dustOf(board, 4)).toEqual(["dust-2", "dust-1", "dust-2", null]);
  });

  it("sweeps a layer of dust off each square as the move's timeline says", async () => {
    const board = await startBoard(MOVE_FIXTURES.dustSwept);
    const play = playOf(MOVE_FIXTURES.dustSwept);
    const sweptMs = Math.max(...play.timeline.dust.map(({ atMs }) => atMs));

    playTo(board, play, sweptMs + 16);

    expect(dustOf(board, 4)).toEqual(["dust-1", null, "dust-1", null]);
  });

  it("draws the page round the board", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const rim = board.scene.board.rim;

    expect({
      colors: colorsOf(rim),
      rects: commandsOf(rim).filter(({ kind }) => kind === "fillRect").length,
    }).toEqual({ colors: [ART_PALETTE.page], rects: 4 });
  });

  it("leaves the board and a margin about it clear of the rim", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const { x, y, width, square } = layoutOf(board);
    const middle = x + width / 2;
    const margin = Math.round(0.04 * square);

    const covered = [y + square, y - 1, y - margin - 1].map((down) =>
      rimCovers(board, middle, down),
    );

    expect(covered).toEqual([false, false, true]);
  });

  it("draws the rim again in a new palette's page", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);

    board.shell.colors = DARK;
    board.run.advance(16);

    expect(colorsOf(board.scene.board.rim)).toEqual([DARK.page]);
  });

  it("sets the wells again where the board is laid out again", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);

    board.run.game.scale.resize(300, 300);
    board.run.advance(16);

    const metrics = layoutOf(board);
    const well = itemAt(board.scene.board.wells, 0);
    expect([well.x, well.y]).toEqual([
      metrics.x + metrics.square / 2,
      metrics.y + metrics.square / 2,
    ]);
  });
});
