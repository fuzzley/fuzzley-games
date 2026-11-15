// How a game's sounds are mixed as they play, decided apart from whatever
// plays them: which take plays next, how a play is varied and where it is
// panned, which voice gives way to another, how far a huge sound ducks the
// busy ones, and how a bed's looped layers keep in step and fade. Each
// number is a parameter, the mix's own its default, and what is drawn at
// random is drawn by the source a caller hands in. It imports nothing, so a
// page that plays by it compiles it alone.

/**
 * The levels a sprite's sound is mixed at, from the quietest: a shot's tick
 * sits 16 dB under a blast. A bed, which loops apart from the sprite, has
 * a level of its own, which no rule here reads.
 */
export const SOUND_LEVELS = [
  "tick",
  "small",
  "medium",
  "large",
  "huge",
] as const;

/** Names a level a sound is mixed at. */
export type SoundLevel = (typeof SOUND_LEVELS)[number];

/** Each level's place among them, from 0 for the quietest. */
const LEVEL_RANK: Readonly<Record<SoundLevel, number>> = {
  tick: 0,
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
};

/** Describes how a sound of a sprite is mixed. */
export interface MixedSound {
  /** The family it is one of, such as a game's rocks, whose sounds share their voices. */
  readonly family: string;
  readonly level: SoundLevel;
  /** How many takes of it the sprite holds, one at least, named as {@link takeMarkers} names them. */
  readonly takes: number;
  /** Whether it is in key, so no play of it is detuned. */
  readonly tuned: boolean;
}

/** Holds how each sound of a sprite is mixed, by its name. */
export type SoundMix<Name extends string> = Readonly<Record<Name, MixedSound>>;

// --- Takes ------------------------------------------------------------------

/** The take a sound has played last before it has played at all: none, so its first plays next. */
export const NO_TAKE = -1;

/**
 * Returns the take of a sound to play next, from 0: the one after the last,
 * in turn, so a sound with two takes or more never plays one twice running.
 */
export function nextTake(last: number, takes: number): number {
  return (last + 1) % takes;
}

/**
 * Returns the names a sound's takes have in its sprite, in turn: the
 * sound's own for one take, else its name and each take's number from 1,
 * as `shot-2`.
 *
 * It makes a list and its names on each call, so a player names a sound's
 * takes once, not on each play.
 */
export function takeMarkers(name: string, takes: number): readonly string[] {
  if (takes === 1) return [name];
  return Array.from(
    { length: takes },
    (_, take) => `${name}-${String(take + 1)}`,
  );
}

// --- Variation --------------------------------------------------------------

/** Describes how far a play is varied at most, and the levels whose plays are. */
export interface VariationLimits {
  /** How far it is raised or lowered at most, in cents. */
  readonly cents: number;
  /** How much louder or quieter it is at most, in decibels. */
  readonly decibels: number;
  /** The levels whose noisy sounds are varied. */
  readonly levels: readonly SoundLevel[];
}

/**
 * How the mix varies a play: up to 40 cents and 1.5 dB either way, for a
 * noisy sound at the levels heard many times a second, so it never repeats
 * itself exactly.
 */
export const VARIATION: VariationLimits = {
  cents: 40,
  decibels: 1.5,
  levels: ["tick", "small"],
};

/**
 * Returns whether a sound's plays are varied: a noisy one at a level the
 * variation names, never a tuned one, which varies by its takes alone and so
 * stays in key.
 */
export function isVaried(
  sound: Pick<MixedSound, "level" | "tuned">,
  variation: VariationLimits = VARIATION,
): boolean {
  return !sound.tuned && variation.levels.includes(sound.level);
}

/**
 * Returns how far a varied play is raised, in cents, below 0 for lowered:
 * up to `most` either way, from a number from 0 up to 1 that `random` draws.
 */
export function variedDetune(
  random: () => number,
  most: number = VARIATION.cents,
): number {
  return (random() * 2 - 1) * most;
}

/**
 * Returns what a varied play's loudness is multiplied by: up to `most`
 * decibels louder or quieter, from a number from 0 up to 1 that `random`
 * draws.
 */
export function variedGain(
  random: () => number,
  most: number = VARIATION.decibels,
): number {
  return gainOf((random() * 2 - 1) * most);
}

/** Returns what a change of loudness in decibels multiplies a sound by, below 1 for quieter. */
export function gainOf(decibels: number): number {
  return 10 ** (decibels / 20);
}

// --- Place ------------------------------------------------------------------

/** How far to one side a sound at the field's edge is panned, from 0 to 1: 60% of full left or right. */
export const PAN_WIDTH = 0.6;

/**
 * Returns where a place lies across a field, from -1 at its left edge to 1
 * at its right, its `x` running from 0 at the left edge to `width` at the
 * right.
 */
export function acrossOf(x: number, width: number): number {
  return (x / width) * 2 - 1;
}

/**
 * Returns the pan of a sound played at a place across the field, from -1
 * at its left edge to 1 at its right: `width` of the way to that side at
 * most, a place past an edge panned no further.
 */
export function panOf(across: number, width: number = PAN_WIDTH): number {
  return Math.min(Math.max(across, -1), 1) * width;
}

// --- Voices -----------------------------------------------------------------

/** Describes the most voices that sound at once: of one sound, of one family and in all. */
export interface VoiceLimits {
  readonly sound: number;
  readonly family: number;
  readonly all: number;
}

/** The most voices the mix lets sound at once: four of a sound, eight of a family and twenty-four in all. */
export const VOICES: VoiceLimits = { sound: 4, family: 8, all: 24 };

/** Describes a voice sounding. */
export interface Voice {
  /** The sound it plays, by name. */
  readonly name: string;
  readonly family: string;
  readonly level: SoundLevel;
  /** When it started, as a count that rises with each play, so the oldest started least. */
  readonly started: number;
}

/** What {@link voiceGivingWay} returns where a play can sound beside every voice sounding. */
export const ROOM = -1;

/**
 * Returns which voice gives way to a play of a sound of a family, by its
 * index among those sounding, or {@link ROOM} where the play can sound
 * beside them all.
 *
 * One of its own sound gives way where as many of it sound as may, else
 * one of its family where as many of that do, else any where as many sound
 * as may in all; of those, the quietest by its level, and of the quietest
 * the oldest, so a sound's own plays take their turns. Giving one way frees
 * room in every wider limit too.
 */
export function voiceGivingWay(
  voices: readonly Voice[],
  name: string,
  family: string,
  limits: VoiceLimits = VOICES,
): number {
  let ofSound = 0;
  let ofFamily = 0;
  // Read by number, as each play's round of the voices makes nothing.
  const count = voices.length;
  for (let at = 0; at < count; at++) {
    const voice = voices[at];
    if (voice?.name === name) ofSound++;
    if (voice?.family === family) ofFamily++;
  }
  const bySound = ofSound >= limits.sound;
  const byFamily = !bySound && ofFamily >= limits.family;
  if (!bySound && !byFamily && count < limits.all) return ROOM;
  let giving = ROOM;
  let quietest: Voice | undefined;
  for (let at = 0; at < count; at++) {
    const voice = voices[at];
    const mayGiveWay = bySound
      ? voice?.name === name
      : !byFamily || voice?.family === family;
    if (voice === undefined || !mayGiveWay) continue;
    if (quietest === undefined || givesWayBefore(voice, quietest)) {
      giving = at;
      quietest = voice;
    }
  }
  return giving;
}

/** Returns whether one voice gives way before another: it is quieter, or as quiet and older. */
function givesWayBefore(voice: Voice, other: Voice): boolean {
  const rank = LEVEL_RANK[voice.level];
  const otherRank = LEVEL_RANK[other.level];
  return rank === otherRank ? voice.started < other.started : rank < otherRank;
}

// --- Ducking ----------------------------------------------------------------

/** Describes how a sound at one level turns those at others down: which, how far and for how long. */
export interface Duck {
  /** The levels whose sounds duck the others. */
  readonly by: readonly SoundLevel[];
  /** The levels they turn down. */
  readonly levels: readonly SoundLevel[];
  /** How far they turn them down, in decibels. */
  readonly decibels: number;
  /** How long the turn down takes, in seconds, so none clicks. */
  readonly attack: number;
  /** When they start back up, in seconds from the ducking sound's start. */
  readonly heldUntil: number;
  /** How long they take to come back up, in seconds after that. */
  readonly release: number;
}

/**
 * How the mix ducks: a sound at the level `huge` turns the `tick` and
 * `small` levels down 6 dB for a third of a second, so a blast is heard
 * clear of the shots and the small breaks round it.
 */
export const DUCK: Duck = {
  by: ["huge"],
  levels: ["tick", "small"],
  decibels: 6,
  attack: 0.02,
  heldUntil: 1 / 3,
  release: 0.1,
};

/** Returns whether a sound at a level ducks others as it plays. */
export function ducksOthers(level: SoundLevel, duck: Duck = DUCK): boolean {
  return duck.by.includes(level);
}

/** Returns whether a sound at a level is ducked under one that ducks others. */
export function isDucked(level: SoundLevel, duck: Duck = DUCK): boolean {
  return duck.levels.includes(level);
}

/**
 * Returns what a ducked sound's loudness is multiplied by, some seconds
 * after a sound that ducks it started: down by the duck's decibels over its
 * attack, held there until its `heldUntil`, and back up over its release;
 * 1 before it and after. Where two ducks overlap, a sound takes the lower
 * of their gains, as {@link duckedGainUnder} gives it.
 */
export function duckedGain(since: number, duck: Duck = DUCK): number {
  const down = gainOf(-duck.decibels);
  if (since < 0 || since >= duck.heldUntil + duck.release) return 1;
  if (since < duck.attack) return 1 + (down - 1) * (since / duck.attack);
  if (since < duck.heldUntil) return down;
  return down + (1 - down) * ((since - duck.heldUntil) / duck.release);
}

/**
 * Returns what a ducked sound's loudness is multiplied by under the latest
 * duck and the one before it, some seconds after each started: the lower of
 * their gains, so a huge sound inside another's duck holds the levels down
 * through its own attack rather than letting them up.
 */
export function duckedGainUnder(
  sinceLatest: number,
  sinceEarlier: number,
  duck: Duck = DUCK,
): number {
  return Math.min(
    duckedGain(sinceLatest, duck),
    duckedGain(sinceEarlier, duck),
  );
}

// --- Layers -----------------------------------------------------------------

/**
 * How long a layer of a bed takes to fade all the way in or out, in
 * seconds: the two seconds a bed takes to cross into another sector's, which
 * the layers keep to too.
 */
export const FADE_SECONDS = 2;

/**
 * Returns how far into its loop a layer is, in seconds, some seconds after
 * the layers' shared start: where one started late plays from, so it keeps
 * to the bar line of those started on it. A loop of no length is at its
 * start.
 */
export function loopPhase(elapsed: number, length: number): number {
  if (!(length > 0)) return 0;
  const phase = elapsed % length;
  return phase < 0 ? phase + length : phase;
}

/**
 * Returns how far a layer has faded in, from 0 to 1, some seconds after it
 * stood at `share`, moving toward `target`, 0 or 1, at the pace that takes
 * `fadeSeconds` the whole way, or at once where it takes no time.
 */
export function fadedShare(
  share: number,
  target: number,
  seconds: number,
  fadeSeconds: number = FADE_SECONDS,
): number {
  if (!(fadeSeconds > 0)) return target;
  const step = seconds / fadeSeconds;
  return target > share
    ? Math.min(share + step, target)
    : Math.max(share - step, target);
}

/**
 * Returns the gain of a layer faded a share of the way in: a quarter sine,
 * so a layer fading out as another fades in at the same pace keeps their
 * loudness together even through the change.
 */
export function fadeGain(share: number): number {
  return Math.sin((Math.min(Math.max(share, 0), 1) * Math.PI) / 2);
}
