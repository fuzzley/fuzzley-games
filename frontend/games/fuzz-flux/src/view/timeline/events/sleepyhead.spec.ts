import { itemAt } from "@fz/core/records";
import type { Hit } from "../../../rules/move/record";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  firstWaveOf,
  pieceAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { FEEL } from "../feel";
import type { HitOf } from "../hits";
import { RAISED } from "../looks";
import { cue } from "../part";
import type { Timeline } from "../timeline";
import type { WavePlay } from "../wave_play";
import { beddedOf, ruffled } from "./sleepyhead";

/** When the blast reaches the sleepyhead it ruffles. */
const RUFFLED_MS = 300;

/** When the board starts to fall. */
const FALL_MS = 1000;

/** When the board has landed. */
const LANDED_MS = 1400;

/** When the first sleepyhead put to bed starts to sink. */
const SINKS_MS = LANDED_MS + FEEL.bedAfterMs;

/** The sleepyhead put to bed in the move played by hand, which falls to its bed on square 10, the second column's foot of a board 3 wide. */
const SLEEPYHEAD = 2;

/** The wave the move that puts a sleepyhead to bed plays first, on the board as its fall leaves it, the sleepyhead on its bed. */
const BEDDED = onItsBed(firstWaveOf(MOVE_FIXTURES.sleepyheadBedded));

/** The wave the move whose dasher ruffles a sleepyhead plays first. */
const RUFFLING = firstWaveOf(MOVE_FIXTURES.sleepyheadRuffled);

/** The ruffled hit in `RUFFLING`, on the sleepyhead 6. */
const RUFFLED = itemAt(
  RUFFLING.wave.hits.filter(
    (hit): hit is HitOf<"ruffled"> => hit.what === "ruffled",
  ),
  0,
);

/** Returns a wave played on the board as it starts but for the sleepyhead it puts to bed, which stands on its bed, where its fall leaves it. */
function onItsBed(play: WavePlay): WavePlay {
  const squares = [...play.grid.squares];
  const from = squares.findIndex((square) => square?.piece?.id === SLEEPYHEAD);
  const bed = itemAt(squares, 10);
  squares[10] =
    bed === null ? null : { ...bed, piece: squares[from]?.piece ?? null };
  squares[from] = null;
  return { ...play, grid: { ...play.grid, squares } };
}

/** Returns the timeline of the sleepyheads a wave puts to bed, played as given. */
function beddedTimeline(play: WavePlay = BEDDED): Timeline {
  return timelineOfParts(play.grid, beddedOf(play, FALL_MS, LANDED_MS));
}

/** Returns `BEDDED` with a second sleepyhead put to bed, on square 9 beside the first. */
function twoBedded(): WavePlay {
  const second: Hit = { what: "bedded", square: 9, piece: 3 };
  return {
    ...BEDDED,
    wave: { ...BEDDED.wave, hits: [...BEDDED.wave.hits, second] },
  };
}

describe("ruffled", () => {
  const timeline = timelineOfParts(
    RUFFLING.grid,
    ruffled(RUFFLED, RUFFLED_MS, RUFFLING),
  );

  it("shakes the sleepyhead's head as the blast reaches it, the shake dying away", () => {
    expect([
      pieceAt(timeline, 6, RUFFLED_MS - 1).wobble,
      pieceAt(timeline, 6, RUFFLED_MS).wobble,
    ]).toEqual([0, FEEL.ruffledWobble]);
    expect(
      pieceAt(timeline, 6, RUFFLED_MS + FEEL.ruffledMs / 2).wobble,
    ).toBeLessThan(FEEL.ruffledWobble / 2);
    expect(pieceAt(timeline, 6, RUFFLED_MS + FEEL.ruffledMs).wobble).toBe(0);
  });

  it("shakes its head the same with Less motion", () => {
    expect(
      ruffled(RUFFLED, RUFFLED_MS, { ...RUFFLING, motion: "less" }),
    ).toEqual(ruffled(RUFFLED, RUFFLED_MS, RUFFLING));
  });
});

describe("beddedOf", () => {
  const timeline = beddedTimeline();

  it("draws a sleepyhead put to bed over the board from when the board falls, so what falls into its square in the same fall comes in behind it", () => {
    expect([
      pieceAt(timeline, SLEEPYHEAD, FALL_MS - 1).raise,
      pieceAt(timeline, SLEEPYHEAD, FALL_MS).raise,
    ]).toEqual([0, RAISED.bedded]);
  });

  it("carries it off a moment after the board lands, sinking down past the board's foot as it shrinks and fades", () => {
    const halfway = pieceAt(timeline, SLEEPYHEAD, SINKS_MS + FEEL.bedMs / 2);

    expect([
      pieceAt(timeline, SLEEPYHEAD, SINKS_MS).y,
      halfway.x,
      halfway.y,
      halfway.scaleX,
      halfway.scaleY,
      halfway.fade,
    ]).toEqual([
      3,
      1,
      expect.closeTo(3 + FEEL.bedSinkSquares / 4, 9),
      expect.closeTo(1 - (1 - FEEL.bedScale) / 4, 9),
      expect.closeTo(1 - (1 - FEEL.bedScale) / 4, 9),
      expect.closeTo(1 / 4, 9),
    ]);
  });

  it("takes it off the board once it has sunk", () => {
    expect(timeline.pieces.find(({ id }) => id === SLEEPYHEAD)?.untilMs).toBe(
      SINKS_MS + FEEL.bedMs,
    );
  });

  it("sinks it down past the board's foot, where the beds are, whichever way the wind blows", () => {
    const halfway = pieceAt(
      beddedTimeline({ ...BEDDED, blows: "right" }),
      SLEEPYHEAD,
      SINKS_MS + FEEL.bedMs / 2,
    );

    expect([halfway.x, halfway.y]).toEqual([
      1,
      expect.closeTo(3 + FEEL.bedSinkSquares / 4, 9),
    ]);
  });

  it("plays its sound and counts it for the sleepyheads' goal as it starts to sink", () => {
    expect(beddedOf(BEDDED, FALL_MS, LANDED_MS)).toEqual(
      expect.arrayContaining([
        cue("bed", SINKS_MS),
        { what: "counted", atMs: SINKS_MS, counts: { what: "sleepyhead" } },
      ]),
    );
  });

  it("carries a wave's sleepyheads off in turn, a gap apart, and holds the board a gap for each", () => {
    const parts = beddedOf(twoBedded(), FALL_MS, LANDED_MS);

    expect([
      parts.filter(({ what }) => what === "sound"),
      parts.filter(({ what }) => what === "hold"),
    ]).toEqual([
      [cue("bed", SINKS_MS), cue("bed", SINKS_MS + FEEL.bedGapMs)],
      [{ what: "hold", atMs: LANDED_MS + 2 * FEEL.bedGapMs }],
    ]);
  });

  it("carries them off the same with Less motion", () => {
    expect(beddedOf({ ...BEDDED, motion: "less" }, FALL_MS, LANDED_MS)).toEqual(
      beddedOf(BEDDED, FALL_MS, LANDED_MS),
    );
  });

  it("puts none to bed, and holds the board for none, in a wave that brings no sleepyhead to a bed", () => {
    expect(
      beddedOf(firstWaveOf(MOVE_FIXTURES.bunch), FALL_MS, LANDED_MS),
    ).toEqual([]);
  });
});
