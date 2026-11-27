// A bunch gathered in a wave: every fuzzball in it gathered but the one
// that stays to become what the bunch leaves, each special among them
// going off, that one too where it was already special, and then what lies
// beside the bunch struck.

import { neighborsOf } from "../board/cells";
import type { SetOff, Striking, Struck } from "../blasts/striking";
import type { Bunch } from "../move/record";
import type { FoundBunch } from "./find";

/** Describes a bunch a wave gathered: what the record writes of it, and the specials in it that went off. */
export interface GatheredBunch {
  readonly bunch: Bunch;
  /** Each special in it that went off, in the order of their squares. */
  readonly setOff: readonly SetOff[];
}

/**
 * Gathers a bunch on a wave's board, and returns its record and the
 * specials in it that went off.
 *
 * Each of its squares is taken in, by each element's rule, before its
 * fuzzball is gathered or made what the bunch leaves; where the one that
 * stays is already special, it is gathered and goes off with the rest,
 * and what the bunch leaves is made anew once the wave's blasts are done.
 * Then each square beside the bunch, by its squares' order and then right,
 * left, down and up, is struck once.
 */
export function gatherBunch(
  striking: Striking,
  { squares, kind, makes }: FoundBunch,
): GatheredBunch {
  let bunch: Bunch = { squares, kind, makes: null };
  const setOff: SetOff[] = [];
  for (const square of squares) {
    const struck = inBunch(square);
    striking.takeIn(square, struck);
    let goesOff: SetOff | null;
    if (square === makes?.square) {
      const left = striking.leave(square, makes.what, struck);
      bunch = { ...bunch, makes: { ...makes, piece: left.piece } };
      goesOff = left.setOff;
    } else {
      goesOff = striking.gather(square, struck);
    }
    if (goesOff !== null) {
      setOff.push(goesOff);
    }
  }
  const near = squares.flatMap((square) => neighborsOf(square, striking.size));
  const beside = near.filter((square, place) => near.indexOf(square) === place);
  for (const square of beside) {
    striking.strikeBeside(square, besideBunch(square));
  }
  return { bunch, setOff };
}

/** Returns where a hit on a square in a bunch came from. */
function inBunch(square: number): Struck {
  return { square, step: 0, blast: null };
}

/** Returns where a hit on a square beside a bunch came from. */
function besideBunch(square: number): Struck {
  return { square, step: 1, blast: null };
}
