// What the specs that fly shots share: a shot at a wall drawn as a picture,
// flown by the bricks' own rules, and a flight's events of one kind.

import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import { BRICK_KINDS, type BrickKinds } from "../rules/catalog/bricks";
import type { Flight, FlightEvent } from "../rules/flight/events";
import { type Flown, fly } from "../rules/flight/flight";
import { AIMS_PER_DEGREE, BORED, FIRST_AIM_DEGREES } from "../rules/tuning";
import { wallFrom } from "./wall_picture";

/** Describes a shot at a wall drawn as a picture. */
export interface PictureShot {
  readonly picture: readonly string[];
  /** The field row the picture's lowest row stands in: 3 unless given. */
  readonly lowestRow?: number;
  /** Where the fuzzball leaves from: the floor's middle unless given. */
  readonly x?: number;
  /** The aim's angle, in degrees counter-clockwise from the floor on the right: straight up unless given. */
  readonly degrees?: number;
  readonly charge?: number;
  readonly hot?: boolean;
  /** The kinds the picture's characters stand for: the catalog's unless given. */
  readonly kinds?: BrickKinds;
}

/** Returns the flight of a shot at a wall drawn as a picture, in a field 11 deep, by the bricks' own rules. */
export function flyPicture({
  picture,
  lowestRow = 3,
  x = 4.5,
  degrees = 90,
  charge = 0,
  hot = false,
  kinds = BRICK_KINDS,
}: PictureShot): Flown {
  const wall = wallFrom(picture, { lowestRow });
  const aim = (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
  return fly(
    { wall, depth: 11, x, aim, charge, hot, mates: 0, friends: 0 },
    { bored: BORED, kinds, traits: TRAIT_RULES },
  );
}

/** Returns a flight's events of a kind. */
export function eventsOf<K extends FlightEvent["kind"]>(
  { flight }: { readonly flight: Flight },
  kind: K,
): Extract<FlightEvent, { readonly kind: K }>[] {
  return flight.events.filter(
    (event): event is Extract<FlightEvent, { readonly kind: K }> =>
      event.kind === kind,
  );
}
