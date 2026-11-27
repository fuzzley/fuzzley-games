// The red kind, spiky: twelve straight, sharp spikes, long and short in
// turn, filled and rounded a little at their corners, so its outline is a
// star.

import { type DrawCommand, ORIGIN, polygon, stroke } from "@fz/phaser/shapes";
import { BODY, polar } from "../design_square";
import type { KindArt } from "./kind_art";

/** How many spikes it has. */
const SPIKES = 12;

/**
 * Says how a spike is drawn: how far out its root's corners lie, in the
 * body's radii; how far its long tips and its short ones reach, in the
 * body's radii; how much further they reach on end, as a share; how wide
 * its root is, as a share of its room round the body; and the line round
 * it, in the body's radii, that rounds its corners.
 */
const SPIKE = {
  root: 0.9,
  long: 1.5,
  short: 1.26,
  rise: 0.14,
  spread: 0.86,
  rounding: 0.08,
} as const;

/** The red kind's art, which sits in the middle of its square. */
export const RED: KindArt = {
  seat: ORIGIN,
  fur: (ink, lift) =>
    Array.from({ length: SPIKES }, (_, i): readonly DrawCommand[] => {
      const angle = (i / SPIKES) * 2 * Math.PI - Math.PI / 2;
      const reach = (i % 2 === 0 ? SPIKE.long : SPIKE.short) * BODY;
      const half = (Math.PI / SPIKES) * SPIKE.spread;
      const left = polar(angle - half, BODY * SPIKE.root);
      const corners = [
        left,
        polar(angle, reach * (1 + lift * SPIKE.rise)),
        polar(angle + half, BODY * SPIKE.root),
      ];
      return [
        polygon(corners, { color: ink }),
        ...stroke([...corners, left], {
          color: ink,
          width: BODY * SPIKE.rounding,
        }),
      ];
    }).flat(),
};
