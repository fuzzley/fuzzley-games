import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { HOPS_MS, blastTimeline, pieceAt } from "../../../testing/played_parts";
import type { BlastEvent } from "../blasts";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { pufferOff } from "./puffer";

/** When the puffer, piece 6, goes off on square 1 of its 4 by 4 board. */
const OFF_MS = HOPS_MS + FEEL.blastAfterMs;

/** When it bursts, once it has breathed in. */
const BURST_MS = OFF_MS + FEEL.pufferInMs;

/** The puffer's own event, played as one a wisp carried to its square, over the piece standing there. */
const CARRIED: BlastEvent = (blast, reach, play) =>
  pufferOff({ ...blast, piece: null }, reach, play);

describe("pufferOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.pufferGoesOff, pufferOff);

  it("breathes the puffer in, cross, raised over the board", () => {
    expect(pieceAt(timeline, 6, BURST_MS)).toMatchObject({
      scaleX: FEEL.pufferShrink,
      face: "cross",
      raise: RAISED.goingOff,
    });
  });

  it("leans everything near it in as it breathes in", () => {
    expect(pieceAt(timeline, 1, BURST_MS).leanX).toBeCloseTo(FEEL.pufferLean);
  });

  it("leans nothing past its reach in", () => {
    expect(pieceAt(timeline, 12, BURST_MS).leanX).toBe(0);
  });

  it("bursts it, swelling, its fur on end, faded, and takes it off", () => {
    const goneMs = BURST_MS + FEEL.pufferBurstMs;

    expect([
      pieceAt(timeline, 6, goneMs),
      timeline.pieces.find(({ id }) => id === 6)?.untilMs,
    ]).toMatchObject([
      { scaleX: FEEL.pufferBurstScale, lift: 1, fade: 1 },
      goneMs,
    ]);
  });

  it("pushes everything left nearby back as it bursts, the less the further off, and springs it home", () => {
    const pushedMs = BURST_MS + FEEL.pufferPushMs;
    const reach = FEEL.pufferReachSquares + FEEL.pufferPushReach;

    expect([
      pieceAt(timeline, 1, pushedMs).leanX,
      pieceAt(timeline, 12, pushedMs).leanY,
      pieceAt(timeline, 1, pushedMs + FEEL.pufferPushBackMs).leanX,
    ]).toEqual([
      expect.closeTo(-FEEL.pufferPush * (1 - 1 / reach)),
      expect.closeTo(
        (2 / Math.hypot(2, 2)) *
          FEEL.pufferPush *
          (1 - Math.hypot(2, 2) / reach),
      ),
      0,
    ]);
  });

  it("flashes, spreads a white ring and one of its kind, throws its tufts and shakes the board as it bursts", () => {
    const at = { x: 1, y: 0 };

    expect(timeline.effects).toEqual([
      {
        what: "ring",
        atMs: BURST_MS,
        ms: FEEL.pufferRingSpreadMs,
        at,
        radius: FEEL.pufferReachSquares,
        ink: "white",
      },
      {
        what: "fluff",
        atMs: BURST_MS,
        at,
        tuft: "tuft-violet",
        count: FEEL.pufferTufts,
        power: FEEL.pufferTuftPower,
      },
      {
        what: "flash",
        atMs: BURST_MS,
        ms: FEEL.flashMs,
        at,
        radius: FEEL.pufferReachSquares * FEEL.pufferFlashReach,
      },
      { what: "shake", atMs: BURST_MS, px: FEEL.shakePufferPx },
      {
        what: "ring",
        atMs: BURST_MS + FEEL.pufferInkRingAfterMs,
        ms: FEEL.pufferRingSpreadMs,
        at,
        radius: FEEL.pufferReachSquares * FEEL.pufferInkRing,
        ink: "violet",
      },
    ]);
  });

  describe("a puffer a wisp carried", () => {
    const carried = blastTimeline(MOVE_FIXTURES.pufferGoesOff, CARRIED);

    it("leans nothing in, as no puffer breathes in", () => {
      expect(pieceAt(carried, 1, BURST_MS).leanX).toBe(0);
    });

    it("neither pushes back nor takes off the piece it goes off over", () => {
      expect([
        pieceAt(carried, 6, BURST_MS + FEEL.pufferPushMs).leanX,
        carried.pieces.find(({ id }) => id === 6)?.untilMs,
      ]).toEqual([0, null]);
    });
  });
});
