// A gust: the wind turning after a move. Lines of wind cross the board the
// way it now blows, each setting out from a place and at a moment drawn by
// `hashShareOf()`, so a gust plays alike every time; and each fuzzball leans
// with the gust as it reaches it, from the edge the wind blows from, its
// fur lifting, then springs back. The board waits for the gust before the
// waves its turn sets off. With Less motion the lines still cross, and
// nothing leans. The wind shows turned as the gust sets in.

import { hashShareOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import { WINDS, type Wind } from "../../../rules/board/board";
import type { Gust } from "../../../rules/move/record";
import type { GridShown } from "../../run_state";
import type { AfterPlay } from "../after_waves";
import { type Part, moves, spawns } from "../part";
import { everyStanding } from "../standing";
import type { Place } from "../timeline";
import { WAYS } from "./fall";

/** What each of a line's draws from `hashShareOf()` is for, as its fourth number. */
const DRAWS = {
  across: 0,
  down: 1,
  setsOut: 2,
} as const satisfies Readonly<Record<string, number>>;

/**
 * Returns the parts of a gust crossing the board, on the board as the wind
 * turns: the wind turning as it sets in, its lines of wind, the lean of
 * each fuzzball it reaches but with Less motion, and the board held for it.
 */
export function gustCrosses(gust: Gust, play: AfterPlay): readonly Part[] {
  const { atMs, feel } = play;
  const blows = itemAt(WINDS, gust.turns);
  return [
    { what: "wind-turns", atMs },
    ...linesOf(gust, blows, play),
    ...(play.motion === "less" ? [] : leansOf(blows, play)),
    { what: "hold", atMs: atMs + feel.gustMs },
  ];
}

/** Returns the parts of a gust's lines of wind, each setting out from a place on the board, the feel's spread after the gust sets in at the most. */
function linesOf(gust: Gust, blows: Wind, play: AfterPlay): readonly Part[] {
  const { atMs, feel, grid } = play;
  const share = (line: number, draw: number): number =>
    hashShareOf(gust.turns, Math.round(atMs), line, draw);
  return Array.from({ length: feel.gustLines }, (_, line) =>
    spawns({
      what: "gust-line",
      atMs: atMs + share(line, DRAWS.setsOut) * feel.gustLinesSpreadMs,
      ms: feel.gustMs,
      at: {
        x: share(line, DRAWS.across) * grid.width - 0.5,
        y: share(line, DRAWS.down) * grid.height - 0.5,
      },
      blows,
    }),
  );
}

/**
 * Returns the parts of each piece leaning with a gust as it reaches it,
 * its fur lifting, and springing back: every fuzzball, the frizzball and
 * a sleepyhead, but a caged fuzzball, which its cage holds, and a brick.
 */
function leansOf(
  blows: Wind,
  { atMs, feel, grid }: AfterPlay,
): readonly Part[] {
  const way = WAYS[blows];
  return everyStanding(grid).flatMap(({ piece, at }): readonly Part[] => {
    if (piece.what === "brick" || (piece.what === "fuzzball" && piece.caged)) {
      return [];
    }
    const leansMs = atMs + squaresInto(at, blows, grid) * feel.gustSquareGapMs;
    const backMs = leansMs + feel.gustLeanMs;
    return [
      ...moves(piece.id, leansMs, feel.gustLeanMs, "out", {
        leanX: way.x * feel.gustLean,
        leanY: way.y * feel.gustLean,
        lift: feel.gustLift,
      }),
      ...moves(piece.id, backMs, feel.gustLeanBackMs, "spring", {
        leanX: 0,
        leanY: 0,
      }),
      ...moves(piece.id, backMs, feel.gustLiftBackMs, "out", { lift: 0 }),
    ];
  });
}

/** Returns how many squares into a board a place lies from the edge a wind blows from. */
function squaresInto(
  { x, y }: Place,
  blows: Wind,
  { width, height }: GridShown,
): number {
  switch (blows) {
    case "down":
      return y;
    case "up":
      return height - 1 - y;
    case "right":
      return x;
    case "left":
      return width - 1 - x;
  }
}
