// The numbers that set the game's feel, in one file, so tuning it touches
// nothing else: lengths in field units, speeds in units a second, and times
// in milliseconds, but the step's, which the physics takes in seconds. A
// number a catalog's entries differ by, such as a rock kind's speed or a
// pickup's time, is the entry's.

import type { RockSize } from "./catalog/rocks";

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

/** The ship's length, nose to tail; its shots leave its nose, half of it ahead of its middle. */
export const SHIP_LENGTH = 2.4;

/** How far from its middle the ship is hit, less than it is drawn, so a graze is a miss. */
export const SHIP_HIT_RADIUS = 0.7;

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

/** How fast a shot flies, before the ship's velocity is added to it. */
export const SHOT_SPEED = 32;

/** Whether a shot leaves with the ship's velocity added to its own, as the genre's do. */
export const SHOTS_CARRY_SHIP = true;

/** How long a shot flies before it fades. */
export const SHOT_LIFE_MS = 800;

/**
 * The time between the gun's pulls while fire is held; each weapon's is
 * written against it, so tuning it tunes them all.
 */
export const SHOT_EVERY_MS = 140;

/** The most of the gun's shots in flight at once. */
export const SHOTS_IN_FLIGHT = 6;

/** How far from its middle a shot reaches what it hits. */
export const SHOT_RADIUS = 0.18;

/** Describes the span a number is drawn from, the least to the most. */
export interface Span {
  readonly least: number;
  readonly most: number;
}

/** How far from its middle a rock of each size is drawn, to its outline's farthest points. */
export const ROCK_RADIUS: Readonly<Record<RockSize, number>> = {
  boulder: 4.6,
  large: 2.8,
  medium: 1.6,
  small: 0.9,
};

/**
 * How much of its radius a rock is hit within, so a shot that only grazes
 * its uneven outline misses.
 */
export const ROCK_HIT_SHARE = 0.9;

/**
 * How fast a rock of each size flies, drawn from a span, before its kind's
 * speed and the field's pace, which are the wave's and the speed's.
 */
export const ROCK_SPEED: Readonly<Record<RockSize, Span>> = {
  boulder: { least: 1.5, most: 2.5 },
  large: { least: 2.5, most: 4 },
  medium: { least: 4, most: 6 },
  small: { least: 5.5, most: 8.5 },
};

/** How fast a rock turns as it flies, in degrees a second, either way. */
export const ROCK_SPIN: Span = { least: 6, most: 30 };

/** How far each of a broken rock's pieces turns off its travel, in degrees, to one side or the other. */
export const PIECE_TURN: Span = { least: 25, most: 50 };

/** How fast a broken rock's pieces are pushed along the way the hit came, on top of their own speed. */
export const PIECE_PUSH = 1.5;
