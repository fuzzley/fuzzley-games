import { createRandom } from "@fz/core/random";
import type { Place, Torus } from "../rules/torus";
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../rules/tuning";

/** How many specks the field holds for each {@link SPECK_AREA} of it: three dozen. */
export const SPECKS_PER_AREA = 36;

/** The area {@link SPECKS_PER_AREA} specks are strewn over, in square field units. */
export const SPECK_AREA = 1600;

/** Returns how many specks a field of a size holds: three dozen for each 1,600 units² of it. */
export function speckCount(torus: Torus): number {
  return Math.round(
    (SPECKS_PER_AREA * torus.width * torus.height) / SPECK_AREA,
  );
}

/** The most specks any field holds: the largest field's. */
export const MOST_SPECKS = speckCount({
  width: FIELD_LONGEST_SIDE,
  height: FIELD_SHORT_SIDE,
});

/**
 * Returns where the specks lie, from a run's seed, as shares of the field's
 * width and height, as many as the largest field holds, so a field reshaped
 * between waves keeps them where they were and shows as many as fit its
 * size, the first.
 */
export function speckShares(seed: number): readonly Place[] {
  const random = createRandom(seed);
  return Array.from({ length: MOST_SPECKS }, () => ({
    x: random(),
    y: random(),
  }));
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
  const random = createRandom(seed ^ Math.imul(wave, 0x165667b1));
  const margin = CONSTELLATION_SIZE / FIELD_SHORT_SIDE;
  const within = 1 - 2 * margin;
  return { x: margin + random() * within, y: margin + random() * within };
}
