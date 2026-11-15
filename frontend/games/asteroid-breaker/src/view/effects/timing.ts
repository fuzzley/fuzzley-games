/** How long a rock's break lasts, from its flash to the last of its pieces gone, in milliseconds. */
export const BREAK_MS = 450;

/** How long a held hit's spark lasts, in milliseconds, as long as the hit's row in `plan.md`'s table. */
export const HELD_MS = 150;

/**
 * How long the muzzle's flash shows as a shot leaves, in milliseconds: its
 * two beats, a frame each at 60 frames a second.
 */
export const MUZZLE_MS = 33;

/** How long a lost pod's burst of shards flies before it fades, in milliseconds. */
export const BURST_MS = 500;

/** How many shards a lost pod bursts into. */
export const BURST_SHARDS = 12;

/** How long a rock that holds a hit flashes light. */
export const FLASH_MS = 60;

/**
 * How long after a flash the field flashes again at the soonest, so it
 * flashes under three times a second, as flashing is safe, however fast
 * the hits come; a hit held sooner sparks alone.
 */
export const FLASH_GAP_MS = 340;

/**
 * How long a blast's, a spent Shield's or a lost ship's ring takes to sweep
 * out to its reach and fade.
 */
export const RING_MS = 300;

/** How far the field kicks away from the shot as a large rock breaks, in CSS pixels. */
export const KICK_CSS_PX = 2;

/** How long the field takes to settle from a kick. */
export const KICK_MS = 100;

/** How far a rock's points rise as they fade, in field units. */
export const POINTS_RISE = 1;

/** How long a rock's points take to rise and fade. */
export const POINTS_MS = 600;

/** How hard the field shakes along a blow, in CSS pixels. */
export const SHAKE_CSS_PX = 6;

/**
 * How long after its blow the field is still again from a shake, in
 * milliseconds, the time it holds still first among them: within the 0.3 s
 * `plan.md`'s budget gives a shake.
 */
export const SHAKE_MS = 300;

/**
 * How long the field holds still as a boulder breaks, in milliseconds, its
 * first beat, before it moves on and shakes.
 */
export const BOULDER_HOLD_MS = 90;

/** How long a lost ship's pilot floats off in its bubble before it is gone. */
export const BAIL_OUT_MS = 1400;

/** How long into its bail-out a pilot starts to blink, as it goes. */
export const BAIL_OUT_BLINK_MS = 700;

/** How many fading outlines of the pod a dash leaves along its path. */
export const DASH_TRAIL = 3;

/** How long each of a dash's outlines takes to fade. */
export const TRAIL_MS = 250;

/** How long a puff of the exhaust drifts back from the engines as it fades, as the art kit's `FX_MS.exhaust`. */
export const EXHAUST_MS = 400;

/**
 * How long the Cleared card waits after the last rock goes, so its shards are
 * seen before the card covers them.
 */
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
 * pod's burst to fly: none where motion is unwelcome, where it doesn't.
 */
export function resultDelayMs(motion: boolean): number {
  return motion ? BURST_MS : 0;
}
