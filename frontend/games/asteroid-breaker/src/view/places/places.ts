import { createRandom } from "@fz/core/random";
import { isOneOf } from "@fz/core/records";
import type { Place, Torus } from "../../rules/torus";
import { type Depth, type Star, starsOf } from "../field/specks";
import { endless } from "./endless";
import { innerBelt } from "./inner_belt";
import { ironReach } from "./iron_reach";
import type { Scenery, Site } from "./marks";
import { storm } from "./storm";

/** Every place the field shows, one a sector, in the order a run meets them. */
export const PLACE_IDS = [
  "inner-belt",
  "iron-reach",
  "storm",
  "endless",
] as const;

/** Names a place the field shows. */
export type PlaceId = (typeof PLACE_IDS)[number];

/**
 * Returns the place a sector of waves is shown in, named by its id; a
 * sector of waves made for a spec, which has no place of its own, is shown
 * in the first.
 */
export function placeOfSector(id: string): PlaceId {
  return isOneOf(id, PLACE_IDS) ? id : PLACE_IDS[0];
}

/**
 * Describes a place laid out on a field, in field units from its top left
 * corner: its sector's scenery, and the stars the run's seed strews.
 */
export interface Backdrop extends Scenery {
  readonly place: PlaceId;
  readonly width: number;
  readonly height: number;
  /** The run's stars, as many as the largest field holds, as shares of the field. */
  readonly stars: Readonly<Record<Depth, readonly Star[]>>;
}

/** Says what a place is laid out for: the place, the field's size, the run's seed, and where an Endless wave lays its constellation. */
export interface BackdropOptions {
  readonly place: PlaceId;
  readonly torus: Torus;
  readonly seed: number;
  /** The constellation's middle, as shares of the field, or null for none. */
  readonly constellation: Readonly<Place> | null;
}

/** How each place lays its scenery out on a site, Endless its constellation too. */
const SCENERY: Readonly<
  Record<
    PlaceId,
    (site: Site, constellation: Readonly<Place> | null) => Scenery
  >
> = {
  "inner-belt": innerBelt,
  "iron-reach": ironReach,
  storm,
  endless,
};

/**
 * Returns a place laid out on a field from a run's seed. Its landmark and
 * its wash are its own, the same every run, drawn from the place alone; the
 * seed strews the stars, which every place shares, and the air.
 */
export function backdropOf({
  place,
  torus,
  seed,
  constellation,
}: BackdropOptions): Backdrop {
  const index = PLACE_IDS.indexOf(place);
  const site: Site = {
    width: torus.width,
    height: torus.height,
    random: createRandom(index * 7919 + 101),
    strewn: createRandom(seed * 613 + index * 37 + 5),
  };
  return {
    place,
    width: torus.width,
    height: torus.height,
    stars: starsOf(seed),
    ...SCENERY[place](site, constellation),
  };
}
