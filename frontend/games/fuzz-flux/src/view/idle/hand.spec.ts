import type { Hint } from "../../rules/levels/level";
import { FEEL } from "../timeline/feel";
import { RAISED } from "../timeline/looks";
import { frameFor } from "../timeline/sample";
import type { Sampled, Timeline } from "../timeline/timeline";
import { handTimeline, sampleHand } from "./hand";

/** A teaching level's own first move: a fuzzball swapped with the one to its right. */
const MOVE: Hint = { from: { x: 2, y: 3 }, to: { x: 3, y: 3 } };

/** How faded the hand is once wholly shown, to within rounding. */
const SHOWN: unknown = expect.closeTo(1 - FEEL.handOpacity, 9);

/** Returns when the hand's showing is a share through. */
function shareMs(share: number): number {
  return share * FEEL.handLoopMs;
}

/** Returns how the hand stands a while into its showing. */
function handAt(hand: Timeline, sinceMs: number): Sampled {
  const [sampled] = sampleHand(hand, FEEL, sinceMs, frameFor(hand)).sprites;
  if (sampled === undefined) {
    throw new Error("The hand's timeline has no sprite.");
  }
  return sampled;
}

/** Returns where the hand stands, how big it is and how faded, a while into its showing. */
function placeAt(
  hand: Timeline,
  sinceMs: number,
): Pick<Sampled, "x" | "y" | "scaleX" | "fade"> {
  const { x, y, scaleX, fade } = handAt(hand, sinceMs);
  return { x, y, scaleX, fade };
}

describe("handTimeline", () => {
  const hand = handTimeline(MOVE, FEEL, "full");

  it("draws the hand's frame, and nothing else", () => {
    expect({
      drawn: hand.sprites.map(({ drawn }) => drawn),
      pieces: hand.pieces,
      sounds: hand.sounds,
    }).toEqual({
      drawn: [{ what: "frame", frame: "hand" }],
      pieces: [],
      sounds: [],
    });
  });

  it("hides the hand on the first fuzzball, grown, until it shows", () => {
    expect(placeAt(hand, shareMs(FEEL.handShowsFrom))).toEqual({
      x: 2,
      y: 3,
      scaleX: FEEL.handScale,
      fade: 1,
    });
  });

  it("shows it there at its size before it slides", () => {
    expect(placeAt(hand, shareMs(FEEL.handSlidesFrom))).toEqual({
      x: 2,
      y: 3,
      scaleX: 1,
      fade: SHOWN,
    });
  });

  it("slides it to the second fuzzball, where it waits", () => {
    expect([
      placeAt(hand, shareMs(FEEL.handSlidesTo)),
      placeAt(hand, shareMs(FEEL.handGoesFrom)),
    ]).toEqual([
      { x: 3, y: 3, scaleX: 1, fade: SHOWN },
      { x: 3, y: 3, scaleX: 1, fade: SHOWN },
    ]);
  });

  it("grows it as it fades away there, all but gone as its showing ends", () => {
    const { x, y, scaleX, fade } = placeAt(hand, FEEL.handLoopMs - 1);

    expect([x, y, scaleX, fade]).toEqual([
      3,
      3,
      expect.closeTo(FEEL.handScale, 3),
      expect.closeTo(1, 3),
    ]);
  });

  it("draws it over everything on the board", () => {
    expect(handAt(hand, shareMs(FEEL.handSlidesFrom)).raise).toBe(RAISED.top);
  });

  it("slides it at its size with Less motion, from the first fuzzball to the second", () => {
    const less = handTimeline(MOVE, FEEL, "less");

    expect(
      [FEEL.handShowsFrom, FEEL.handSlidesFrom, FEEL.handSlidesTo].map(
        (share) => placeAt(less, shareMs(share)),
      ),
    ).toEqual([
      { x: 2, y: 3, scaleX: 1, fade: 1 },
      { x: 2, y: 3, scaleX: 1, fade: SHOWN },
      { x: 3, y: 3, scaleX: 1, fade: SHOWN },
    ]);
  });

  it("keeps it at its size with Less motion as it fades away", () => {
    expect(
      placeAt(handTimeline(MOVE, FEEL, "less"), FEEL.handLoopMs - 1).scaleX,
    ).toBe(1);
  });
});

describe("sampleHand", () => {
  const hand = handTimeline(MOVE, FEEL, "full");

  it("shows the move again each time the hand's showing ends", () => {
    const midway = shareMs((FEEL.handSlidesFrom + FEEL.handSlidesTo) / 2);

    expect(placeAt(hand, 3 * FEEL.handLoopMs + midway)).toEqual(
      placeAt(hand, midway),
    );
  });
});
