/**
 * Returns a stand-in for Math.random that yields the given values in order,
 * then zeros.
 */
export function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index++;
    return value;
  };
}
