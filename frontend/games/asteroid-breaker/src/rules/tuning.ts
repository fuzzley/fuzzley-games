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

/** The most rocks a field of 40 by 40 holds at once, a wave's written among them; a larger field holds more, by its area. */
export const ROCK_CAP = 48;

/** How near the ship, middle to middle across the wrap, no rock of a wave starts. */
export const FAIR_DISTANCE = 12;

/** How near the ship no rock of a wave comes on its course in its first {@link FAIR_COURSE_MS}. */
export const FAIR_COURSE = 5;

/** How long a wave's rocks keep {@link FAIR_COURSE} off the ship, flying as they start. */
export const FAIR_COURSE_MS = 3000;

/** How near the field's middle no rock may be for a new ship to wait there. */
export const SAFE_MIDDLE = 9;

/** How many places across and down the field a new ship may wait at, when the middle isn't safe. */
export const SAFE_GRID = 5;

/** How far ahead a new ship's place is judged, by where the rocks will be. */
export const SAFE_AHEAD_MS = 1000;

/** How many pickups a field of 40 by 40 floats before chance lets no more go; a larger field floats more, by its area. */
export const PICKUPS_AT_ONCE = 2;

/** How fast a pickup drifts from where it was let go. */
export const PICKUP_DRIFT = 2;

/** How long a pickup floats before it fades. */
export const PICKUP_LIFE_MS = 8000;

/** How long before it fades a pickup blinks. */
export const PICKUP_BLINK_MS = 2000;

/** How near the ship a pickup is drawn in to it from, unless a Magnet draws from farther. */
export const PICKUP_PULL_REACH = 3;

/** How fast a pickup is drawn in to the ship, in place of its drift. */
export const PICKUP_PULL_SPEED = 10;

/** How near the ship's middle a pickup's is as the ship catches it. */
export const PICKUP_CATCH_REACH = 2;

/** How long a wave goes without letting a pickup go before the next large rock broken lets one go. */
export const DROUGHT_MS = 25_000;

/** How long the ship stays untouchable as its shield goes, so the pieces of the rock it broke can fly clear. */
export const SHIELD_GUARD_MS = 1000;

/** How many ships a run starts with, each with its pilot. */
export const FIRST_SHIPS = 3;

/** The most ships a run has at once; one gained past it is not. */
export const MAX_SHIPS = 6;

/** The first wave a stray crosses, in a wave that doesn't say how many. */
export const STRAYS_FROM = 3;

/** How far into a wave its first stray comes. */
export const STRAY_FIRST_MS = 20_000;

/** How long after a stray has gone, brought home or off the field, the next comes. */
export const STRAY_NEXT_MS = 8000;

/** How fast a stray crosses the field. */
export const STRAY_SPEED = 3.2;

/**
 * How far a stray's bubble reaches from its middle, which comes in from and
 * leaves past that far off the field, so the bubble slides in and out of
 * sight.
 */
export const STRAY_RADIUS = 1.15;

/** How near the ship's middle a stray's is as the ship brings it home. */
export const STRAY_CATCH_REACH = 2;

/** How far off straight across the field a stray comes in, in degrees, toward its edge's middle. */
export const STRAY_TILT = 20;

/** How fast a stray's heading turns as it crosses, in degrees a second, either way, so it crosses on a gentle curve. */
export const STRAY_TURN: Span = { least: 2, most: 5 };

/** How long a comet is warned of at the edge it will come in by. */
export const COMET_WARNING_MS = 1500;

/** How fast a comet crosses the field, before the field's pace. */
export const COMET_SPEED = 26;

/** How far from its middle a comet meets what it touches. */
export const COMET_RADIUS = 1;

/**
 * How far off the field a comet's middle comes in from and leaves past, so
 * its head and its short tail slide in and out of sight.
 */
export const COMET_MARGIN = 3;

/** How far off straight across the field a comet comes in, in degrees, toward its edge's middle. */
export const COMET_TILT = 30;

/**
 * Where along an edge a stray or a comet comes in, as a share of it: away
 * from its corners, so neither clips one and is gone at once.
 */
export const ENTRY_ALONG: Span = { least: 0.15, most: 0.85 };

/** How long after a break the next must come to count on in the chain. */
export const CHAIN_MS = 1500;

/**
 * How a chain of breaks scores: from the count a break is in the chain,
 * how many times its points it scores, the longest first.
 */
export const CHAIN = [
  { from: 20, times: 4 },
  { from: 10, times: 3 },
  { from: 5, times: 2 },
] as const;

/** The points a stray brought home scores, before the chain's multiplier. */
export const STRAY_POINTS = 500;

/** The points a cleared wave adds. */
export const CLEAR_POINTS = 500;

/** The points a wave cleared without losing a ship adds besides. */
export const CLEAN_POINTS = 500;

/** The score that brings a run's first ship more. */
export const FIRST_SHIP_POINTS = 10_000;

/** The points between each ship more after the first. */
export const SHIP_POINTS = 20_000;
