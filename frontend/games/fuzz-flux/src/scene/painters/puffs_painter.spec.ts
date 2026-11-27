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
import { dustPuffAlpha, dustPuffRadius } from "../../view/effects/flourishes";
import { FEEL } from "../../view/timeline/feel";
import type { DustChange } from "../../view/timeline/timeline";
import { DISC } from "../disc";

/** A layer of dust swept off the square 1 across and 2 down at the tap. */
const SWEPT: DustChange = { atMs: 0, at: { x: 1, y: 2 }, layers: 1 };

/** Runs the scene on a board sweeping the dust given, and plays it a time in. */
async function sweptBoard(
  dust: readonly DustChange[],
  ms = 16,
): Promise<Board> {
  const board = await startBoard(MOVE_FIXTURES.bunch);
  playTo(board, drawnPlay({ dust }), ms);
  return board;
}

/** Returns the puffs' images that show. */
function puffsShown({ scene }: Board): readonly GameObjects.Image[] {
  return scene.puffs.puffs.all
    .map(({ image }) => image)
    .filter(({ visible }) => visible);
}

describe("PuffsPainter", () => {
  it("puffs thick dust from a square as a layer of its dust is swept off, spreading as it fades", async () => {
    const board = await sweptBoard([SWEPT]);
    const { x, y, square } = layoutOf(board);
    const done = 16 / FEEL.dustPuffMs;

    const [puff] = puffsShown(board);

    expect({
      at: [puff?.x, puff?.y],
      tint: puff?.tint,
      scale: puff?.scaleX,
      alpha: puff?.alpha,
    }).toEqual({
      at: [x + 1.5 * square, y + 2.5 * square],
      tint: ART_PALETTE.dust[2],
      scale: expect.closeTo(
        (2 * dustPuffRadius(done) * square) / DISC.size,
        9,
      ) as number,
      alpha: expect.closeTo(dustPuffAlpha(done), 9) as number,
    });
  });

  it("puffs from each square swept at once", async () => {
    const board = await sweptBoard([SWEPT, { ...SWEPT, at: { x: 0, y: 0 } }]);

    expect(puffsShown(board)).toHaveLength(2);
  });

  it("lets a puff go once it has spread", async () => {
    const board = await sweptBoard([SWEPT], FEEL.dustPuffMs + 16);

    expect(puffsShown(board)).toEqual([]);
  });
});
