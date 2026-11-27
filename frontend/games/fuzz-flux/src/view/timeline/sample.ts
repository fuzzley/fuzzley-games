// Where everything a move's timeline draws stands at a moment: each piece's
// and each loose sprite's look, face and frame, and the board's dimming
// and shake, each written into a record the scene keeps, so a frame makes
// no records. A frame is a time, so the same moment samples the same on
// every run and at any frame rate.

import { easeOutCubic, lerp } from "@fz/core/math";
import { type Shift, shakeOf } from "@fz/core/motion";
import { itemAt } from "@fz/core/records";
import type { FuzzballFace } from "@fz/style/fuzzball";
import type { FeelTuning } from "./feel";
import { lookAt } from "./looks";
import {
  CHANNELS,
  type Easing,
  type Effect,
  type Key,
  type Keys,
  type Look,
  type Sampled,
  type SampledBoard,
  type Timeline,
} from "./timeline";

/** Describes the records a scene keeps for a timeline, which sampling writes into. */
export interface Frame {
  /** A record for each of the timeline's pieces' tracks, in its order. */
  readonly pieces: readonly Sampled[];
  /** A record for each of its loose sprites' tracks, in its order. */
  readonly sprites: readonly Sampled[];
  readonly board: SampledBoard;
}

/** How far the sketch's "back" easing swings past its end, as a share of the way. */
const BACK_OVERSHOOT = 1.4;

/** How many half turns the sketch's "spring" easing swings through over its time, of which the first two show. */
const SPRING_HALF_TURNS = 3.2;

/** How fast the sketch's "spring" easing's swing dies away, by the power of e a whole key takes off it. */
const SPRING_DAMPING = 5.2;

/**
 * How far through each easing a key has moved its number, a share through
 * its time, each the sketch's but that a spring lands on its key's end,
 * which the sketch's misses by a little.
 */
const EASE: Readonly<Record<Easing, (done: number) => number>> = {
  linear: (done) => done,
  out: easeOutCubic,
  in: (done) => done * done,
  "in-out": (done) =>
    done < 0.5 ? 2 * done * done : 1 - (2 - 2 * done) ** 2 / 2,
  back: (done) =>
    1 +
    (BACK_OVERSHOOT + 1) * (done - 1) ** 3 +
    BACK_OVERSHOOT * (done - 1) ** 2,
  spring: (done) =>
    done < 1
      ? 1 -
        Math.cos(done * Math.PI * SPRING_HALF_TURNS) *
          Math.exp(-done * SPRING_DAMPING)
      : 1,
};

/**
 * How many halvings a shake's fade runs over: more than any shake takes to
 * fall below the feel's stop, since 2 to the 32nd of the stop is wider than
 * any screen.
 */
const SHAKE_HALVINGS = 32;

/** Returns records a scene can sample a timeline's frames into, made once as its move starts. */
export function frameFor(timeline: Timeline): Frame {
  return {
    pieces: timeline.pieces.map(sampledRecord),
    sprites: timeline.sprites.map(sampledRecord),
    board: { dim: 0, shake: { x: 0, y: 0 } },
  };
}

/**
 * Writes where everything a timeline draws stands at a moment, in
 * milliseconds from the tap, into a frame's records, and returns them.
 *
 * It takes the feel the timeline was built by, as `pacedFeel()` gives it
 * at the player's pace, since a head's shake sways at that feel's rate.
 *
 * @throws {RangeError} for a frame with fewer records than the timeline
 *   has tracks.
 */
export function sampleAt(
  timeline: Timeline,
  feel: FeelTuning,
  ms: number,
  into: Frame,
): Frame {
  if (
    into.pieces.length < timeline.pieces.length ||
    into.sprites.length < timeline.sprites.length
  ) {
    throw new RangeError(
      "A frame keeps a record for each of its timeline's tracks.",
    );
  }
  for (let index = 0; index < timeline.pieces.length; index++) {
    const track = itemAt(timeline.pieces, index);
    const sampled = itemAt(into.pieces, index);
    sampled.shown =
      track.fromMs <= ms && (track.untilMs === null || ms < track.untilMs);
    sampleLook(track.look, track.keys, feel, ms, sampled);
    sampled.face = latestAt(track.faces, ms)?.face ?? track.face;
    sampled.drawn = latestAt(track.becomes, ms)?.piece ?? track.drawn;
  }
  for (let index = 0; index < timeline.sprites.length; index++) {
    const track = itemAt(timeline.sprites, index);
    const sampled = itemAt(into.sprites, index);
    sampled.shown = track.fromMs <= ms && ms < track.untilMs;
    sampleLook(track.look, track.keys, feel, ms, sampled);
    sampled.face = track.drawn.what === "copy" ? track.drawn.face : REST;
    sampled.drawn = null;
  }
  into.board.dim = numberAt(0, timeline.dim, ms);
  shakeAt(timeline.effects, feel, ms, into.board.shake);
  return into;
}

/** The face a loose frame's record holds, as it has no eyes. */
const REST: FuzzballFace = "rest";

/** Returns a record for a sprite's sampling to write into. */
function sampledRecord(): Sampled {
  return { ...lookAt({ x: 0, y: 0 }), shown: false, face: REST, drawn: null };
}

/** Writes each number of a sprite's look at a moment into its record, its wobble's sway folded into its lean across. */
function sampleLook(
  look: Look,
  keys: Keys,
  feel: FeelTuning,
  ms: number,
  into: Sampled,
): void {
  for (let index = 0; index < CHANNELS.length; index++) {
    const channel = itemAt(CHANNELS, index);
    into[channel] = numberAt(look[channel], keys[channel], ms);
  }
  into.leanX +=
    Math.sin(ms / feel.wobbleRadianMs) * into.wobble * feel.wobbleSquares;
}

/** Returns a number of a sprite's look at a moment, each key that has started moving it on from where the one before left it. */
function numberAt(
  start: number,
  keys: readonly Key[] | undefined,
  ms: number,
): number {
  if (keys === undefined) {
    return start;
  }
  let value = start;
  for (let index = 0; index < keys.length; index++) {
    const key = itemAt(keys, index);
    if (key.atMs > ms) {
      break;
    }
    const next = keys[index + 1];
    const untilMs = next !== undefined && next.atMs <= ms ? next.atMs : ms;
    const done = key.ms > 0 ? Math.min(1, (untilMs - key.atMs) / key.ms) : 1;
    value = lerp(value, key.to, EASE[key.easing](done));
  }
  return value;
}

/** Returns the last of a list in the order it starts that has started by a moment, or undefined for none. */
function latestAt<T extends { readonly atMs: number }>(
  items: readonly T[],
  ms: number,
): T | undefined {
  let latest: T | undefined;
  for (let index = 0; index < items.length; index++) {
    const item = itemAt(items, index);
    if (item.atMs > ms) {
      break;
    }
    latest = item;
  }
  return latest;
}

/** Returns what is left of a shake a share through its halvings. */
function halving(done: number): number {
  return 0.5 ** (done * SHAKE_HALVINGS);
}

/**
 * Writes how far the board is shaken at a moment: by its widest shake as
 * each halves away, none once that is narrower than the feel's stop, and
 * half that width each way.
 */
function shakeAt(
  effects: readonly Effect[],
  feel: FeelTuning,
  ms: number,
  into: Shift,
): void {
  let widest = 0;
  let widestPx = 0;
  let sinceMs = 0;
  for (let index = 0; index < effects.length; index++) {
    const effect = itemAt(effects, index);
    if (effect.atMs > ms) {
      break;
    }
    if (effect.what === "shake") {
      const since = ms - effect.atMs;
      const width = effect.px * 0.5 ** (since / feel.shakeHalfLifeMs);
      if (width > widest) {
        widest = width;
        widestPx = effect.px;
        sinceMs = since;
      }
    }
  }
  if (widest < feel.shakeStopPx) {
    into.x = 0;
    into.y = 0;
    return;
  }
  shakeOf(
    sinceMs,
    feel.shakeHalfLifeMs * SHAKE_HALVINGS,
    widestPx / 2,
    halving,
    into,
  );
}
