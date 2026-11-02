// How each flourish moves over its time, and how what idles on the field
// moves while motion is welcome: a pickup's breath, a stray's bob, a
// pilot's eyes, a comet's warning's pulse and the flame's flicker. Where
// motion isn't welcome each holds still at its look at rest. A sign that
// blinks, a pickup about to fade or a guarded ship, is no motion, so it
// blinks either way.

import { formatPoints } from "@fz/core/format";
import { clamp } from "@fz/core/math";
import type { Moving } from "../rules/torus";
import { DASH_MS, DASH_SPEED } from "../rules/tuning";
import type { FieldEvent } from "./frame";
import type { BeltPalette } from "./palette";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  DASH_TRAIL,
  FLASH_GAP_MS,
  LEAST_SHARDS,
  MOST_SHARDS,
  POINTS_RISE,
  SHAKE_DELAY_MS,
  SHAKE_MS,
} from "./timing";

/** How much a pickup swells and shrinks as it breathes, as a share of its size. */
export const BREATH = 0.05;

/** How far a stray bobs in its bubble, up and down, as a share of its radius. */
export const BOB = 0.12;

/** How faint a comet's warning gets between pulses. */
export const PULSE_LEAST = 0.6;

/** How far the flame's length flickers below its full, as a share. */
export const FLICKER = 0.15;

/** How opaque a held hit's flash starts: a light wash of the rock's own frame, over it. */
export const FLASH_MOST = 0.7;

/** How opaque the first of a dash's fading outlines is; each after it fainter. */
export const TRAIL_MOST = 0.5;

/** How far a spent Shield's ring sweeps out from the ship, in field units, past the Shield's own ring. */
export const SHIELD_RING_REACH = 3;

/** How far a lost ship's ring sweeps out from where it was lost, in field units. */
export const LOST_RING_REACH = 5;

/** How far a held hit's spark flies before it is gone, in field units. */
export const SPARK_REACH = 1.2;

/** How fast a pilot bailing out floats off, in field units a second. */
export const BAIL_OUT_SPEED = 2.2;

/** How shut a pilot's eyes get as it blinks, a share of their height. */
export const EYES_SHUT = 0.1;

/**
 * How far apart two events' flourishes fly, and two pickups' breaths turn,
 * in radians: a golden angle, so no two keep step.
 */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** How often a pilot blinks, and how long a blink takes, in seconds, and how far each pilot's blink comes after the one before's. */
const EYE_BLINK = { every: 4, takes: 0.16, lag: 0.7 } as const;

/**
 * How fast the field shakes along each axis, in turns a second, apart, so
 * it doesn't swing along a line, and slow enough that a screen's 60 frames
 * a second catch each swing, rather than a slow beat of it.
 */
const SHAKE_RATES = { x: 13, y: 17 } as const;

/** How fast each idle motion turns, in turns a second: a breath, a bob, a pulse and a flicker. */
const RATES = { breath: 0.64, bob: 0.35, pulse: 0.8, flicker: 7.5 } as const;

/** How many times a second a blinking thing blinks, under the three flashes a second that are safe. */
const BLINK_RATE = 2.5;

/** Returns how far through its time a flourish is, from 0 as it starts to 1 once it is over. */
export function shareDone(startedAt: number, now: number, ms: number): number {
  return clamp((now - startedAt) / ms, 0, 1);
}

/** Returns how far out something that spreads has gone, a share through its time: fast, then slowing. */
export function spread(done: number): number {
  return 1 - (1 - done) ** 3;
}

/** Returns how opaque a fading thing is, a share through its fade. */
export function fadeAlpha(done: number): number {
  return 1 - done;
}

/** Returns how far the field is from where it rests, a share through a kick: all of it as it starts, settling. */
export function kickShare(done: number): number {
  return (1 - done) ** 2;
}

/** Returns whether a held hit may flash at a time, in milliseconds, after the field's last flash, or −Infinity before its first: once that last is {@link FLASH_GAP_MS} past. */
export function flashDue(lastFlashAt: number, now: number): boolean {
  return now - lastFlashAt >= FLASH_GAP_MS;
}

/** Returns how opaque a held hit's flash is, a share through it. */
export function flashAlpha(done: number): number {
  return FLASH_MOST * (1 - done);
}

/** Returns how opaque each of a dash's fading outlines is as it is laid, counting from the dash's start: the last, nearest the ship, the most. */
export function trailAlpha(index: number): number {
  return (TRAIL_MOST * (index + 1)) / DASH_TRAIL;
}

/** Returns how long into a dash each of its outlines is laid, in milliseconds, counting from the dash's start, as the ship passes where it lies: the first as the dash starts. */
export function trailLaidAfter(index: number): number {
  return (DASH_MS * index) / DASH_TRAIL;
}

/** Returns how far along a dash each of its outlines lies from where the dash started, in field units, counting from the dash's start. */
export function trailReach(index: number): number {
  return (DASH_SPEED * trailLaidAfter(index)) / 1000;
}

/** Returns the label points scored show, as "+40", or "+40 ×2" where the chain's multiplier scored them more. */
export function pointsLabel(event: Readonly<FieldEvent>): string {
  const points = `+${formatPoints(event.points)}`;
  return event.times > 1 ? `${points} ×${String(event.times)}` : points;
}

/** Returns how far points have risen above where they were scored, in field units, a share through their time: none where motion isn't welcome. */
export function riseOf(done: number, motion: boolean): number {
  return motion ? POINTS_RISE * done : 0;
}

/** Returns how far an event's ring sweeps out, in field units: a blast's or the Nova's to its reach, a spent Shield's and a lost ship's to their own. */
export function ringReachOf(event: Readonly<FieldEvent>): number {
  switch (event.kind) {
    case "shielded":
      return SHIELD_RING_REACH;
    case "lost":
      return LOST_RING_REACH;
    default:
      return event.reach;
  }
}

/** Returns the color an event's ring sweeps out in: a blast's in the warning color, and the Nova's, a spent Shield's and a lost ship's in the accent. */
export function ringColorOf(
  event: Readonly<FieldEvent>,
  palette: Pick<BeltPalette, "flame" | "accent">,
): number {
  return event.kind === "blast" ? palette.flame : palette.accent;
}

/** Returns the way an event's flourish flies, in radians, by its serial, so the flourishes of events one after another fly apart. */
export function wayOf(serial: number): number {
  return serial * GOLDEN_ANGLE;
}

/** Returns whether a pilot bailing out shows, a share through its bail-out, at a time, in seconds: steadily, then blinking as it goes. */
export function bailOutShown(done: number, seconds: number): boolean {
  return done < BAIL_OUT_BLINK_MS / BAIL_OUT_MS || blinkShown(seconds);
}

/**
 * Writes how far the field is shaken from where it rests into a record and
 * returns it, a share of the shake along each axis, a time after a ship is
 * lost, in milliseconds: still for a moment, then all of it, dying away.
 */
export function shakeOf(sinceMs: number, into: Moving): Moving {
  const done = (sinceMs - SHAKE_DELAY_MS) / SHAKE_MS;
  into.x = 0;
  into.y = 0;
  if (!(done >= 0 && done < 1)) return into;
  const left = 1 - done;
  const seconds = sinceMs / 1000;
  into.x = left * Math.sin(2 * Math.PI * SHAKE_RATES.x * seconds);
  into.y = left * Math.sin(2 * Math.PI * SHAKE_RATES.y * seconds);
  return into;
}

/** Returns how many shards a broken rock scatters, from the fewest to the most, as its event's serial says. */
export function shardCount(serial: number): number {
  return LEAST_SHARDS + (serial % (MOST_SHARDS - LEAST_SHARDS + 1));
}

/**
 * Returns where in its turn an idle motion is at a time, in seconds, a
 * phase on, in radians, so things side by side move apart.
 *
 * A thing's phase is its own and never changes, such as its slot's place in
 * its pool, never its place on the field, which would quicken or slow its
 * motion as it moves.
 */
function wave(rate: number, seconds: number, phase: number): number {
  return Math.sin(2 * Math.PI * rate * seconds + phase);
}

/** Returns how large a pickup is drawn as it breathes, against its size, a phase on, as its slot's own. */
export function breathScale(
  seconds: number,
  phase: number,
  motion: boolean,
): number {
  return motion ? 1 + BREATH * wave(RATES.breath, seconds, phase) : 1;
}

/** Returns how far below its place a stray is drawn as it bobs, as a share of its radius, a phase on, as its own. */
export function bobShare(
  seconds: number,
  phase: number,
  motion: boolean,
): number {
  return motion ? BOB * wave(RATES.bob, seconds, phase) : 0;
}

/** Returns how far through its swing an idle motion is at a time, from 0 to 1 and back once a turn, 1 as it starts. */
function swing(rate: number, seconds: number): number {
  return (1 + wave(rate, seconds, Math.PI / 2)) / 2;
}

/** Returns how opaque a comet's warning is as it pulses, full as it starts: full where motion isn't welcome. */
export function pulseAlpha(seconds: number, motion: boolean): number {
  if (!motion) return 1;
  return PULSE_LEAST + (1 - PULSE_LEAST) * swing(RATES.pulse, seconds);
}

/** Returns how much of its length the flame is drawn at as it flickers: all of it where motion isn't welcome. */
export function flickerShare(seconds: number, motion: boolean): number {
  if (!motion) return 1;
  return 1 - FLICKER * swing(RATES.flicker, seconds);
}

/**
 * Returns how open a pilot's eyes are at a time, in seconds, a share of
 * their height: open but for a quick blink every few seconds, each pilot's
 * a little after the one before's; open where motion isn't welcome.
 */
export function eyesOpen(
  seconds: number,
  pilot: number,
  motion: boolean,
): number {
  if (!motion) return 1;
  const into = (seconds + pilot * EYE_BLINK.lag) % EYE_BLINK.every;
  if (into >= EYE_BLINK.takes) return 1;
  return 1 - (1 - EYES_SHUT) * Math.sin((Math.PI * into) / EYE_BLINK.takes);
}

/** Returns whether a blinking thing, a pickup about to fade or a guarded ship, is shown at a time, in seconds: for the first half of each blink. */
export function blinkShown(seconds: number): boolean {
  return (seconds * BLINK_RATE) % 1 < 0.5;
}
