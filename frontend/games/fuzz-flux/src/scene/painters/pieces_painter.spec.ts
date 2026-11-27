import { itemAt } from "@fz/core/records";
import { type GameObjects, TintModes } from "phaser";
import type { Fuzzball, Piece } from "../../rules/catalog/pieces";
import { ART_PALETTE } from "../../testing/art_frames";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  layoutOf,
  playOf,
  drawnPlay,
  playTo,
  startBoard,
  stillTrackOf,
} from "../../testing/scene_shell";
import { BURRED_SCALE } from "../../view/art/elements/burr";
import { FRAMES } from "../../view/art/frame_names";
import { DIM_DEPTH, PieceLook } from "../../view/art/piece_look";
import { blinkAt } from "../../view/idle/blinks";
import { breathAt } from "../../view/idle/breaths";
import { FEEL } from "../../view/timeline/feel";
import { frameFor, sampleAt } from "../../view/timeline/sample";
import type { PieceTrack, Sampled } from "../../view/timeline/timeline";
import type { PieceSprite } from "./piece_sprite";

/** Returns a plain red fuzzball, but as a spec changes it. */
function fuzzball(change: Partial<Fuzzball> = {}): Fuzzball {
  return {
    what: "fuzzball",
    id: 1,
    kind: "red",
    special: null,
    caged: false,
    burred: false,
    ...change,
  };
}

/** Runs the scene on a board drawing the pieces' tracks given, and returns it once it has drawn a frame of them. */
async function boardOf(...tracks: readonly PieceTrack[]): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch);
  playTo(board, drawnPlay({ pieces: tracks }), 16);
  return board;
}

/** Returns the sprite of the board's pieces the scene draws a piece on the board with, in the order the timeline lists them. */
function spriteAt(board: Board, index: number): PieceSprite {
  return itemAt(board.scene.pieces.onBoard, index);
}

/** Returns how an image shows: its frame, or null where it is hidden, and how opaque it is. */
function showing(image: GameObjects.Image): {
  frame: string | null;
  alpha: number;
} {
  return {
    frame: image.visible ? image.frame.name : null,
    alpha: image.alpha,
  };
}

/** Returns how far the eyes of the sprite the board draws a piece on it with sit from the middle of the square the piece stands on, in the middle row, in squares. */
function eyesFrom(
  board: Board,
  index: number,
  across = 1,
): { x: number; y: number } {
  const { x, y, square } = layoutOf(board);
  const { eyes } = spriteAt(board, index);
  return {
    x: (eyes.x - x) / square - across - 0.5,
    y: (eyes.y - y) / square - 1.5,
  };
}

/** Returns how a piece's track samples standing still, as it does from the tap. */
function sampledOf(track: PieceTrack): Sampled {
  return { ...track.look, shown: true, face: track.face, drawn: track.drawn };
}

/** Returns the first moment on the scene's clock from one on, a frame apart, at which a fuzzball at rest blinks. */
function blinkMsOf(piece: Fuzzball, fromMs: number): number {
  const sampled = sampledOf(stillTrackOf(piece));
  let ms = fromMs;
  while (blinkAt(FEEL, ms, { ...sampled }).face !== "blink") ms += 16;
  return ms;
}

/** Returns how many of the sprites show a body. */
function bodiesShown(sprites: readonly PieceSprite[]): number {
  return sprites.filter(({ body }) => body.visible).length;
}

describe("PiecesPainter", () => {
  it("draws a piece where it stands, leaning as it leans, in its body's frame", async () => {
    const board = await boardOf(
      stillTrackOf(fuzzball(), { x: 2, y: 0, leanX: 0.25, leanY: -0.5 }),
    );
    const { x, y, square } = layoutOf(board);

    const { body } = spriteAt(board, 0);

    expect([body.x, body.y, body.frame.name, body.visible]).toEqual([
      x + 2.75 * square,
      y + 0 * square,
      FRAMES.body("red", "plain", "rest"),
      true,
    ]);
  });

  it("squashes, stretches and turns a piece as it is sampled", async () => {
    const board = await boardOf(
      stillTrackOf(fuzzball(), { scaleX: 1.25, scaleY: 0.75, rotation: 0.5 }),
    );

    const { body } = spriteAt(board, 0);

    expect([body.scaleX, body.scaleY, body.rotation]).toEqual([
      1.25, 0.75, 0.5,
    ]);
  });

  it("draws a burred fuzzball's bodies and its glow as much smaller as the view's look has them, and its ring of thorns whole", async () => {
    const board = await boardOf(
      stillTrackOf(fuzzball({ burred: true }), {
        scaleX: 1.25,
        lift: 0.5,
        glow: 1,
      }),
    );
    const { behind, body, second } = spriteAt(board, 0);

    expect(
      [behind, body, second, board.scene.pieces.glow].map(
        ({ scaleX }) => scaleX,
      ),
    ).toEqual([
      1.25,
      expect.closeTo(1.25 * BURRED_SCALE, 9),
      expect.closeTo(1.25 * BURRED_SCALE, 9),
      expect.closeTo(1.25 * BURRED_SCALE, 9),
    ]);
  });

  it("shows each of a piece's images in the frame and at the opacity the view's look has it", async () => {
    const piece = fuzzball({ special: "wisp", caged: true, burred: true });
    const track = stillTrackOf(piece, { furIn: 0.5, lift: 0.25, fade: 0.5 });
    const board = await boardOf(track);
    const look = new PieceLook().of(sampledOf(track), piece);

    const images = spriteAt(board, 0).images.map(showing);

    expect(images).toEqual(
      [look.behind, look.body, look.second, look.eyes, look.over].map(
        ({ frame, alpha }) => ({ frame, alpha }),
      ),
    );
  });

  it("sets a piece's eyes where the view's look seats them, at the size it gives them", async () => {
    const piece = fuzzball({ special: "wisp" });
    const track = stillTrackOf(piece, {
      lookX: 1,
      scaleX: 1.5,
      rotation: 0.5,
    });
    const board = await boardOf(track);
    const look = new PieceLook().of(sampledOf(track), piece);

    const eyes = eyesFrom(board, 0);

    expect({ ...eyes, scale: spriteAt(board, 0).eyes.scaleX }).toEqual({
      x: expect.closeTo(look.eyesX, 9) as number,
      y: expect.closeTo(look.eyesY, 9) as number,
      scale: expect.closeTo(1.5 * look.eyesScale, 9) as number,
    });
  });

  it("hides each image the view's look shows in no frame, or not at all", async () => {
    const board = await boardOf(
      stillTrackOf({ what: "brick", id: 1, layers: 2 }, { x: 0 }),
      stillTrackOf(fuzzball({ id: 2 }), { x: 2 }),
    );

    const frames = [0, 1].map((index) =>
      spriteAt(board, index)
        .images.map(showing)
        .map(({ frame }) => frame),
    );

    expect(frames).toEqual([
      [null, FRAMES.brick(2), null, null, null],
      [
        null,
        FRAMES.body("red", "plain", "rest"),
        null,
        FRAMES.eyes("rest"),
        null,
      ],
    ]);
  });

  it("draws a piece from the depth the view's look gives it", async () => {
    const piece = fuzzball({ caged: true, burred: true });
    const track = stillTrackOf(piece, { raise: 2, y: 2 });
    const board = await boardOf(track);
    const look = new PieceLook().of(sampledOf(track), piece);

    expect(spriteAt(board, 0).behind.depth).toBe(look.depth);
  });

  it("draws each of a piece's images deeper than the one behind it, so its layer keeps them in order however its depth changes", async () => {
    const piece = fuzzball({ special: "wisp", caged: true, burred: true });
    const board = await boardOf(stillTrackOf(piece));
    playTo(
      board,
      drawnPlay({ pieces: [stillTrackOf(piece, { raise: 2, furIn: 0.5 })] }),
      16,
    );

    const depths = spriteAt(board, 0).images.map(({ depth }) => depth);

    expect(depths).toEqual([...new Set(depths)].sort((p, q) => p - q));
  });

  it("blinks a fuzzball at rest on the scene's clock, as the view has it between moves", async () => {
    const board = await boardOf(stillTrackOf(fuzzball()));
    const nowMs = board.shell.ticks.at(-1)?.nowMs ?? 0;

    board.run.advance(blinkMsOf(fuzzball(), nowMs) - nowMs);

    expect(spriteAt(board, 0).eyes.frame.name).toBe(FRAMES.eyes("blink"));
  });

  it("stirs a puffer's bodies as it breathes on the scene's clock, and not its eyes", async () => {
    const puffer = fuzzball({ special: "puffer" });
    const board = await boardOf(stillTrackOf(puffer));
    const nowMs = board.shell.ticks.at(-1)?.nowMs ?? 0;
    const breath = breathAt(puffer, FEEL, nowMs, {
      scale: 1,
      turn: 0,
      behindTurn: 0,
    });
    const look = new PieceLook().of(sampledOf(stillTrackOf(puffer)), puffer);

    const { body, eyes } = spriteAt(board, 0);

    expect([body.scaleX, eyes.scaleX]).toEqual([
      expect.closeTo(breath.scale, 9),
      expect.closeTo(look.eyesScale, 9),
    ]);
  });

  it("turns a frizzball's sparks behind it as its static crackles on the scene's clock, and not its body", async () => {
    const frizzball: Piece = { what: "frizzball", id: 1 };
    const board = await boardOf(stillTrackOf(frizzball));
    board.run.advance(FEEL.staticStepMs);
    const nowMs = board.shell.ticks.at(-1)?.nowMs ?? 0;
    const { behindTurn } = breathAt(frizzball, FEEL, nowMs, {
      scale: 1,
      turn: 0,
      behindTurn: 0,
    });

    const { behind, body } = spriteAt(board, 0);

    expect({
      sparks: behind.frame.name,
      turned: [behind.rotation, body.rotation],
      crackled: behindTurn > 0,
    }).toEqual({
      sparks: FRAMES.frizzballSparks,
      turned: [expect.closeTo(behindTurn, 9), 0],
      crackled: true,
    });
  });

  it("lights a glowing piece's body with the glow, over all its images, filled with the effects' white", async () => {
    const piece = fuzzball({ caged: true });
    const track = stillTrackOf(piece, { x: 2, glow: 1 });
    const board = await boardOf(
      stillTrackOf(fuzzball({ id: 2 }), { x: 0 }),
      track,
    );
    const look = new PieceLook().of(sampledOf(track), piece);
    const { glow } = board.scene.pieces;

    expect({
      shown: showing(glow),
      at: [glow.x, glow.y],
      fill: [glow.tint, glow.tintMode],
      over: glow.depth > spriteAt(board, 1).over.depth,
    }).toEqual({
      shown: { ...look.glow },
      at: [spriteAt(board, 1).body.x, spriteAt(board, 1).body.y],
      fill: [ART_PALETTE.flare, TintModes.FILL],
      over: true,
    });
  });

  it("lights a glowing frizzball's rays and body with the glow, held still as its static crackles, and leaves its sparks unlit", async () => {
    const frizzball: Piece = { what: "frizzball", id: 1 };
    const board = await boardOf(stillTrackOf(frizzball, { glow: 1 }));
    board.run.advance(FEEL.staticStepMs);
    const { glow } = board.scene.pieces;
    const { behind } = spriteAt(board, 0);

    expect({
      glow: [showing(glow).frame, glow.rotation],
      sparks: [showing(behind).frame, behind.rotation > 0],
    }).toEqual({
      glow: [FRAMES.frizzball, 0],
      sparks: [FRAMES.frizzballSparks, true],
    });
  });

  it("shows no glow where no piece glows", async () => {
    const board = await boardOf(stillTrackOf(fuzzball(), { glow: 1 }));

    playTo(board, drawnPlay({ pieces: [stillTrackOf(fuzzball())] }), 16);

    expect(board.scene.pieces.glow.visible).toBe(false);
  });

  it("dims the board in the page's color as far as the timeline has it, at the dimming's depth among the pieces", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);

    playTo(
      board,
      drawnPlay({ dim: [{ atMs: 0, ms: 0, to: 0.5, easing: "linear" }] }),
      16,
    );

    const { dim } = board.scene.pieces;
    expect([
      dim.visible,
      dim.isFilled,
      dim.fillColor,
      dim.alpha,
      dim.depth,
    ]).toEqual([true, true, ART_PALETTE.page, 0.5, DIM_DEPTH]);
  });

  it("shows no dimming where the board is not dimmed", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);

    expect(board.scene.pieces.dim.visible).toBe(false);
  });

  it("draws a piece falling in from past the board's edge under the rim, which hides it", async () => {
    const board = await boardOf(stillTrackOf(fuzzball(), { y: -1 }));
    const layerOf = (image: GameObjects.GameObject): number =>
      board.scene.children
        .getChildren()
        .findIndex((layer) => layer === image.displayList);

    const falling = itemAt(board.scene.pieces.fallingIn, 0).body;

    expect({
      falling: falling.visible,
      onBoard: bodiesShown(board.scene.pieces.onBoard),
      underRim: layerOf(falling) < layerOf(board.scene.board.rim),
    }).toEqual({ falling: true, onBoard: 0, underRim: true });
  });

  it("draws every piece a move's timeline shows at the frame's moment, and no more", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const play = playOf(MOVE_FIXTURES.bunch);
    const ms = play.timeline.restMs / 2;
    const shown = sampleAt(
      play.timeline,
      play.feel,
      Math.ceil(ms / 16) * 16,
      frameFor(play.timeline),
    ).pieces.filter(({ shown }) => shown).length;

    playTo(board, play, ms);

    expect(
      bodiesShown(board.scene.pieces.onBoard) +
        bodiesShown(board.scene.pieces.fallingIn),
    ).toBe(shown);
  });

  it("hides a piece once it is gone", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const gone: PieceTrack = { ...stillTrackOf(fuzzball()), untilMs: 32 };
    playTo(board, drawnPlay({ pieces: [gone] }), 16);

    board.run.advance(32);

    expect(spriteAt(board, 0).images.some(({ visible }) => visible)).toBe(
      false,
    );
  });
});
