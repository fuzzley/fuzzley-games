// How each flourish moves over its time, and how what idles on the field
// moves while motion is welcome: a pickup's breath, a stray's bob and the
// exhaust the flame streams. Where motion isn't welcome each holds still at
// its look at rest. A sign that blinks, a pickup about to fade or the ring
// of a pod nothing can touch, is no motion, so it blinks either way. The pilots' blinks and the flame's
// flicker go by the field's steps, in `src/view/art/`.

import { formatPoints } from "@fz/core/format";
import { shareDone } from "@fz/core/math";
import { ROCK_KIND_IDS, ROCK_SIZES, rockKind } from "../../rules/catalog/rocks";
import { stepsIn } from "../../rules/stepper";
import type { Moving } from "../../rules/torus";
import {
  DASH_MS,
  DASH_SPEED,
  STATIC_STEPS,
  STEP_S,
  STRAY_POINTS,
} from "../../rules/tuning";
import type { FieldEvent } from "../field/frame";
import type { BeltPalette } from "../colors/palette";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  DASH_TRAIL,
  FLASH_GAP_MS,
  KICK_CSS_PX,
  KICK_MS,
  LEAST_SHARDS,
  MOST_SHARDS,
  POINTS_RISE,
  SHAKE_CSS_PX,
  SHAKE_DELAY_MS,
  SHAKE_MS,
} from "./timing";

/** How far a stray bobs in its bubble, up and down, as a share of its radius. */
export const BOB = 0.12;

/** How opaque a held hit's flash starts: a light wash of the rock's own frame, over it. */
export const FLASH_MOST = 0.7;

/** How opaque the first of a dash's fading outlines is; each after it fainter. */
export const TRAIL_MOST = 0.5;

/**
 * How far a spent Shield's ring sweeps out from the ship, in field units, past
 * the Shield's own ring.
 */
export const SHIELD_RING_REACH = 3;

/** How far a lost ship's ring sweeps out from where it was lost, in field units. */
export const LOST_RING_REACH = 5;

/** How far a held hit's spark flies before it is gone, in field units. */
export const SPARK_REACH = 1.2;

/** How fast a pilot bailing out floats off, in field units a second. */
export const BAIL_OUT_SPEED = 2.2;

/** How many specks of exhaust the flame streams a second at full thrust. */
export const EXHAUST_RATE = 40;

/**
 * How far apart two events' flourishes fly, and two pickups' breaths turn,
 * in radians: a golden angle, so no two keep step.
 */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * How fast the field shakes along each axis, in turns a second, apart, so
 * it doesn't swing along a line, and slow enough that a screen's 60 frames
 * a second catch each swing, rather than a slow beat of it.
 */
const SHAKE_RATES = { x: 13, y: 17 } as const;

/** How fast each idle motion turns, in turns a second: a breath and a bob. */
const RATES = { breath: 0.64, bob: 0.35 } as const;

/**
 * How many times a second a blinking thing blinks, under the three flashes a
 * second that are safe.
 */
const BLINK_RATE = 2.5;

/**
 * Returns how far the field is from where it rests, a share through a kick: all
 * of it as it starts, settling.
 */
export function kickShare(done: number): number {
  return (1 - done) ** 2;
}

/**
 * Returns whether a held hit may flash at a time, in milliseconds, after the
 * field's last flash, or −Infinity before its first: once that last is
 * {@link FLASH_GAP_MS} past.
 */
export function flashDue(lastFlashAt: number, now: number): boolean {
  return now - lastFlashAt >= FLASH_GAP_MS;
}

/** Returns how opaque a held hit's flash is, a share through it. */
export function flashAlpha(done: number): number {
  return FLASH_MOST * (1 - done);
}

/**
 * Returns how opaque each of a dash's fading outlines is as it is laid,
 * counting from the dash's start: the last, nearest the ship, the most.
 */
export function trailAlpha(index: number): number {
  return (TRAIL_MOST * (index + 1)) / DASH_TRAIL;
}

/**
 * Returns how long into a dash each of its outlines is laid, in milliseconds,
 * counting from the dash's start, as the ship passes where it lies: the first
 * as the dash starts.
 */
export function trailLaidAfter(index: number): number {
  return (DASH_MS * index) / DASH_TRAIL;
}

/**
 * Returns how far along a dash each of its outlines lies from where the dash
 * started, in field units, counting from the dash's start.
 */
export function trailReach(index: number): number {
  return (DASH_SPEED * trailLaidAfter(index)) / 1000;
}

/**
 * Returns how many of a dash's outlines are laid once the field has taken
 * so many steps since the dash started: the first as it starts, and each
 * after it once the field has stepped the ship past where it lies; none
 * before the dash starts, or for no dash, −Infinity steps since.
 */
export function trailOutlinesLaid(stepsSince: number): number {
  let laid = 0;
  while (laid < DASH_TRAIL && stepsSince >= stepsIn(trailLaidAfter(laid))) {
    laid++;
  }
  return laid;
}

/**
 * Returns the label points scored show, as "+40", or "+40 ×2" where static's
 * multiplier scored them more.
 */
export function pointsLabel(
  event: Readonly<Pick<FieldEvent, "points" | "times">>,
): string {
  const points = `+${formatPoints(event.points)}`;
  return event.times > 1 ? `${points} ×${String(event.times)}` : points;
}

/**
 * The most characters a label of points runs to: the most a rock or a stray
 * scores, at static's highest multiplier.
 */
export const MOST_POINTS_CHARACTERS = pointsLabel({
  points: Math.max(
    STRAY_POINTS,
    ...ROCK_KIND_IDS.flatMap((id) =>
      ROCK_SIZES.map((size) => rockKind(id).points[size] ?? 0),
    ),
  ),
  times: Math.max(...STATIC_STEPS.map(({ times }) => times)),
}).length;

/**
 * Returns how far points have risen above where they were scored, in field
 * units, a share through their time: none where motion isn't welcome.
 */
export function riseOf(done: number, motion: boolean): number {
  return motion ? POINTS_RISE * done : 0;
}

/**
 * Returns how far an event's ring sweeps out, in field units: a blast's to
 * its reach, a spent Shield's and a lost ship's to their own.
 */
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

/**
 * Returns the color an event's ring sweeps out in: a blast's in the warning
 * color, and a spent Shield's and a lost ship's in the accent.
 */
export function ringColorOf(
  event: Readonly<FieldEvent>,
  palette: Pick<BeltPalette, "flame" | "accent">,
): number {
  return event.kind === "blast" ? palette.flame : palette.accent;
}

/**
 * Returns the way an event's flourish flies, in radians, by its serial, so the
 * flourishes of events one after another fly apart.
 */
export function wayOf(serial: number): number {
  return serial * GOLDEN_ANGLE;
}

/**
 * Returns whether a pilot bailing out shows, a share through its bail-out, at a
 * time, in seconds: steadily, then blinking as it goes.
 */
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

/**
 * Says what last jolted the field, each at a time, in milliseconds, or
 * −Infinity for none: a kick, as a large rock broke, and the way its blow
 * came, a share along each axis; and a ship lost, which shakes it.
 */
export interface Jolts {
  kickedAt: number;
  wayX: number;
  wayY: number;
  lostAt: number;
}

/**
 * Writes how far the field's camera is scrolled from where it rests into a
 * record and returns it, in device pixels at a pixel ratio, at a time:
 * against the way the last kick's blow came, settling, and as far as
 * {@link shakeOf} shakes it since the last ship was lost.
 */
export function cameraShift(
  jolts: Readonly<Jolts>,
  now: number,
  pixelRatio: number,
  into: Moving,
): Moving {
  const kick =
    KICK_CSS_PX *
    pixelRatio *
    kickShare(shareDone(jolts.kickedAt, now, KICK_MS));
  const shake = SHAKE_CSS_PX * pixelRatio;
  shakeOf(now - jolts.lostAt, into);
  // The field moves the way the blow came, so its camera the other.
  into.x = into.x * shake - jolts.wayX * kick;
  into.y = into.y * shake - jolts.wayY * kick;
  return into;
}

/**
 * Returns how many shards a broken rock scatters, from the fewest to the most,
 * as its event's serial says.
 */
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

/**
 * Returns how far a pickup has breathed in, from 0, breathed out, to 1, a
 * phase on, as its slot's own, or 0 where motion isn't welcome.
 */
export function breathShare(
  seconds: number,
  phase: number,
  motion: boolean,
): number {
  return motion ? (1 + wave(RATES.breath, seconds, phase)) / 2 : 0;
}

/**
 * Returns how far below its place a stray is drawn as it bobs, as a share of
 * its radius, a phase on, as its own.
 */
export function bobShare(
  seconds: number,
  phase: number,
  motion: boolean,
): number {
  return motion ? BOB * wave(RATES.bob, seconds, phase) : 0;
}

/**
 * Returns how many specks of exhaust are due, whole and in part, once the
 * field has taken so many steps at a thrust, the part of one carried from
 * before among them, for the whole ones to stream and the part to carry
 * on: none at no thrust, or where motion isn't welcome, which carry
 * nothing on.
 */
export function exhaustDue(
  carried: number,
  thrust: number,
  steps: number,
  motion: boolean,
): number {
  if (!motion || thrust <= 0) return 0;
  return carried + thrust * EXHAUST_RATE * steps * STEP_S;
}

/**
 * Returns whether a blinking thing, a pickup about to fade or the ring of a
 * pod nothing can touch, is shown at a time, in seconds: for the first half
 * of each blink.
 */
export function blinkShown(seconds: number): boolean {
  return (seconds * BLINK_RATE) % 1 < 0.5;
}
