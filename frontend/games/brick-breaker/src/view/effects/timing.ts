/**
 * How long a level's bricks take to drop in as it starts, a column after a
 * column, from the first column's start to the last's landing, in
 * milliseconds.
 */
export const DROP_IN_MS = 400;

/** How long a brick that holds a hit takes to swell and settle. */
export const POP_MS = 120;

/** How long a ball's squash and the pad's dip last as the two meet. */
export const MEET_MS = 90;

/** How long a fire ball's embers last, short enough that its trail keeps close behind it. */
export const EMBERS_MS = 60;

/** How long a regrowing brick takes to grow back. */
export const REGROW_MS = 500;

/** How long the shards of a broken brick fly, fading and dimming as they fall. */
export const SHARDS_MS = 350;

/** How many shards a broken brick scatters. */
export const SHARDS = 6;

/** How long a blast's ring takes to spread. */
export const RING_MS = 300;

/** How long the camera shakes on a blast or a lost ball. */
export const SHAKE_MS = 160;

/** How hard it shakes, as a share of the canvas. */
export const SHAKE_INTENSITY = 0.006;

/** How long a lost ball takes to fade. */
export const FADE_MS = 600;

/**
 * How long the paddle stands empty once the last ball is lost, before the
 * next is served on it, so the loss is seen with motion or without.
 */
export const SERVE_MS = 1000;

/** How long the Cleared card waits after the last brick breaks, so the break is seen before the card covers it. */
export const CLEARED_MS = 700;

/**
 * How long the last bricks a level needs wait unbroken before they glow,
 * so the player knows where to aim.
 */
export const GLOW_AFTER_MS = 15_000;

/** How few bricks a level needs before they may glow. */
export const GLOW_BRICKS = 3;

/** How long one pulse of the last bricks' glow lasts. */
export const GLOW_PULSE_MS = 1200;

/**
 * Returns how long the Cleared card waits after a level is cleared, for its
 * last shards to fly: none where motion is unwelcome, where there are none.
 */
export function clearedDelayMs(motion: boolean): number {
  return motion ? CLEARED_MS : 0;
}

/**
 * Returns how long the result card waits after a run ends, for the last
 * ball's fade to run: none where motion is unwelcome, where the fade is at
 * once.
 */
export function resultDelayMs(motion: boolean): number {
  return motion ? FADE_MS : 0;
}

/** How long a streak's step plays: the ring about its ball and the count beside it. */
export const STREAK_MS = 300;

/**
 * How long the last brick's hit holds as its level clears, the flourishes
 * the scene times and the shards standing still, before the clear's chord
 * plays; the camera's shake and a fire ball's embers, which Phaser times,
 * run on.
 */
export const HOLD_MS = 120;
