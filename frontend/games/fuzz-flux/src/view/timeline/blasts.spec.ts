import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import {
  HOPS_MS,
  firstWaveOf,
  timelineOfParts,
} from "../../testing/played_parts";
import { blastsOf } from "./blasts";
import { FEEL } from "./feel";
import { reachesOf } from "./reach";
import type { Timeline } from "./timeline";

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

  it("holds the board until the last blast reaches as far as the board waits for", () => {
    const dasherMs = HOPS_MS + FEEL.blastAfterMs;
    const pufferMs = dasherMs + FEEL.streaksAfterMs + 2 * FEEL.dasherSquareMs;

    expect(blastsTimeline(MOVE_FIXTURES.dasherSetsOffPuffer).restMs).toBe(
      pufferMs + FEEL.pufferInMs + 2 * FEEL.pufferRingMs,
    );
  });
});
