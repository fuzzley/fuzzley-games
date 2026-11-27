import { itemAt } from "@fz/core/records";
import type { Fuzzball } from "../../rules/catalog/pieces";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import {
  type Board,
  layoutOf,
  playOf,
  playOfTracks,
  playTo,
  startBoard,
} from "../../testing/scene_shell";
import { FRAMES } from "../../view/art/frame_names";
import { lookAt } from "../../view/timeline/looks";
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
  playTo(board, playOfTracks([], tracks), 16);
  return board;
}

/** Returns how many loose sprites the board shows, frames and copies alike. */
function looseShown({ scene }: Board): number {
  return (
    scene.loose.frames.filter(({ visible }) => visible).length +
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

    const image = itemAt(board.scene.loose.frames, 0);

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
