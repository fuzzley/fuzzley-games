// The pilots: the crew flying the run's ships, the strays brought home to
// fly the next, and the color each new pilot is given. The rules know a
// pilot only as its color's number, as Brick Breaker's levels know a
// brick's tint, and the view gives the number its ink.

import type { FieldEventLog } from "../field/events";
import type { Strays } from "../hazards/hazards";
import type { Place, Torus } from "../torus";
import { FIRST_SHIPS, MAX_SHIPS } from "../tuning";

/** A pilot, by its color's number, from 0 to under {@link PILOT_COLORS}. */
export type Pilot = number;

/** How many colors pilots are given, in turn. */
export const PILOT_COLORS = 8;

/**
 * Describes who flies the run's ships, who waits at home to fly the next,
 * and the color last given, a value each change replaces.
 */
export interface Crew {
  /** The pilots of the run's ships, in the order they fly, the one at the controls first. */
  readonly flying: readonly Pilot[];
  /** The strays brought home, in the order they came, each to fly the next ship the run gains. */
  readonly home: readonly Pilot[];
  /** The color last given to a new pilot or a stray, from which the next is counted. */
  readonly lastGiven: Pilot;
}

/** Describes what of the field a ship gained changes: its crew, by the stray adrift, and its log. */
export interface CrewField {
  crew: Crew;
  readonly strays: Readonly<Strays>;
  /** The ship in play, where a ship gained is logged, or null between ships. */
  readonly ship: Readonly<Place> | null;
  readonly torus: Torus;
  readonly events: FieldEventLog;
}

/** Returns a run's first crew: a pilot for each of its first ships, in the first colors, and no one at home. */
export function createCrew(): Crew {
  return {
    flying: Array.from({ length: FIRST_SHIPS }, (_, color) => color),
    home: [],
    lastGiven: FIRST_SHIPS - 1,
  };
}

/**
 * Returns the pilot at the controls of the ship in play, the first flying.
 *
 * @throws {RangeError} For a crew with no one flying, whose run is over.
 */
export function atControls(crew: Crew): Pilot {
  const [pilot] = crew.flying;
  if (pilot === undefined) throw new RangeError("No pilot is flying.");
  return pilot;
}

/**
 * Returns the color a new pilot or a stray is given: the next in turn after
 * the last given that no pilot wears, flying, at home or adrift, or, once
 * every color is worn, the next in turn.
 */
export function nextPilot(crew: Crew, adrift: Pilot | null): Pilot {
  const after = crew.lastGiven + 1;
  for (let turn = 0; turn < PILOT_COLORS; turn++) {
    const color = (after + turn) % PILOT_COLORS;
    if (!isWorn(crew, adrift, color)) return color;
  }
  return after % PILOT_COLORS;
}

/** Returns the crew with a color counted as the last given, so the next is counted on from it. */
export function given(crew: Crew, color: Pilot): Crew {
  return { ...crew, lastGiven: color };
}

/**
 * Returns the crew with a ship gained, flown by the first stray at home,
 * or, with no one at home, by a new pilot; a crew of the most ships gains
 * none.
 */
export function gainShip(crew: Crew, adrift: Pilot | null): Crew {
  if (crew.flying.length >= MAX_SHIPS) return crew;
  const [first, ...rest] = crew.home;
  if (first !== undefined) {
    return { ...crew, flying: [...crew.flying, first], home: rest };
  }
  const pilot = nextPilot(crew, adrift);
  return { ...given(crew, pilot), flying: [...crew.flying, pilot] };
}

/**
 * Gains the field's crew a ship, as `gainShip()` does, a new pilot skipping
 * the color of the stray adrift, and logs its pilot, and whether it was
 * brought home, at the ship, or the field's middle between ships.
 */
export function gainShipOn(field: CrewField): void {
  const { adrift } = field.strays;
  const { flying, home } = field.crew;
  field.crew = gainShip(field.crew, adrift.live ? adrift.pilot : null);
  const fromHome = field.crew.home.length < home.length;
  const x = field.ship?.x ?? field.torus.width / 2;
  const y = field.ship?.y ?? field.torus.height / 2;
  for (const pilot of field.crew.flying.slice(flying.length)) {
    field.events.addGained(x, y, pilot, fromHome, field.crew);
  }
}

/** Returns the crew with the pilot at the controls bailed out of its lost ship, the next in line taking them. */
export function bailOut(crew: Crew): Crew {
  return { ...crew, flying: crew.flying.slice(1) };
}

/** Returns the crew with a stray brought home, waiting behind those home before it. */
export function bringHome(crew: Crew, stray: Pilot): Crew {
  return { ...crew, home: [...crew.home, stray] };
}

/** Returns whether a pilot flying, at home or adrift wears a color. */
function isWorn(crew: Crew, adrift: Pilot | null, color: Pilot): boolean {
  return (
    color === adrift || crew.flying.includes(color) || crew.home.includes(color)
  );
}
