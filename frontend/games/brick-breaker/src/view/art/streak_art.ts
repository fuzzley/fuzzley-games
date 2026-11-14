import {
  type ArtFrame,
  type ArtScale,
  ORIGIN,
  centered,
  circle,
  lineWidth,
  ring,
} from "@fz/phaser/shapes";
import { BALL_RADIUS } from "../../rules/tuning";

/** The names of the frames a streak's flourishes show, white, so the scene tints them as the balls are. */
export const STREAK_FRAMES = {
  /** A dot of a ball's tail, at its largest. */
  dot: "tail-dot",
  /** The ring about a ball as its streak steps, at its widest. */
  ring: "streak-ring",
} as const;

/** How far a dot of a ball's tail reaches from its middle at its largest, in field units: half as far as a ball. */
const DOT_RADIUS = BALL_RADIUS / 2;

/** How far the ring about a ball reaches at its widest, in field units: three times as far as a ball. */
export const STREAK_RING_RADIUS = 3 * BALL_RADIUS;

/** Returns the frames of a streak's flourishes, white: a dot of a ball's tail and the ring about a ball. */
export function streakArt(scale: ArtScale): readonly ArtFrame[] {
  const line = lineWidth(scale);
  return [
    centered(STREAK_FRAMES.dot, [
      circle(ORIGIN, Math.max(line, DOT_RADIUS * scale.unit), {
        color: 0xffffff,
      }),
    ]),
    centered(STREAK_FRAMES.ring, [
      ring(ORIGIN, STREAK_RING_RADIUS * scale.unit - line, {
        color: 0xffffff,
        width: 2 * line,
      }),
    ]),
  ];
}
