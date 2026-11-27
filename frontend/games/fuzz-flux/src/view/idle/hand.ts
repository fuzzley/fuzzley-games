// The hand that shows a teaching level's own first move, again and again
// until it is made: it shows on the first fuzzball, slides to the second,
// and fades away, as the sketch's page draws it. With Less motion it
// slides at its size, with no growing in or out: the slide shows which way
// to swap, which the design's Less motion keeps, as it keeps a swap.

import type { Hint } from "../../rules/levels/level";
import { FRAMES } from "../art/frame_names";
import type { FeelTuning } from "../timeline/feel";
import type { Motion } from "../timeline/less_motion";
import { RAISED, lookAt } from "../timeline/looks";
import { type Frame, sampleAt } from "../timeline/sample";
import type { Key, SpriteTrack, Timeline } from "../timeline/timeline";

/**
 * Returns the timeline of the hand showing a move once, a loose sprite of
 * the hand's frame from the move's first square to its second, in the
 * motion the player sets, which `sampleHand()` plays again and again.
 */
export function handTimeline(
  move: Hint,
  feel: FeelTuning,
  motion: Motion,
): Timeline {
  return {
    pieces: [],
    sprites: [handTrack(move, feel, motion)],
    effects: [],
    flights: [],
    counts: [],
    dust: [],
    marks: [],
    sounds: [],
    dim: [],
    restMs: feel.handLoopMs,
    end: null,
  };
}

/**
 * Writes where the hand stands a while into its showing into a frame's
 * records, and returns them, its timeline played again from its start each
 * time it ends.
 */
export function sampleHand(
  hand: Timeline,
  feel: FeelTuning,
  sinceMs: number,
  into: Frame,
): Frame {
  return sampleAt(hand, feel, sinceMs % hand.restMs, into);
}

/**
 * Returns the hand's track over a showing of a move, over everything on
 * the board: shown on its first square, slid to the second and gone there,
 * in full shrinking in as it shows and growing as it goes, and with Less
 * motion at its size throughout.
 */
function handTrack(move: Hint, feel: FeelTuning, motion: Motion): SpriteTrack {
  const scale = motion === "full" ? feel.handScale : 1;
  const atMs = (share: number): number => share * feel.handLoopMs;
  const shows = (to: number): Key => ({
    atMs: atMs(feel.handShowsFrom),
    ms: atMs(feel.handSlidesFrom - feel.handShowsFrom),
    to,
    easing: "in-out",
  });
  const slides = (to: number): Key => ({
    atMs: atMs(feel.handSlidesFrom),
    ms: atMs(feel.handSlidesTo - feel.handSlidesFrom),
    to,
    easing: "in-out",
  });
  const goes = (to: number): Key => ({
    atMs: atMs(feel.handGoesFrom),
    ms: atMs(1 - feel.handGoesFrom),
    to,
    easing: "in-out",
  });
  return {
    drawn: { what: "frame", frame: FRAMES.hand },
    fromMs: 0,
    untilMs: feel.handLoopMs,
    look: {
      ...lookAt(move.from),
      scaleX: scale,
      scaleY: scale,
      fade: 1,
      raise: RAISED.top,
    },
    keys: {
      x: [slides(move.to.x)],
      y: [slides(move.to.y)],
      scaleX: [shows(1), goes(scale)],
      scaleY: [shows(1), goes(scale)],
      fade: [shows(1 - feel.handOpacity), goes(1)],
    },
  };
}
