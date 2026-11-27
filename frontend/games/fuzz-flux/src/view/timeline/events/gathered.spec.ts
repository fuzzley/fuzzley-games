import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { standingOn } from "../standing";
import { gathered } from "./gathered";

/** When the hit lands. */
const AT_MS = 300;

describe("gathered", () => {
  it("hops a fuzzball a blast takes off as the blast reaches it", () => {
    const play = firstWaveOf(MOVE_FIXTURES.pufferGoesOff);
    const parts = gathered(
      {
        what: "gathered",
        square: 0,
        step: 1,
        blast: 0,
        piece: 1,
        kind: "blue",
      },
      AT_MS,
      play,
    );

    expect(pieceAt(timelineOfParts(play.grid, parts), 1, AT_MS).face).toBe(
      "happy",
    );
  });

  it("only sends the copy of a special a blast sets off to its goal, its own blast playing the rest", () => {
    const play = firstWaveOf(MOVE_FIXTURES.dasherSetsOffPuffer);

    expect(
      gathered(
        {
          what: "gathered",
          square: 3,
          step: 2,
          blast: 0,
          piece: 4,
          kind: "green",
        },
        AT_MS,
        play,
      ),
    ).toEqual([
      {
        what: "gathered",
        atMs: AT_MS,
        piece: standingOn(play.grid, 3).piece,
        at: { x: 3, y: 0 },
      },
    ]);
  });
});
