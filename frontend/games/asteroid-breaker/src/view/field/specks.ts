import { createRandom, mixSeed } from "@fz/core/random";
import { recordOf } from "@fz/core/records";
import type { Place, Torus } from "../../rules/torus";
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../../rules/tuning";

/**
 * Every depth of the field's stars, farthest first: the far, which never
 * move, and the two nearer, which slide a little as the pod flies.
 */
export const DEPTHS = ["far", "mid", "bright"] as const;

/** Names a depth of the field's stars. */
export type Depth = (typeof DEPTHS)[number];

/** How many stars of each depth the field holds for each {@link STAR_AREA} of it. */
export const STARS_PER_AREA: Readonly<Record<Depth, number>> = {
  far: 96,
  mid: 34,
  bright: 3.4,
};

/** The area {@link STARS_PER_AREA} stars are strewn over, in square field units. */
export const STAR_AREA = 1600;

/** The least and the most radius of a star of each depth, in field units. */
export const STAR_SIZES: Readonly<Record<Depth, readonly [number, number]>> = {
  far: [0.055, 0.09],
  mid: [0.1, 0.15],
  bright: [0.13, 0.17],
};

/**
 * Describes a star: where it lies, as shares of the field's width and
 * height, its radius, in field units, and how bright it is among its
 * depth's, from 0 to 1.
 */
export interface Star {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly shine: number;
}

/** Returns how many stars of a depth a field of a size holds, by its area. */
export function starCount(depth: Depth, torus: Torus): number {
  return Math.round(
    (STARS_PER_AREA[depth] * torus.width * torus.height) / STAR_AREA,
  );
}

/** The most stars of each depth any field holds: the largest field's. */
export const MOST_STARS: Readonly<Record<Depth, number>> = recordOf(
  DEPTHS,
  (depth) =>
    starCount(depth, { width: FIELD_LONGEST_SIDE, height: FIELD_SHORT_SIDE }),
);

/**
 * Returns the field's stars from a run's seed, each depth's from a stream of
 * its own, as many as the largest field holds, so a field reshaped between
 * waves keeps them where they were and shows as many as fit its size, the
 * first.
 */
export function starsOf(
  seed: number,
): Readonly<Record<Depth, readonly Star[]>> {
  return recordOf(DEPTHS, (depth) => {
    const random = createRandom(seed * 31 + (DEPTHS.indexOf(depth) + 1) * 977);
    const [least, most] = STAR_SIZES[depth];
    return Array.from({ length: MOST_STARS[depth] }, () => ({
      x: random(),
      y: random(),
      r: least + (most - least) * random(),
      shine: random(),
    }));
  });
}

/** How wide an Endless wave's constellation is drawn, across the fuzzball's size, in field units. */
export const CONSTELLATION_SIZE = 10;

/**
 * Returns where an Endless wave's constellation lies, its middle as shares
 * of the field's width and height, from the run's seed and the wave's
 * number, so each wave's lies elsewhere: as far in from every edge as it
 * is wide on the smallest field, so it never wraps.
 */
export function constellationAt(seed: number, wave: number): Place {
  const random = createRandom(mixSeed(seed, wave, "scenery"));
  const margin = CONSTELLATION_SIZE / FIELD_SHORT_SIDE;
  const within = 1 - 2 * margin;
  return { x: margin + random() * within, y: margin + random() * within };
}
