/**
 * The most times a second a cue may blink, since a flash more often than
 * three times a second can bring on a seizure.
 */
export const MOST_BLINKS_A_SECOND = 3;

/**
 * Returns whether a wall game's blinking cue, such as a warning on its
 * field, shows a time into its blinking: for the first half of each period,
 * so it shows as it starts. It throws a `RangeError` for a period that
 * would blink it more than {@link MOST_BLINKS_A_SECOND} times a second.
 */
export function blinkShows(elapsedMs: number, periodMs: number): boolean {
  // Asked this way round, so a period that is NaN is refused too.
  if (!(periodMs * MOST_BLINKS_A_SECOND >= 1000)) {
    throw new RangeError(
      `A cue blinks ${String(MOST_BLINKS_A_SECOND)} times a second at the most, over a period of 1000 / ${String(MOST_BLINKS_A_SECOND)} ms or more, not ${String(periodMs)} ms.`,
    );
  }
  return elapsedMs % periodMs < periodMs / 2;
}
