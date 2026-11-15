// What the sound lab works out of each play: how a play is varied and placed
// across the field by `@fz/core/sound_mix`'s rules at the lab's own numbers,
// and how a scene's sounds play by a game's own mix, at the game's numbers.

import {
  type MixedPlay,
  NO_TAKE,
  ROOM,
  type SoundMix,
  type Voice,
  ducksOthers,
  mixedPlay,
  panOf,
  takeMarkers,
  variedDetune,
  variedGain,
  voiceGivingWay,
} from "@fz/core/sound_mix";

export {
  DUCK,
  LIMITER,
  type SoundMix,
  VARIATION,
  VOICES,
} from "@fz/core/sound_mix";

/** How far a varied play is raised or lowered at most, in cents. */
export const VARY_CENTS = 60;

/** How much louder or quieter a varied play is at most, in decibels. */
export const VARY_DECIBELS = 1.5;

/** How far to one side a sound at the field's edge is panned, from 0 to 1. */
const PAN_WIDTH = 0.7;

/** Describes how a play is varied. */
export interface Variation {
  /** How far it is raised, in cents, below 0 for lowered. */
  readonly detune: number;
  /** What its loudness is multiplied by. */
  readonly gain: number;
}

/**
 * Returns how a play is varied, by the mix's rules at the lab's numbers,
 * from two numbers from 0 up to 1 that `random` draws: raised or lowered by
 * up to {@link VARY_CENTS}, then up to {@link VARY_DECIBELS} louder or
 * quieter, so a sound heard many times a second never repeats itself
 * exactly.
 *
 * Unlike a game's mix, it varies every sound, tuned or not, by more.
 */
export function variedPlay(random: () => number): Variation {
  return {
    detune: variedDetune(random, VARY_CENTS),
    gain: variedGain(random, VARY_DECIBELS),
  };
}

/**
 * Returns the pan of a sound played at a place across the field, from -1
 * at its left edge to 1 at its right, by the mix's rule at the lab's
 * {@link PAN_WIDTH}.
 */
export function panAt(x: number): number {
  return panOf(x, PAN_WIDTH);
}

/** How long a looping sound is held where its cue doesn't say, in seconds. */
export const HOLD_S = 1;

/**
 * Describes a sound a scene plays, as a game would play it: when, which,
 * risen how far, where across the field and how loud.
 */
export interface MixCue<Name extends string> {
  /** When it plays, in seconds from the scene's start. */
  readonly at: number;
  readonly sound: Name;
  /** How far the game raises it, in cents. */
  readonly detune?: number;
  /** Where across the field it happens, from -1 at its left edge to 1 at its right. */
  readonly x?: number;
  /** What the game multiplies its loudness by, 1 unless given. */
  readonly volume?: number;
  /** How long a looping sound is held, in seconds, {@link HOLD_S} unless given. */
  readonly holdFor?: number;
}

/** Describes the takes of a sprite, by their names in it. */
export interface TakeSprite {
  /** Returns how long a take sounds, in seconds. */
  lengthOf(take: string): number;
  /** Returns whether a take loops, as the game holds a hum. */
  loops(take: string): boolean;
}

/** Describes a take played as the lab schedules it. */
export interface TakePlay {
  /** The take, by its name in the sprite. */
  readonly take: string;
  /** When it starts, in seconds from the scene's start. */
  readonly at: number;
  /** How far it is raised, in cents. */
  readonly detune: number;
  /** What its loudness is multiplied by. */
  readonly gain: number;
  /** Where it is panned, from -1 at the left to 1 at the right. */
  readonly pan: number;
  /** When it stops short, in seconds from the scene's start, or null where it plays to its end. */
  readonly stopsAt: number | null;
}

/** A take played as the lab plans it, its stop written as a later play takes its voice. */
type Planned = { -readonly [Key in keyof TakePlay]: TakePlay[Key] };

/** Returns how long a take sounds raised by some cents, which play it faster: its length over the rate. */
export function soundingFor(length: number, detune: number): number {
  return length / 2 ** (detune / 1200);
}

/**
 * Plans how a game's sounds play by its mix, as `@fz/phaser/sound`'s
 * `SpritePlayer` plays them handed it, for the sound lab to schedule: each
 * sound's takes in turn, from one scene to the next as in the game.
 */
export class GameMix<Name extends string> {
  /** The take of each sound played last, by name. */
  private readonly lastTakes = new Map<Name, number>();
  private readonly mix: SoundMix<Name>;
  /** Draws each play's variation. */
  private readonly random: () => number;

  /**
   * Makes a game's mix, handed how it mixes each sound and the source its
   * plays' variation is drawn from.
   */
  constructor(mix: SoundMix<Name>, random: () => number) {
    this.mix = mix;
    this.random = random;
  }

  /** Returns a sound's takes, by their names in the sprite, in turn. */
  takesOf(name: Name): readonly string[] {
    return takeMarkers(name, this.mix[name].takes);
  }

  /**
   * Returns how a scene's cues play by the mix, in the order of their
   * times, those at one time in the order given, as a frame plays its
   * sounds, the loudest first: each as `@fz/core/sound_mix`'s `mixedPlay()`
   * says, its sound's next take, varied where the mix varies it and ducked
   * as it starts under a huge sound started a moment before, or with it;
   * panned by its place, where it has one; and the voice that gives way to
   * it, where as many sound as the mix lets, stopped as it starts, each
   * sounding as long as its take at the rate it is raised to. A looping
   * sound plays its first take plainly, for as long as it is held, and
   * among no voices, as a game holds its hum.
   */
  plan(cues: readonly MixCue<Name>[], sprite: TakeSprite): TakePlay[] {
    const plays: Planned[] = [];
    // The plays that sound as a voice, with the voice each sounds as.
    const voiced: { play: Planned; voice: Voice; endsAt: number }[] = [];
    const step: MixedPlay = { take: 0, detune: 0, gain: 1 };
    let latestDuck = Number.NEGATIVE_INFINITY;
    const ordered = [...cues].sort((one, other) => one.at - other.at);
    for (const cue of ordered) {
      const mixed = this.mix[cue.sound];
      const { family, level } = mixed;
      const takes = this.takesOf(cue.sound);
      const first = takes[0] ?? cue.sound;
      if (sprite.loops(first)) {
        const held = cue.holdFor ?? HOLD_S;
        plays.push({
          take: first,
          at: cue.at,
          detune: 0,
          gain: 1,
          pan: 0,
          stopsAt: cue.at + held,
        });
        continue;
      }
      mixedPlay(
        mixed,
        this.lastTakes.get(cue.sound) ?? NO_TAKE,
        cue.at - latestDuck,
        this.random,
        step,
      );
      this.lastTakes.set(cue.sound, step.take);
      if (ducksOthers(level)) latestDuck = cue.at;
      const take = takes[step.take] ?? first;
      const detune = (cue.detune ?? 0) + step.detune;
      const gain = (cue.volume ?? 1) * step.gain;
      const sounding = voiced.filter(({ endsAt }) => endsAt > cue.at);
      const giving = voiceGivingWay(
        sounding.map(({ voice }) => voice),
        cue.sound,
        family,
      );
      const gives = giving === ROOM ? undefined : sounding[giving];
      if (gives !== undefined) {
        gives.play.stopsAt = cue.at;
        gives.endsAt = cue.at;
      }
      const pan = cue.x === undefined ? 0 : panOf(cue.x);
      const play = { take, at: cue.at, detune, gain, pan, stopsAt: null };
      plays.push(play);
      voiced.push({
        play,
        voice: { name: cue.sound, family, level, started: plays.length },
        endsAt: cue.at + soundingFor(sprite.lengthOf(take), detune),
      });
    }
    return plays;
  }
}
