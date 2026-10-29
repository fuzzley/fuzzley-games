/** How long a row of bricks takes to drop into place as a level starts, in milliseconds. */
export const DROP_IN_MS = 360;

/** How long each row waits after the one above it before it drops in. */
export const DROP_IN_STAGGER_MS = 45;

/** How long a regrowing brick takes to grow back. */
export const REGROW_MS = 500;

/** How long the shards of a broken brick fly. */
export const SHARDS_MS = 420;

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

/** How long the shards of the last brick broken fly before the Cleared card shows. */
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
