import type { Swap } from "../../../rules/move/record";
import { type BoardPicture, boardFrom } from "../../../testing/board_picture";
import { pieceAt, timelineOfParts } from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import type { Timeline } from "../timeline";
import { swapOf } from "./swap";

/** How long a refused swap leans out and comes back. */
const REFUSED_MS = FEEL.refusedOutMs + FEEL.refusedBackMs;

/** Returns the timeline of a swap on a board drawn as text. */
function swapOn(
  picture: BoardPicture | readonly string[],
  swap: Swap,
): Timeline {
  const grid = gridOf(boardFrom(picture));
  return timelineOfParts(grid, swapOf(swap, grid, FEEL));
}

describe("swapOf", () => {
  describe("a swap kept", () => {
    const timeline = swapOn(["rg"], { from: 0, to: 1, refused: false });

    it("sounds as it starts", () => {
      expect(timeline.sounds).toEqual([
        { atMs: 0, sound: "swap", cents: 0, volume: 1 },
      ]);
    });

    it("stands each of the two on the other's square once it is done", () => {
      expect([
        pieceAt(timeline, 1, FEEL.swapMs).x,
        pieceAt(timeline, 2, FEEL.swapMs).x,
      ]).toEqual([1, 0]);
    });

    it("slides each a little past the other's square on its way", () => {
      expect(pieceAt(timeline, 1, FEEL.swapMs / 2).x).toBeGreaterThan(1);
    });

    it("raises the one swapped from over the board, and the other not", () => {
      expect([
        pieceAt(timeline, 1, 0).raise,
        pieceAt(timeline, 2, 0).raise,
      ]).toEqual([RAISED.moving, 0]);
    });

    it("holds the board until it is done", () => {
      expect(timeline.restMs).toBe(FEEL.swapMs);
    });
  });

  describe("two specials swapped together", () => {
    const timeline = swapOn(
      { pieces: ["rg"], marks: ["-o"] },
      { from: 0, to: 1, refused: false },
    );

    it("slides the first onto the second, which stays until the swap is done", () => {
      expect([
        pieceAt(timeline, 1, FEEL.swapMs).x,
        pieceAt(timeline, 2, FEEL.swapMs).x,
        timeline.pieces.find(({ id }) => id === 2)?.untilMs,
      ]).toEqual([1, 1, FEEL.swapMs]);
    });

    it("winds the pair up as the swap is done", () => {
      expect(timeline.effects).toMatchObject([
        { what: "ring", atMs: FEEL.swapMs, radius: FEEL.pairRingSquares },
        { what: "fluff", atMs: FEEL.swapMs },
      ]);
    });
  });

  it("moves a special set off where it stands not at all, and holds the board a moment", () => {
    const timeline = swapOn(
      { pieces: ["r"], marks: ["o"] },
      { from: 0, to: 0, refused: false },
    );

    expect(timeline.pieces[0]?.keys).toEqual({});
    expect(timeline.restMs).toBe(FEEL.setOffWaitMs);
  });

  it("refuses to keep a swap from a square with no piece", () => {
    expect(() => swapOn(["r "], { from: 0, to: 1, refused: false })).toThrow(
      RangeError,
    );
  });

  describe("a swap refused", () => {
    const timeline = swapOn(["r", "g"], { from: 0, to: 1, refused: true });

    it("sounds a refusal as it starts", () => {
      expect(timeline.sounds).toEqual([
        { atMs: 0, sound: "refuse", cents: 0, volume: 1 },
      ]);
    });

    it("leans each of the two out toward the other", () => {
      expect([
        pieceAt(timeline, 1, FEEL.refusedOutMs).leanY,
        pieceAt(timeline, 2, FEEL.refusedOutMs).leanY,
      ]).toEqual([FEEL.refusedReach, -FEEL.refusedReach]);
    });

    it("brings each back to its square, its head still, by the time it holds the board until", () => {
      expect(timeline.restMs).toBe(REFUSED_MS);
      expect(pieceAt(timeline, 1, REFUSED_MS)).toMatchObject({
        y: 0,
        leanY: 0,
        wobble: 0,
      });
    });

    it("shakes each one's head, dying away as it comes back", () => {
      expect(pieceAt(timeline, 1, 0).wobble).toBe(FEEL.refusedWobble);
      expect(pieceAt(timeline, 1, FEEL.refusedOutMs).wobble).toBeLessThan(
        FEEL.refusedWobble,
      );
    });

    it("makes each look cross, and then rest again", () => {
      expect([
        pieceAt(timeline, 2, 0).face,
        pieceAt(timeline, 2, FEEL.refusedCrossMs).face,
      ]).toEqual(["cross", "rest"]);
    });
  });

  it("never moves a brick in a swap refused, though the other leans its way", () => {
    const timeline = swapOn(["r", "1"], { from: 0, to: 1, refused: true });

    expect(timeline.pieces[1]?.keys).toEqual({});
    expect(pieceAt(timeline, 1, FEEL.refusedOutMs).leanY).toBe(
      FEEL.refusedReach,
    );
  });

  it("plays nothing for a special refused where it stands", () => {
    const timeline = swapOn(
      { pieces: ["r"], marks: ["o"] },
      { from: 0, to: 0, refused: true },
    );

    expect([timeline.pieces[0]?.keys, timeline.pieces[0]?.faces]).toEqual([
      {},
      [],
    ]);
    expect(timeline.restMs).toBe(0);
  });

  it("moves neither of a swap refused toward a gap, but holds the board as long", () => {
    const timeline = swapOn(["r_"], { from: 0, to: 1, refused: true });

    expect(timeline.pieces[0]?.keys).toEqual({});
    expect(timeline.restMs).toBe(REFUSED_MS);
  });
});
