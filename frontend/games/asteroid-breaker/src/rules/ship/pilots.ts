// The pilots: the crew aboard, the one at the controls and the line in tow
// behind, the strays brought home past the most, and the color each new
// pilot is given. The rules know a pilot only as its color's number, as
// Brick Breaker's levels know a brick's tint, and the view gives the number
// its ink.

import { FIRST_CREW, MOST_CREW } from "../tuning";

/** A pilot, by its color's number, from 0 to under {@link PILOT_COLORS}. */
export type Pilot = number;

/** How many colors pilots are given, in turn. */
export const PILOT_COLORS = 8;

/**
 * Describes who is at the controls, who rides in tow, who waits at home,
 * and the color last given, a value each change replaces.
 */
export interface Crew {
  /** The pilot at the controls, or null once the run is over, when no one is in tow either. */
  readonly pilot: Pilot | null;
  /** The pilots in tow behind, in the order they ride, the next to take the controls first. */
  readonly tow: readonly Pilot[];
  /** The strays brought home with the most of the crew aboard, in the order they came. */
  readonly home: readonly Pilot[];
  /** The color last given to a new pilot or a stray, from which the next is counted. */
  readonly lastGiven: Pilot;
}

/**
 * Returns a run's first crew: a pilot at the controls and the rest of its
 * first crew in tow, in the first colors, and no one at home.
 */
export function createCrew(): Crew {
  return {
    pilot: 0,
    tow: Array.from({ length: FIRST_CREW - 1 }, (_, place) => place + 1),
    home: [],
    lastGiven: FIRST_CREW - 1,
  };
}

/**
 * Returns the pilot at the controls.
 *
 * @throws {RangeError} For a crew with no one at the controls, whose run is over.
 */
export function atControls(crew: Crew): Pilot {
  if (crew.pilot === null) throw new RangeError("No pilot is at the controls.");
  return crew.pilot;
}

/** Returns how many of the crew are aboard: the pilot at the controls and those in tow. */
export function aboard(crew: Crew): number {
  return crew.pilot === null ? 0 : 1 + crew.tow.length;
}

/** Returns the pilots aboard, the one at the controls first, then those in tow in order. */
export function pilotsAboard(crew: Crew): readonly Pilot[] {
  return crew.pilot === null ? [] : [crew.pilot, ...crew.tow];
}

/**
 * Returns the color a new pilot or a stray is given: the next in turn after
 * the last given that no pilot wears, aboard, at home or adrift, or, once
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
 * Returns the crew with the pilot at the controls bailed out of its lost ship,
 * the first in tow taking the controls, or no one with none in tow.
 */
export function bailOut(crew: Crew): Crew {
  const [next = null, ...rest] = crew.tow;
  return { ...crew, pilot: next, tow: rest };
}

/**
 * Returns the crew with a stray brought home, last in tow, or, with the
 * most of the crew aboard, waiting at home behind those home before it.
 *
 * @throws {RangeError} For a crew with no one at the controls, whose run is over.
 */
export function bringHome(crew: Crew, stray: Pilot): Crew {
  if (crew.pilot === null) throw new RangeError("No pilot is at the controls.");
  if (aboard(crew) < MOST_CREW) return { ...crew, tow: [...crew.tow, stray] };
  return { ...crew, home: [...crew.home, stray] };
}

/** Returns whether a pilot aboard, at home or adrift wears a color. */
function isWorn(crew: Crew, adrift: Pilot | null, color: Pilot): boolean {
  return (
    color === adrift ||
    color === crew.pilot ||
    crew.tow.includes(color) ||
    crew.home.includes(color)
  );
}
