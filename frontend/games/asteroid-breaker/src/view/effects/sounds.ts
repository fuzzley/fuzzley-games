import { FrameSounds } from "@fz/core/frame_sounds";
import { type RockSize, hasTrait } from "../../rules/catalog/rocks";
import {
  type FieldEvent,
  type FieldEventKind,
  rockKindOf,
  rockSizeOf,
} from "../field/frame";

/** Every sound of the game's sprite, in the sprite's order. */
export const SOUNDS = [
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

/** Names a sound of the game's sprite. */
export type SoundName = (typeof SOUNDS)[number];

/** The sound the thrust hums while it is held, which no event plays. */
export const THRUST: SoundName = "thrust";

/** How far a break's sound rises for each break of its chain before it, in cents: a semitone. */
export const CHAIN_STEP_CENTS = 100;

/** The most a chain raises a break's sound, in cents: a fifth. */
export const CHAIN_MOST_CENTS = 700;

/** The sound each size of rock breaks with, from a boulder's low thump to a small rock's crack. */
const BREAK_SOUNDS: Readonly<Record<RockSize, SoundName>> = {
  boulder: "large",
  large: "large",
  medium: "medium",
  small: "small",
};

/**
 * The sound each event plays, or null for one that plays none, but a rock's
 * break and a hit it holds, which its kind and size decide.
 */
const EVENT_SOUNDS: Readonly<
  Record<Exclude<FieldEventKind, "broken" | "hit">, SoundName | null>
> = {
  fired: "fired",
  dashed: "dashed",
  // The plan's sounds name none for it; iron's ring tells the guard is gone.
  shielded: "rung",
  nova: "blast",
  warned: "warned",
  cleared: "cleared",
  rung: "rung",
  blast: "blast",
  dropped: null,
  caught: "caught",
  faded: null,
  lost: "lost",
  // The crew's own sounds are a later package's to choose.
  knocked: null,
  recaught: null,
  floated: null,
  strayed: null,
  joined: null,
  home: "home",
  scored: null,
};

/**
 * Returns the sound an event plays, or null for none.
 *
 * A rock's break plays its size's sound, and so does a hit it holds, as no
 * sound is a held hit's own and the five hits a boulder holds would
 * otherwise go unheard; but a rock that rings logs its ring as it holds a
 * hit, and the ring is heard for both.
 *
 * @throws {RangeError} For a rock's break that names no size, or a hit it
 *   holds that names no kind or size, which the field's log never records.
 */
export function soundOf(event: Readonly<FieldEvent>): SoundName | null {
  switch (event.kind) {
    case "broken":
      return BREAK_SOUNDS[rockSizeOf(event)];
    case "hit":
      return hasTrait(rockKindOf(event), "rings")
        ? null
        : BREAK_SOUNDS[rockSizeOf(event)];
    default:
      return EVENT_SOUNDS[event.kind];
  }
}

/**
 * Returns how far an event's sound is raised, in cents: a broken rock's by
 * a semitone for each break of its chain before it, up to a fifth, which
 * rewards a chain by ear; any other's, and a smashed rock's, not at all, as
 * they count in no chain.
 */
export function detuneOf(event: Readonly<FieldEvent>): number {
  const before = Math.max(event.chain - 1, 0);
  return Math.min(before * CHAIN_STEP_CENTS, CHAIN_MOST_CENTS);
}

/** Returns what gathers a frame's sounds, so each of {@link SOUNDS} plays once a frame at most. */
export function createFrameSounds(): FrameSounds<SoundName> {
  return new FrameSounds(SOUNDS);
}
