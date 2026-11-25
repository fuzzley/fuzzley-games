// What a wall game's slow specs share: how long a test may take, and what
// its benchmarks read of the times they take: the times sorted, a quantile
// of them, and how they read at the median and the 99th percentile.

/**
 * How long, in milliseconds, a `sim` test that can run past half a second
 * alone, or a `pure` search no batch can split, may take: the root runs four
 * workspaces' tests at once, where 2 s alone has passed Vitest's 5 s,
 * `yarn test:coverage` slows `pure` two or three times over, and lint,
 * typecheck and the builds may run beside them.
 */
export const SIM_TIMEOUT_MS = 60_000;

/** Returns times sorted from the least. */
export function sortedTimes(times: readonly number[]): number[] {
  return [...times].sort((a, b) => a - b);
}

/** Returns the value at a share of times sorted from the least, the nearest below. */
export function quantile(sorted: readonly number[], share: number): number {
  return sorted[Math.floor(share * (sorted.length - 1))] ?? Number.NaN;
}

/** Returns how a list of times in milliseconds reads in microseconds, at the median and the 99th percentile. */
export function described(times: readonly number[]): string {
  const sorted = sortedTimes(times);
  const micro = (ms: number): string => `${(ms * 1000).toFixed(2)} µs`;
  return `median ${micro(quantile(sorted, 0.5))}, p99 ${micro(quantile(sorted, 0.99))}`;
}
