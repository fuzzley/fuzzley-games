// Where everything a move's timeline draws stands at a moment: each piece's
// and each loose sprite's look, face and frame, the board's dimming and
// shake, and each copy flying to its goal, each written into a record the
// scene keeps, so a frame makes no records. A frame is a time, so where
// everything shown stands at a moment samples the same on every run and at
// any frame rate.

import { clamp, lerp } from "@fz/core/math";
import { type Shift, shakeOf } from "@fz/core/motion";
import { hashShareOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import type { FuzzballFace } from "@fz/style/fuzzball";
import { curveAt } from "./curve";
import { eased } from "./easing";
import type { FeelTuning } from "./feel";
import { RAISED, lookAt } from "./looks";
import {
  CHANNELS,
  type Effect,
  type Flight,
  type Key,
  type Keys,
  type Look,
  type PieceTrack,
  type Place,
  type Sampled,
  type SampledBoard,
  type SpriteTrack,
  type Timeline,
} from "./timeline";

/** Describes the records a scene keeps for a timeline, which sampling writes into. */
export interface Frame {
  /** A record for each of the timeline's pieces' tracks, in its order. */
  readonly pieces: readonly Sampled[];
  /** A record for each of its loose sprites' tracks, in its order. */
  readonly sprites: readonly Sampled[];
  readonly board: SampledBoard;
  /** What each piece's record holds of its track's look while it stands still, in the same order. */
  readonly heldPieces: readonly Held[];
  /** What each loose sprite's record holds of its track's look while it stands still, in the same order. */
  readonly heldSprites: readonly Held[];
}

/**
 * Describes the look a record holds of a track standing still between its
 * keys, every key started by then ended, the next yet to start, and no
 * wobble swaying it, so a frame in that while samples none of it again.
 */
export interface Held {
  /** The track whose look the record holds standing still, or null for none. */
  track: PieceTrack | SpriteTrack | null;
  /** When the look came to stand, the last of its keys started by then ended. */
  fromMs: number;
  /** When the next of its keys starts, or Infinity for none. */
  untilMs: number;
}

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
    heldPieces: timeline.pieces.map(heldRecord),
    heldSprites: timeline.sprites.map(heldRecord),
  };
}

/**
 * Writes where everything a timeline draws stands at a moment, in
 * milliseconds from the tap, into a frame's records, and returns them.
 *
 * It takes the feel the timeline was built by, as `pacedFeel()` gives it
 * at the player's speed, since a head's shake sways at that feel's rate.
 * A track that doesn't show, yet to or gone, is left as it stood, but for
 * showing nothing, and a look standing still is sampled once.
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
    if (showsAt(track, ms)) {
      samplePiece(track, feel, ms, sampled, itemAt(into.heldPieces, index));
    } else {
      sampled.shown = false;
    }
  }
  for (let index = 0; index < timeline.sprites.length; index++) {
    const track = itemAt(timeline.sprites, index);
    const sampled = itemAt(into.sprites, index);
    if (showsAt(track, ms)) {
      sampleSprite(track, feel, ms, sampled, itemAt(into.heldSprites, index));
    } else {
      sampled.shown = false;
    }
  }
  into.board.dim = numberAt(0, timeline.dim, ms);
  shakeAt(timeline.effects, feel, ms, into.board.shake);
  return into;
}

/**
 * Writes how a piece's track looks at a moment into a record, whether it
 * shows then or not, and returns it, sampling none of a look the record
 * holds standing still already.
 */
export function samplePiece(
  track: PieceTrack,
  feel: FeelTuning,
  ms: number,
  into: Sampled,
  held: Held,
): Sampled {
  into.shown = showsAt(track, ms);
  sampleTrackLook(track, feel, ms, into, held);
  into.face = latestAt(track.faces, ms)?.face ?? track.face;
  into.drawn = latestAt(track.becomes, ms)?.piece ?? track.drawn;
  return into;
}

/**
 * Writes how a loose sprite's track looks at a moment into a record,
 * whether it shows then or not, and returns it, as `samplePiece()` does a
 * piece's.
 */
export function sampleSprite(
  track: SpriteTrack,
  feel: FeelTuning,
  ms: number,
  into: Sampled,
  held: Held,
): Sampled {
  into.shown = showsAt(track, ms);
  sampleTrackLook(track, feel, ms, into, held);
  into.face = track.drawn.what === "copy" ? track.drawn.face : REST;
  into.drawn = null;
  return into;
}

/**
 * Writes where a fuzzball's copy flying to its goal stands at a moment, the
 * goal's picture at a place in the board's squares, into a record: on a
 * curve that bows by a bend of its own flight's, shrinking as it goes,
 * happy, its fur a little on end, over all the rest. The record shows only
 * while it flies.
 */
export function sampleFlight(
  flight: Flight,
  to: Place,
  feel: FeelTuning,
  ms: number,
  into: Sampled,
): Sampled {
  const done = clamp((ms - flight.atMs) / flight.ms, 0, 1);
  for (let index = 0; index < CHANNELS.length; index++) {
    const channel = itemAt(CHANNELS, index);
    into[channel] = STILL[channel];
  }
  curveAt(flight.from, to, bendOf(flight, feel), done, feel, into);
  const along = eased("in-out", done);
  into.scaleX = feel.flightScale - feel.flightShrink * along;
  into.scaleY = into.scaleX;
  into.lift = feel.flightLift;
  into.raise = RAISED.top;
  into.shown = flight.atMs <= ms && ms < flight.atMs + flight.ms;
  into.face = "happy";
  into.drawn = flight.drawn;
  return into;
}

/** How a sprite looks standing still, which a flight's copy moves on from. */
const STILL: Look = lookAt({ x: 0, y: 0 });

/** Returns how far a flight bows, in squares, to the right of its way for more than 0: its own, the same every time, within the feel's spread. */
function bendOf(flight: Flight, feel: FeelTuning): number {
  const share = hashShareOf(flight.drawn.id, flight.atMs, flight.goal, 0);
  return (share - 0.5) * feel.flightBendSpread;
}

/** The keys of a number no key moves. */
const NO_KEYS: readonly Key[] = [];

/** The face a loose frame's record holds, as it has no eyes. */
const REST: FuzzballFace = "rest";

/** Returns a record for a sprite's sampling to write into. */
function sampledRecord(): Sampled {
  return { ...lookAt({ x: 0, y: 0 }), shown: false, face: REST, drawn: null };
}

/** Returns a record of a look held standing still, holding none yet. */
function heldRecord(): Held {
  return { track: null, fromMs: 0, untilMs: 0 };
}

/** Returns whether a track shows at a moment: from its start until its end, where it has one. */
function showsAt(
  { fromMs, untilMs }: PieceTrack | SpriteTrack,
  ms: number,
): boolean {
  return fromMs <= ms && (untilMs === null || ms < untilMs);
}

/**
 * Writes a track's look at a moment into its record, unless the record
 * holds that look already, standing still, and keeps whether the look it
 * now holds stands still, and for how long.
 */
function sampleTrackLook(
  track: PieceTrack | SpriteTrack,
  feel: FeelTuning,
  ms: number,
  into: Sampled,
  held: Held,
): void {
  if (held.track === track && held.fromMs <= ms && ms < held.untilMs) {
    return;
  }
  sampleLook(track.look, track.keys, feel, ms, into);
  standingAt(track.keys, ms, held);
  held.track = held.fromMs <= ms && into.wobble === 0 ? track : null;
}

/**
 * Writes the while about a moment that a look's keys leave it standing
 * into a record: from when the last key started by then of each of its
 * numbers ends, as those before it stop where the next starts, until the
 * next key of any of them starts.
 */
function standingAt(keys: Keys, ms: number, into: Held): void {
  into.fromMs = 0;
  into.untilMs = Number.POSITIVE_INFINITY;
  for (let channel = 0; channel < CHANNELS.length; channel++) {
    const moves = keys[itemAt(CHANNELS, channel)] ?? NO_KEYS;
    let next = 0;
    while (next < moves.length && itemAt(moves, next).atMs <= ms) next++;
    const started = moves[next - 1];
    if (started !== undefined) {
      into.fromMs = Math.max(into.fromMs, started.atMs + started.ms);
    }
    const coming = moves[next];
    if (coming !== undefined) {
      into.untilMs = Math.min(into.untilMs, coming.atMs);
    }
  }
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
    value = lerp(value, key.to, eased(key.easing, done));
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
