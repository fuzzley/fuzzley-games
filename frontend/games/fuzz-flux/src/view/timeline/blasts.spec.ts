import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import {
  HOPS_MS,
  firstWaveOf,
  timelineOfParts,
} from "../../testing/played_parts";
import { blastsOf } from "./blasts";
import { FEEL } from "./feel";
import type { Part } from "./part";
import { reachesOf } from "./reach";
import type { Timeline } from "./timeline";

/** Returns what the goals count of the blasts of a move played by hand's first wave as they go off, with no flight. */
function countedOf(fixture: MoveFixture): readonly Part[] {
  const play = firstWaveOf(fixture);
  return blastsOf(play, reachesOf(play.wave, play.hopsMs, FEEL)).filter(
    ({ what }) => what === "counted",
  );
}

/** Returns the timeline of the blasts of a move played by hand's first wave. */
function blastsTimeline(fixture: MoveFixture): Timeline {
  const play = firstWaveOf(fixture);
  return timelineOfParts(
    play.grid,
    blastsOf(play, reachesOf(play.wave, play.hopsMs, FEEL)),
  );
}

describe("blastsOf", () => {
  it("plays each blast by its own event", () => {
    expect(
      blastsTimeline(MOVE_FIXTURES.dasherSetsOffPuffer).effects.map(
        ({ what }) => what,
      ),
    ).toEqual(expect.arrayContaining(["streak", "flash"]));
  });

  it("plays a pair swapped together by its own event, as one blast", () => {
    expect(
      blastsTimeline(MOVE_FIXTURES.twoDashers).effects.filter(
        ({ what }) => what === "streak",
      ),
    ).toHaveLength(4);
  });

  it("holds the board until the last blast reaches as far as the board waits for", () => {
    const dasherMs = HOPS_MS + FEEL.blastAfterMs;
    const pufferMs = dasherMs + FEEL.streaksAfterMs + 2 * FEEL.dasherSquareMs;

    expect(blastsTimeline(MOVE_FIXTURES.dasherSetsOffPuffer).restMs).toBe(
      pufferMs + FEEL.pufferInMs + 2 * FEEL.pufferRingMs,
    );
  });

  it("counts a special swapped going off, which no hit of its own counts, for the goal of its kind", () => {
    expect(countedOf(MOVE_FIXTURES.dasherGoesOff)).toEqual([
      {
        what: "counted",
        atMs: HOPS_MS + FEEL.blastAfterMs,
        counts: { what: "gather", kind: "violet" },
      },
    ]);
  });

  it.each([
    ["the frizzball", MOVE_FIXTURES.frizzballGoesOff],
    ["a pair, whose swap counts it", MOVE_FIXTURES.twoDashers],
  ])("counts nothing of %s going off", (_, fixture) => {
    expect(countedOf(fixture)).toEqual([]);
  });

  it("counts no special another blast sets off, which a hit counts", () => {
    expect(countedOf(MOVE_FIXTURES.dasherSetsOffPuffer)).toMatchObject([
      { counts: { what: "gather", kind: "violet" } },
    ]);
  });
});
