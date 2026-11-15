// The crew as the bar shows them beside the face cam of the pilot at the
// controls: each in tow and each knocked loose while the bar has room for
// them, else a count, and the words a screen reader hears for what it
// shows.

import { type Crew, type Pilot, aboard } from "../rules/ship/pilots";

/** The most of the crew the bar draws beside the face cam before it counts them instead. */
export const MOST_DRAWN = 3;

/**
 * Describes the crew beside the face cam, where the bar has room for them:
 * the pilots drawn in tow, those knocked loose drawn after them, and the
 * number beside them once the bar counts them, or null.
 */
export interface CrewLine {
  readonly drawn: readonly Pilot[];
  readonly loose: readonly Pilot[];
  readonly count: number | null;
}

/**
 * Returns the crew beside the face cam: each in tow, in the order they
 * ride, and each knocked loose, the last knocked first, while there are
 * {@link MOST_DRAWN} or fewer of them; past that, the first in tow and how
 * many ride, or, with no one in tow, the first knocked loose and how many
 * are.
 */
export function crewLineOf(
  tow: readonly Pilot[],
  loose: readonly Pilot[],
): CrewLine {
  if (tow.length + loose.length <= MOST_DRAWN) {
    return { drawn: tow, loose, count: null };
  }
  return tow.length > 0
    ? { drawn: tow.slice(0, 1), loose: [], count: tow.length }
    : { drawn: [], loose: loose.slice(0, 1), count: loose.length };
}

/**
 * Returns the words a screen reader hears for the crew the bar shows,
 * beside the pilot at the controls: how many are in tow where it draws
 * them, or how many are aboard, the pilot among them, where it gives that
 * number on the face cam; and how many are knocked loose.
 */
export function crewWords(
  crew: Readonly<Crew>,
  loose: readonly Pilot[],
  shows: "line" | "aboard",
): string {
  const words =
    shows === "aboard" ? `${String(aboard(crew))} aboard` : inTowWords(crew);
  return loose.length === 0
    ? words
    : `${words}, ${String(loose.length)} knocked loose`;
}

/** Returns how many of a crew ride in tow, in words. */
function inTowWords({ tow }: Readonly<Crew>): string {
  return tow.length === 0 ? "No one in tow" : `${String(tow.length)} in tow`;
}
