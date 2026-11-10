/** How long the wall takes to come down a row after a round, in milliseconds. */
export const STEP_MS = 260;

/** How long the wall takes to jump, however many rows it comes down. */
export const JUMP_MS = 480;

/** How long a struck brick that holds takes to swell and settle. */
export const SWELL_MS = 200;

/** How long the shards of a broken brick fly. */
export const SHARDS_MS = 420;

/** How many shards a broken brick bursts into. */
export const SHARDS = 6;

/** How long a punch's streak takes to fade. */
export const STREAK_MS = 160;

/** How long a zap's bolt stays along the cells it reaches as it fades. */
export const BOLT_MS = 240;

/** How long a blast's ring takes to spread. */
export const RING_MS = 300;

/** How long a freed friend takes to hop out of its cage and down to the floor. */
export const HOP_MS = 600;

/** How long the jump line takes to flash and fade as the wall jumps: once, as flashing is safe. */
export const FLASH_MS = 300;

/** How long the waiting fuzzball takes to flare into its boon. */
export const FLARE_MS = 400;

/** How long a lost level's shake takes to die away. */
export const SHAKE_MS = 300;

/** How hard a lost level shakes the field, in CSS pixels. */
export const SHAKE_CSS_PX = 6;

/**
 * How long the Cleared card waits after the round that cleared the level,
 * so the last brick's shards are seen before the card covers them.
 */
export const CLEARED_MS = 700;

/**
 * How long the result card waits after a level is lost, so its shake dies
 * away and the brick that lost it is seen before the card covers it.
 */
export const LOST_MS = 800;

/**
 * How long the result card waits after a level is lost where motion is
 * unwelcome, so the brick that lost it, stepped down at once, is seen
 * before the card covers it.
 */
export const LOST_STILL_MS = 500;

/**
 * Returns how long the Cleared card waits after a level is cleared, for its
 * last shards to fly: none where motion is unwelcome, where there are none.
 */
export function clearedDelayMs(motion: boolean): number {
  return motion ? CLEARED_MS : 0;
}

/**
 * Returns how long the result card waits after a level is lost, for the
 * brick that lost it to be seen, and for its shake to die away where motion
 * is welcome.
 */
export function resultDelayMs(motion: boolean): number {
  return motion ? LOST_MS : LOST_STILL_MS;
}
