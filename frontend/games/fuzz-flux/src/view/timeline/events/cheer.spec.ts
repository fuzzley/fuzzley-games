import { boardFrom } from "../../../testing/board_picture";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  HOPS_MS,
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { FEEL } from "../feel";
import { facing } from "../part";
import { everyStanding } from "../standing";
import type { Timeline } from "../timeline";
import { type WavePlay, stayingThrough } from "../wave_play";
import { BIGGEST_CHEER, cheerOf, cheered, waveCheerOf } from "./cheer";

/** When the board cheers. */
const AT_MS = 100;

/** A red fuzzball, the frizzball, a sleepyhead, a brick and a caged blue fuzzball, numbered 1 to 5, with a green fuzzball under them, 6. */
const GRID = gridOf(boardFrom(["rfz1B", "g____"]));

/** Returns the timeline of the board cheering, as big as a cheer can be. */
function cheering(): Timeline {
  return timelineOfParts(
    GRID,
    cheered(BIGGEST_CHEER, AT_MS, everyStanding(GRID), FEEL),
  );
}

/** Returns a move played by hand's first wave, played as its move's wave of a number. */
function waveNumbered(number: number): WavePlay {
  const play = firstWaveOf(MOVE_FIXTURES.bunch);
  return { ...play, wave: { ...play.wave, number } };
}

describe("cheerOf", () => {
  it.each([
    [3, 1],
    [5, 2],
    [7, 3],
    [9, 4],
  ])("has wave %i cheer as big as %i", (wave, size) => {
    expect(cheerOf(wave)).toBe(size);
  });

  it.each([1, 2, 4, 10])("has wave %i not cheer", (wave) => {
    expect(cheerOf(wave)).toBeNull();
  });
});

describe("cheered", () => {
  const timeline = cheering();

  it("makes each fuzzball and the frizzball happy, and stretches it up", () => {
    expect([
      pieceAt(timeline, 1, AT_MS + FEEL.cheerUpMs),
      pieceAt(timeline, 2, AT_MS + FEEL.cheerSquareGapMs + FEEL.cheerUpMs),
    ]).toMatchObject([
      {
        face: "happy",
        scaleX: 1 - FEEL.cheerNarrow * BIGGEST_CHEER,
        scaleY: 1 + FEEL.cheerStretch * BIGGEST_CHEER,
      },
      { face: "happy", scaleY: 1 + FEEL.cheerStretch * BIGGEST_CHEER },
    ]);
  });

  it("hops each a moment later a square further right or down", () => {
    const hopsMs = AT_MS + FEEL.cheerSquareGapMs;

    expect([
      pieceAt(timeline, 6, hopsMs).scaleY,
      pieceAt(timeline, 6, hopsMs + FEEL.cheerUpMs).scaleY,
    ]).toEqual([1, 1 + FEEL.cheerStretch * BIGGEST_CHEER]);
  });

  it("springs each back, and rests its eyes again", () => {
    const backMs = AT_MS + FEEL.cheerHappyMs;

    expect(pieceAt(timeline, 1, backMs)).toMatchObject({
      face: "rest",
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("leaves the face something else gave a fuzzball as it cheered", () => {
    const crossed = timelineOfParts(GRID, [
      ...cheered(BIGGEST_CHEER, AT_MS, everyStanding(GRID), FEEL),
      facing(1, AT_MS + FEEL.cheerUpMs, "cross"),
    ]);

    expect(pieceAt(crossed, 1, AT_MS + FEEL.cheerHappyMs).face).toBe("cross");
  });

  it("hops no sleepyhead, brick or caged fuzzball", () => {
    expect(
      [3, 4, 5].map((id) => timeline.pieces.find((track) => track.id === id)),
    ).toMatchObject([
      { faces: [], keys: {} },
      { faces: [], keys: {} },
      { faces: [], keys: {} },
    ]);
  });
});

describe("waveCheerOf", () => {
  it("cheers wave 5 a moment after its bunches hop off, by those it leaves standing", () => {
    const play = waveNumbered(5);

    expect(waveCheerOf(play)).toEqual(
      cheered(2, HOPS_MS + FEEL.cheerAfterMs, stayingThrough(play), FEEL),
    );
  });

  it("cheers no wave that doesn't", () => {
    expect(waveCheerOf(waveNumbered(4))).toEqual([]);
  });
});
