import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { HOPS_MS, blastTimeline } from "../../../testing/played_parts";
import type { BlastEvent } from "../blasts";
import { FEEL } from "../feel";
import { frameFor, sampleAt } from "../sample";
import { twoFrizzballsOff } from "./two_frizzballs";

/** When the pair goes off, played as two frizzballs on the two dashers' square 4 of their 3 by 3 board. */
const OFF_MS = HOPS_MS + FEEL.pairMs;

/** The two dashers' blast, played as two frizzballs'. */
const TWO_FRIZZBALLS: BlastEvent = (blast, reach, play) =>
  twoFrizzballsOff(
    { ...blast, what: "two-frizzballs", kind: null },
    reach,
    play,
  );

describe("twoFrizzballsOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.twoDashers, TWO_FRIZZBALLS);
  const dimAt = (ms: number): number =>
    sampleAt(timeline, FEEL, ms, frameFor(timeline)).board.dim;

  it("takes the pair off at once", () => {
    expect(timeline.pieces.find(({ id }) => id === 4)?.untilMs).toBe(OFF_MS);
  });

  it("dims the board deep, and brightens it slowly after a while", () => {
    const brightensMs = OFF_MS + FEEL.twoFrizzballsDimWaitMs;

    expect([
      dimAt(OFF_MS),
      dimAt(brightensMs),
      dimAt(brightensMs + FEEL.twoFrizzballsDimMs),
    ]).toEqual([FEEL.twoFrizzballsDim, FEEL.twoFrizzballsDim, 0]);
  });

  it("spreads a white ring and then one of static over the whole board, and shakes it its hardest", () => {
    const at = { x: 1, y: 1 };

    expect(timeline.effects).toEqual([
      { what: "shake", atMs: OFF_MS, px: FEEL.shakeTwoFrizzballsPx },
      {
        what: "ring",
        atMs: OFF_MS + FEEL.twoFrizzballsRingAfterMs,
        ms: FEEL.twoFrizzballsRingMs,
        at,
        radius: 3 * FEEL.twoFrizzballsRing,
        ink: "white",
      },
      {
        what: "ring",
        atMs: OFF_MS + FEEL.twoFrizzballsSparkRingAfterMs,
        ms: FEEL.twoFrizzballsRingMs,
        at,
        radius: 3,
        ink: "frizzball",
      },
    ]);
  });
});
