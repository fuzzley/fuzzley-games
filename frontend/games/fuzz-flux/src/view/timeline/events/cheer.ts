// The board cheering: every fuzzball on it hops for joy, happy, stretching
// up and springing back, a moment later the further it is from the top
// left corner, higher the bigger the cheer, and rests its eyes again
// unless something else has changed its face meanwhile. A move's waves 3,
// 5, 7 and 9 cheer a moment after their bunches hop off, each bigger than
// the last, and a level cleared cheers biggest.

import { CHEERS } from "../../effects/sounds";
import type { FeelTuning } from "../feel";
import { restingFace } from "../looks";
import { type Part, facing, facingAgain, moves } from "../part";
import type { Standing } from "../standing";
import { type WavePlay, stayingThrough } from "../wave_play";

/** The waves that cheer, in the order their cheers grow. */
const CHEERING: readonly number[] = Object.values(CHEERS);

/** How big the biggest cheer is, a level cleared's. */
export const BIGGEST_CHEER = CHEERING.length;

/** Returns how big a wave's cheer is, from 1, or null for a wave that doesn't cheer. */
export function cheerOf(wave: number): number | null {
  const index = CHEERING.indexOf(wave);
  return index < 0 ? null : index + 1;
}

/** Returns the parts of a wave's cheer, from a moment after its bunches hop off, by those still standing; none for a wave that doesn't cheer. */
export function waveCheerOf(play: WavePlay): readonly Part[] {
  const size = cheerOf(play.wave.number);
  return size === null
    ? []
    : cheered(
        size,
        play.hopsMs + play.feel.cheerAfterMs,
        stayingThrough(play),
        play.feel,
      );
}

/**
 * Returns the parts of a cheer of a size from a moment, every fuzzball
 * and the frizzball among the pieces standing hopping, but a caged one and
 * a sleepyhead.
 */
export function cheered(
  size: number,
  atMs: number,
  standing: readonly Standing[],
  feel: FeelTuning,
): readonly Part[] {
  return standing.flatMap(({ piece, at }): readonly Part[] => {
    if (
      piece.what === "brick" ||
      piece.what === "sleepyhead" ||
      (piece.what === "fuzzball" && piece.caged)
    ) {
      return [];
    }
    const hopsMs = atMs + (at.x + at.y) * feel.cheerSquareGapMs;
    return [
      facing(piece.id, atMs, "happy"),
      ...moves(piece.id, hopsMs, feel.cheerUpMs, "out", {
        scaleX: 1 - feel.cheerNarrow * size,
        scaleY: 1 + feel.cheerStretch * size,
      }),
      ...moves(piece.id, hopsMs + feel.cheerUpMs, feel.cheerDownMs, "spring", {
        scaleX: 1,
        scaleY: 1,
      }),
      facingAgain(
        piece.id,
        hopsMs + feel.cheerHappyMs,
        restingFace(piece),
        atMs,
      ),
    ];
  });
}
