// The beds: a loop under each place, and two layers over it that join as
// the multiplier climbs, which the scene holds each frame by these rules.

import { keysOf, recordOf } from "@fz/core/records";
import { PLACE_IDS, type PlaceId } from "../places/places";

/** The bed each place plays under its waves, by the name the sound kit gives its file. */
const BED_OF_PLACE = {
  "inner-belt": "bed-inner-belt",
  "iron-reach": "bed-iron-reach",
  storm: "bed-storm",
  endless: "bed-endless",
} as const satisfies Readonly<Record<PlaceId, string>>;

/** Names a place's bed, such as "bed-storm". */
type PlaceBed = (typeof BED_OF_PLACE)[PlaceId];

/**
 * The multiplier each layer over a bed joins at, by the name the sound kit
 * gives its file: the pulse's soft mallet eighths at ×3, static's second
 * step, and the shimmer's bells over it at ×4, its third and highest.
 */
const LAYERS_FROM = {
  "bed-pulse": 3,
  "bed-shimmer": 4,
} as const satisfies Readonly<Record<string, number>>;

/** Names a layer over a bed. */
type Layer = keyof typeof LAYERS_FROM;

/** The layers, the pulse then the shimmer, which join any bed. */
const LAYERS = keysOf(LAYERS_FROM);

/** Names a bed or a layer over one, such as "bed-storm". */
export type BedName = PlaceBed | Layer;

/** Every bed, each place's in its order, then every layer over one. */
export const BED_NAMES: readonly BedName[] = [
  ...PLACE_IDS.map((place) => BED_OF_PLACE[place]),
  ...LAYERS,
];

/**
 * The beds the scene fetches ahead while a wave is played before a place:
 * that place's bed and every layer, so each can join as soon as it is
 * wanted.
 */
const AHEAD_OF: Readonly<Record<PlaceId, readonly BedName[]>> = recordOf(
  PLACE_IDS,
  (place) => [BED_OF_PLACE[place], ...LAYERS],
);

/** Returns the bed a place plays under its waves. */
export function bedOf(place: PlaceId): BedName {
  return BED_OF_PLACE[place];
}

/** Returns whether a bed's name is a layer's, which joins any place's bed. */
function isLayer(name: BedName): name is Layer {
  return name in LAYERS_FROM;
}

/**
 * Returns whether a bed or a layer plays under a place at a multiplier:
 * the place's own bed always, another place's never, and each layer from
 * the multiplier it joins at.
 */
export function bedPlays(
  name: BedName,
  place: PlaceId,
  multiplier: number,
): boolean {
  return isLayer(name)
    ? multiplier >= LAYERS_FROM[name]
    : name === bedOf(place);
}

/**
 * Returns the beds to fetch ahead of a place's waves: its bed and every
 * layer, the same list each time, which the scene fetches each frame.
 */
export function bedsAhead(place: PlaceId): readonly BedName[] {
  return AHEAD_OF[place];
}
