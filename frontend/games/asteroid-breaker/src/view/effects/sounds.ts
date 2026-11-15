import { FrameSounds } from "@fz/core/frame_sounds";
import { keysOf } from "@fz/core/records";
import {
  type MixedSound,
  SOUND_LEVELS,
  type SoundLevel,
} from "@fz/core/sound_mix";
import type { PickupId } from "../../rules/catalog/pickups";
import {
  type ROCK_KINDS,
  type RockKindId,
  type RockSize,
  hasTrait,
} from "../../rules/catalog/rocks";
import {
  type FieldEvent,
  type FieldEventKind,
  rockKindOf,
  rockSizeOf,
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
const PLAY_ORDER: readonly SoundName[] = [...SOUND_NAMES].sort(
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

/** How far a break's sound rises for each break of its chain before it, in cents: a semitone. */
export const CHAIN_STEP_CENTS = 100;

/** The most a chain raises a break's sound, in cents: a fifth. */
export const CHAIN_MOST_CENTS = 700;

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

/**
 * The sound each pickup's catch plays, each its own short signature, or
 * null for the Nova, whose ring is heard.
 */
const CATCH_SOUNDS: Readonly<Record<PickupId, SoundName | null>> = {
  spread: "pickup-spread",
  rapid: "pickup-rapid",
  shield: "pickup-shield",
  lance: "pickup-lance",
  magnet: "pickup-magnet",
  slow: "pickup-slow",
  nova: null,
};

/**
 * The sound each event plays, or null for one that plays none, but those
 * a rock's kind and size or a pickup decide.
 */
const EVENT_SOUNDS: Readonly<
  Record<
    Exclude<FieldEventKind, "broken" | "hit" | "blast" | "caught">,
    SoundName | null
  >
> = {
  fired: "shot-gun",
  dashed: "dash",
  shielded: "shield-break",
  // The plan names no sound for it, and the Nova goes with sparks and
  // static; it plays a blast, as it did before.
  nova: "blast-volatile",
  warned: "comet-warning",
  cleared: "wave-clear",
  rung: "hit-iron",
  dropped: null,
  faded: null,
  lost: "pod-lost",
  knocked: "pod-hit",
  recaught: "crew-caught",
  floated: "crew-home",
  strayed: null,
  joined: "stray-catch",
  home: "stray-catch",
  scored: null,
};

/**
 * Returns the sound an event plays, or null for none.
 *
 * A rock's break plays its kind's at its size, but one a comet smashed,
 * which counts in no chain, plays the comet's smash; a hit it holds plays
 * its kind's knock, but a rock that rings logs its ring too, which is heard
 * for both.
 *
 * @throws {RangeError} For a break that names no rock, or one of a size
 *   its kind doesn't come in, a held hit that names no rock, a blast that
 *   names no size, or a catch that names no pickup, which the field's log
 *   never records.
 */
export function soundOf(event: Readonly<FieldEvent>): SoundName | null {
  switch (event.kind) {
    case "broken":
      return event.chain === 0 ? "comet-smash" : breakSoundOf(event);
    case "hit": {
      const kind = rockKindOf(event);
      return hasTrait(kind, "rings") ? null : HIT_SOUNDS[kind];
    }
    case "blast":
      return BLAST_SOUNDS[rockSizeOf(event)];
    case "caught":
      return CATCH_SOUNDS[pickupOf(event)];
    default:
      return EVENT_SOUNDS[event.kind];
  }
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

/**
 * Returns what gathers a frame's sounds, so each of {@link SOUNDS} plays
 * once a frame at most, the loudest level first.
 */
export function createFrameSounds(): FrameSounds<SoundName> {
  return new FrameSounds(PLAY_ORDER);
}
