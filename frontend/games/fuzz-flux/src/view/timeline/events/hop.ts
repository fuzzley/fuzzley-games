// A fuzzball hopping off the board as it is gathered: it swells, its fur
// on end and its eyes happy, fades as it goes, and leaves tufts and a
// thin ring behind.

import type { KindId } from "../../../rules/catalog/kinds";
import { FRAMES } from "../../art/frame_names";
import type { FeelTuning } from "../feel";
import { RAISED } from "../looks";
import { type Part, facing, moves, sets, spawns } from "../part";
import type { Standing } from "../standing";

/**
 * Returns the parts of a fuzzball hopping off from a moment, its tufts more
 * and flying harder the more waves of its move came before its own.
 *
 * @param kind The kind it is gathered as, or null for the frizzball, which
 *   leaves no tufts, there being none of its fur.
 */
export function hopOff(
  { piece, at }: Standing,
  kind: KindId | null,
  atMs: number,
  before: number,
  feel: FeelTuning,
): readonly Part[] {
  const fadeMs = atMs + feel.hopMs * feel.hopFadeFrom;
  const fadeLengthMs = feel.hopMs * feel.hopFadeLength;
  return [
    facing(piece.id, atMs, "happy"),
    ...sets(piece.id, atMs, { raise: RAISED.moving }),
    ...moves(piece.id, atMs, feel.hopMs, "out", {
      scaleX: feel.hopScale,
      scaleY: feel.hopScale,
      lift: 1,
    }),
    ...moves(piece.id, fadeMs, fadeLengthMs, "in", { fade: 1 }),
    ...(kind === null
      ? []
      : [
          spawns({
            what: "fluff",
            atMs,
            at,
            tuft: FRAMES.tuft(kind),
            count: feel.bunchTufts + Math.min(feel.mostWaveTufts, before),
            power: 1 + before * feel.tuftPowerPerWave,
          }),
        ]),
    spawns({
      what: "ring",
      atMs,
      ms: feel.hopRingMs,
      at,
      radius: feel.hopRingSquares,
      ink: kind ?? "frizzball",
    }),
    { what: "leaves", piece: piece.id, atMs: fadeMs + fadeLengthMs },
  ];
}
