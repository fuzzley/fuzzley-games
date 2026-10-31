import { canBreak } from "../rules/bricks";
import type { FieldEvent, FieldEventKind, FieldView } from "./frame";

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

/** What `FrameSounds` holds for a sound not heard: below any rise or fall. */
const UNHEARD = Number.NEGATIVE_INFINITY;

/**
 * Gathers the sounds a frame's events call for, so each plays once, at the
 * most it rose: a blast's dozen bricks sound as one, and a streak at its
 * highest.
 */
export class FrameSounds {
  /** The most each of `SOUNDS` rose since they were last played, by its place there, or `UNHEARD`. */
  private readonly heard: number[] = SOUNDS.map(() => UNHEARD);

  /** Notes a sound an event calls for, risen by some cents. */
  hear(name: SoundName, detune: number): void {
    const at = SOUNDS.indexOf(name);
    if (detune > (this.heard[at] ?? UNHEARD)) this.heard[at] = detune;
  }

  /**
   * Plays each sound heard since the last time, once, at the most it rose,
   * in the sprite's order, and forgets them.
   */
  playEach(play: (name: SoundName, detune: number) => void): void {
    for (let at = 0; at < SOUNDS.length; at++) {
      const name = SOUNDS[at];
      const detune = this.heard[at] ?? UNHEARD;
      if (name === undefined || detune === UNHEARD) continue;
      this.heard[at] = UNHEARD;
      play(name, detune);
    }
  }
}

/** Returns the flourishes an event's effects play: all of them where motion is welcome, else none. */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : STILL;
}
