// A sleepyhead's moments in a move, which never wake it: ruffled by a
// blast, and carried off to bed. Less motion keeps both, as it keeps a
// refused swap's shaken heads and every fall: neither is among what the
// design's Less motion takes away.

import { squareOf } from "../../../rules/board/cells";
import type { Hit } from "../../../rules/move/record";
import type { HitOf } from "../hits";
import { RAISED } from "../looks";
import { type Part, cue, moves, sets } from "../part";
import type { WavePlay } from "../wave_play";

/** A sleepyhead put to bed, as its wave's record holds it. */
type Bedded = Extract<Hit, { readonly what: "bedded" }>;

/** Returns the parts of a sleepyhead a blast ruffles as the blast reaches it: it shakes its head, the shake dying away. */
export function ruffled(
  hit: HitOf<"ruffled">,
  atMs: number,
  { feel }: WavePlay,
): readonly Part[] {
  return [
    ...sets(hit.piece, atMs, { wobble: feel.ruffledWobble }),
    ...moves(hit.piece, atMs, feel.ruffledMs, "out", { wobble: 0 }),
  ];
}

/**
 * Returns the parts of the sleepyheads a wave puts to bed, in its record's
 * order, and a hold until the last has had its turn, or none for a wave
 * that puts none to bed: each is raised over the board as the board starts
 * to fall, since what falls into its square comes in behind it in the same
 * fall, and is carried off once the board has landed.
 */
export function beddedOf(
  play: WavePlay,
  fallMs: number,
  landedMs: number,
): readonly Part[] {
  const bedded = play.wave.hits.filter(
    (hit): hit is Bedded => hit.what === "bedded",
  );
  if (bedded.length === 0) {
    return [];
  }
  const { feel } = play;
  return [
    ...bedded.flatMap((sleepyhead, turn) => [
      ...sets(sleepyhead.piece, fallMs, { raise: RAISED.bedded }),
      ...carriedOff(
        sleepyhead,
        landedMs + feel.bedAfterMs + turn * feel.bedGapMs,
        play,
      ),
    ]),
    { what: "hold", atMs: landedMs + bedded.length * feel.bedGapMs },
  ];
}

/** Returns the parts of a sleepyhead carried off to its bed from a moment: it sinks down past the board's foot, shrinking and fading, to its sound, and its goal counts it. */
function carriedOff(
  sleepyhead: Bedded,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  return [
    cue("bed", atMs),
    ...moves(sleepyhead.piece, atMs, feel.bedMs, "in", {
      y: squareOf(sleepyhead.square, play.grid.width).y + feel.bedSinkSquares,
      scaleX: feel.bedScale,
      scaleY: feel.bedScale,
      fade: 1,
    }),
    { what: "counted", atMs, counts: { what: "sleepyhead" } },
    { what: "leaves", piece: sleepyhead.piece, atMs: atMs + feel.bedMs },
  ];
}
