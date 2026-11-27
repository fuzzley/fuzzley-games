// A dasher going off: it splits into two streaks that run its line, one
// each way, as it stretches along the line, narrows and is gone, and the
// board shakes.

import { squareOf } from "../../../rules/board/cells";
import type { Blast } from "../../../rules/move/record";
import { blastShakePx } from "../../effects/shakes";
import { RAISED } from "../looks";
import { type Part, moves, sets, spawns } from "../part";
import type { Reach } from "../reach";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a dasher going off, its streaks running across the board for one across and down it for one down. */
export function dasherOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const across = blast.what === "dasher-across";
  const stretches: readonly Part[] =
    blast.piece === null
      ? []
      : [
          ...sets(blast.piece, reach.startMs, { raise: RAISED.goingOff }),
          ...moves(blast.piece, reach.startMs, feel.dasherGoneMs, "out", {
            scaleX: across ? feel.dasherStretchScale : feel.dasherNarrowScale,
            scaleY: across ? feel.dasherNarrowScale : feel.dasherStretchScale,
            fade: 1,
          }),
          {
            what: "leaves",
            piece: blast.piece,
            atMs: reach.startMs + feel.dasherGoneMs,
          },
        ];
  return [
    ...streaksOf(blast, across, reach, play),
    spawns({
      what: "shake",
      atMs: reach.startMs,
      px: blastShakePx(blast.what, feel),
    }),
    ...stretches,
  ];
}

/**
 * Returns the parts of the two streaks a blast sends from its square,
 * along its row or down its column, running on past the board's edge.
 */
function streaksOf(
  blast: Blast,
  across: boolean,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel, grid } = play;
  const from = squareOf(blast.square, grid.width);
  const squares = Math.max(grid.width, grid.height) + feel.streakRunOnSquares;
  return [1, -1].map((way) =>
    spawns({
      what: "streak",
      atMs: reach.startMs + feel.streaksAfterMs,
      ms: squares * feel.dasherSquareMs,
      from,
      to: across
        ? { x: from.x + way * squares, y: from.y }
        : { x: from.x, y: from.y + way * squares },
      ink: blast.kind ?? "white",
    }),
  );
}
