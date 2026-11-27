// How each flourish a move spawns looks a share through its life, as the
// sketch draws it, for the scene to play from its moment on: a wave's
// mark fading in as it pops up, then rising and fading away; a ring
// spreading and thinning; a flash fading; a bolt fading as it flickers; a
// square's puff of dust spreading as it fades; and a dasher's streak
// running its line, shown only from where it set out to a little past the
// board's edge. And the color each effect's ink is drawn in.

import type { BoardPalette } from "../colors/palette";
import { eased } from "../timeline/easing";
import type { FeelTuning } from "../timeline/feel";
import type { Effect, Ink } from "../timeline/timeline";

/** How far through its showing a wave's mark has faded in, a share of it. */
const MARK_IN = 0.2;

/** How much larger than its size a wave's mark pops in, a share of it. */
const MARK_POP = 0.3;

/** How many times faster than its showing a wave's mark springs back from its pop. */
const MARK_POP_PACE = 3;

/** Returns how opaque a wave's mark is a share through its showing: fading in over its first fifth, and out over the rest. */
export function markAlpha(done: number): number {
  return done < MARK_IN ? done / MARK_IN : (1 - done) / (1 - MARK_IN);
}

/** Returns how large a wave's mark is drawn a share through its showing, as a scale of its size: popping in larger, and springing back. */
export function markScale(done: number): number {
  return (
    1 + MARK_POP * (1 - eased("spring", Math.min(1, done * MARK_POP_PACE)))
  );
}

/** Returns how far a wave's mark has risen from its place a share through its showing, in squares. */
export function markRise(done: number, feel: FeelTuning): number {
  return done * feel.markRiseSquares;
}

/** Returns the color an effect's ink is drawn in, in a palette: a kind's, the frizzball's, or the effects' white. */
export function inkOf(ink: Ink, palette: BoardPalette): number {
  switch (ink) {
    case "white":
      return palette.flare;
    case "frizzball":
      return palette.frizzball.body;
    default:
      return palette.kinds[ink];
  }
}

/** How far across a ring starts, in squares, as it spreads from it. */
const RING_START = 0.25;

/** How wide a ring's line is as it starts, in squares. */
const RING_LINE = 0.09;

/** How much of its line's width a ring has lost once it has spread. */
const RING_THINNING = 0.6;

/** How opaque a ring is as it starts. */
const RING_ALPHA = 0.9;

/** Returns how opaque a ring is a share through its spreading, fading ever more slowly. */
export function ringAlpha(done: number): number {
  return (1 - done) ** 1.5 * RING_ALPHA;
}

/** Returns how far across a ring has spread a share through its spreading, in squares, to as far as it spreads. */
export function ringRadius(done: number, radius: number): number {
  return RING_START + (radius - RING_START) * eased("out", done);
}

/** Returns how wide a ring's line is a share through its spreading, in squares, thinning as it goes. */
export function ringLine(done: number): number {
  return RING_LINE * (1 - RING_THINNING * done);
}

/** How opaque a flash is as it starts. */
const FLASH_ALPHA = 0.55;

/** Returns how opaque a flash is a share through its showing, fading to nothing. */
export function flashAlpha(done: number): number {
  return (1 - done) * FLASH_ALPHA;
}

/** Returns how opaque a bolt of static is a share through its showing, fading ever faster. */
export function boltAlpha(done: number): number {
  return 1 - done * done;
}

/** How long a bolt's zigzag holds before it flips across its line, as the sketch draws it anew. */
const BOLT_JAG_MS = 45;

/** Returns whether a bolt of static is drawn flipped across its line a time into its showing, as it flickers. */
export function boltFlipped(sinceMs: number): boolean {
  return Math.floor(sinceMs / BOLT_JAG_MS) % 2 === 1;
}

/** How opaque a square's puff of dust is as a layer comes off. */
const PUFF_ALPHA = 0.7;

/** How far a puff of dust reaches from its square's middle as it starts, in squares. */
const PUFF_START = 0.3;

/** How much further it reaches once it has spread, in squares. */
const PUFF_SPREAD = 0.4;

/** Returns how opaque a square's puff of dust is a share through its showing, fading as it spreads. */
export function dustPuffAlpha(done: number): number {
  return (1 - eased("out", done)) * PUFF_ALPHA;
}

/** Returns how far a square's puff of dust reaches from its middle a share through its showing, in squares. */
export function dustPuffRadius(done: number): number {
  return PUFF_START + PUFF_SPREAD * eased("out", done);
}

/** How far past the board's edge a dasher's streak shows, in squares, as the sketch clips it. */
const STREAK_CLIP = 0.3;

/** A dasher's streak as an effect. */
export type Streak = Extract<Effect, { readonly what: "streak" }>;

/**
 * Describes a dasher's streak as it runs: where its head's middle is, in
 * squares, the way it runs, in radians, and how far behind the head and
 * ahead of it it shows, in squares from the head's middle.
 */
export interface StreakRun {
  x: number;
  y: number;
  angle: number;
  /** How far behind its head it shows: no further than where it set out. */
  behind: number;
  /** How far ahead of its head's middle it shows: no further than a little past the board's edge, and less than nothing once its head has run past. */
  ahead: number;
}

/**
 * Writes where a dasher's streak has run a share through its running, on a
 * board of a size in squares, into a record, and returns it: its head a
 * square a step of the dasher's, from where it sets out to where it ends.
 */
export function streakAt(
  streak: Streak,
  done: number,
  board: { readonly width: number; readonly height: number },
  into: StreakRun,
): StreakRun {
  const { from, to } = streak;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  into.x = from.x + dx * done;
  into.y = from.y + dy * done;
  into.angle = Math.atan2(dy, dx);
  into.behind = length * done;
  into.ahead = Math.min(
    reachAlong(into.x, dx / length, board.width),
    reachAlong(into.y, dy / length, board.height),
  );
  return into;
}

/** Returns how far a place may go along one of the board's ways, a share of a step along it at a time, before it passes the streaks' clip: as far as it likes where it goes along the other way alone. */
export function reachAlong(at: number, step: number, squares: number): number {
  if (step === 0) return Number.POSITIVE_INFINITY;
  const edge = step > 0 ? squares - 0.5 + STREAK_CLIP : -0.5 - STREAK_CLIP;
  return (edge - at) / step;
}
