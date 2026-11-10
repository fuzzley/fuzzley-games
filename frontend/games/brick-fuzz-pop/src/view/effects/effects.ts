/** The game's twenty sounds, in the order the sprite holds them. */
export const SOUNDS = [
  "notch",
  "release",
  "boon",
  "knock",
  "strike",
  "break",
  "punch",
  "clank",
  "zap",
  "blast",
  "bump",
  "portal",
  "cage",
  "land",
  "yawn",
  "step",
  "jump",
  "danger",
  "chime",
  "lost",
] as const;

/** A sound's name, such as "zap". */
export type SoundName = (typeof SOUNDS)[number];
