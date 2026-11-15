// The sounds the game played before the uplift, which the sound lab plays
// as its "before": their sprite, the WAV and its map beside this module,
// which the dev server alone serves and no build holds, and the names the
// sprite plays them under, as the view named them then.

import spritemap from "./sounds.json";
import spriteUrl from "./sounds.wav?url";

/** Every sound of the sprite before the uplift, in the sprite's order. */
export const BEFORE_SOUNDS = [
  "fired",
  "small",
  "medium",
  "large",
  "rung",
  "blast",
  "caught",
  "dashed",
  "warned",
  "lost",
  "cleared",
  "gained",
  "home",
  "thrust",
] as const;

/** Names a sound of the sprite before the uplift. */
export type BeforeName = (typeof BEFORE_SOUNDS)[number];

/** What played each sound before the uplift. */
export const BEFORE_PLAYS: Readonly<Record<BeforeName, string>> = {
  fired: "A shot, heard many times a second while fire is held.",
  small: "A small rock broken, raised along a chain.",
  medium: "A medium rock broken.",
  large: "A large rock or a boulder broken.",
  rung: "Iron hit that holds.",
  blast: "A blast, or the Nova.",
  caught: "A pickup caught.",
  dashed: "A dash.",
  warned: "A comet's warning.",
  lost: "A ship lost.",
  cleared: "A wave cleared.",
  gained: "A ship gained.",
  home: "A stray brought home.",
  thrust: "The thrust's hum, looped while the thrust is held.",
};

/** The sprite before the uplift: its address, as the bundler gives it, and its map. */
export const BEFORE_SPRITE = { url: spriteUrl, spritemap };
