// What a bunch leaves behind, and where, by the design's table: the
// frizzball for 5 or more in a line, a puffer for lines across and down, a
// dasher for 4 in a line and a wisp for a square of 4, each before the next
// where a bunch could make two. A bunch a swap made leaves it where the
// swap moved a fuzzball to; one a fall made, where its shape says.

import { itemAt } from "@fz/core/records";
import type { Making, Swap } from "../move/record";

/** Describes what a bunch is made of, each list in the order the board is read. */
export interface BunchShape {
  /** Every square of it, in the order of their indices. */
  readonly squares: readonly number[];
  /** Its lines of 3 or more across, row by row, each from the left. */
  readonly across: readonly (readonly number[])[];
  /** Its lines of 3 or more down, column by column, each from the top. */
  readonly down: readonly (readonly number[])[];
  /** Its squares of 4, row by row, each its top left, top right, bottom left and bottom right. */
  readonly squaresOfFour: readonly (readonly number[])[];
}

/** What a bunch can leave, before a dasher is given its way. */
type Made = "frizzball" | "puffer" | "dasher" | "wisp";

/** The shortest line that leaves the frizzball. */
const FRIZZBALL_LINE = 5;

/** The line that leaves a dasher. */
const DASHER_LINE = 4;

/** Where a square of 4 leaves its wisp after a fall, by its place in the square: its bottom left. */
const WISP_CORNER = 2;

/**
 * Returns what a bunch leaves behind and where, or null for 3 in a line,
 * which leaves nothing.
 *
 * @param swap The swap that made the bunch, its fuzzballs already traded,
 *   or null for a bunch a fall made.
 */
export function makingOf(
  bunch: BunchShape,
  swap: Pick<Swap, "from" | "to"> | null,
): Omit<Making, "piece"> | null {
  const made = madeBy(bunch);
  if (made === null) {
    return null;
  }
  const swapped = swap === null ? null : swappedInto(bunch, swap);
  const square = swapped ?? restingPlace(bunch, made);
  if (made !== "dasher") {
    return { what: made, square };
  }
  // A dasher runs the way it was last moving: along a swap across, or down
  // a swap down or a fall.
  const across =
    swap !== null && swapped !== null && Math.abs(swap.to - swap.from) === 1;
  return { what: across ? "dasher-across" : "dasher-down", square };
}

/** Returns what a bunch leaves by the design's table and its order, or null for one that leaves nothing. */
function madeBy(bunch: BunchShape): Made | null {
  const longest = longestLine(bunch).length;
  if (longest >= FRIZZBALL_LINE) {
    return "frizzball";
  }
  if (bunch.across.length > 0 && bunch.down.length > 0) {
    return "puffer";
  }
  if (longest === DASHER_LINE) {
    return "dasher";
  }
  return bunch.squaresOfFour.length > 0 ? "wisp" : null;
}

/**
 * Returns the square of a bunch a swap moved a fuzzball into, the one
 * picked up's before its neighbor's, or null for a bunch the swap moved
 * none into.
 */
function swappedInto(
  { squares }: BunchShape,
  swap: Pick<Swap, "from" | "to">,
): number | null {
  if (squares.includes(swap.to)) {
    return swap.to;
  }
  return squares.includes(swap.from) ? swap.from : null;
}

/**
 * Returns where a bunch a fall made leaves what it makes: a puffer at the
 * first square where a line down crosses one across, a wisp at its first
 * square of 4's bottom left, and the frizzball or a dasher in its first
 * longest line, across at its middle, the left of two, and down at its
 * bottom.
 */
function restingPlace(bunch: BunchShape, made: Made): number {
  const { across, down, squaresOfFour } = bunch;
  if (made === "puffer") {
    const crossings = down
      .flat()
      .filter((square) => across.some((line) => line.includes(square)));
    return itemAt(crossings, 0);
  }
  if (made === "wisp") {
    return itemAt(itemAt(squaresOfFour, 0), WISP_CORNER);
  }
  const line = longestLine(bunch);
  return across.includes(line)
    ? itemAt(line, Math.floor((line.length - 1) / 2))
    : itemAt(line, line.length - 1);
}

/** Returns a bunch's first longest line, its lines across before its lines down, or no squares for a bunch of squares of 4 alone. */
function longestLine({ across, down }: BunchShape): readonly number[] {
  const lines = [...across, ...down];
  const longest = Math.max(0, ...lines.map(({ length }) => length));
  return lines.find(({ length }) => length === longest) ?? [];
}
