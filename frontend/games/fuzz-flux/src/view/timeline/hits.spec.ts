import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import {
  HOPS_MS,
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../testing/played_parts";
import { FEEL } from "./feel";
import { hitsOf } from "./hits";
import { reachesOf } from "./reach";
import type { Timeline } from "./timeline";

/** Returns the timeline of the hits of a move played by hand's first wave. */
function hitsTimeline(fixture: MoveFixture): Timeline {
  const play = firstWaveOf(fixture);
  return timelineOfParts(
    play.grid,
    hitsOf(play, reachesOf(play.wave, play.hopsMs, FEEL)),
  );
}

describe("hitsOf", () => {
  describe("the fuzzballs a puffer takes", () => {
    const timeline = hitsTimeline(MOVE_FIXTURES.pufferGoesOff);
    const reachesMs =
      HOPS_MS + FEEL.blastAfterMs + FEEL.pufferInMs + FEEL.pufferRingMs;

    it("has each look wide-eyed a moment before the blast reaches it", () => {
      expect([
        pieceAt(timeline, 1, reachesMs - FEEL.struckLookMs - 1).face,
        pieceAt(timeline, 1, reachesMs - FEEL.struckLookMs).face,
      ]).toEqual(["rest", "eep"]);
    });

    it("hops each off as it reaches it", () => {
      expect(pieceAt(timeline, 1, reachesMs).face).toBe("happy");
    });

    it("holds the board until the last is struck", () => {
      expect(timeline.restMs).toBe(reachesMs + FEEL.pufferRingMs);
    });
  });

  it("plays none of a bunch's own fuzzballs, which the bunch plays", () => {
    expect(hitsTimeline(MOVE_FIXTURES.bunch).restMs).toBe(0);
  });

  it("holds the board for a hit beside a bunch until a moment after the bunch hops off", () => {
    expect(hitsTimeline(MOVE_FIXTURES.rollAndRefill).restMs).toBe(
      HOPS_MS + FEEL.struckAfterBunchMs,
    );
  });
});
