import { itemAt } from "@fz/core/records";
import { commandsOf } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { ART_PALETTE } from "../../testing/art_frames";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  drawnPlay,
  layoutOf,
  playTo,
  startBoard,
} from "../../testing/scene_shell";
import { STREAK_HEAD } from "../../view/art/fluff";
import { bakedScale } from "../../view/art/frames";
import {
  boltAlpha,
  flashAlpha,
  ringAlpha,
  ringLine,
  ringRadius,
} from "../../view/effects/flourishes";
import {
  type GustLineRun,
  LONGEST_GUST_LINE,
  gustLineAt,
} from "../../view/effects/gust_line";
import type { Effect } from "../../view/timeline/timeline";
import { DISC } from "../disc";

/** Runs the scene on a board playing the effects given from the tap, and plays them a time in. */
async function boardPlaying(
  effects: readonly Effect[],
  ms = 16,
): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch);
  playTo(board, drawnPlay({ effects }), ms);
  return board;
}

/** Returns where a place on the board, in squares, lies on the canvas. */
function canvasOf(board: Board, x: number, y: number): [number, number] {
  const metrics = layoutOf(board);
  return [
    metrics.x + (x + 0.5) * metrics.square,
    metrics.y + (y + 0.5) * metrics.square,
  ];
}

/** Returns the images of a pool that show. */
function shownIn(
  pool: readonly { readonly image: GameObjects.Image }[],
): readonly GameObjects.Image[] {
  return pool.map(({ image }) => image).filter(({ visible }) => visible);
}

/** A blue ring spreading from the middle square to 2 squares across over 160 ms. */
const RING: Effect = {
  what: "ring",
  atMs: 0,
  ms: 160,
  at: { x: 1, y: 1 },
  radius: 2,
  ink: "blue",
};

/** A green dasher's streak running from the middle square across to the right, a square each 10 ms. */
const STREAK: Effect = {
  what: "streak",
  atMs: 0,
  ms: 80,
  from: { x: 1, y: 1 },
  to: { x: 9, y: 1 },
  ink: "green",
};

/** A bolt of static from the top left square to the bottom right one, for 200 ms. */
const BOLT: Effect = {
  what: "bolt",
  atMs: 0,
  ms: 200,
  from: { x: 0, y: 0 },
  to: { x: 2, y: 2 },
};

/** A flash in the middle square reaching 1.5 squares, for 110 ms. */
const FLASH: Effect = {
  what: "flash",
  atMs: 0,
  ms: 110,
  at: { x: 1, y: 1 },
  radius: 1.5,
};

/** A line of wind blowing down from the middle square, crossing in 520 ms. */
const GUST_LINE = {
  what: "gust-line",
  atMs: 0,
  ms: 520,
  at: { x: 1, y: 1 },
  blows: "down",
} as const satisfies Effect;

/** Returns where `GUST_LINE` is a time into its crossing, on the bare board a spec's play draws over. */
function gustLineCrossed(ms: number): GustLineRun {
  return gustLineAt(GUST_LINE, ms / GUST_LINE.ms, drawnPlay({}).grid, {
    x: 0,
    y: 0,
    angle: 0,
    length: 0,
    shown: 0,
    alpha: 0,
  });
}

/** A line of wind blowing down from the bottom row's middle square, 0.8 squares short of the clip past the board's edge. */
const GUST_LINE_AT_EDGE = {
  ...GUST_LINE,
  at: { x: 1, y: 2 },
} as const satisfies Effect;

describe("EffectsPainter's rings", () => {
  it("strokes a ring from its place, in its ink, as far spread, as thin and as faded as it is a share through its time", async () => {
    const board = await boardPlaying([RING]);
    const { square } = layoutOf(board);
    const done = 16 / 160;

    const strokes = commandsOf(board.scene.effects.ringLines).filter(
      ({ kind }) => kind === "lineStyle" || kind === "arc",
    );

    expect(strokes).toEqual([
      {
        kind: "lineStyle",
        width: expect.closeTo(ringLine(done) * square, 9) as number,
        color: ART_PALETTE.kinds.blue,
        alpha: expect.closeTo(ringAlpha(done), 9) as number,
      },
      expect.objectContaining({
        kind: "arc",
        x: canvasOf(board, 1, 1)[0],
        y: canvasOf(board, 1, 1)[1],
        radius: expect.closeTo(ringRadius(done, 2) * square, 9) as number,
      }),
    ]);
  });

  it("strokes every ring spreading at once", async () => {
    const board = await boardPlaying([RING, { ...RING, at: { x: 0, y: 2 } }]);

    const arcs = commandsOf(board.scene.effects.ringLines).filter(
      ({ kind }) => kind === "arc",
    );

    expect(arcs).toHaveLength(2);
  });

  it("clears a ring once it has spread", async () => {
    const board = await boardPlaying([RING], 176);

    expect(commandsOf(board.scene.effects.ringLines)).toEqual([]);
  });
});

describe("EffectsPainter's streaks", () => {
  it("runs a dasher's streak along its line, in its ink, its head where it has run to", async () => {
    const board = await boardPlaying([STREAK], 32);
    const { square } = layoutOf(board);
    const [image] = shownIn(board.scene.effects.streaks.all);
    const [headX, headY] = canvasOf(board, 1 + (32 / 80) * 8, 1);

    expect({
      x: image?.x,
      y: image?.y,
      rotation: image?.rotation,
      tint: image?.tint,
      alpha: image?.alpha,
    }).toEqual({
      x: expect.closeTo(headX - STREAK_HEAD * square, 9) as number,
      y: headY,
      rotation: 0,
      tint: ART_PALETTE.kinds.green,
      alpha: 1,
    });
  });

  it("shows nothing of a streak behind where it set out", async () => {
    const board = await boardPlaying([STREAK]);

    expect(shownIn(board.scene.effects.streaks.all)[0]?.isCropped).toBe(true);
  });

  it("shows nothing of a streak that has run on past the board's edge", async () => {
    const board = await boardPlaying([STREAK], 64);

    expect(shownIn(board.scene.effects.streaks.all)[0]?.alpha).toBe(0);
  });

  it("lets a streak go once it has run its course", async () => {
    const board = await boardPlaying([STREAK], 96);

    expect(shownIn(board.scene.effects.streaks.all)).toEqual([]);
  });
});

describe("EffectsPainter's bolts", () => {
  it("stretches a bolt of static from its frizzball to what it strikes, fading", async () => {
    const board = await boardPlaying([BOLT]);
    const [image] = shownIn(board.scene.effects.bolts.all);
    const [x, y] = canvasOf(board, 1, 1);

    expect({
      x: image?.x,
      y: image?.y,
      rotation: image?.rotation,
      scaleX: image?.scaleX,
      alpha: image?.alpha,
    }).toEqual({
      x,
      y,
      rotation: expect.closeTo(Math.PI / 4, 9) as number,
      scaleX: expect.closeTo(Math.SQRT2, 9) as number,
      alpha: expect.closeTo(boltAlpha(16 / 200), 9) as number,
    });
  });

  it("flips a bolt across its line as it flickers", async () => {
    const steady = await boardPlaying([BOLT]);
    const flipped = await boardPlaying([BOLT], 48);

    expect(
      [steady, flipped].map(
        (board) => shownIn(board.scene.effects.bolts.all)[0]?.scaleY,
      ),
    ).toEqual([1, -1]);
  });

  it("lets a bolt go once its time is up", async () => {
    const board = await boardPlaying([BOLT], 208);

    expect(shownIn(board.scene.effects.bolts.all)).toEqual([]);
  });
});

describe("EffectsPainter's flash", () => {
  it("flashes the soft disc in the effects' white where a special goes off, as wide as it reaches, fading", async () => {
    const board = await boardPlaying([FLASH]);
    const { square } = layoutOf(board);
    const [image] = shownIn(board.scene.effects.flashes.all);

    expect({
      at: [image?.x, image?.y],
      tint: image?.tint,
      scale: image?.scaleX,
      alpha: image?.alpha,
    }).toEqual({
      at: canvasOf(board, 1, 1),
      tint: ART_PALETTE.flare,
      scale: expect.closeTo((2 * 1.5 * square) / DISC.size, 9) as number,
      alpha: expect.closeTo(flashAlpha(16 / 110), 9) as number,
    });
  });

  it("lets a flash go once its time is up", async () => {
    const board = await boardPlaying([FLASH], 112);

    expect(shownIn(board.scene.effects.flashes.all)).toEqual([]);
  });
});

describe("EffectsPainter's lines of wind", () => {
  it("sets a line of wind along the way the wind blows, as far on, as long and as faded as it is a share through its crossing", async () => {
    const board = await boardPlaying([GUST_LINE], 256);
    const [image] = shownIn(board.scene.effects.gustLines.all);
    const crossed = gustLineCrossed(256);

    expect({
      at: [image?.x, image?.y],
      rotation: image?.rotation,
      scaleX: image?.scaleX,
      alpha: image?.alpha,
    }).toEqual({
      at: canvasOf(board, crossed.x, crossed.y),
      rotation: expect.closeTo(Math.PI / 2, 9) as number,
      scaleX: expect.closeTo(crossed.length / LONGEST_GUST_LINE, 9) as number,
      alpha: expect.closeTo(crossed.alpha, 9) as number,
    });
  });

  it("shows the whole of a line of wind short of the clip past the board's edge, in an image a line before it left cut off", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const { image } = itemAt(board.scene.effects.gustLines.all, 0);
    image.setCrop(0, 0, 1, image.frame.height);

    playTo(board, drawnPlay({ effects: [GUST_LINE] }), 16);

    expect(image.isCropped).toBe(false);
  });

  it("cuts a line of wind off where it runs past the clip, keeping its near end", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    const { image } = itemAt(board.scene.effects.gustLines.all, 0);
    const setCrop = vi.spyOn(image, "setCrop");
    const { unit } = bakedScale({
      unit: layoutOf(board).square,
      pixelRatio: 1,
    });
    const { shown } = gustLineCrossed(256);

    playTo(board, drawnPlay({ effects: [GUST_LINE] }), 256);

    expect(setCrop).toHaveBeenLastCalledWith(
      0,
      0,
      expect.closeTo(
        image.frame.width / 2 + (shown - 0.5) * LONGEST_GUST_LINE * unit,
        9,
      ),
      image.frame.height,
    );
  });

  it("shows nothing of a line of wind once its near end has run past the clip", async () => {
    const board = await boardPlaying([GUST_LINE_AT_EDGE], 256);

    expect(shownIn(board.scene.effects.gustLines.all)[0]?.alpha).toBe(0);
  });

  it("lets a line of wind go once it has crossed", async () => {
    const board = await boardPlaying([GUST_LINE], 528);

    expect(shownIn(board.scene.effects.gustLines.all)).toEqual([]);
  });
});

describe("EffectsPainter", () => {
  it("plays an effect out as the next play starts", async () => {
    const board = await boardPlaying([BOLT]);

    playTo(board, drawnPlay({}), 16);

    expect(shownIn(board.scene.effects.bolts.all)).toHaveLength(1);
  });

  it("starts an effect no sooner than its moment", async () => {
    const board = await boardPlaying([{ ...BOLT, atMs: 40 }], 32);

    expect(itemAt(board.scene.effects.bolts.all, 0).image.visible).toBe(false);
  });
});
