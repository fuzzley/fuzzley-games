import {
  type ArtFrame,
  type ArtScale,
  ORIGIN,
  centered,
  circle,
  lineWidth,
} from "@fz/phaser/shapes";
import { BALL_RADIUS } from "../../rules/tuning";

/** The names of the frames a streak's flourishes show, white, so the scene tints them as the balls are. */
export const STREAK_FRAMES = {
  /** A dot of a ball's tail, at its largest. */
  dot: "tail-dot",
} as const;

/** How far a dot of a ball's tail reaches from its middle at its largest, in field units: half as far as a ball. */
const DOT_RADIUS = BALL_RADIUS / 2;

/** Returns the frames of a streak's flourishes, white: a dot of a ball's tail. */
export function streakArt(scale: ArtScale): readonly ArtFrame[] {
  return [
    centered(STREAK_FRAMES.dot, [
      circle(ORIGIN, Math.max(lineWidth(scale), DOT_RADIUS * scale.unit), {
        color: 0xffffff,
      }),
    ]),
  ];
}
