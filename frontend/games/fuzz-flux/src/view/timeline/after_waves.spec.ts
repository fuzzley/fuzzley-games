import { itemAt } from "@fz/core/records";
import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import { firstWaveOf } from "../../testing/played_parts";
import { type MovePlayed, playAfterWaves } from "./after_waves";
import { afterWave } from "./board_after";
import { Draft } from "./draft";
import { FEEL } from "./feel";
import type { Timeline } from "./timeline";

/** When a move's waves let the board go on. */
const WAVES_END_MS = 1000;

/** Describes what plays after a move played by hand's waves: when the board may go on, how it is left, and the timeline. */
interface AfterWaves {
  readonly played: MovePlayed;
  readonly timeline: Timeline;
}

/** Returns what plays after a move played by hand's one wave, from when it lets the board go on. */
function afterWavesOf(fixture: MoveFixture): AfterWaves {
  const grid = afterWave(
    firstWaveOf(fixture).grid,
    itemAt(fixture.record.waves, 0),
  );
  const draft = new Draft(grid, []);
  const played = playAfterWaves(
    draft,
    fixture.record,
    { endMs: WAVES_END_MS, grid },
    "down",
    FEEL,
  );
  return { played, timeline: draft.finish(played.endMs, null, FEEL) };
}

describe("playAfterWaves", () => {
  it("leaves the board as it was, and goes on at once, after a move with nothing more to play", () => {
    const fixture = MOVE_FIXTURES.bunch;

    expect(afterWavesOf(fixture).played).toEqual({
      endMs: WAVES_END_MS,
      grid: afterWave(
        firstWaveOf(fixture).grid,
        itemAt(fixture.record.waves, 0),
      ),
      blows: "down",
    });
  });

  it("puts the burr that spreads on the fuzzball it spreads to", () => {
    expect(
      afterWavesOf(MOVE_FIXTURES.burrSpreads).played.grid.squares[3]?.piece,
    ).toMatchObject({ id: 4, burred: true });
  });

  it("plays the waves the wind's turn sets off, letting fuzzballs in from the edge it now blows from", () => {
    const { played, timeline } = afterWavesOf(MOVE_FIXTURES.windTurns);

    expect([
      played.blows,
      timeline.pieces.find(({ id }) => id === 10)?.look,
    ]).toMatchObject(["right", { x: -1, y: 1 }]);
  });

  it("shuffles the board, and waits until the shuffle is done", () => {
    const { played } = afterWavesOf(MOVE_FIXTURES.shuffle);

    expect([played.endMs, played.grid.squares[8]?.piece?.id]).toEqual([
      WAVES_END_MS + FEEL.shuffleMs,
      12,
    ]);
  });
});
