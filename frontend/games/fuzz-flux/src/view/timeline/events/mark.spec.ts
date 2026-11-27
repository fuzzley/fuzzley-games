import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { firstWaveOf } from "../../../testing/played_parts";
import { FEEL } from "../feel";
import type { WavePlay } from "../wave_play";
import { waveMarkOf } from "./mark";

/** Returns a move played by hand's first wave, played as its move's wave of a number. */
function waveNumbered(number: number): WavePlay {
  const play = firstWaveOf(MOVE_FIXTURES.bunch);
  return { ...play, wave: { ...play.wave, number } };
}

describe("waveMarkOf", () => {
  it("shows a wave's count a little above a bunch's middle", () => {
    expect(waveMarkOf({ x: 1, y: 2 }, 300, waveNumbered(9))).toEqual([
      {
        what: "mark",
        mark: {
          atMs: 300,
          at: { x: 1, y: 2 - FEEL.markAboveSquares },
          times: 9,
        },
      },
    ]);
  });

  it.each([1, 10])("shows none for wave %i", (number) => {
    expect(waveMarkOf({ x: 1, y: 2 }, 300, waveNumbered(number))).toEqual([]);
  });
});
