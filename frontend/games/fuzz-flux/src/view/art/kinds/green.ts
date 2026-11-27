// The green kind, curly: nine round curls about its body, a scalloped edge
// like a sheep's, so its outline is a flower with no strand at all.

import { ORIGIN, circle } from "@fz/phaser/shapes";
import { BODY, polar } from "../design_square";
import type { KindArt } from "./kind_art";

/** How many curls it has, the first at its top. */
const CURLS = 9;

/**
 * Says how its curls are drawn, in the body's radii: how far out their
 * middles lie at rest and how much further on end, and their radius at
 * rest and how much it grows on end.
 */
const CURL = { out: 0.88, rise: 0.1, radius: 0.36, swell: 0.03 } as const;

/** The green kind's art, which sits in the middle of its square. */
export const GREEN: KindArt = {
  seat: ORIGIN,
  fur: (ink, lift) =>
    Array.from({ length: CURLS }, (_, i) =>
      circle(
        polar(
          (i / CURLS) * 2 * Math.PI - Math.PI / 2,
          BODY * (CURL.out + lift * CURL.rise),
        ),
        BODY * (CURL.radius + lift * CURL.swell),
        { color: ink },
      ),
    ),
};
