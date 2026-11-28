import { itemAt } from "@fz/core/records";
import type { QuarterTurns } from "../../../rules/board/board";
import type { Gust } from "../../../rules/move/record";
import { boardFrom } from "../../../testing/board_picture";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { pieceAt, timelineOfParts } from "../../../testing/played_parts";
import { gridOf, moveStartOf } from "../../../testing/shown_board";
import { type AfterPlay, playAfterWaves } from "../after_waves";
import { afterSwap, afterWave } from "../board_after";
import { Draft } from "../draft";
import { FEEL } from "../feel";
import type { Motion } from "../less_motion";
import { POOLS } from "../limits";
import type { Part } from "../part";
import type { Effect, Place, Timeline } from "../timeline";
import { gustCrosses } from "./gust";

/**
 * A board 3 by 2: a blue fuzzball, piece 1, a caged red, 2, and a
 * sleepyhead, 3, over a brick, 4, the frizzball, 5, and an amber
 * fuzzball, 6.
 */
const GRID = gridOf(boardFrom(["bRz", "2fa"]));

/** The blue fuzzball, in the board's top left corner. */
const BLUE = 1;

/** The amber fuzzball, in its bottom right corner. */
const AMBER = 6;

/** When the gust sets in, as a spec plays it. */
const GUST_MS = 1000;

/** A line of wind as an effect. */
type GustLine = Extract<Effect, { readonly what: "gust-line" }>;

/** Returns the parts of the wind turning so far from the screen's frame, crossing `GRID` from a moment, `GUST_MS` unless given, in a motion. */
function crossing(
  turns: QuarterTurns,
  motion: Motion = "full",
  atMs = GUST_MS,
): readonly Part[] {
  const gust: Gust = { turns, waves: [] };
  const play: AfterPlay = { atMs, grid: GRID, feel: FEEL, motion };
  return gustCrosses(gust, play);
}

/** Returns the lines of wind among some parts. */
function linesIn(parts: readonly Part[]): readonly GustLine[] {
  return parts.flatMap((part) =>
    part.what === "effect" && part.effect.what === "gust-line"
      ? [part.effect]
      : [],
  );
}

/** Returns where each of some lines of wind sets out. */
function placesOf(lines: readonly GustLine[]): readonly Place[] {
  return lines.map(({ at }) => at);
}

/** Returns the pieces some parts move, each once, in the order first moved. */
function movedIn(parts: readonly Part[]): readonly number[] {
  return [
    ...new Set(
      parts.flatMap((part) => (part.what === "key" ? [part.piece] : [])),
    ),
  ];
}

/** Returns when a piece starts to lean among some parts. */
function leansFromMs(parts: readonly Part[], piece: number): number {
  const lean = parts.find(
    (part) =>
      part.what === "key" && part.piece === piece && part.channel === "lift",
  );
  return lean?.what === "key" ? lean.key.atMs : Number.NaN;
}

/** The green fuzzball the fall the wind's turn starts lets in, after `MOVE_FIXTURES.windTurns`. */
const LET_IN = 10;

/** Returns the timeline of what plays after `MOVE_FIXTURES.windTurns`' one wave, the gust setting in at `GUST_MS`. */
function afterWindTurns(): Timeline {
  const fixture = MOVE_FIXTURES.windTurns;
  const grid = afterWave(
    afterSwap(moveStartOf(fixture).grid, fixture.record.swap),
    itemAt(fixture.record.waves, 0),
  );
  const draft = new Draft(grid, [], "full");
  playAfterWaves(draft, fixture.record, { endMs: GUST_MS, grid }, "down", FEEL);
  return draft.finish(GUST_MS, null, FEEL, POOLS);
}

describe("gustCrosses", () => {
  it("sends the feel's lines of wind across the board the way the wind now blows, each crossing in the gust's time", () => {
    const lines = linesIn(crossing(1));

    expect(lines.map(({ blows, ms }) => [blows, ms])).toEqual(
      Array.from({ length: FEEL.gustLines }, () => ["right", FEEL.gustMs]),
    );
  });

  it("sets each line out from a place on the board, as the gust sets in or within the feel's spread after it", () => {
    const lines = linesIn(crossing(2));
    const across = lines.map(({ at }) => at.x);
    const down = lines.map(({ at }) => at.y);
    const setsOutMs = lines.map(({ atMs }) => atMs - GUST_MS);

    expect(Math.min(...across)).toBeGreaterThanOrEqual(-0.5);
    expect(Math.max(...across)).toBeLessThan(GRID.width - 0.5);
    expect(Math.min(...down)).toBeGreaterThanOrEqual(-0.5);
    expect(Math.max(...down)).toBeLessThan(GRID.height - 0.5);
    expect(Math.min(...setsOutMs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...setsOutMs)).toBeLessThan(FEEL.gustLinesSpreadMs);
  });

  it("sets each line out from a place across, a place down and at a moment of its own", () => {
    const lines = linesIn(crossing(1));

    expect([
      new Set(lines.map(({ at }) => at.x)).size,
      new Set(lines.map(({ at }) => at.y)).size,
      new Set(lines.map(({ atMs }) => atMs)).size,
    ]).toEqual([FEEL.gustLines, FEEL.gustLines, FEEL.gustLines]);
  });

  it("draws a line's place down apart from its place across, so the lines don't lie corner to corner", () => {
    const lines = linesIn(crossing(1));

    expect(
      lines.some(
        ({ at }) =>
          Math.abs((at.x + 0.5) / GRID.width - (at.y + 0.5) / GRID.height) >
          1e-9,
      ),
    ).toBe(true);
  });

  it("sends its lines out from other places for a gust turned another way", () => {
    expect(placesOf(linesIn(crossing(1)))).not.toEqual(
      placesOf(linesIn(crossing(2))),
    );
  });

  it("sends its lines out from other places for a gust setting in at another moment", () => {
    expect(placesOf(linesIn(crossing(1)))).not.toEqual(
      placesOf(linesIn(crossing(1, "full", GUST_MS + 1))),
    );
  });

  it("sends its lines out alike every time it crosses", () => {
    expect(linesIn(crossing(3))).toEqual(linesIn(crossing(3)));
  });

  it.each<[QuarterTurns, string, { leanX: number; leanY: number }]>([
    [0, "down", { leanX: 0, leanY: FEEL.gustLean }],
    [1, "right", { leanX: FEEL.gustLean, leanY: 0 }],
  ])(
    "leans each fuzzball the way the wind blows as the gust reaches it, its fur lifting, a wind turned %i times blowing %s",
    (turns, _, lean) => {
      const parts = crossing(turns);
      const timeline = timelineOfParts(GRID, parts);
      const leanedMs = (piece: number): number =>
        leansFromMs(parts, piece) + FEEL.gustLeanMs;

      expect(
        [BLUE, AMBER].map((piece) => {
          const { leanX, leanY, lift } = pieceAt(
            timeline,
            piece,
            leanedMs(piece),
          );
          return { leanX, leanY, lift };
        }),
      ).toEqual([
        { ...lean, lift: FEEL.gustLift },
        { ...lean, lift: FEEL.gustLift },
      ]);
    },
  );

  it("springs each back once it has leaned, its fur settling", () => {
    const timeline = timelineOfParts(GRID, crossing(0));
    const settledMs =
      leansFromMs(crossing(0), AMBER) +
      FEEL.gustLeanMs +
      Math.max(FEEL.gustLeanBackMs, FEEL.gustLiftBackMs);

    const { leanX, leanY, lift } = pieceAt(timeline, AMBER, settledMs);

    expect({ leanX, leanY, lift }).toEqual({ leanX: 0, leanY: 0, lift: 0 });
  });

  it.each<[QuarterTurns, string, number]>([
    [0, "down", 0],
    [1, "right", 0],
    [2, "up", 1],
    [3, "left", 2],
  ])(
    "leans a fuzzball as many squares' gaps on as it lies from the edge the wind blows from, a wind turned %i times blowing %s",
    (turns, _, squares) => {
      expect(leansFromMs(crossing(turns), BLUE)).toBe(
        GUST_MS + squares * FEEL.gustSquareGapMs,
      );
    },
  );

  it("leans a sleepyhead and the frizzball, but neither a caged fuzzball nor a brick", () => {
    expect(movedIn(crossing(1))).toEqual([1, 3, 5, 6]);
  });

  it("leans nothing with Less motion, its lines still crossing", () => {
    const parts = crossing(1, "less");

    expect([movedIn(parts), linesIn(parts).length]).toEqual([
      [],
      FEEL.gustLines,
    ]);
  });

  it.each<Motion>(["full", "less"])(
    "turns the wind as the gust sets in, in %s motion",
    (motion) => {
      expect(crossing(1, motion)).toContainEqual({
        what: "wind-turns",
        atMs: GUST_MS,
      });
    },
  );

  it.each<Motion>(["full", "less"])(
    "holds the board for the gust's time, in %s motion",
    (motion) => {
      expect(crossing(1, motion)).toContainEqual({
        what: "hold",
        atMs: GUST_MS + FEEL.gustMs,
      });
    },
  );

  it("lets nothing the wind's turn sets falling in before the gust has crossed", () => {
    const timeline = afterWindTurns();

    expect(
      timeline.pieces.find(({ id }) => id === LET_IN)?.fromMs,
    ).toBeGreaterThanOrEqual(GUST_MS + FEEL.gustMs);
  });
});
