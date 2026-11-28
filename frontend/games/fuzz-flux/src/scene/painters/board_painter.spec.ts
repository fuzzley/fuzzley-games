import { dynamicTexture } from "@fz/phaser/scene";
import {
  type BakeCommand,
  colorsOf,
  commandsOf,
  recordBakes,
  stampsIn,
} from "@fz/phaser/testing";
import { Textures } from "phaser";
import { ART_PALETTE } from "../../testing/art_frames";
import { boardFrom } from "../../testing/board_picture";
import type { MoveFixture } from "../../testing/move_fixtures";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  type Canvas,
  DARK,
  drawnPlay,
  layoutOf,
  playOf,
  playTo,
  startBoard,
  stillPlayOf,
} from "../../testing/scene_shell";
import { gridOf } from "../../testing/shown_board";
import { FRAMES } from "../../view/art/frame_names";
import { bakedScale } from "../../view/art/frames";
import { SQUARES_BAKE } from "./board_painter";

/** Describes a board running a move's scene, and reads what its squares' bake was handed from the start. */
interface Stamped {
  readonly board: Board;
  readonly baked: () => BakeCommand[];
}

/** Runs the scene on a move's board, on a canvas 400 pixels square unless given another, recording what every bake is handed from the start. */
async function boardStamped(
  fixture: MoveFixture,
  canvas?: Canvas,
): Promise<Stamped> {
  const bakes = recordBakes(Textures.DynamicTexture.prototype);
  onTestFinished(() => {
    vi.restoreAllMocks();
  });
  const board = await startBoard(fixture, undefined, canvas);
  return { board, baked: () => bakes(SQUARES_BAKE) };
}

/** Returns the commands a bake was handed from its last whole clear on, throwing where it was never cleared whole. */
function sinceWhole(commands: readonly BakeCommand[]): readonly BakeCommand[] {
  const whole = commands
    .map((command) => command.kind === "clear" && command.rect === null)
    .lastIndexOf(true);
  if (whole < 0) throw new Error("The bake was never cleared whole.");
  return commands.slice(whole);
}

/** Returns the frames stamped on the bake, each with the square it lies in, as "frame column,row", in the order stamped. */
function stampedOn(
  board: Board,
  commands: readonly BakeCommand[],
): readonly string[] {
  const { square } = layoutOf(board);
  return stampsIn(commands).map(
    ({ frame, x, y }) =>
      `${frame} ${String(Math.floor(x / square))},${String(Math.floor(y / square))}`,
  );
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
  it("stamps a well at each square's middle, on a bake as large as the board shown at its top left corner", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch);
    const metrics = layoutOf(board);
    const bake = dynamicTexture(board.scene, SQUARES_BAKE);
    const { squares } = board.scene.board;

    expect({
      at: [squares.x, squares.y],
      size: [bake.width, bake.height],
      fifth: stampsIn(sinceWhole(baked()))[5],
    }).toEqual({
      at: [metrics.x, metrics.y],
      size: [metrics.width, metrics.height],
      fifth: {
        kind: "stamp",
        frame: FRAMES.square,
        x: 2.5 * metrics.square,
        y: 1.5 * metrics.square,
        scale: 1,
      },
    });
  });

  it("stamps a well at the board's square, though the art caps the square the atlas is baked for", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch, {
      width: 1600,
      height: 1600,
    });
    const metrics = layoutOf(board);
    const atlasScale = bakedScale({ unit: metrics.square, pixelRatio: 1 });

    const [well] = stampsIn(sinceWhole(baked()));

    expect({
      capped: atlasScale.unit < metrics.square,
      scale: well?.scale,
    }).toEqual({ capped: true, scale: metrics.square / atlasScale.unit });
  });

  it("stamps a well on each square of the board, and none on a gap", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch);

    playTo(board, stillPlayOf(gridOf(boardFrom(["b_b", "rbr"]))), 16);

    expect(stampedOn(board, sinceWhole(baked()))).toEqual([
      "square 0,0",
      "square 2,0",
      "square 0,1",
      "square 1,1",
      "square 2,1",
    ]);
  });

  it("stamps the dust each square holds as the move starts over its well", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.dustSwept);

    expect(stampedOn(board, sinceWhole(baked())).slice(0, 7)).toEqual([
      "square 0,0",
      "dust-2 0,0",
      "square 1,0",
      "dust-1 1,0",
      "square 2,0",
      "dust-2 2,0",
      "square 0,1",
    ]);
  });

  it("stamps again only each square a layer of dust is swept off, as the move's timeline says, clearing it first", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.dustSwept);
    const play = playOf(MOVE_FIXTURES.dustSwept);
    const sweptMs = Math.max(...play.timeline.dust.map(({ atMs }) => atMs));
    playTo(board, play, 16);
    const from = baked().length;

    playTo(board, play, sweptMs + 16);

    const swept = baked().slice(from);
    const { square } = layoutOf(board);
    expect({
      cleared: swept.flatMap((command) =>
        command.kind === "clear" ? [command.rect] : [],
      ),
      stamped: stampedOn(board, swept),
      rendered: swept.at(-1),
    }).toEqual({
      cleared: [0, 1, 2].map((column) => ({
        x: column * square,
        y: 0,
        width: square,
        height: square,
      })),
      stamped: [
        "square 0,0",
        "dust-1 0,0",
        "square 1,0",
        "square 2,0",
        "dust-1 2,0",
      ],
      rendered: { kind: "render" },
    });
  });

  it("clears and stamps again a square past the first row and column as a layer of its dust is swept off", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch);
    const play = drawnPlay({
      dust: [
        { atMs: 0, at: { x: 2, y: 1 }, layers: 2 },
        { atMs: 40, at: { x: 2, y: 1 }, layers: 1 },
      ],
    });
    playTo(board, play, 16);
    const from = baked().length;

    playTo(board, play, 32);

    const swept = baked().slice(from);
    const { square } = layoutOf(board);
    expect({
      cleared: swept.flatMap((command) =>
        command.kind === "clear" ? [command.rect] : [],
      ),
      stamped: stampedOn(board, swept),
    }).toEqual({
      cleared: [{ x: 2 * square, y: square, width: square, height: square }],
      stamped: ["square 2,1", "dust-1 2,1"],
    });
  });

  it("stamps nothing while nothing changes", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch);
    const from = baked().length;

    board.run.advance(48);

    expect(baked().length).toBe(from);
  });

  it.each([
    [
      "the board is laid out again",
      (board: Board): void => {
        board.run.game.scale.resize(300, 300);
      },
    ],
    [
      "the shell hands it a new palette",
      (board: Board): void => {
        board.shell.colors = DARK;
      },
    ],
  ])("stamps the bake whole again as %s", async (_, change) => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch);
    const from = baked().length;

    change(board);
    board.run.advance(16);

    const again = baked().slice(from);
    const metrics = layoutOf(board);
    expect({
      first: again[0],
      stamps: stampsIn(again).length,
      at: [board.scene.board.squares.x, board.scene.board.squares.y],
    }).toEqual({
      first: { kind: "clear", rect: null },
      stamps: 9,
      at: [metrics.x, metrics.y],
    });
  });

  it("stamps the bake whole again once a lost context is restored", async () => {
    const { board, baked } = await boardStamped(MOVE_FIXTURES.bunch);
    await board.run.loseContext();
    await board.run.restoreContext();
    const from = baked().length;

    board.run.advance(16);

    const again = baked().slice(from);
    expect({ first: again[0], stamps: stampsIn(again).length }).toEqual({
      first: { kind: "clear", rect: null },
      stamps: 9,
    });
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
});
