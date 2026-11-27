// Two frizzballs swapped together going off: they are gone at once, the
// board dims deeper and brightens slowly, two rings spread over the whole
// board, a white one and then one of static, to a crackle and a boom, and
// it shakes its hardest.

import { squareOf } from "../../../rules/board/cells";
import type { Blast } from "../../../rules/move/record";
import { blastShakePx } from "../../effects/shakes";
import { type Part, cue, spawns } from "../part";
import type { Reach } from "../reach";
import type { WavePlay } from "../wave_play";

/** Returns the parts of two frizzballs going off together. */
export function twoFrizzballsOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel, grid } = play;
  const at = squareOf(blast.square, grid.width);
  const across = Math.max(grid.width, grid.height);
  const gone: readonly Part[] =
    blast.piece === null
      ? []
      : [{ what: "leaves", piece: blast.piece, atMs: reach.startMs }];
  return [
    cue("frizz", reach.startMs + feel.twoFrizzballsCrackleAfterMs),
    cue(
      "big-puff",
      reach.startMs + feel.twoFrizzballsBoomAfterMs,
      feel.twoFrizzballsBoomVolume,
    ),
    ...gone,
    {
      what: "dim",
      key: {
        atMs: reach.startMs,
        ms: 0,
        to: feel.twoFrizzballsDim,
        easing: "linear",
      },
    },
    {
      what: "dim",
      key: {
        atMs: reach.startMs + feel.twoFrizzballsDimWaitMs,
        ms: feel.twoFrizzballsDimMs,
        to: 0,
        easing: "in",
      },
    },
    spawns({
      what: "ring",
      atMs: reach.startMs + feel.twoFrizzballsRingAfterMs,
      ms: feel.twoFrizzballsRingMs,
      at,
      radius: across * feel.twoFrizzballsRing,
      ink: "white",
    }),
    // The sketch's second ring is in its sparks' color, which no ink of
    // the timeline's names; the frizzball's is the nearest.
    spawns({
      what: "ring",
      atMs: reach.startMs + feel.twoFrizzballsSparkRingAfterMs,
      ms: feel.twoFrizzballsRingMs,
      at,
      radius: across,
      ink: "frizzball",
    }),
    spawns({
      what: "shake",
      atMs: reach.startMs,
      px: blastShakePx(blast.what, feel),
    }),
  ];
}
