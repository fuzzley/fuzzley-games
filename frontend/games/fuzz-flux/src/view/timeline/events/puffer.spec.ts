import { itemAt } from "@fz/core/records";
import type { Blast } from "../../../rules/move/record";
import { boardFrom } from "../../../testing/board_picture";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  HOPS_MS,
  blastTimeline,
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { reachesOf } from "../reach";
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

/** The puffer's own event, played as two puffers swapped together. */
const TWO: BlastEvent = (blast, reach, play) =>
  pufferOff({ ...blast, what: "two-puffers" }, reach, play);

describe("pufferOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.pufferGoesOff, pufferOff);

  it("puffs as it goes off", () => {
    expect(timeline.sounds).toEqual([
      { atMs: OFF_MS, sound: "puff", cents: 0, volume: 1 },
    ]);
  });

  it("puffs bigger for two puffers", () => {
    expect(blastTimeline(MOVE_FIXTURES.pufferGoesOff, TWO).sounds).toEqual([
      { atMs: OFF_MS, sound: "big-puff", cents: 0, volume: 1 },
    ]);
  });

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

  describe("two puffers swapped together", () => {
    const two = blastTimeline(MOVE_FIXTURES.pufferGoesOff, TWO);

    it("lean in what is past one puffer's reach", () => {
      expect(pieceAt(two, 12, BURST_MS).leanX).toBeCloseTo(
        (-2 / Math.hypot(2, 2)) * FEEL.pufferLean,
      );
    });

    it("reach further, throwing more tufts harder and shaking the board harder", () => {
      expect(two.effects).toMatchObject([
        { what: "ring", radius: FEEL.twoPuffersReachSquares },
        {
          what: "fluff",
          count: FEEL.twoPuffersTufts,
          power: FEEL.twoPuffersTuftPower,
        },
        {
          what: "flash",
          radius: FEEL.twoPuffersReachSquares * FEEL.pufferFlashReach,
        },
        { what: "shake", px: FEEL.shakeTwoPuffersPx },
        {
          what: "ring",
          radius: FEEL.twoPuffersReachSquares * FEEL.pufferInkRing,
        },
      ]);
    });
  });

  it("pushes back nothing past its reach and as far again", () => {
    const grid = gridOf(
      boardFrom({ pieces: ["rgbgbgbgbg"], marks: ["o........."] }),
    );
    const play = firstWaveOf(MOVE_FIXTURES.pufferGoesOff);
    const blast: Blast = {
      what: "puffer",
      square: 0,
      piece: 1,
      kind: "red",
      setOffBy: null,
      wait: 0,
      strikes: [{ square: 0, step: 0 }],
    };
    const wave = { ...play.wave, blasts: [blast] };
    const reach = itemAt(reachesOf(wave, play.hopsMs, FEEL), 0);

    const far = timelineOfParts(
      grid,
      pufferOff(blast, reach, { ...play, grid, wave }),
    );

    expect(far.pieces.find(({ id }) => id === 10)?.keys).toEqual({});
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
