/** Returns how much each of a list's numbers differs from the one before. */
export function stepsBetween(values: readonly number[]): number[] {
  return values.slice(1).map((value, at) => value - (values[at] ?? value));
}
