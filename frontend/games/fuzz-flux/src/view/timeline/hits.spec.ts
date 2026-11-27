import { itemAt } from "@fz/core/records";
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

  it("knocks a layer off a brick beside a bunch a moment after it hops off", () => {
    expect(hitsTimeline(MOVE_FIXTURES.rollAndRefill).sounds).toEqual([
      {
        atMs: HOPS_MS + FEEL.struckAfterBunchMs,
        sound: "knock-1",
        cents: 0,
        volume: 1,
      },
    ]);
  });

  it("bursts a brick of 1 layer beside a bunch a moment after it hops off", () => {
    expect(hitsTimeline(MOVE_FIXTURES.brickBroken).sounds).toEqual([
      {
        atMs: HOPS_MS + FEEL.struckAfterBunchMs,
        sound: "break",
        cents: 0,
        volume: 1,
      },
    ]);
  });

  it("opens a cage as the blast that reaches it does, to its sound", () => {
    const play = firstWaveOf(MOVE_FIXTURES.cageOpened);
    const reach = itemAt(reachesOf(play.wave, play.hopsMs, FEEL), 0);

    expect(
      hitsTimeline(MOVE_FIXTURES.cageOpened).sounds.flatMap(
        ({ atMs, sound }) => (sound === "cage" ? [atMs] : []),
      ),
    ).toEqual([reach.reachMs(1)]);
  });

  it("sweeps the dust off each square of a bunch a moment after it hops off", () => {
    expect(
      hitsTimeline(MOVE_FIXTURES.dustSwept).dust.map(({ atMs, layers }) => [
        atMs,
        layers,
      ]),
    ).toEqual([
      [HOPS_MS + FEEL.struckAfterBunchMs, 1],
      [HOPS_MS + FEEL.struckAfterBunchMs, 0],
      [HOPS_MS + FEEL.struckAfterBunchMs, 1],
    ]);
  });
});
