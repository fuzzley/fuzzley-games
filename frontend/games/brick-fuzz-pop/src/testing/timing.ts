// What the `sim` specs share: how long a test may take, and how a list of
// times reads.

/** How long a `sim` test that can run past half a second alone may take, in milliseconds: `yarn test` runs it beside `dom`, `pure` and the other workspaces' tests, where 2 s alone has passed Vitest's 5 s. */
export const SIM_TIMEOUT_MS = 60_000;

/** Returns a share's value of numbers sorted from the least, as the nearest below. */
export function quantile(sorted: readonly number[], share: number): number {
  return sorted[Math.floor(share * (sorted.length - 1))]!;
}

/** Returns a list of times in milliseconds sorted from the least. */
export function sortedTimes(times: readonly number[]): number[] {
  return [...times].sort((a, b) => a - b);
}

/** Returns how a list of times in milliseconds reads in microseconds, at the median and the 99th percentile. */
export function described(times: readonly number[]): string {
  const sorted = sortedTimes(times);
  const micro = (ms: number): string => `${(ms * 1000).toFixed(2)} µs`;
  return `median ${micro(quantile(sorted, 0.5))}, p99 ${micro(quantile(sorted, 0.99))}`;
}
