// A cage opened, to its sound, as the cages' goal counts it: it bursts
// into hard bits, each a bar, that fly up and apart from across its
// square, spinning outward, then fall and fade. A blast opens a cage and
// leaves its fuzzball, which stretches up happy, springs back and yips; a
// bunch opens the cage of each fuzzball it takes in a moment before that
// one goes, hopping off, running into the special the bunch makes or
// staying to become it. Less motion plays it as it is, as the sketch does:
// the bars are hard bits, not the fluff it cuts, and the stretch is no hop
// of the whole board.

import { hashShareOf } from "@fz/core/random";
import type { Fuzzball } from "../../../rules/catalog/pieces";
import { isCaged } from "../../../rules/elements/cage";
import { FRAMES } from "../../art/frame_names";
import type { GridShown } from "../../run_state";
import type { FeelTuning } from "../feel";
import type { HitOf } from "../hits";
import { lookAt, restingFace } from "../looks";
import { type Part, cue, facing, facingAgain, moves } from "../part";
import { type Standing, standingOn } from "../standing";
import { thrownKeys } from "../thrown";
import type { SpriteTrack } from "../timeline";
import type { WavePlay } from "../wave_play";

/** Describes a caged fuzzball where it stands. */
interface Caged extends Standing {
  readonly piece: Fuzzball;
}

/**
 * Returns the parts of a cage a blast opens, as its hit lands: the cage
 * bursting, and its fuzzball let out, happy, stretching up and springing
 * back as it yips, then resting its eyes.
 *
 * @throws {RangeError} for a hit on a square with no caged fuzzball.
 */
export function uncaged(
  hit: HitOf<"uncaged">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const caged = cagedOn(play.grid, hit.square);
  const { id } = caged.piece;
  return [
    ...opened(caged, atMs, feel),
    cue("yip", atMs + feel.yipAfterMs),
    facing(id, atMs, "happy"),
    ...moves(id, atMs, feel.freedUpMs, "out", {
      scaleX: feel.freedNarrow,
      scaleY: feel.freedStretch,
    }),
    ...moves(id, atMs + feel.freedUpMs, feel.freedDownMs, "spring", {
      scaleX: 1,
      scaleY: 1,
    }),
    facingAgain(
      id,
      atMs + feel.freedHappyMs,
      restingFace(freedOf(caged.piece)),
      atMs,
    ),
  ];
}

/**
 * Returns the parts of the cage of a fuzzball a bunch takes in, opened a
 * moment before `goesMs`, when the fuzzball goes: as it hops off the
 * board or runs into the special the bunch makes, or, for the one that
 * stays to become that special, as the rest run into it. A piece with no
 * cage has none.
 */
export function openedInBunch(
  standing: Standing,
  goesMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const { piece, at } = standing;
  return isCaged(piece)
    ? opened({ piece, at }, goesMs - feel.hopShedLeadMs, feel)
    : [];
}

/**
 * Returns the parts of a cage opened at a moment: its sound, its fuzzball
 * drawn free of it, the cages' goal counting it, and its bits flying.
 */
function opened(caged: Caged, atMs: number, feel: FeelTuning): readonly Part[] {
  const { id } = caged.piece;
  return [
    cue("cage", atMs),
    { what: "becomes", piece: id, atMs, drawn: freedOf(caged.piece) },
    { what: "counted", atMs, counts: { what: "cage" } },
    ...bitsOf(caged, atMs, feel).map((sprite): Part => ({
      what: "sprite",
      sprite,
    })),
  ];
}

/**
 * Returns the bits a cage bursts into at a moment, set out across its
 * square, each thrown up and aside, faster the farther from the middle it
 * sets out, and spinning outward as it flies.
 */
function bitsOf(
  { piece, at }: Caged,
  atMs: number,
  feel: FeelTuning,
): readonly SpriteTrack[] {
  const ms = feel.cageBitMs;
  const seconds = ms / 1000;
  const middle = (feel.cageBits - 1) / 2;
  return Array.from({ length: feel.cageBits }, (_, bit) => {
    const out = bit - middle;
    const from = { x: at.x + out * feel.cageBitGapSquares, y: at.y };
    const rise =
      feel.cageBitRise +
      hashShareOf(piece.id, bit, 0, 0) * feel.cageBitRiseSpread;
    return {
      drawn: { what: "frame", frame: FRAMES.cageBar },
      fromMs: atMs,
      untilMs: atMs + ms,
      look: lookAt(from),
      keys: {
        ...thrownKeys(
          { from, aside: out * feel.cageBitAside, rise, atMs, ms },
          feel,
        ),
        rotation: [
          { atMs, ms, to: out * feel.cageBitSpin * seconds, easing: "linear" },
        ],
      },
    };
  });
}

/**
 * Returns the caged fuzzball standing on a square of a board, which must
 * hold one.
 *
 * @throws {RangeError} for a square with none.
 */
function cagedOn(grid: GridShown, square: number): Caged {
  const { piece, at } = standingOn(grid, square);
  if (!isCaged(piece)) {
    throw new RangeError(
      `No caged fuzzball stands on square ${String(square)}.`,
    );
  }
  return { piece, at };
}

/** Returns a fuzzball let out of its cage. */
function freedOf(fuzzball: Fuzzball): Fuzzball {
  return { ...fuzzball, caged: false };
}
