/**
 * Describes how the phone buzzes, as `navigator.vibrate()` takes it: in
 * milliseconds, buzzing and still by turns.
 */
export type Buzz = readonly number[];

/** How the phone buzzes as a ship is lost: once, firmly. */
export const LOST_BUZZ: Buzz = [80];

/** How the phone buzzes as a wave is cleared: twice, lightly, a moment apart. */
export const CLEARED_BUZZ: Buzz = [30, 60, 30];
