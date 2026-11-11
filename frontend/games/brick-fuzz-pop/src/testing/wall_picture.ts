// A wall laid out from a picture, so a spec draws the wall it plays rather
// than building its bricks. The solver's and the careless player's specs
// lay their walls out with it too, so it is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import { isKeyOf } from "@fz/core/records";
import { isBrickKindId } from "../rules/catalog/bricks";
import { LEGEND, NO_BRICK, PORTAL_MARKS, tintOf } from "../rules/levels/legend";
import { COLUMNS } from "../rules/tuning";
import type { Brick, Wall } from "../rules/wall/wall";

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
 * Each brick is whole, and takes the tint `tintOf()` gives its cell, and a
 * portal the other of its pair as its twin, as a level's do. It throws for
 * a row not nine wide, a character no cataloged kind's brick stands for, or
 * a portal with no pair, so a spec plays the wall it draws.
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
  // The picture's characters by wall cell, its lowest row first.
  const characters = [...picture].reverse().join("");
  const bricks = twinsIn(characters).map((twin, cell) =>
    brickOf(characters.charAt(cell), tintOf(characters, cell), twin),
  );
  return { bricks, rows: picture.length, lowestRow };
}

/**
 * Returns each wall cell's twin, the cell of the other portal of its pair,
 * or null for a cell that holds no portal, from the characters of a wall's
 * picture by wall cell, its lowest row first, each mark of `PORTAL_MARKS`
 * a picture uses pairing its two cells, throwing for a mark used once or
 * more than twice.
 */
export function twinsIn(characters: string): (number | null)[] {
  const twins: (number | null)[] = Array.from(characters, () => null);
  for (const mark of PORTAL_MARKS) {
    const cells = Array.from(characters).flatMap((character, cell) =>
      character === mark ? [cell] : [],
    );
    if (cells.length === 0) {
      continue;
    }
    const [one, other] = cells;
    if (one === undefined || other === undefined || cells.length > 2) {
      throw new RangeError(
        `A wall's picture holds ${String(cells.length)} of the portal "${mark}", where a pair has 2.`,
      );
    }
    twins[one] = other;
    twins[other] = one;
  }
  return twins;
}

/**
 * Returns the whole brick a picture's character stands for, in a tint and
 * with a twin, or null for no brick, throwing for a character no cataloged
 * kind's brick stands for.
 */
function brickOf(
  character: string,
  tint: number,
  twin: number | null,
): Brick | null {
  if (character === NO_BRICK) {
    return null;
  }
  if (!isKeyOf(character, LEGEND)) {
    throw uncataloged(character);
  }
  const { kind, hits, plates } = LEGEND[character];
  if (!isBrickKindId(kind)) {
    throw uncataloged(character);
  }
  return {
    kind,
    hits,
    full: hits,
    plates,
    tint,
    twin,
  };
}

/** Returns the error for a picture's character that no cataloged kind's brick stands for. */
function uncataloged(character: string): RangeError {
  return new RangeError(
    `A wall's picture holds "${character}", no cataloged kind's brick.`,
  );
}
