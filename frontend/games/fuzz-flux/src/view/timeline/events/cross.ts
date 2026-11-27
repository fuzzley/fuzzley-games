// Two dashers swapped together going off as a cross, with a dasher's
// rush, streaks running along the row and down the column they meet on; a
// dasher with a puffer, three rows and three columns wide, to the rush
// and the puff together. A white ring spreads, the board shakes, and the
// pair is gone at once.

import { squareOf } from "../../../rules/board/cells";
import type { Blast } from "../../../rules/move/record";
import { blastShakePx } from "../../effects/shakes";
import { type Part, cue, spawns } from "../part";
import type { Reach } from "../reach";
import type { WavePlay } from "../wave_play";
import { streaksOf } from "./dasher";

/** The lines a dasher and a puffer's cross runs along, its own and one to either side of it. */
const WIDE_LINES = [-1, 0, 1] as const;

/** Returns the parts of two dashers, or a dasher and a puffer, going off together. */
export function crossOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const lines = blast.what === "dasher-and-puffer" ? WIDE_LINES : [0];
  const gone: readonly Part[] =
    blast.piece === null
      ? []
      : [{ what: "leaves", piece: blast.piece, atMs: reach.startMs }];
  return [
    ...(blast.what === "dasher-and-puffer"
      ? [cue("dash", reach.startMs), cue("puff", reach.startMs)]
      : [cue("dash", reach.startMs, feel.dashVolume)]),
    ...lines.flatMap((off) => [
      ...streaksOf(blast, true, off, reach, play),
      ...streaksOf(blast, false, off, reach, play),
    ]),
    spawns({
      what: "ring",
      atMs: reach.startMs,
      ms: feel.crossRingMs,
      at: squareOf(blast.square, play.grid.width),
      radius: feel.crossRingSquares,
      ink: "white",
    }),
    spawns({
      what: "shake",
      atMs: reach.startMs,
      px: blastShakePx(blast.what, feel),
    }),
    ...gone,
  ];
}
