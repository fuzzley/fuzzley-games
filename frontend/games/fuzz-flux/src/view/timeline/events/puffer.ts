// A puffer going off: it breathes in, cross, as everything near it leans
// in, then bursts with a white flash, two rings and its tufts, and the
// board shakes as everything left nearby is pushed back and springs home.

import { squareOf } from "../../../rules/board/cells";
import type { Blast } from "../../../rules/move/record";
import { blastShakePx } from "../../effects/shakes";
import type { FeelTuning } from "../feel";
import { RAISED } from "../looks";
import { type Part, facing, moves, sets, spawns, tuftsOf } from "../part";
import type { Reach } from "../reach";
import { type Standing, findStanding } from "../standing";
import type { Place } from "../timeline";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a puffer going off. */
export function pufferOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const at = squareOf(blast.square, play.grid.width);
  const far = feel.pufferReachSquares;
  const burstMs = reach.startMs + feel.pufferInMs;
  const others = othersOn(blast, play);
  const breathes: readonly Part[] =
    blast.piece === null
      ? []
      : [
          ...sets(blast.piece, reach.startMs, { raise: RAISED.goingOff }),
          facing(blast.piece, reach.startMs, "cross"),
          ...moves(blast.piece, reach.startMs, feel.pufferInMs, "in-out", {
            scaleX: feel.pufferShrink,
            scaleY: feel.pufferShrink,
          }),
          ...moves(blast.piece, burstMs, feel.pufferBurstMs, "out", {
            scaleX: feel.pufferBurstScale,
            scaleY: feel.pufferBurstScale,
            fade: 1,
            lift: 1,
          }),
          {
            what: "leaves",
            piece: blast.piece,
            atMs: burstMs + feel.pufferBurstMs,
          },
          ...others
            .filter((other) => distance(other.at, at) <= far)
            .flatMap((other) => leanIn(other, at, reach.startMs, feel)),
        ];
  return [
    ...breathes,
    spawns({
      what: "ring",
      atMs: burstMs,
      ms: feel.pufferRingSpreadMs,
      at,
      radius: far,
      ink: "white",
    }),
    spawns({
      what: "ring",
      atMs: burstMs + feel.pufferInkRingAfterMs,
      ms: feel.pufferRingSpreadMs,
      at,
      radius: far * feel.pufferInkRing,
      ink: blast.kind ?? "white",
    }),
    ...tuftsOf(blast.kind, burstMs, at, feel.pufferTufts, feel.pufferTuftPower),
    spawns({
      what: "flash",
      atMs: burstMs,
      ms: feel.flashMs,
      at,
      radius: far * feel.pufferFlashReach,
    }),
    spawns({
      what: "shake",
      atMs: burstMs,
      px: blastShakePx(blast.what, feel),
    }),
    ...others.flatMap((other) => pushedBack(other, at, far, burstMs, feel)),
  ];
}

/**
 * Returns each piece with eyes on the board as a blast goes off, but the
 * one on its square: its own, or the fuzzball under a special a wisp
 * carried there.
 */
function othersOn(blast: Blast, play: WavePlay): readonly Standing[] {
  return play.grid.squares.flatMap((_, square) => {
    const standing = findStanding(play.grid, square);
    return square === blast.square ||
      standing === null ||
      standing.piece.what === "brick"
      ? []
      : [standing];
  });
}

/** Returns the parts of a piece near a puffer leaning in as it breathes in, then springing back. */
function leanIn(
  { piece, at }: Standing,
  toward: Place,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const far = distance(at, toward);
  return [
    ...moves(piece.id, atMs, feel.pufferInMs, "in-out", {
      leanX: ((toward.x - at.x) / far) * feel.pufferLean,
      leanY: ((toward.y - at.y) / far) * feel.pufferLean,
    }),
    ...moves(
      piece.id,
      atMs + feel.pufferInMs,
      feel.pufferLeanBackMs,
      "spring",
      {
        leanX: 0,
        leanY: 0,
      },
    ),
  ];
}

/** Returns the parts of a piece pushed back by a puffer's burst, the less the further off, then springing home; none past its reach. */
function pushedBack(
  { piece, at }: Standing,
  from: Place,
  far: number,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const off = distance(at, from);
  const reach = far + feel.pufferPushReach;
  if (off > reach) {
    return [];
  }
  const push = feel.pufferPush * (1 - off / reach);
  return [
    ...moves(piece.id, atMs, feel.pufferPushMs, "out", {
      leanX: ((at.x - from.x) / off) * push,
      leanY: ((at.y - from.y) / off) * push,
    }),
    ...moves(
      piece.id,
      atMs + feel.pufferPushMs,
      feel.pufferPushBackMs,
      "spring",
      {
        leanX: 0,
        leanY: 0,
      },
    ),
  ];
}

/** Returns how far apart two places are, in squares. */
function distance(a: Place, b: Place): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
