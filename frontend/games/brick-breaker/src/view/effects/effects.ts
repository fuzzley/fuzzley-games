import { FrameSounds } from "@fz/core/frame_sounds";
import { canBreak } from "../../rules/bricks/bricks";
import type { FieldEvent, FieldEventKind, FieldView } from "../field/frame";
import { isStreakStep } from "./streak";
import { HOLD_MS } from "./timing";

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

/** The highest note a streak climbs to, in semitones above its first: an octave and a fifth. */
const TOP_NOTE = 19;

/**
 * The notes a streak climbs, a note a brick, in semitones above its first: a
 * major pentatonic scale, up to {@link TOP_NOTE}, where it holds.
 */
const STREAK_NOTES = [0, 2, 4, 7, 9, 12, 14, 16, TOP_NOTE] as const;

/** The cents in a semitone. */
const SEMITONE_CENTS = 100;

/**
 * Names a flourish the scene plays: a hit brick's pop, a broken one's
 * shards, a blast's ring, the field's shake, a lost ball's fade, a
 * regrown brick's growing back, a streak's step, a ring about the ball
 * and the streak's count beside it, and the last brick's hit holding as the
 * level clears. Each moves, so none plays where motion isn't welcome.
 */
export type Flourish =
  "pop" | "shards" | "ring" | "shake" | "fade" | "grow" | "streak" | "hold";

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
  cleared: { flourishes: ["hold"], sound: CHIME },
  freed: { flourishes: [], sound: null },
  plated: { flourishes: [], sound: null },
  opened: { flourishes: [], sound: null },
  seeking: { flourishes: [], sound: null },
};

/** What a hit on a brick that never breaks calls for. */
const UNBROKEN_HIT: EventEffects = { flourishes: ["pop"], sound: "steel" };

/** What a brick broken as it takes the streak to a step calls for: what any broken brick does, and the step. */
const BROKEN_AT_STEP: EventEffects = {
  ...EVENT_EFFECTS.broken,
  flourishes: [...EVENT_EFFECTS.broken.flourishes, "streak"],
};

/** The flourishes played where motion isn't welcome. */
const STILL: readonly Flourish[] = [];

/** Returns what an event calls for, on the field as it stands. */
export function effectsOf(
  event: Readonly<FieldEvent>,
  field: FieldView,
): EventEffects {
  const brick = field.bricks[event.cell];
  if (event.kind === "hit" && brick && !canBreak(brick)) return UNBROKEN_HIT;
  if (event.kind === "broken" && isStreakStep(event.streak)) {
    return BROKEN_AT_STEP;
  }
  return EVENT_EFFECTS[event.kind];
}

/**
 * Returns how far an event's sound is raised, in cents: a broken brick's by
 * a note of a major pentatonic scale for each brick of its streak before
 * it, up to an octave and a fifth, so a streak sounds like a run; any
 * other's not at all.
 *
 * The top, 1900 cents, is past the ±1200 Phaser's docs give, on purpose:
 * Web Audio plays it as a rate, which nothing clamps.
 */
export function detuneOf(event: Readonly<FieldEvent>): number {
  if (event.kind !== "broken") return 0;
  const note = STREAK_NOTES[Math.max(0, event.streak - 1)] ?? TOP_NOTE;
  return note * SEMITONE_CENTS;
}

/**
 * Returns how long the sound of an event that calls for these effects
 * waits, in milliseconds: one that holds the last brick's hit waits out the
 * hold, with motion or without, so the last brick's note is heard alone
 * before it, as the clear's chord does; any other not at all.
 */
export function soundDelayOf(effects: EventEffects): number {
  return effects.flourishes.includes("hold") ? HOLD_MS : 0;
}

/**
 * Keeps a sound that waits to play, as the clear's chord waits out the last
 * brick's hold, till a frame's sounds hear it. One waits at most, as only
 * the clear's chord waits.
 */
export class DelayedSound {
  private sound: SoundName | null = null;
  private detune = 0;
  /** When it plays, in the scene's time. */
  private due = Infinity;

  /** Keeps a sound, raised so far, to play once a time comes. */
  wait(sound: SoundName, detune: number, due: number): void {
    this.sound = sound;
    this.detune = detune;
    this.due = due;
  }

  /** Returns whether a sound waits to play. */
  isWaiting(sound: SoundName): boolean {
    return this.sound === sound;
  }

  /**
   * Has a frame's sounds hear the sound waiting, once its time has come;
   * at Infinity, whenever it was due, as a new field starts.
   */
  playDue(now: number, sounds: FrameSounds<SoundName>): void {
    if (this.sound === null || now < this.due) return;
    sounds.hear(this.sound, this.detune);
    this.sound = null;
    this.due = Infinity;
  }
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
