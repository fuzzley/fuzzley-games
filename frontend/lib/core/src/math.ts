/** Returns a number kept between a least and a most, which it may equal. */
export function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}

/**
 * Returns the number a share of the way from one number to another: the first at 0, the second
 * at 1 but for rounding, and past either for a share outside 0 to 1.
 */
export function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/**
 * Returns how far through its time something is, from 0 as it starts to 1 once it is over, from
 * when it started, the time now and how long it lasts, all in one unit.
 */
export function shareDone(
  startedAt: number,
  now: number,
  duration: number,
): number {
  return clamp((now - startedAt) / duration, 0, 1);
}

/**
 * Returns how far something that eases out has gone, a share through its time: fast, then
 * slowing.
 */
export function easeOutCubic(done: number): number {
  return 1 - (1 - done) ** 3;
}

/**
 * Returns how opaque a fading thing is, a share through its fade: whole as it starts, gone at its
 * end.
 */
export function fadeAlpha(done: number): number {
  return 1 - done;
}

/**
 * Returns the first mark past a score, of the marks at `first` and every `every` after it, as the
 * score a game's next life comes at.
 */
export function nextMarkAfter(
  score: number,
  first: number,
  every: number,
): number {
  if (score < first) return first;
  const passed = Math.floor((score - first) / every) + 1;
  return first + passed * every;
}

/** Describes a step of a ladder of multipliers: the count it starts from, and how many times it scores. */
export interface MultiplierTier {
  readonly from: number;
  readonly times: number;
}

/**
 * Returns how many times a count scores on a ladder of multipliers, listed
 * from the highest: the first tier's it reaches, or once below them all, as
 * a breaker's streak or chain scores.
 */
export function multiplierAt(
  count: number,
  tiers: readonly MultiplierTier[],
): number {
  for (const { from, times } of tiers) {
    if (count >= from) return times;
  }
  return 1;
}
