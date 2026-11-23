// The names of the game's sounds, the one list the sound script builds the
// sprite from, the view's effects pick from and the scene plays by name, as
// the design's "Sound" lists them.

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
  // The "Rickashay!" call's own chord.
  "call",
] as const satisfies readonly string[];

/** A sound's name, such as "clank". */
export type SoundName = (typeof SOUNDS)[number];
