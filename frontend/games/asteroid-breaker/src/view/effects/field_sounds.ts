// How the game plays the sounds a frame calls for, by the plan's table: each
// once at the most it rose, placed across the field, at its volume, the
// loudest first; a crowd of breaks as its largest and a patter; one bell a
// frame at the highest of static's multipliers its breaks scored at; each
// spark gathered up the ladder; a zap in place of its dash; and what the
// field's state says without an event: a burst of fire let go, the dash
// charged, an effect run out.

import { recordOf } from "@fz/core/records";
import { acrossOf } from "@fz/core/sound_mix";
import type { EffectKind } from "../../rules/catalog/pickups";
import { ROCK_SIZES } from "../../rules/catalog/rocks";
import { EFFECT_KINDS } from "../../rules/rocks/pickups";
import { stepsIn } from "../../rules/stepper";
import { STATIC_HOLD_MS } from "../../rules/tuning";
import { type FieldEvent, type FieldView, rockSizeOf } from "../field/frame";
import {
  CHARGED,
  CROWD,
  DASH,
  LADDER,
  PLAY_ORDER,
  SPARK,
  SPARK_ABOVE_BELL_CENTS,
  type SoundName,
  TAIL,
  bellCentsOf,
  endSoundOf,
  ladderCentsOf,
  secondSoundOf,
  soundOf,
  volumeOf,
} from "./sounds";

/** Plays a sound: risen by some cents, at a place across the field from -1 to 1, at a volume. */
export type PlaySound = (
  name: SoundName,
  detune: number,
  across: number,
  volume: number,
) => void;

/** The most breaks of a frame that each play their own sound; more play as a crowd. */
export const MOST_BREAKS_HEARD = 3;

/** The fewest pulls of fire a burst holds, which a tail ends as fire is let go. */
export const BURST_PULLS = 2;

/**
 * The longest after a burst's last pull that fire let go ends it with its
 * tail, in milliseconds; let go later, as after a pause, the burst is over
 * unheard.
 */
export const TAIL_WITHIN_MS = 300;

/**
 * The most steps of the field after a spark gathered that the next climbs
 * the ladder from it: static's hold, after which static drains; later, the
 * next starts the climb again.
 */
export const SPARK_RUN_STEPS = stepsIn(STATIC_HOLD_MS);

/** A rank below every rock's size, which the largest break of a frame starts from. */
const NO_RANK: number = ROCK_SIZES.length;

/**
 * Describes a sound of the sprite as a frame hears it: whether it did, the
 * most it rose, where, and whether a rock's break called for it.
 */
interface Heard {
  readonly name: SoundName;
  readonly volume: number;
  heard: boolean;
  /** In cents. */
  detune: number;
  across: number;
  broken: boolean;
}

/**
 * Gathers the sounds a frame of the field calls for, from its events and
 * from how its state changed since the frame before, and plays each once.
 *
 * Each sound plays once a frame at most, at its volume, the loudest level
 * first, so a huge one ducks the busy ones of its own frame; each but the
 * bell at the most it rose and where it rose most, the first where it rose
 * as much. A frame whose breaks scored rings one bell, at the ladder's
 * note for the highest of static's multipliers they scored at, where the
 * first to score at it broke; more than
 * {@link MOST_BREAKS_HEARD} breaks in a frame play as the largest two
 * sounds and `break-cluster`, at the middle of where they broke. Each spark
 * gathered plays the next note of the ladder, from its first, an octave
 * under the bell's, in a run of sparks each gathered within
 * {@link SPARK_RUN_STEPS} of the field's steps of the last, which static's
 * fall to a lower step or a new field ends. A zap plays in place of the
 * dash that set it off. It makes nothing as it hears or plays.
 */
export class FieldSounds {
  /** A record for each of the sprite's sounds, made once, by name. */
  private readonly byName: Readonly<Record<SoundName, Heard>>;
  /** The same records, in the order a frame plays them. */
  private readonly sounds: readonly Heard[];
  /** Whether a sound was heard since the sounds last played. */
  private heardAny = false;

  /** How many rocks broke in the frame and scored. */
  private breaks = 0;
  /** The sum of where they broke, for the middle of a crowd. */
  private breaksAcross = 0;
  /** The sound of the frame's largest break, the earlier of two alike, and its size's rank, 0 the largest. */
  private largest: SoundName | null = null;
  private largestRank: number = NO_RANK;
  /** The sound of the frame's next largest break, and its size's rank. */
  private nextLargest: SoundName | null = null;
  private nextRank: number = NO_RANK;
  /** The highest of static's multipliers a break of the frame scored at, 0 for none, and where the first to score at it broke. */
  private topTimes = 0;
  private topAcross = 0;

  /** The field the last frame showed, whose state the next is held to. */
  private field: FieldView | null = null;
  /** The time of the frame being heard, in milliseconds. */
  private now = 0;
  /** The pulls of fire since fire was last let go. */
  private pulls = 0;
  /** Where the last pull was fired, across the field, and the time of its frame. */
  private pullAcross = 0;
  private pullAt = 0;
  /** How many sparks the run gathered so far, and the field's step its last was gathered at. */
  private sparks = 0;
  private sparkAt = 0;
  /** Whether the frame heard a zap, which plays in place of its dash. */
  private zapped = false;
  /** Whether the ship's dash was charging as of the last frame. */
  private charging = false;
  /** The step each group's effect ended at as of the last frame, 0 for one that has no time. */
  private readonly endsAt: Record<EffectKind, number> = recordOf(
    EFFECT_KINDS,
    () => 0,
  );

  constructor() {
    this.byName = recordOf(PLAY_ORDER, (name) => ({
      name,
      volume: volumeOf(name),
      heard: false,
      detune: 0,
      across: 0,
      broken: false,
    }));
    this.sounds = PLAY_ORDER.map((name) => this.byName[name]);
  }

  /**
   * Hears what a frame's field says, at a time in milliseconds, by how it
   * changed since the last frame: fire let go just after a burst, its tail
   * at the last pull; the dash charged again, at the ship; and an effect
   * whose time ran out, at the ship. A new field says nothing of the last
   * one's. Call it before the frame's events.
   */
  hearField(field: FieldView, now: number): void {
    this.now = now;
    if (field !== this.field) {
      this.field = field;
      this.pulls = 0;
      this.sparks = 0;
      this.charging = isCharging(field);
      for (const kind of EFFECT_KINDS) {
        this.endsAt[kind] = field.effects[kind].endsAt;
      }
      return;
    }
    const { steer, ship, torus } = field;
    if (!steer.fire && !steer.autoFire) {
      const burst =
        this.pulls >= BURST_PULLS && now - this.pullAt <= TAIL_WITHIN_MS;
      if (burst) this.note(TAIL, 0, this.pullAcross);
      this.pulls = 0;
    }
    const at = ship === null ? 0 : acrossOf(ship.x, torus.width);
    const charging = isCharging(field);
    if (this.charging && !charging && ship !== null) {
      this.note(CHARGED, 0, at);
    }
    this.charging = charging;
    for (const kind of EFFECT_KINDS) this.hearEnding(field, kind, at);
  }

  /** Hears whether an effect's time ran out since the last frame, noting its end at a place if so. */
  private hearEnding(field: FieldView, kind: EffectKind, at: number): void {
    const endedAt = this.endsAt[kind];
    const endsAt = field.effects[kind].endsAt;
    const ranOut = endedAt > 0 && endsAt !== endedAt && field.steps >= endedAt;
    const sound = ranOut ? endSoundOf(kind) : null;
    if (sound !== null) this.note(sound, 0, at);
    this.endsAt[kind] = endsAt;
  }

  /**
   * Hears what an event of the field calls for, where it happened on a field
   * so wide: its sound and the one after it, for a break that scored its
   * multiplier for the frame's bell, its own sound kept for the frame's
   * crowd, and for a spark gathered its note of the ladder. A spark and a
   * pull of fire are timed by the frame `hearField()` last heard, so the
   * frame's field is heard first.
   *
   * @throws {RangeError} For an event its sound can't be told for, as
   *   `soundOf()` does.
   */
  hear(event: Readonly<FieldEvent>, width: number): void {
    const across = acrossOf(event.x, width);
    const sound = soundOf(event);
    if (event.kind === "broken" && event.times > 0 && sound !== null) {
      this.keepBreak(sound, ROCK_SIZES.indexOf(rockSizeOf(event)), across);
      if (event.times > this.topTimes) {
        this.topTimes = event.times;
        this.topAcross = across;
      }
      return;
    }
    if (event.kind === "sparked") {
      this.hearSpark(across);
      return;
    }
    if (event.kind === "stepped" && event.fell) this.sparks = 0;
    if (event.kind === "zapped") this.zapped = true;
    if (sound !== null) this.note(sound, 0, across);
    const second = secondSoundOf(event);
    if (second !== null) this.note(second, 0, across);
    if (event.kind === "fired") {
      this.pulls += 1;
      this.pullAcross = across;
      this.pullAt = this.now;
    }
  }

  /**
   * Plays each sound heard since the last time, once, the loudest level
   * first, the bell at the highest of static's multipliers the frame's
   * breaks scored at, a crowd of breaks as its largest two and its patter,
   * a zap without its dash, and forgets them.
   */
  playEach(play: PlaySound): void {
    if (!this.heardAny) return;
    if (this.zapped) this.byName[DASH].heard = false;
    if (this.topTimes > 0) {
      this.note(LADDER, bellCentsOf(this.topTimes), this.topAcross);
    }
    const crowd = this.breaks > MOST_BREAKS_HEARD;
    if (crowd) this.note(CROWD, 0, this.breaksAcross / this.breaks);
    this.heardAny = false;
    for (const sound of this.sounds) {
      if (!sound.heard) continue;
      const lost =
        crowd &&
        sound.broken &&
        sound.name !== this.largest &&
        sound.name !== this.nextLargest;
      sound.heard = false;
      sound.broken = false;
      if (!lost) play(sound.name, sound.detune, sound.across, sound.volume);
    }
    this.breaks = 0;
    this.breaksAcross = 0;
    this.largest = null;
    this.largestRank = NO_RANK;
    this.nextLargest = null;
    this.nextRank = NO_RANK;
    this.topTimes = 0;
    this.zapped = false;
  }

  /** Notes a spark gathered at a place, at the next note of its run's climb, or the first of a new run. */
  private hearSpark(across: number): void {
    const steps = this.field?.steps ?? 0;
    if (steps - this.sparkAt > SPARK_RUN_STEPS) this.sparks = 0;
    this.sparks += 1;
    this.sparkAt = steps;
    const cents = ladderCentsOf(this.sparks) - SPARK_ABOVE_BELL_CENTS;
    this.note(SPARK, cents, across);
  }

  /** Notes a sound heard, risen by some cents at a place, where it rose the most. */
  private note(name: SoundName, detune: number, across: number): void {
    const sound = this.byName[name];
    this.heardAny = true;
    if (sound.heard && detune <= sound.detune) return;
    sound.heard = true;
    sound.detune = detune;
    sound.across = across;
  }

  /**
   * Notes a rock's break, of a size by its rank, the largest 0, keeping it
   * among the frame's largest and its count.
   */
  private keepBreak(sound: SoundName, rank: number, across: number): void {
    this.note(sound, 0, across);
    this.byName[sound].broken = true;
    this.breaks += 1;
    this.breaksAcross += across;
    // Two breaks alike are one sound, kept once.
    if (sound === this.largest || sound === this.nextLargest) return;
    if (rank < this.largestRank) {
      this.nextLargest = this.largest;
      this.nextRank = this.largestRank;
      this.largest = sound;
      this.largestRank = rank;
    } else if (rank < this.nextRank) {
      this.nextLargest = sound;
      this.nextRank = rank;
    }
  }
}

/** Returns whether a field's ship is charging its dash. */
function isCharging(field: FieldView): boolean {
  return field.ship !== null && field.ship.rechargeSteps > 0;
}
