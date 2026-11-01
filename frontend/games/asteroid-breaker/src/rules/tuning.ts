// The numbers that set the game's feel, in one file, so tuning it touches
// nothing else: lengths in field units, speeds in units a second, and times
// in milliseconds, but the step's, which the physics takes in seconds. A
// number a catalog's entries differ by, such as a rock kind's speed or a
// pickup's time, is the entry's.

/** How long a step of the field is, in seconds. */
export const STEP_S = 1 / 120;

/** The most steps one frame takes, however long it was. */
export const MAX_STEPS_PER_FRAME = 12;

/** The field's short side, whatever the shape of the room it fills. */
export const FIELD_SHORT_SIDE = 40;

/**
 * The longest the field's long side grows, so a room longer than this
 * over {@link FIELD_SHORT_SIDE} times its short side shows the page at the
 * field's ends.
 */
export const FIELD_LONGEST_SIDE = 88;

/** The push of full thrust along the ship's heading, in units a second, each second. */
export const THRUST = 24;

/** The fastest the ship flies, except while it dashes. */
export const TOP_SPEED = 15;

/** How long the ship's speed takes to halve as it flies, if nothing pushes it. */
export const COAST_HALF_LIFE_MS = 1500;

/** How fast held keys turn the ship, in degrees a second. */
export const KEY_TURN_RATE = 300;

/**
 * How long held keys take to turn the ship at their full rate, so a tap
 * turns it a few degrees.
 */
export const KEY_TURN_RAMP_MS = 80;

/** The fastest the ship turns toward a stick's heading or the mouse, in degrees a second. */
export const HEADING_TURN_RATE = 600;

/**
 * How far from a heading, in degrees, the ship's turn toward it starts to
 * slow, so it comes to the heading gently rather than stopping dead on it.
 */
export const HEADING_EASE = 12;

/** How fast a dash throws the ship along its heading. */
export const DASH_SPEED = 34;

/** How long a dash throws the ship. */
export const DASH_MS = 220;

/** How long nothing can hit the ship from a dash's start: the dash and a little after. */
export const DASH_GUARD_MS = 320;

/** How long a dash takes to charge again, from its start. */
export const DASH_RECHARGE_MS = 2500;

/** The speed a dash adds along the ship's heading to what it flew at before, to its top speed. */
export const DASH_CARRY = 4;

/** How long a new ship stays untouchable once it first moves. */
export const NEW_SHIP_GUARD_MS = 2000;

/**
 * How far, in degrees, a stick held as a new ship comes must turn from where
 * it pointed then before it moves the ship, so a resting thumb's tremble
 * doesn't end the wait.
 */
export const STICK_SLACK = 8;
