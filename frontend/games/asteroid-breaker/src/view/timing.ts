/** How long a broken rock's shards fly before they fade, in milliseconds. */
export const SHARDS_MS = 500;

/** The fewest shards a broken rock scatters. */
export const LEAST_SHARDS = 4;

/** The most shards a broken rock scatters. */
export const MOST_SHARDS = 7;

/** How long a rock that holds a hit flashes light. */
export const FLASH_MS = 60;

/** How far the field kicks away from the shot as a large rock breaks, in CSS pixels. */
export const KICK_CSS_PX = 2;

/** How long the field takes to settle from a kick. */
export const KICK_MS = 100;

/** How far a rock's points rise as they fade, in field units. */
export const POINTS_RISE = 1;

/** How long a rock's points take to rise and fade. */
export const POINTS_MS = 600;

/** How hard the field shakes as a ship is lost, in CSS pixels. */
export const SHAKE_CSS_PX = 6;

/** How long the shake takes to die away. */
export const SHAKE_MS = 300;

/** How long the field holds still as a ship is lost, before it shakes. */
export const SHAKE_DELAY_MS = 80;

/** How many fading outlines of the ship a dash leaves along its path. */
export const DASH_TRAIL = 3;

/** How long the Cleared card waits after the last rock goes, so its shards are seen before the card covers them. */
export const CLEARED_MS = 800;

/**
 * Returns how long the Cleared card waits after a wave is cleared, for its
 * last shards to fly: none where motion is unwelcome, where there are none.
 */
export function clearedDelayMs(motion: boolean): number {
  return motion ? CLEARED_MS : 0;
}

/**
 * Returns how long the result card waits after a run ends, for the last
 * ship's burst to fly and its shake to die away: none where motion is
 * unwelcome, where neither happens.
 */
export function resultDelayMs(motion: boolean): number {
  return motion ? Math.max(SHARDS_MS, SHAKE_DELAY_MS + SHAKE_MS) : 0;
}
