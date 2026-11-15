import { keysOf } from "@fz/core/records";
import {
  type MixedSound,
  SOUND_LEVELS,
  type SoundLevel,
  gainOf,
} from "@fz/core/sound_mix";
import type { EffectKind, PickupId } from "../../rules/catalog/pickups";
import {
  type ROCK_KINDS,
  type RockKindId,
  type RockSize,
  hasTrait,
} from "../../rules/catalog/rocks";
import type { WeaponId } from "../../rules/catalog/weapons";
import { FULL_STEP } from "../../rules/sparks/charge";
import { STATIC_STEPS } from "../../rules/tuning";
import {
  type FieldEvent,
  type FieldEventKind,
  rockKindOf,
  rockSizeOf,
  weaponOf,
} from "../field/frame";

/**
 * Whether each family of the game's sounds is tuned: in key, so a play of
 * one is never varied, as the sound kit played them.
 */
const TUNED_BY_FAMILY = {
  chain: true,
  hazards: false,
  pickups: true,
  rescue: true,
  rocks: false,
  ship: false,
  stingers: true,
  voice: true,
} as const;

/** Names a family of the game's sounds, whose sounds share their voices. */
export type SoundFamily = keyof typeof TUNED_BY_FAMILY;

/**
 * The names a sound's takes are numbered by in the sprite, by how many it
 * has, as `@fz/core/sound_mix`'s `takeMarkers()` names them: none for one
 * take, which has the sound's own name.
 */
interface TakeNumbers {
  1: never;
  2: 1 | 2;
  3: 1 | 2 | 3;
  4: 1 | 2 | 3 | 4;
  5: 1 | 2 | 3 | 4 | 5;
}

/** Describes how a sound of the sprite is mixed, with how many takes it has as a type. */
interface GameSound<Takes extends keyof TakeNumbers> extends MixedSound {
  readonly family: SoundFamily;
  readonly takes: Takes;
}

/** Returns how a sound of a family is mixed, at a level, with so many takes, tuned as its family is. */
function sound<Takes extends keyof TakeNumbers>(
  family: SoundFamily,
  level: SoundLevel,
  takes: Takes,
): GameSound<Takes> {
  return { family, level, takes, tuned: TUNED_BY_FAMILY[family] };
}

/**
 * Every sound of the game's sprite, the plan's sounds but the beds, by name,
 * with its family, level and takes, as the sound kit's recipes make them,
 * and whether it is tuned, its family's: the mix the scene hands its
 * player. A sound no event plays yet is here too, for the rules that will
 * play it.
 */
export const SOUNDS = {
  "chain-ping": sound("chain", "small", 1),
  "chain-x2": sound("chain", "medium", 1),
  "chain-x3": sound("chain", "medium", 1),
  "chain-x4": sound("chain", "medium", 1),
  "comet-warning": sound("hazards", "medium", 1),
  "comet-pass": sound("hazards", "large", 2),
  "comet-smash": sound("hazards", "medium", 2),
  "burr-cling": sound("hazards", "small", 3),
  "burr-shed": sound("hazards", "small", 2),
  "burr-pop": sound("hazards", "tick", 3),
  "lodestone-hum": sound("hazards", "tick", 1),
  "near-miss": sound("hazards", "small", 3),
  "pickup-drop": sound("pickups", "small", 2),
  "pickup-fade": sound("pickups", "tick", 1),
  "pickup-spread": sound("pickups", "medium", 1),
  "pickup-rapid": sound("pickups", "medium", 1),
  "pickup-lance": sound("pickups", "medium", 1),
  "pickup-shield": sound("pickups", "medium", 1),
  "pickup-magnet": sound("pickups", "medium", 1),
  "pickup-slow": sound("pickups", "medium", 1),
  "effect-end": sound("pickups", "small", 1),
  "slow-on": sound("pickups", "medium", 1),
  "slow-off": sound("pickups", "medium", 1),
  spark: sound("pickups", "tick", 3),
  "stray-appear": sound("rescue", "small", 1),
  "stray-catch": sound("rescue", "medium", 2),
  "crew-loose": sound("rescue", "medium", 2),
  "crew-caught": sound("rescue", "medium", 2),
  "crew-home": sound("rescue", "small", 1),
  "tow-twang": sound("rescue", "tick", 3),
  "break-stone-small": sound("rocks", "small", 3),
  "break-stone-medium": sound("rocks", "medium", 3),
  "break-stone-large": sound("rocks", "large", 3),
  "break-ice-small": sound("rocks", "small", 3),
  "break-ice-medium": sound("rocks", "medium", 3),
  "break-ice-large": sound("rocks", "large", 3),
  "break-crystal-medium": sound("rocks", "medium", 2),
  "break-crystal-large": sound("rocks", "large", 2),
  "break-iron-small": sound("rocks", "small", 2),
  "break-iron-medium": sound("rocks", "medium", 2),
  "break-iron-large": sound("rocks", "large", 2),
  "break-lodestone-small": sound("rocks", "small", 2),
  "break-lodestone-medium": sound("rocks", "medium", 2),
  "break-lodestone-large": sound("rocks", "large", 2),
  "hit-stone": sound("rocks", "small", 3),
  "hit-iron": sound("rocks", "small", 4),
  "hit-boulder": sound("rocks", "medium", 3),
  "break-boulder": sound("rocks", "huge", 1),
  "fuse-volatile": sound("rocks", "small", 1),
  "blast-volatile": sound("rocks", "huge", 3),
  "blast-volatile-small": sound("rocks", "large", 2),
  "break-cluster": sound("rocks", "medium", 3),
  "shot-gun": sound("ship", "tick", 5),
  "shot-tail": sound("ship", "tick", 3),
  "shot-spread": sound("ship", "tick", 4),
  "shot-rapid": sound("ship", "tick", 5),
  "shot-lance": sound("ship", "small", 3),
  thrust: sound("ship", "tick", 1),
  "thrust-start": sound("ship", "tick", 1),
  "thrust-stop": sound("ship", "tick", 1),
  dash: sound("ship", "medium", 2),
  "dash-ready": sound("ship", "tick", 1),
  "static-full": sound("ship", "medium", 1),
  "static-down": sound("ship", "small", 1),
  "zap-dash": sound("ship", "huge", 1),
  "zap-arc": sound("ship", "small", 4),
  "shield-up": sound("ship", "medium", 1),
  "shield-break": sound("ship", "large", 1),
  "pod-hit": sound("ship", "large", 2),
  "pod-lost": sound("ship", "huge", 1),
  "guard-end": sound("ship", "tick", 1),
  "run-start": sound("stingers", "medium", 1),
  "wave-start": sound("stingers", "small", 1),
  "wave-clear": sound("stingers", "large", 1),
  "sector-clear": sound("stingers", "large", 1),
  "run-end": sound("stingers", "large", 1),
  "new-best": sound("stingers", "large", 1),
  "level-up": sound("stingers", "large", 1),
  "tally-tick": sound("stingers", "tick", 1),
  "ui-move": sound("stingers", "tick", 1),
  "ui-select": sound("stingers", "tick", 1),
  "ui-back": sound("stingers", "tick", 1),
  pause: sound("stingers", "small", 1),
  resume: sound("stingers", "small", 1),
  "voice-whee": sound("voice", "medium", 3),
  "voice-eep": sound("voice", "medium", 3),
  "voice-ouch": sound("voice", "medium", 2),
  "voice-yay": sound("voice", "medium", 3),
  "voice-ooh": sound("voice", "small", 2),
  "voice-aww": sound("voice", "small", 2),
  "voice-cheer": sound("voice", "medium", 2),
  "voice-hum": sound("voice", "small", 2),
} as const;

/** Names a sound of the game's sprite, such as "shot-gun". */
export type SoundName = keyof typeof SOUNDS;

/** Every sound of the game's sprite, by name, by family as the recipes list them. */
export const SOUND_NAMES = keysOf(SOUNDS);

/**
 * Every sound of the game's sprite in the order a frame plays them: the
 * loudest level first, so a huge one has started as the busy ones start,
 * which the mix ducks only under a huge sound played before them.
 */
export const PLAY_ORDER: readonly SoundName[] = [...SOUND_NAMES].sort(
  (a, b) =>
    SOUND_LEVELS.indexOf(SOUNDS[b].level) -
    SOUND_LEVELS.indexOf(SOUNDS[a].level),
);

/** Names a take of a sound in the sprite, as `@fz/core/sound_mix`'s `takeMarkers()` names it. */
type TakeOf<Name extends SoundName> = (typeof SOUNDS)[Name]["takes"] extends 1
  ? Name
  : `${Name}-${TakeNumbers[(typeof SOUNDS)[Name]["takes"]]}`;

/**
 * Names a take of any sound of the sprite, such as "shot-gun-2", so a map
 * typed by it fails to compile where it lacks one.
 */
export type SoundTake = { [Name in SoundName]: TakeOf<Name> }[SoundName];

/** The sound the thrust hums while it is held, which no event plays. */
export const THRUST: SoundName = "thrust";

/** The bell under each break, at the ladder's note for static's multiplier it scored at. */
export const LADDER: SoundName = "chain-ping";

/** The spark each spark gathered plays, at the next note of the ladder. */
export const SPARK: SoundName = "spark";

/**
 * How far the spark is recorded above the bell, in cents: an octave, on C6,
 * so it climbs the ladder an octave under the bell's notes, as the sound
 * kit's audition plays it.
 */
export const SPARK_ABOVE_BELL_CENTS = 1200;

/** The dash's whoosh, which a zap's own plays in place of. */
export const DASH: SoundName = "dash";

/** The patter a crowd of breaks in one frame plays as, beside its largest two. */
export const CROWD: SoundName = "break-cluster";

/** The echo a burst of fire ends with as fire is let go. */
export const TAIL: SoundName = "shot-tail";

/** The tick the dash makes as it has charged again. */
export const CHARGED: SoundName = "dash-ready";

/** The tick the thrust makes as it is pressed. */
export const THRUST_START: SoundName = "thrust-start";

/** The tick the thrust makes as it is let go. */
export const THRUST_STOP: SoundName = "thrust-stop";

/** The lift a wave starts with, at the player's first move. */
export const FIRST_MOVE: SoundName = "wave-start";

/** The tick the ship's untouchable time ends with. */
export const GUARD_END: SoundName = "guard-end";

/** The rush a comet comes in with, its warning over. */
export const COMET_IN: SoundName = "comet-pass";

/**
 * How far each sound plays from its level, in decibels, where it isn't
 * there: the Rapid's shot 3 dB under the gun's, as twice as many are heard.
 */
const DECIBELS: Readonly<Partial<Record<SoundName, number>>> = {
  "shot-rapid": -3,
};

/**
 * How far each family's sounds play from their levels, in decibels, where
 * they aren't there: the fuzzball's calls 3 dB down, as a voice held in the
 * ear's keenest band is louder than a struck sound at its level.
 */
const FAMILY_DECIBELS: Readonly<Partial<Record<SoundFamily, number>>> = {
  voice: -3,
};

/** Returns the volume a sound plays at, 1 at its level. */
export function volumeOf(name: SoundName): number {
  return gainOf(
    (DECIBELS[name] ?? 0) + (FAMILY_DECIBELS[SOUNDS[name].family] ?? 0),
  );
}

/**
 * The ladder, in cents above `chain-ping` as recorded, for each of its
 * notes from the first: the sound kit's `CHAIN_CENTS` (`@fz/dev/synth`),
 * copied, as the game imports nothing of `@fz/dev`. It climbs the key,
 * lands on C at its fifth and tenth notes, then circles in the top
 * octave, and rings a fifth above at its twentieth.
 */
export const CHAIN_CENTS: readonly number[] = [
  0, 200, 400, 700, 1200, 1400, 1600, 1900, 2100, 2400, 2600, 2800, 3100, 2800,
  2600, 2800, 3100, 2800, 2600, 3100,
];

/**
 * Returns how far the ladder's note, counted from 1, rises, in cents: the
 * last for one past it.
 */
export function ladderCentsOf(note: number): number {
  const step = Math.min(Math.max(note, 1), CHAIN_CENTS.length) - 1;
  return CHAIN_CENTS[step] ?? 0;
}

/**
 * The ladder's note, counted from 1, the bell under a break rings at for
 * each of static's multipliers it scored at: the C the kit's ladder lands
 * on at ×1, ×2 and ×3, and the fifth above it rings at ×4.
 */
const BELL_NOTES: readonly number[] = [1, 5, 10, 20];

/**
 * Returns how far the bell under a break scored at one of static's
 * multipliers rises, in cents: the ladder's note for it, the last for one
 * past ×4.
 */
export function bellCentsOf(times: number): number {
  const at = Math.min(Math.max(times, 1), BELL_NOTES.length) - 1;
  return ladderCentsOf(BELL_NOTES[at] ?? 1);
}

/**
 * The sound each lasting effect plays as its time runs out, or null for
 * one that has no time: a weapon or the Magnet a soft fall on glass, and
 * Slow the field coming back; the Shield is spent rather than ending.
 */
const END_SOUNDS: Readonly<Record<EffectKind, SoundName | null>> = {
  weapon: "effect-end",
  guard: null,
  pull: "effect-end",
  pace: "slow-off",
};

/** Returns the sound an effect of a group plays as its time runs out, or null for none. */
export function endSoundOf(kind: EffectKind): SoundName | null {
  return END_SOUNDS[kind];
}

/**
 * The sound each lasting effect plays as a pickup caught starts it, beside
 * the catch's own, or null for none: the Shield raised, and the field
 * slowing; a weapon and the Magnet are heard by their catch alone.
 */
const START_SOUNDS: Readonly<Record<EffectKind, SoundName | null>> = {
  weapon: null,
  guard: "shield-up",
  pull: null,
  pace: "slow-on",
};

/** Returns the sound an effect of a group plays as a pickup caught starts it, or null for none. */
export function startSoundOf(kind: EffectKind): SoundName | null {
  return START_SOUNDS[kind];
}

/** Gives a sound for each size a kind of rock comes in. */
type BySize<Kind extends RockKindId> = Readonly<
  Record<keyof (typeof ROCK_KINDS)[Kind]["hits"], SoundName>
>;

/**
 * The sound each kind of rock breaks with at each size it comes in, its
 * material's: stone knocks and crumbles, ice is glass, a crystal chimes,
 * iron clanks, a lodestone wobbles, a volatile rock's fuse sizzles before
 * its blast, and the boulder breaks in three beats.
 */
const BREAK_SOUNDS: { readonly [Kind in RockKindId]: BySize<Kind> } = {
  stone: {
    large: "break-stone-large",
    medium: "break-stone-medium",
    small: "break-stone-small",
  },
  crystal: { large: "break-crystal-large", medium: "break-crystal-medium" },
  ice: {
    large: "break-ice-large",
    medium: "break-ice-medium",
    small: "break-ice-small",
  },
  boulder: { boulder: "break-boulder" },
  iron: {
    large: "break-iron-large",
    medium: "break-iron-medium",
    small: "break-iron-small",
  },
  volatile: { large: "fuse-volatile", medium: "fuse-volatile" },
  lodestone: {
    large: "break-lodestone-large",
    medium: "break-lodestone-medium",
    small: "break-lodestone-small",
  },
};

/**
 * The sound each kind of rock holds a hit with: a boulder's deep knock, and
 * a knock and a crack for the rest, as nothing came off; a rock that rings
 * logs its ring as it holds a hit, and the ring is heard for both.
 */
const HIT_SOUNDS: Readonly<Record<RockKindId, SoundName>> = {
  stone: "hit-stone",
  crystal: "hit-stone",
  ice: "hit-stone",
  boulder: "hit-boulder",
  iron: "hit-iron",
  volatile: "hit-stone",
  lodestone: "hit-stone",
};

/**
 * The sound a blast of each size plays: a small one's is shorter and less
 * deep, though no rock that blasts comes small yet.
 */
const BLAST_SOUNDS: Readonly<Record<RockSize, SoundName>> = {
  boulder: "blast-volatile",
  large: "blast-volatile",
  medium: "blast-volatile",
  small: "blast-volatile-small",
};

/** The sound each pickup's catch plays, each its own short signature. */
const CATCH_SOUNDS: Readonly<Record<PickupId, SoundName>> = {
  spread: "pickup-spread",
  rapid: "pickup-rapid",
  shield: "pickup-shield",
  lance: "pickup-lance",
  magnet: "pickup-magnet",
  slow: "pickup-slow",
};

/**
 * The sound each weapon's pull of fire plays: the gun's soft pew, the
 * Spread's three at once, the Rapid's lighter, higher one, and the Lance's
 * ringing needle.
 */
const SHOT_SOUNDS: Readonly<Record<WeaponId, SoundName>> = {
  gun: "shot-gun",
  spread: "shot-spread",
  rapid: "shot-rapid",
  lance: "shot-lance",
};

/** The chime static plays as it rises to each multiplier's step. */
const MULTIPLIER_SOUNDS: Readonly<
  Record<(typeof STATIC_STEPS)[number]["times"], SoundName>
> = {
  2: "chain-x2",
  3: "chain-x3",
  4: "chain-x4",
};

/** Static's steps above ×1, the lowest first, as `stepped` counts them from 1. */
const STEPS_UP = [...STATIC_STEPS].sort((one, other) => one.from - other.from);

/**
 * The sound each event plays, or null for one that plays none, but those
 * a rock's kind and size, a pickup, a weapon or static's step decide.
 */
const EVENT_SOUNDS: Readonly<
  Record<
    Exclude<
      FieldEventKind,
      "broken" | "hit" | "blast" | "caught" | "fired" | "stepped"
    >,
    SoundName | null
  >
> = {
  dashed: DASH,
  shielded: "shield-break",
  warned: "comet-warning",
  cleared: "wave-clear",
  rung: "hit-iron",
  dropped: "pickup-drop",
  faded: "pickup-fade",
  lost: "pod-lost",
  knocked: "pod-hit",
  recaught: "crew-caught",
  floated: "crew-home",
  strayed: "stray-appear",
  joined: "stray-catch",
  home: "stray-catch",
  scored: null,
  sparked: SPARK,
  grazed: "near-miss",
  zapped: "zap-dash",
  arced: "zap-arc",
};

/**
 * The sound an event plays after its first, where it has one: the line
 * snapping as one is knocked loose, after the pod's hit.
 */
const SECOND_SOUNDS: Readonly<Partial<Record<FieldEventKind, SoundName>>> = {
  knocked: "crew-loose",
};

/** Returns the sound an event plays after its first, or null for none. */
export function secondSoundOf(event: Readonly<FieldEvent>): SoundName | null {
  return SECOND_SOUNDS[event.kind] ?? null;
}

/**
 * Returns the sound an event plays, or null for none.
 *
 * A rock's break plays its kind's at its size, but one a comet smashed,
 * which scored nothing, plays the comet's smash; a hit it holds plays
 * its kind's knock, but a rock that rings logs its ring too, which is heard
 * for both. A pull of fire plays its weapon's shot. Static rising to a step
 * plays the chime of the multiplier it reaches, or full's, and falling to
 * one plays its fall.
 *
 * @throws {RangeError} For a break that names no rock, or one of a size
 *   its kind doesn't come in, a held hit that names no rock, a blast that
 *   names no size, a catch that names no pickup, a pull of fire that names
 *   no weapon, or static rising to its first step, which the field's log
 *   never records.
 */
export function soundOf(event: Readonly<FieldEvent>): SoundName | null {
  switch (event.kind) {
    case "broken":
      return event.times === 0 ? "comet-smash" : breakSoundOf(event);
    case "hit": {
      const kind = rockKindOf(event);
      return hasTrait(kind, "rings") ? null : HIT_SOUNDS[kind];
    }
    case "blast":
      return BLAST_SOUNDS[rockSizeOf(event)];
    case "caught":
      return CATCH_SOUNDS[pickupOf(event)];
    case "fired":
      return SHOT_SOUNDS[weaponOf(event)];
    case "stepped":
      return event.fell ? "static-down" : riseSoundOf(event.step);
    default:
      return EVENT_SOUNDS[event.kind];
  }
}

/**
 * Returns the sound static plays as it rises to a step.
 *
 * @throws {RangeError} For its first step, ×1, which it only falls to.
 */
function riseSoundOf(step: number): SoundName {
  if (step === FULL_STEP) return "static-full";
  const tier = STEPS_UP[step - 1];
  if (tier === undefined) {
    throw new RangeError(`Static rises to no step ${String(step)}.`);
  }
  return MULTIPLIER_SOUNDS[tier.times];
}

/**
 * Returns the sound a rock's break plays, its kind's at its size.
 *
 * @throws {RangeError} For a kind that doesn't come in its size.
 */
function breakSoundOf(event: Readonly<FieldEvent>): SoundName {
  const kind = rockKindOf(event);
  const size = rockSizeOf(event);
  const sounds: Readonly<Partial<Record<RockSize, SoundName>>> =
    BREAK_SOUNDS[kind];
  const broken = sounds[size];
  if (broken === undefined) {
    throw new RangeError(`A ${kind} rock doesn't come ${size}.`);
  }
  return broken;
}

/**
 * Returns the pickup an event happened to.
 *
 * @throws {RangeError} For an event that names no pickup.
 */
function pickupOf(event: Readonly<FieldEvent>): PickupId {
  if (event.pickup === null) {
    throw new RangeError(`A "${event.kind}" event names no pickup`);
  }
  return event.pickup;
}
