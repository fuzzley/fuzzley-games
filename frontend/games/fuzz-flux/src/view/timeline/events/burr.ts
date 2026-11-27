// A burr coming off and a burr spreading. A bunch beside a burr or a blast
// brushes it off to its sound, in a puff of its tufts, its fuzzball happy
// for a while; a fuzzball of a bunch sheds its burr in a smaller puff a
// moment before it hops off. After a move that brushed none off, a burr
// hops across from a burred fuzzball at half its size, bending a little
// aside, and the fuzzball it lands on wears it, looking cross, squashing
// and springing back. With Less motion they play the same, the draft
// dropping three quarters of every fluff; the hop across stays, as it is a
// move of the game.

import { squareOf } from "../../../rules/board/cells";
import type { BurrSpread } from "../../../rules/move/record";
import { FRAMES } from "../../art/frame_names";
import type { AfterPlay } from "../after_waves";
import { afterSpread } from "../board_after";
import { curveKeys } from "../curve";
import type { FeelTuning } from "../feel";
import type { HitOf } from "../hits";
import { RAISED, lookAt } from "../looks";
import { type Part, cue, facing, facingAgain, moves, spawns } from "../part";
import { type Standing, standingOn } from "../standing";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a burred fuzzball's burr coming off at a moment, in a puff of so many of its tufts, or none for any other piece. */
function comesOff(
  { piece, at }: Standing,
  atMs: number,
  tufts: number,
  feel: FeelTuning,
): readonly Part[] {
  return piece.what === "fuzzball" && piece.burred
    ? [
        {
          what: "becomes",
          piece: piece.id,
          atMs,
          drawn: { ...piece, burred: false },
        },
        spawns({
          what: "fluff",
          atMs,
          at,
          tuft: FRAMES.burrTuft,
          count: tufts,
          power: feel.tuftPower,
        }),
      ]
    : [];
}

/** Returns the parts of a burr a bunch beside it or a blast brushes off as the hit lands, to its sound, its fuzzball happy a while. */
export function brushedOff(
  hit: HitOf<"unburred">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const standing = standingOn(play.grid, hit.square);
  const { id } = standing.piece;
  return [
    cue("burr-off", atMs),
    ...comesOff(standing, atMs, feel.burrOffTufts, feel),
    facing(id, atMs, "happy"),
    facingAgain(id, atMs + feel.burrOffHappyMs, "rest", atMs),
  ];
}

/** Returns the parts of a fuzzball of a bunch shedding its burr before it hops off at a moment, or none for one with no burr. */
export function shedBeforeHop(
  standing: Standing,
  hopMs: number,
  feel: FeelTuning,
): readonly Part[] {
  return comesOff(
    standing,
    hopMs - feel.hopShedLeadMs,
    feel.burrInBunchTufts,
    feel,
  );
}

/**
 * Returns the parts of a burr spreading after a move: it hops across from
 * the burred fuzzball to the one it spreads to, which wears it as it lands,
 * cross, squashing and springing back, the board held until it may go on.
 *
 * @throws {RangeError} for a spread to a square where no fuzzball stands.
 */
export function burrSpreads(
  spread: BurrSpread,
  play: AfterPlay,
): readonly Part[] {
  const { atMs, feel, grid } = play;
  const from = squareOf(spread.from, grid.width);
  const { piece, at } = standingOn(afterSpread(grid, spread), spread.to);
  const landsMs = atMs + feel.burrSpreadMs;
  return [
    {
      what: "sprite",
      sprite: {
        drawn: { what: "frame", frame: FRAMES.burr },
        fromMs: atMs,
        untilMs: landsMs,
        look: {
          ...lookAt(from),
          scaleX: feel.burrSpreadScale,
          scaleY: feel.burrSpreadScale,
          raise: RAISED.top,
        },
        keys: curveKeys(
          from,
          at,
          feel.burrSpreadBendSquares,
          atMs,
          feel.burrSpreadMs,
          feel,
        ),
      },
    },
    { what: "becomes", piece: piece.id, atMs: landsMs, drawn: piece },
    facing(piece.id, landsMs, "cross"),
    ...moves(piece.id, landsMs, feel.burrLandSquashMs, "out", {
      scaleX: feel.burrLandScale,
      scaleY: feel.burrLandScale,
    }),
    ...moves(
      piece.id,
      landsMs + feel.burrLandSquashMs,
      feel.burrLandBackMs,
      "spring",
      { scaleX: 1, scaleY: 1 },
    ),
    { what: "hold", atMs: atMs + feel.burrSpreadHoldMs },
  ];
}
