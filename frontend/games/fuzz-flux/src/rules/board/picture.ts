// A level's board as its pictures lay it out: what each letter puts on its
// square, the dust's layers and the beds. The deal fills the squares it
// leaves to any kind, and places the level's specials.

import { isKeyOf } from "@fz/core/records";
import type { DustLayers } from "../catalog/elements";
import { squareOf } from "./cells";
import { DUST_LEGEND, LEGEND, type Placed } from "./legend";

/** Describes a board as a level's pictures lay it out, each of its lists by square. */
export interface LaidOut {
  readonly width: number;
  readonly height: number;
  /** What each square's letter puts on it. */
  readonly placed: readonly Placed[];
  readonly dust: readonly DustLayers[];
  /** Whether each square is a bed: where the board holds a sleepyhead, the lowest open square of each column. */
  readonly beds: readonly boolean[];
}

/**
 * Returns a board as a level's pictures lay it out, the dust's picture
 * null for a level with none.
 *
 * @throws {Error} for pictures `readPictures()` finds wrong.
 */
export function layOut(
  board: readonly string[],
  dust: readonly string[] | null,
): LaidOut {
  const read = readPictures(board, dust);
  if (typeof read === "string") {
    throw new Error(`The pictures don't lay a board out: ${read}.`);
  }
  return read;
}

/**
 * Returns a board as a level's pictures lay it out, its board's and its
 * dust's, or what is wrong with them where they lay none out: every row
 * as long as the first, each letter the legend's, and the dust, where the
 * level has any, of the board's shape, in the dust's digits, and on no gap.
 */
export function readPictures(
  board: readonly string[],
  dust: readonly string[] | null,
): LaidOut | string {
  const width = board[0]?.length ?? 0;
  if (width === 0) {
    return "its board has no squares";
  }
  const placed = readRows(board, width, "board", (letter) =>
    isKeyOf(letter, LEGEND) ? LEGEND[letter] : null,
  );
  if (typeof placed === "string") {
    return placed;
  }
  const layers = readDust(dust, placed, width);
  if (typeof layers === "string") {
    return layers;
  }
  return {
    width,
    height: board.length,
    placed,
    dust: layers,
    beds: bedsOf(placed, width),
  };
}

/** Returns the dust's layers by square, none where a level has no dust, or what is wrong with its picture. */
function readDust(
  dust: readonly string[] | null,
  placed: readonly Placed[],
  width: number,
): DustLayers[] | string {
  if (dust === null) {
    return placed.map(() => 0);
  }
  const height = placed.length / width;
  if (dust.length !== height) {
    return `its dust has ${String(dust.length)} rows, and its board ${String(height)}`;
  }
  const layers = readRows(dust, width, "dust", (digit) =>
    isKeyOf(digit, DUST_LEGEND) ? DUST_LEGEND[digit] : null,
  );
  if (typeof layers === "string") {
    return layers;
  }
  const onGap = layers.findIndex(
    (layer, square) => layer > 0 && placed[square]?.what === "gap",
  );
  return onGap < 0
    ? layers
    : `its dust lies on a gap ${squareWords(onGap, width)}`;
}

/**
 * Returns what each letter of a picture's rows reads as, by square, or what
 * is wrong with them: a row of another length than the board's, or a
 * letter that reads as nothing.
 */
function readRows<T>(
  rows: readonly string[],
  width: number,
  picture: string,
  read: (letter: string) => T | null,
): T[] | string {
  const squares: T[] = [];
  for (const [y, row] of rows.entries()) {
    if (row.length !== width) {
      return `row ${String(y + 1)} of its ${picture} is ${String(row.length)} squares long, and its first ${String(width)}`;
    }
    for (const [x, letter] of Array.from(row).entries()) {
      const square = read(letter);
      if (square === null) {
        return `its ${picture} has a "${letter}", which no level draws in, ${squareWords(y * width + x, width)}`;
      }
      squares.push(square);
    }
  }
  return squares;
}

/** Returns the beds of a board laid out: none without a sleepyhead, else the lowest open square of each column. */
function bedsOf(placed: readonly Placed[], width: number): boolean[] {
  const beds = placed.map(() => false);
  if (!placed.some(({ what }) => what === "sleepyhead")) {
    return beds;
  }
  for (let x = 0; x < width; x++) {
    let square = placed.length - width + x;
    while (square >= 0 && placed[square]?.what === "gap") {
      square -= width;
    }
    if (square >= 0) {
      beds[square] = true;
    }
  }
  return beds;
}

/** Returns where a square is, in words: its column and its row, each from 1. */
function squareWords(square: number, width: number): string {
  const { x, y } = squareOf(square, width);
  return `at column ${String(x + 1)}, row ${String(y + 1)}`;
}
