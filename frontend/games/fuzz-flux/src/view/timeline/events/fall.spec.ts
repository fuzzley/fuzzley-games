import type { Wind } from "../../../rules/board/board";
import {
  MOVE_FIXTURES,
  type MoveFixture,
} from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { FEEL } from "../feel";
import type { Timeline } from "../timeline";
import type { WavePlay } from "../wave_play";
import { fallsOf } from "./fall";

/** When the board starts to fall. */
const FALL_MS = 1000;

/** Returns how long a fall of some squares takes, at the design's feel. */
function fallMsOf(squares: number): number {
  return FEEL.fallBaseMs + FEEL.fallPerSquareMs * squares ** FEEL.fallExponent;
}

/** Returns the timeline of a move played by hand's first wave's falls, as it is played with some of its own changed. */
function fallsTimeline(
  fixture: MoveFixture,
  changed: Partial<WavePlay> = {},
): Timeline {
  const play = { ...firstWaveOf(fixture), ...changed };
  return timelineOfParts(play.grid, fallsOf(play, FALL_MS));
}

/** Returns when a piece of a timeline shows, or undefined for none. */
function showsMs(timeline: Timeline, piece: number): number | undefined {
  return timeline.pieces.find(({ id }) => id === piece)?.fromMs;
}

describe("fallsOf", () => {
  describe("the fuzzballs let in over a bunch of 3", () => {
    const timeline = fallsTimeline(MOVE_FIXTURES.bunch);
    const landsMs = FALL_MS + fallMsOf(1);

    it("lets each in from over the board's top edge as it starts", () => {
      expect([
        showsMs(timeline, 10),
        pieceAt(timeline, 10, FALL_MS),
      ]).toMatchObject([FALL_MS, { x: 0, y: -1 }]);
    });

    it("starts each lane a little after the one to its left", () => {
      expect([showsMs(timeline, 11), showsMs(timeline, 12)]).toEqual([
        FALL_MS + FEEL.laneGapMs,
        FALL_MS + 2 * FEEL.laneGapMs,
      ]);
    });

    it("speeds each up as it falls, a quarter of the way down halfway through", () => {
      expect(pieceAt(timeline, 10, FALL_MS + fallMsOf(1) / 2).y).toBeCloseTo(
        -0.75,
      );
    });

    it("stretches each down the way it falls, and narrows it, the more the faster it goes", () => {
      const stretchedMs = fallMsOf(1) * Math.sqrt(1 / FEEL.fallStretchGrowth);

      expect([
        pieceAt(timeline, 10, FALL_MS + stretchedMs / 2),
        pieceAt(timeline, 10, FALL_MS + stretchedMs),
      ]).toMatchObject([
        {
          scaleX: 1 - FEEL.fallNarrow / 4,
          scaleY: 1 + FEEL.fallStretch / 4,
        },
        {
          scaleX: 1 - FEEL.fallNarrow,
          scaleY: 1 + FEEL.fallStretch,
          lookY: FEEL.fallLook,
        },
      ]);
    });

    it("lands each on its square, its eyes ahead", () => {
      expect(pieceAt(timeline, 10, landsMs)).toMatchObject({
        x: 0,
        y: 0,
        lookY: 0,
      });
    });

    it("squashes each against what it lands on, then springs it back", () => {
      expect([
        pieceAt(timeline, 10, landsMs + FEEL.landSquashMs),
        pieceAt(timeline, 10, landsMs + FEEL.landMs),
      ]).toMatchObject([
        { scaleX: 1 + FEEL.landWiden, scaleY: 1 - FEEL.landSquash },
        { scaleX: 1, scaleY: 1 },
      ]);
    });

    it("blinks each as it lands", () => {
      const blinksMs = landsMs + FEEL.landBlinkAfterMs;

      expect([
        pieceAt(timeline, 10, blinksMs).face,
        pieceAt(timeline, 10, blinksMs + FEEL.blinkMs).face,
      ]).toEqual(["blink", "rest"]);
    });

    it("holds the board until the last has landed", () => {
      expect(timeline.restMs).toBe(landsMs + 2 * FEEL.laneGapMs);
    });
  });

  describe("a lane that lets a stack fall", () => {
    const timeline = fallsTimeline(MOVE_FIXTURES.dasherAcrossMade);

    it("drops the one on the board first, from where it stands", () => {
      expect([
        pieceAt(timeline, 8, FALL_MS).y,
        pieceAt(timeline, 8, FALL_MS + fallMsOf(1)).y,
      ]).toEqual([2, 3]);
    });

    it("lets each after it in a little later, from a square further over the edge", () => {
      expect([
        showsMs(timeline, 15),
        pieceAt(timeline, 15, FALL_MS + 3 * FEEL.stackGapMs).y,
      ]).toEqual([FALL_MS + 3 * FEEL.stackGapMs, -3]);
    });
  });

  it("rolls a fuzzball let in round a corner to where it lands, after the one falling down its lane before it", () => {
    const timeline = fallsTimeline(MOVE_FIXTURES.rollAndRefill);
    const startMs = FALL_MS + FEEL.stackGapMs;
    const lengthMs = fallMsOf(1 + Math.SQRT2);

    expect([
      pieceAt(
        timeline,
        10,
        startMs + lengthMs * Math.sqrt(1 / (1 + Math.SQRT2)),
      ),
      pieceAt(timeline, 10, startMs + lengthMs),
    ]).toMatchObject([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it.each<[Wind, number, number]>([
    ["down", 0, -1],
    ["right", -1, 0],
    ["up", 0, 3],
    ["left", 3, 0],
  ])(
    "lets fuzzballs in from the edge the wind blows from as it blows %s",
    (blows, x, y) => {
      const timeline = fallsTimeline(MOVE_FIXTURES.bunch, { blows });

      expect(pieceAt(timeline, 10, FALL_MS)).toMatchObject({ x, y });
    },
  );

  it("falls quicker in a quicker wave", () => {
    const timeline = fallsTimeline(MOVE_FIXTURES.bunch, { quickening: 0.5 });

    expect(timeline.restMs).toBe(
      FALL_MS + (2 * FEEL.laneGapMs + fallMsOf(1)) * 0.5,
    );
  });

  it("never blinks a sleepyhead, though a fuzzball lands where it is put to bed", () => {
    const timeline = fallsTimeline(MOVE_FIXTURES.sleepyheadBedded);

    expect(timeline.pieces.find(({ id }) => id === 2)?.faces).toEqual([]);
  });

  it("holds the board for none where nothing falls", () => {
    const play = {
      ...firstWaveOf(MOVE_FIXTURES.bunch),
      wave: { ...firstWaveOf(MOVE_FIXTURES.bunch).wave, falls: [] },
    };

    expect(fallsOf(play, FALL_MS)).toEqual([]);
  });
});
