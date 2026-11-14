import { FrameSounds } from "@fz/core/frame_sounds";
import { recordOf } from "@fz/core/records";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
} from "../../rules/catalog/bricks";
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
  "plate",
  "cage",
  "key",
  "gates",
  "seeker",
  "bumper",
  "portal",
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
 * Names a flourish the scene plays: the pop of a brick that holds a hit or
 * of a bumper a ball turns off, a broken brick's shards, a blast's ring,
 * the field's shake, a lost ball's fade, a regrown brick's growing back, a
 * streak's step or its reaching the level's mark, a ring about the ball and
 * the streak's count beside it, the last brick's hit holding as the level
 * clears, and, as a ball meets the paddle, the ball's squash and the pad's
 * dip, and a slider's slide into its next cell. Each moves, so none plays
 * where motion isn't welcome.
 */
export type Flourish =
  | "pop"
  | "shards"
  | "ring"
  | "shake"
  | "fade"
  | "grow"
  | "streak"
  | "hold"
  | "squash"
  | "dip"
  | "slide";

/** Says what an event calls for: the flourishes it plays, and its sound. */
export interface EventEffects {
  readonly flourishes: readonly Flourish[];
  /** Its sound, or null; a sound plays with motion or without. */
  readonly sound: SoundName | null;
}

/** The sound a level cleared plays, which a life by points and a new best share. */
export const CHIME: SoundName = "cleared";

/**
 * What each event calls for, but a hit on a brick that never breaks, which
 * rings, and a hit or a break on a brick of a kind with a voice of its own.
 */
const EVENT_EFFECTS: Readonly<Record<FieldEventKind, EventEffects>> = {
  launched: { flourishes: [], sound: null },
  wall: { flourishes: [], sound: "wall" },
  paddle: { flourishes: ["squash", "dip"], sound: "paddle" },
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
  freed: { flourishes: [], sound: "cage" },
  plated: { flourishes: [], sound: "plate" },
  opened: { flourishes: [], sound: "gates" },
  seeking: { flourishes: [], sound: "seeker" },
  bumped: { flourishes: ["pop"], sound: "bumper" },
  portalled: { flourishes: [], sound: "portal" },
  slid: { flourishes: ["slide"], sound: null },
};

/** What a hit on a brick that never breaks calls for. */
const UNBROKEN_HIT: EventEffects = { flourishes: ["pop"], sound: "steel" };

/** What a brick broken as it takes the streak to a step, or to the level's mark, calls for: what any broken brick does, and the step. */
const BROKEN_AT_STEP: EventEffects = {
  ...EVENT_EFFECTS.broken,
  flourishes: [...EVENT_EFFECTS.broken.flourishes, "streak"],
};

/** Says which sounds a kind of brick makes in a voice of its own: as a hit leaves it standing, and as it breaks. */
interface BrickVoice {
  readonly hit?: SoundName;
  readonly broken?: SoundName;
}

/**
 * The kinds of brick that sound in a voice of their own: a cage's bars
 * rattle as a hit bends one, a key chimes as it breaks, and a bumper boings
 * as a bolt or a blast strikes it, as it does when a ball turns off it. Any
 * other knocks as it holds, or rings as steel if it never breaks, and
 * bloops as it breaks.
 */
const VOICES: Readonly<Partial<Record<BrickKindId, BrickVoice>>> = {
  cage: { hit: "cage" },
  key: { broken: "key" },
  bumper: { hit: "bumper" },
};

/** Says what a brick's hit and its breaking call for, in its kind's voice. */
interface BrickEffects {
  readonly hit: EventEffects;
  readonly broken: EventEffects;
  /** What it calls for as it breaks taking the streak to a step, or to the level's mark. */
  readonly brokenAtStep: EventEffects;
}

/** Returns effects with a voice's sound in place of theirs, where it has one. */
function voiced(
  effects: EventEffects,
  sound: SoundName | undefined,
): EventEffects {
  return sound === undefined ? effects : { ...effects, sound };
}

/**
 * Returns what a brick's hit and its breaking call for, in a voice, a hit
 * ringing as steel's does on a brick that never breaks.
 */
function brickEffects(voice: BrickVoice, breaks: boolean): BrickEffects {
  return {
    hit: voiced(breaks ? EVENT_EFFECTS.hit : UNBROKEN_HIT, voice.hit),
    broken: voiced(EVENT_EFFECTS.broken, voice.broken),
    brokenAtStep: voiced(BROKEN_AT_STEP, voice.broken),
  };
}

/** What a hit and a break call for on a brick of each kind, made once, so playing an event makes nothing. */
const BRICK_EFFECTS = recordOf(BRICK_KIND_IDS, (kind) =>
  brickEffects(VOICES[kind] ?? {}, brickKind(kind).hits !== "never"),
);

/** What a hit and a break call for where the field has no brick at their cell. */
const UNVOICED = brickEffects({}, true);

/** The flourishes played where motion isn't welcome. */
const STILL: readonly Flourish[] = [];

/** Returns what an event calls for, on the field as it stands. */
export function effectsOf(
  event: Readonly<FieldEvent>,
  field: FieldView,
): EventEffects {
  const brick = field.bricks[event.cell];
  const effects = brick ? BRICK_EFFECTS[brick.kind] : UNVOICED;
  if (event.kind === "hit") return effects.hit;
  if (event.kind === "broken") {
    return isStreakStep(event.streak, field.level.mark)
      ? effects.brokenAtStep
      : effects.broken;
  }
  return EVENT_EFFECTS[event.kind];
}

/**
 * Returns how far an event's sound is raised, in cents: a broken brick's,
 * its bloop or a key's chime, by a note of a major pentatonic scale for each
 * brick of its streak before it, up to an octave and a fifth, so a streak
 * sounds like a run; any other's not at all.
 *
 * The top, 1900 cents, is past the ±1200 Phaser's docs give, on purpose:
 * Phaser's Web Audio sound plays a detune as its source's playback rate,
 * 2^(cents / 1200), which neither it nor Web Audio clamps.
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
