import { type Showing, showing } from "../../rules/describe";
import type { FieldSize } from "../../rules/difficulty";
import type { Field } from "../../rules/field";

/** How long one square takes to land, showing how the game ended, in ms. */
export const LANDING_RUN_MS = 300;

/**
 * How much later a square lands for each step it lies further from the
 * square the game ended on, in ms.
 */
export const LANDING_STEP_MS = 80;

/**
 * The longest the landings take to reach the farthest square, in ms. On a
 * field too large for whole steps, the steps shrink to fit.
 */
export const LANDING_SPREAD_MS = 640;

/** How long the landings run, from the move that ends a game to the last, in ms. */
export const LANDING_MS = LANDING_SPREAD_MS + LANDING_RUN_MS;

/**
 * What the squares that land show: the mines and wrong flags a loss
 * uncovers, and the flags a win lays.
 */
const LANDS: ReadonlySet<Showing> = new Set(["mine", "wrong-flag", "flagged"]);

/**
 * Returns when each square that shows how the game ended lands, in ms after
 * the move that ended it, by the square's index: the later, the further it
 * lies from the square the move was made on.
 */
export function landings(
  field: Field,
  before: Field,
  at: number,
): ReadonlyMap<number, number> {
  const away = field.squares.flatMap((_, index) => {
    const shown = showing(field, index);
    return LANDS.has(shown) && shown !== showing(before, index)
      ? [[index, distance(field.size, at, index)] as const]
      : [];
  });
  const farthest = Math.max(1, ...away.map(([, steps]) => steps));
  const step = Math.min(LANDING_STEP_MS, LANDING_SPREAD_MS / farthest);
  return new Map(
    away.map(([index, steps]) => [index, Math.round(steps * step)]),
  );
}

/** Returns how many steps apart two squares are, a step reaching any of the eight around. */
function distance(size: FieldSize, a: number, b: number): number {
  const rows = Math.abs(Math.floor(a / size.cols) - Math.floor(b / size.cols));
  const cols = Math.abs((a % size.cols) - (b % size.cols));
  return Math.max(rows, cols);
}
