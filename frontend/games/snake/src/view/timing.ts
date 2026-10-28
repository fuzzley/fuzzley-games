/** How long a new apple takes to pop up, in milliseconds. */
export const POP_MS = 180;

/** How long the camera shakes on a crash. */
export const SHAKE_MS = 180;

/** How hard it shakes, as a share of the canvas. */
export const SHAKE_INTENSITY = 0.008;

/** How long a crashed snake takes to fade. */
export const FADE_MS = 600;

/** How long the crumbs of an apple eaten last. */
export const CRUMBS_MS = 420;

/** How many crumbs an apple eaten scatters. */
export const CRUMBS = 10;

/**
 * Returns how long the result card waits after a run ends, for the crash's
 * fade to run: none where motion is unwelcome, where the fade is at once.
 */
export function resultDelayMs(motion: boolean): number {
  return motion ? FADE_MS : 0;
}
