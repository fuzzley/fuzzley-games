import type { Hint } from "../../rules/levels/level";
import { boardFrom } from "../../testing/board_picture";
import { pieceAt } from "../../testing/played_parts";
import { gridOf } from "../../testing/shown_board";
import { FEEL } from "../timeline/feel";
import { Hinting, hintTimeline } from "./hint";

/** A board of 4 fuzzballs, numbered 1 to 4 across, then a fifth under the first. */
const GRID = gridOf(boardFrom(["rgbp", "a   "]));

/** The careful player's move: the first two fuzzballs, swapped across. */
const CAREFUL: Hint = { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } };

/** A teaching level's own first move: the first fuzzball, swapped down. */
const TAUGHT: Hint = { from: { x: 0, y: 0 }, to: { x: 0, y: 1 } };

/** When a hint's first hop is at its tallest. */
const UP_MS = FEEL.hintUpMs;

/** Returns the hints of a level that teaches nothing, its board at rest from a moment. */
function restingFrom(atMs: number, levelMove: Hint | null = null): Hinting {
  const hinting = new Hinting(levelMove);
  hinting.rests(atMs);
  return hinting;
}

describe("Hinting", () => {
  it("hints once the board has rested the feel's wait with no move", () => {
    const hinting = restingFrom(100);

    expect([
      hinting.hintsAt(100 + FEEL.hintWaitMs - 1, false, FEEL),
      hinting.hintsAt(100 + FEEL.hintWaitMs, false, FEEL),
    ]).toEqual([false, true]);
  });

  it("hints again as long after each hint", () => {
    const hinting = restingFrom(0);
    hinting.hintsAt(FEEL.hintWaitMs, false, FEEL);

    expect([
      hinting.hintsAt(2 * FEEL.hintWaitMs - 1, false, FEEL),
      hinting.hintsAt(2 * FEEL.hintWaitMs, false, FEEL),
    ]).toEqual([false, true]);
  });

  it("hints at once when asked, and waits for the next from then", () => {
    const hinting = restingFrom(0);

    expect([
      hinting.hintsAt(10, true, FEEL),
      hinting.hintsAt(FEEL.hintWaitMs, false, FEEL),
      hinting.hintsAt(10 + FEEL.hintWaitMs, false, FEEL),
    ]).toEqual([true, false, true]);
  });

  it("never hints while a move plays, asked or not", () => {
    const hinting = restingFrom(0);
    hinting.moves();

    expect([
      hinting.hintsAt(2 * FEEL.hintWaitMs, false, FEEL),
      hinting.hintsAt(2 * FEEL.hintWaitMs, true, FEEL),
    ]).toEqual([false, false]);
  });

  it("never hints before the level's board first rests", () => {
    expect(new Hinting(null).hintsAt(FEEL.hintWaitMs, true, FEEL)).toBe(false);
  });

  it("hints a teaching level's own first move as soon as its board rests, then waits as any level does", () => {
    const hinting = restingFrom(500, TAUGHT);

    expect([
      hinting.hintsAt(500, false, FEEL),
      hinting.hintsAt(500 + FEEL.hintWaitMs - 1, false, FEEL),
    ]).toEqual([true, false]);
  });

  it("waits the feel's wait on a teaching level once its first move is made", () => {
    const hinting = restingFrom(0, TAUGHT);
    hinting.moves();
    hinting.rests(1000);

    expect(hinting.hintsAt(1000, false, FEEL)).toBe(false);
  });

  it("shows a teaching level's own first move with the hand, until a move is made", () => {
    const hinting = restingFrom(0, TAUGHT);
    const before = hinting.shown(() => CAREFUL);
    hinting.moves();

    expect([before, hinting.shown(() => CAREFUL)]).toEqual([
      { move: TAUGHT, hand: true },
      { move: CAREFUL, hand: false },
    ]);
  });

  it("shows the careful player's move on a level that teaches nothing, with no hand", () => {
    expect(restingFrom(0).shown(() => CAREFUL)).toEqual({
      move: CAREFUL,
      hand: false,
    });
  });

  it("shows nothing where the careful player finds no move", () => {
    expect(restingFrom(0).shown(() => null)).toBeNull();
  });
});

describe("hintTimeline", () => {
  const timeline = hintTimeline(GRID, CAREFUL, FEEL);

  it("plays the hint's sound as the hops start", () => {
    expect(timeline.sounds).toEqual([
      { atMs: 0, sound: "hint", cents: 0, volume: 1 },
    ]);
  });

  it("has the move's two fuzzballs look at each other as they hop", () => {
    expect(
      [1, 2].map((piece) => {
        const { lookX, lookY } = pieceAt(timeline, piece, 0);
        return { lookX, lookY };
      }),
    ).toEqual([
      { lookX: 1, lookY: 0 },
      { lookX: -1, lookY: 0 },
    ]);
  });

  it("has them look ahead again after the feel's while", () => {
    expect(pieceAt(timeline, 1, FEEL.hintLookMs)).toMatchObject({
      lookX: 0,
      lookY: 0,
    });
  });

  it.each([
    ["first", 0],
    ["second", FEEL.hintHopGapMs],
  ])("stretches both up and narrow at the top of their %s hop", (_, fromMs) => {
    expect(
      [1, 2].map((piece) => {
        const { scaleX, scaleY } = pieceAt(timeline, piece, fromMs + UP_MS);
        return { scaleX, scaleY };
      }),
    ).toEqual([
      { scaleX: FEEL.hintNarrow, scaleY: FEEL.hintStretch },
      { scaleX: FEEL.hintNarrow, scaleY: FEEL.hintStretch },
    ]);
  });

  it("springs them back to their size after the last hop", () => {
    const backMs =
      (FEEL.hintHops - 1) * FEEL.hintHopGapMs + UP_MS + FEEL.hintDownMs;

    expect(pieceAt(timeline, 2, backMs)).toMatchObject({
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("leaves every other fuzzball as it rests", () => {
    expect(pieceAt(timeline, 3, UP_MS)).toMatchObject({
      scaleX: 1,
      scaleY: 1,
      lookX: 0,
    });
  });

  it("rests once its fuzzballs look ahead again, after their hops", () => {
    expect(timeline.restMs).toBe(FEEL.hintLookMs);
  });

  it("throws for a move from a square with no piece", () => {
    expect(() =>
      hintTimeline(GRID, { from: { x: 1, y: 1 }, to: { x: 1, y: 0 } }, FEEL),
    ).toThrow(RangeError);
  });
});
