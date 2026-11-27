import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { firstWaveOf } from "../../../testing/played_parts";
import { cue } from "../part";
import { dusted } from "./dust";

describe("dusted", () => {
  it("shows what dust is left on the square as the hit lands, to its sound, and counts the layer for the dust's goal", () => {
    const play = firstWaveOf(MOVE_FIXTURES.dustSwept);

    expect(
      dusted(
        {
          what: "dusted",
          square: 0,
          step: 0,
          blast: null,
          layersLeft: 1,
        },
        300,
        play,
      ),
    ).toEqual([
      cue("dust", 300),
      {
        what: "dust",
        change: { atMs: 300, at: { x: 0, y: 0 }, layers: 1 },
      },
      { what: "counted", atMs: 300, counts: { what: "dust" } },
    ]);
  });
});
