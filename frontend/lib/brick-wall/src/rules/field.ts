// The field every wall game plays on, the same in each: its columns, the
// depths it takes, the fuzzball that flies in it, where a level's first shot
// leaves from and how close in a flight contacts meet at one moment, lengths
// in field units, a unit a brick's side.

/** How many cells a row of the field holds. */
export const COLUMNS = 9;

/** The fewest rows a field holds, the floor's among them. */
export const LEAST_DEPTH = 11;

/** The most rows a field holds, the floor's among them. */
export const MOST_DEPTH = 22;

/** A fuzzball's radius, so it fits a gap one cell wide. */
export const RADIUS = 0.25;

/** The nearest a waiting fuzzball's middle comes to a side wall. */
export const SIDE_MARGIN = 0.5;

/** Where a level's first shot leaves from: the floor's middle. */
export const FIRST_X = 4.5;

/** How close in a flight contacts are met at one moment. */
export const AT_ONCE = 1e-9;

/** Every depth a field has, from {@link LEAST_DEPTH} rows to {@link MOST_DEPTH}. */
export const DEPTHS: readonly number[] = Array.from(
  { length: MOST_DEPTH - LEAST_DEPTH + 1 },
  (_, index) => LEAST_DEPTH + index,
);

/** Returns whether a value is a depth a field has: a whole number of rows from {@link LEAST_DEPTH} to {@link MOST_DEPTH}. */
export function isDepth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LEAST_DEPTH &&
    value <= MOST_DEPTH
  );
}
