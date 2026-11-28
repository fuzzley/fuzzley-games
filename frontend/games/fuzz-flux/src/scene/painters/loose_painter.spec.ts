import { itemAt } from "@fz/core/records";
import { type GameObjects, TintModes } from "phaser";
import { ART_PALETTE } from "../../testing/art_frames";
import type { Fuzzball } from "../../rules/catalog/pieces";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  layoutOf,
  playOf,
  drawnPlay,
  playTo,
  startBoard,
} from "../../testing/scene_shell";
import { FRAMES } from "../../view/art/frame_names";
import { type Fluff, type TuftFlight, tuftAt } from "../../view/effects/tufts";
import { FEEL } from "../../view/timeline/feel";
import { RAISED, lookAt } from "../../view/timeline/looks";
import type {
  LooseDrawn,
  Look,
  SpriteTrack,
} from "../../view/timeline/timeline";

/** A wisp, as its copies fly. */
const WISP: Fuzzball = {
  what: "fuzzball",
  id: 1,
  kind: "blue",
  special: "wisp",
  caged: false,
  burred: false,
};

/** Returns the track of a loose sprite showing from the tap for a second, in the middle square, its look a resting one's but as a spec changes it. */
function looseTrackOf(
  drawn: LooseDrawn,
  look: Partial<Look> = {},
  untilMs = 1000,
): SpriteTrack {
  return {
    drawn,
    fromMs: 0,
    untilMs,
    look: { ...lookAt({ x: 1, y: 1 }), ...look },
    keys: {},
  };
}

/** Runs the scene on a board drawing the loose sprites' tracks given, and returns it once it has drawn a frame of them. */
async function boardOf(...tracks: readonly SpriteTrack[]): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch);
  playTo(board, drawnPlay({ sprites: tracks }), 16);
  return board;
}

/** Returns the loose bits the board shows, frames and tufts alike. */
function bitsShown({ scene }: Board): readonly GameObjects.Image[] {
  return scene.loose.bits.filter(({ visible }) => visible);
}

/** Returns how many loose sprites the board shows, frames and copies alike. */
function looseShown({ scene }: Board): number {
  return (
    scene.loose.bits.filter(({ visible }) => visible).length +
    scene.loose.copies.filter(({ body }) => body.visible).length
  );
}

describe("LoosePainter", () => {
  it("draws a loose frame where its sprite stands, as it is sampled", async () => {
    const board = await boardOf(
      looseTrackOf(
        { what: "frame", frame: FRAMES.cageBar },
        { x: 2, leanY: 0.5, scaleX: 0.5, rotation: 1, fade: 0.25, raise: 2 },
      ),
    );
    const { x, y, square } = layoutOf(board);

    const image = itemAt(board.scene.loose.bits, 0);

    expect({
      frame: image.frame.name,
      x: image.x,
      y: image.y,
      scale: [image.scaleX, image.scaleY],
      rotation: image.rotation,
      alpha: image.alpha,
      depth: image.depth,
    }).toEqual({
      frame: FRAMES.cageBar,
      x: x + 2.5 * square,
      y: y + 2 * square,
      scale: [0.5, 1],
      rotation: 1,
      alpha: 0.75,
      depth: 2,
    });
  });

  it("draws a piece's copy as the piece, in the copy's face", async () => {
    const board = await boardOf(
      looseTrackOf({ what: "copy", piece: WISP, face: "happy" }),
    );

    const copy = itemAt(board.scene.loose.copies, 0);

    expect([copy.body.frame.name, copy.eyes.frame.name]).toEqual([
      FRAMES.body("blue", "wisp", "rest"),
      FRAMES.eyes("happy"),
    ]);
  });

  it("shows no more loose frames than a play's feel, tuned under the design's, lets show at once", async () => {
    const board = await boardOf();
    const bar = looseTrackOf({ what: "frame", frame: FRAMES.cageBar });

    playTo(
      board,
      {
        ...drawnPlay({ sprites: [bar, bar, bar] }),
        feel: { ...FEEL, mostLooseBits: 2 },
      },
      16,
    );

    expect(bitsShown(board)).toHaveLength(2);
  });

  it("hides a loose sprite once it is gone", async () => {
    const board = await boardOf(
      looseTrackOf({ what: "frame", frame: FRAMES.cageBar }, {}, 32),
      looseTrackOf({ what: "copy", piece: WISP, face: "rest" }, {}, 32),
    );

    board.run.advance(32);

    expect(looseShown(board)).toBe(0);
  });

  it("draws a wisp's copies as its move's timeline flies them", async () => {
    const board = await startBoard(MOVE_FIXTURES.wispGoesOff);
    const play = playOf(MOVE_FIXTURES.wispGoesOff);
    const copies = play.timeline.sprites.filter(
      ({ drawn }) => drawn.what === "copy",
    );
    const flyingMs = Math.max(...copies.map(({ fromMs }) => fromMs)) + 16;

    playTo(board, play, flyingMs);

    expect([looseShown(board), copies.length > 0]).toEqual([
      copies.length,
      true,
    ]);
  });
});

describe("LoosePainter's fluff", () => {
  /** A fluff of 6 red tufts from the middle square at the tap. */
  const FLUFF: Fluff = {
    what: "fluff",
    atMs: 0,
    at: { x: 1, y: 1 },
    tuft: FRAMES.tuft("red"),
    count: 6,
    power: 1,
  };

  /** Runs the scene on a board throwing the fluff given, and plays it a time in. */
  async function fluffedBoard(
    effects: readonly Fluff[],
    ms = 16,
  ): Promise<Board> {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    playTo(board, drawnPlay({ effects }), ms);
    return board;
  }

  it("throws each tuft of a fluff from its moment, where the view flies it", async () => {
    const board = await fluffedBoard([FLUFF]);
    const { x, y, square } = layoutOf(board);
    const flight: TuftFlight = {
      x: 0,
      y: 0,
      rotation: 0,
      length: 0,
      width: 0,
      alpha: 0,
      frizzy: false,
    };
    tuftAt(FLUFF, 1, 16, FEEL, flight);

    const tufts = bitsShown(board);

    expect({
      count: tufts.length,
      frame: tufts[1]?.frame.name,
      at: [tufts[1]?.x, tufts[1]?.y],
      scale: [tufts[1]?.scaleX, tufts[1]?.scaleY],
    }).toEqual({
      count: 6,
      frame: FRAMES.tuft("red"),
      at: [
        expect.closeTo(x + (flight.x + 0.5) * square, 9),
        expect.closeTo(y + (flight.y + 0.5) * square, 9),
      ],
      scale: [
        expect.closeTo(flight.length, 9),
        expect.closeTo(flight.width, 9),
      ],
    });
  });

  it("fills every third tuft with the frizzball's color, and shows the rest in their own", async () => {
    const board = await fluffedBoard([FLUFF]);

    const fills = bitsShown(board).map(({ tint, tintMode }) =>
      tintMode === TintModes.FILL ? tint : null,
    );

    expect(fills).toEqual([
      ART_PALETTE.frizzball.body,
      null,
      null,
      ART_PALETTE.frizzball.body,
      null,
      null,
    ]);
  });

  it("lets each tuft go once its life is over", async () => {
    const board = await fluffedBoard(
      [FLUFF],
      FEEL.tuftLifeMs + FEEL.tuftLifeSpreadMs + 16,
    );

    expect(bitsShown(board)).toEqual([]);
  });

  it("throws as many tufts as a play's feel, tuned past the design's, lets show at once", async () => {
    const feel = { ...FEEL, mostLooseBits: FEEL.mostLooseBits + 30 };
    const board = await startBoard(MOVE_FIXTURES.bunch);

    playTo(
      board,
      {
        ...drawnPlay({ effects: [{ ...FLUFF, count: feel.mostLooseBits }] }),
        feel,
      },
      16,
    );

    expect(bitsShown(board)).toHaveLength(feel.mostLooseBits);
  });

  it("shows no more loose bits than a play's feel, tuned under the design's, lets show at once, tufts still flying from the play before among them", async () => {
    const board = await fluffedBoard([FLUFF]);

    playTo(
      board,
      {
        ...drawnPlay({
          sprites: [looseTrackOf({ what: "frame", frame: FRAMES.cageBar })],
        }),
        feel: { ...FEEL, mostLooseBits: 4 },
      },
      16,
    );

    expect(bitsShown(board)).toHaveLength(4);
  });

  it("flies a tuft on as the next play starts", async () => {
    const board = await fluffedBoard([FLUFF]);

    playTo(board, drawnPlay({}), 16);

    expect(bitsShown(board)).toHaveLength(6);
  });

  it("draws a tuft under the pieces in a bit that last drew a loose frame raised over them", async () => {
    const board = await boardOf(
      looseTrackOf(
        { what: "frame", frame: FRAMES.cageBar },
        { raise: RAISED.top },
      ),
    );

    playTo(board, drawnPlay({ effects: [FLUFF] }), 16);

    expect(bitsShown(board).map(({ depth }) => depth)).toEqual(
      Array<number>(6).fill(0),
    );
  });

  it("draws a loose frame in its own colors in a bit that last drew a tuft", async () => {
    const board = await fluffedBoard([FLUFF]);

    playTo(
      board,
      drawnPlay({
        sprites: [looseTrackOf({ what: "frame", frame: FRAMES.cageBar })],
      }),
      FEEL.tuftLifeMs + FEEL.tuftLifeSpreadMs,
    );

    const [bar] = bitsShown(board);
    expect([bitsShown(board).length, bar?.tintMode, bar?.tint]).toEqual([
      1,
      TintModes.MULTIPLY,
      0xffffff,
    ]);
  });
});
