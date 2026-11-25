// The names of the game's sounds, the one list the sound script builds the
// sprite from, the view's effects pick from and the scene plays by name, as
// the design's "Sound" lists them, and the ladder of notes a flight's rally
// climbs.

/** The game's twenty-five sounds, in the order the sprite holds them. */
export const SOUNDS = [
  // The shot's release.
  "release",
  // A hot shot's release.
  "hot-release",
  // A side wall's or the ceiling's knock.
  "knock",
  // A brick struck, its note climbing with the rally.
  "strike",
  // A brick broken.
  "break",
  // Steel's clank.
  "clank",
  // A ramp's ring.
  "ring",
  // A hatch's thud as it holds the fuzzball up.
  "thud",
  // The hatches swinging open.
  "swing",
  // A spring brick's break.
  "spring",
  // A gem struck.
  "gem",
  // A portal's pass.
  "portal",
  // A plated face met.
  "plate",
  // A lock's bolt sliding back.
  "bolt",
  // A lock opening.
  "unlock",
  // A floor bounce earned, a chord on the note the rally has reached.
  "earn",
  // A floor bounce spent.
  "spend",
  // The landing.
  "land",
  // A bored fuzzball's yawn.
  "yawn",
  // The wall's step.
  "step",
  // The wall's jump.
  "jump",
  // The danger line's warning.
  "danger",
  // A level's chime as it is cleared.
  "chime",
  // A level lost.
  "lost",
  // The "Rickaashay!" call's own chord.
  "call",
] as const satisfies readonly string[];

/** A sound's name, such as "clank". */
export type SoundName = (typeof SOUNDS)[number];

/**
 * How far the note a flight's rally has reached rises above its first
 * strike's, in cents, a strike at a time from the first: a step of the
 * key's five-note scale, C, D, E, G and A, a strike, two octaves up at the
 * eleventh, where it holds. They are the sound kit's steps of the key
 * (`@fz/dev/synth`'s `centsOf()`), copied, as the game imports nothing of
 * `@fz/dev`.
 */
export const RALLY_CENTS = [
  0, 200, 400, 700, 900, 1200, 1400, 1600, 1900, 2100, 2400,
] as const satisfies readonly number[];

/**
 * Returns how many cents a strike's note, and an earned floor bounce's
 * chord, rise at a rally: none at the first strike or before it, and the
 * ladder's top from the eleventh on.
 */
export function rallyCentsOf(rally: number): number {
  return RALLY_CENTS[Math.min(rally, RALLY_CENTS.length) - 1] ?? 0;
}
