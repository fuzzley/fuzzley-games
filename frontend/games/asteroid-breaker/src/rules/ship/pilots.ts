// The pilots: the crew aboard, the one at the controls and the line in tow
// behind, every fuzzball gone home in the run, and the color each new pilot
// is given. The rules know a pilot only as its color's number, as Brick
// Breaker's levels know a brick's tint, and the view gives the number its
// ink.

import { FIRST_CREW } from "../tuning";

/** A pilot, by its color's number, from 0 to under {@link PILOT_COLORS}. */
export type Pilot = number;

/** How many colors pilots are given, in turn. */
export const PILOT_COLORS = 8;

/**
 * Describes who is at the controls, who rides in tow, who has gone home,
 * and the color last given, a value each change replaces.
 */
export interface Crew {
  /** The pilot at the controls, or null once the run is over, when no one is in tow either. */
  readonly pilot: Pilot | null;
  /** The pilots in tow behind, in the order they ride, the last the first a hit knocks loose. */
  readonly tow: readonly Pilot[];
  /**
   * Every fuzzball gone home in the run, out of it, in the order they went:
   * a stray caught with the most in tow, one knocked loose that floated
   * home, and the pilot who bailed out as the run ended.
   */
  readonly home: readonly Pilot[];
  /** The color last given to a new pilot or a stray, from which the next is counted. */
  readonly lastGiven: Pilot;
}

/**
 * Returns a run's first crew: a pilot at the controls and the rest of its
 * first crew in tow, in the first colors, and no one gone home.
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
 * Returns the color a stray is given: the next in turn after the last
 * given that no pilot aboard wears, nor any other on the field, or, once
 * every color is worn, the next in turn. Those gone home are out of the
 * run, so their colors come round again.
 */
export function nextPilot(crew: Crew, onField: readonly Pilot[]): Pilot {
  const after = crew.lastGiven + 1;
  for (let turn = 0; turn < PILOT_COLORS; turn++) {
    const color = (after + turn) % PILOT_COLORS;
    if (!isWorn(crew, onField, color)) return color;
  }
  return after % PILOT_COLORS;
}

/** Returns the crew with a color counted as the last given, so the next is counted on from it. */
export function given(crew: Crew, color: Pilot): Crew {
  return { ...crew, lastGiven: color };
}

/**
 * Returns the crew with a pilot at the line in tow's end: a stray caught,
 * or one knocked loose caught again.
 *
 * @throws {RangeError} For a crew with no one at the controls, whose run is over.
 */
export function joinTow(crew: Crew, pilot: Pilot): Crew {
  atControls(crew);
  return { ...crew, tow: [...crew.tow, pilot] };
}

/** Returns the crew with the last in tow knocked loose, out of the line, or as it is with no one in tow. */
export function knockLoose(crew: Crew): Crew {
  if (crew.tow.length === 0) return crew;
  return { ...crew, tow: crew.tow.slice(0, -1) };
}

/** Returns the crew with a fuzzball gone home, out of the run, behind those home before it. */
export function goHome(crew: Crew, pilot: Pilot): Crew {
  return { ...crew, home: [...crew.home, pilot] };
}

/**
 * Returns the crew with the pilot at the controls bailed out home, as a hit
 * with no one in tow ends the run.
 *
 * @throws {RangeError} For a crew with no one at the controls, whose run is
 *   over already, or with someone in tow, whom a hit knocks loose instead.
 */
export function bailOut(crew: Crew): Crew {
  const pilot = atControls(crew);
  if (crew.tow.length > 0) {
    throw new RangeError("A pilot bails out only with no one in tow.");
  }
  return { ...goHome(crew, pilot), pilot: null };
}

/** Returns whether a pilot aboard, or any other on the field, wears a color. */
function isWorn(crew: Crew, onField: readonly Pilot[], color: Pilot): boolean {
  return (
    color === crew.pilot || crew.tow.includes(color) || onField.includes(color)
  );
}
