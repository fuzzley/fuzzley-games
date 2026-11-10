// A wall laid out from a picture, so a spec draws the wall it plays rather
// than building its bricks. The solver's and the careless player's specs
// lay their walls out with it too, so it is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import { isKeyOf } from "@fz/core/records";
import { isBrickKindId } from "../rules/catalog/bricks";
import { LEGEND, NO_BRICK } from "../rules/levels/legend";
import { COLUMNS } from "../rules/tuning";
import type { Brick, Wall } from "../rules/wall/wall";

/** How many tints the rows of a wall take in turn. */
const TINTS = 8;

/** Says where a pictured wall stands, where a spec cares. */
export interface PictureOptions {
  /** The field row the picture's lowest row stands in: 1 by default, the lowest a brick stands in, over the floor's. */
  readonly lowestRow?: number;
}

/**
 * Returns a wall laid out from a picture, a row of nine characters for each
 * of its rows from the top, in the legend's characters
 * (`src/rules/levels/legend.ts`), `.` for no brick.
 *
 * Each brick is whole. A plain or tough brick takes its row's tint, the rows
 * counted from the wall's lowest, and any other kind tint 0. It throws for a
 * row not nine wide, or a character no cataloged kind's brick stands for,
 * so a spec plays the wall it draws.
 */
export function wallFrom(
  picture: readonly string[],
  { lowestRow = 1 }: PictureOptions = {},
): Wall {
  const wrong = picture.find((line) => line.length !== COLUMNS);
  if (wrong !== undefined) {
    throw new RangeError(
      `A wall's picture is ${String(COLUMNS)} characters wide a row, not "${wrong}".`,
    );
  }
  const bricks = [...picture]
    .reverse()
    .flatMap((line, wallRow) =>
      Array.from({ length: COLUMNS }, (_, column) =>
        brickOf(line.charAt(column), wallRow),
      ),
    );
  return { bricks, rows: picture.length, lowestRow };
}

/**
 * Returns the whole brick a character of the legend stands for in a wall
 * row, or null for no brick, throwing for a character whose kind the
 * catalog doesn't hold.
 */
function brickOf(character: string, wallRow: number): Brick | null {
  if (character === NO_BRICK) {
    return null;
  }
  const entry = isKeyOf(character, LEGEND) ? LEGEND[character] : null;
  if (entry === null || !isBrickKindId(entry.kind)) {
    throw new RangeError(
      `A wall's picture holds "${character}", no cataloged kind's brick.`,
    );
  }
  const { kind, hits, plates } = entry;
  const rowTint = kind === "brick" || kind === "tough";
  return {
    kind,
    hits,
    full: hits,
    plates,
    tint: rowTint ? wallRow % TINTS : 0,
    twin: null,
  };
}
