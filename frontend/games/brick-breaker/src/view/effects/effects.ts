import { FrameSounds } from "@fz/core/frame_sounds";
import { canBreak } from "../../rules/bricks/bricks";
import type { FieldEvent, FieldEventKind, FieldView } from "../field/frame";

/** Every sound of the game's sprite, in the sprite's order. */
export const SOUNDS = [
  "paddle",
  "wall",
  "hit",
  "broken",
  "steel",
  "blast",
  "caught",
  "fired",
  "lost",
  "cleared",
] as const;

/** Names a sound of the game's sprite. */
export type SoundName = (typeof SOUNDS)[number];

/** How far a sound rises for each brick of a streak, in cents: a semitone. */
const STREAK_STEP_CENTS = 100;

/** The most a streak raises a sound, in cents: a fifth. */
const STREAK_MOST_CENTS = 700;

/**
 * Names a flourish the scene plays: a hit brick's pop, a broken one's
 * shards, a blast's ring, the field's shake, a lost ball's fade and a
 * regrown brick's growing back. Each moves, so none plays where motion
 * isn't welcome.
 */
export type Flourish = "pop" | "shards" | "ring" | "shake" | "fade" | "grow";

/** Says what an event calls for: the flourishes it plays, and its sound. */
export interface EventEffects {
  readonly flourishes: readonly Flourish[];
  /** Its sound, or null; a sound plays with motion or without. */
  readonly sound: SoundName | null;
}

/** The sound a level cleared plays, which a life by points and a new best share. */
export const CHIME: SoundName = "cleared";

/** What each event calls for, but a hit on steel, which rings. */
const EVENT_EFFECTS: Readonly<Record<FieldEventKind, EventEffects>> = {
  launched: { flourishes: [], sound: null },
  wall: { flourishes: [], sound: "wall" },
  paddle: { flourishes: [], sound: "paddle" },
  hit: { flourishes: ["pop"], sound: "hit" },
  broken: { flourishes: ["shards"], sound: "broken" },
  blast: { flourishes: ["ring", "shake"], sound: "blast" },
  regrown: { flourishes: ["grow"], sound: null },
  dropped: { flourishes: [], sound: null },
  caught: { flourishes: [], sound: "caught" },
  missed: { flourishes: [], sound: null },
  fired: { flourishes: [], sound: "fired" },
  netted: { flourishes: [], sound: "paddle" },
  lost: { flourishes: ["fade", "shake"], sound: "lost" },
  cleared: { flourishes: [], sound: CHIME },
};

/** What a hit on a brick that never breaks calls for. */
const UNBROKEN_HIT: EventEffects = { flourishes: ["pop"], sound: "steel" };

/** The flourishes played where motion isn't welcome. */
const STILL: readonly Flourish[] = [];

/** Returns what an event calls for, on the field as it stands. */
export function effectsOf(
  event: Readonly<FieldEvent>,
  field: FieldView,
): EventEffects {
  const brick = field.bricks[event.cell];
  if (event.kind === "hit" && brick && !canBreak(brick)) return UNBROKEN_HIT;
  return EVENT_EFFECTS[event.kind];
}

/**
 * Returns how far an event's sound is raised, in cents: a broken brick's by
 * a semitone for each brick of its streak before it, up to a fifth, which
 * rewards a streak by ear; any other's not at all.
 */
export function detuneOf(event: Readonly<FieldEvent>): number {
  if (event.kind !== "broken" || event.streak < 2) return 0;
  return Math.min((event.streak - 1) * STREAK_STEP_CENTS, STREAK_MOST_CENTS);
}

/** Returns what gathers a frame's sounds, so each of {@link SOUNDS} plays once a frame at most. */
export function createFrameSounds(): FrameSounds<SoundName> {
  return new FrameSounds(SOUNDS);
}

/** Returns the flourishes an event's effects play: all of them where motion is welcome, else none. */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : STILL;
}
