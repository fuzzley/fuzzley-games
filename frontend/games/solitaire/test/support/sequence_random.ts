/**
 * Returns a deterministic stand-in for Math.random that yields the provided
 * values in order. Lets tests drive shuffles and other randomized logic
 * without spying on the global Math.random.
 */
export function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index++;
    return value;
  };
}
