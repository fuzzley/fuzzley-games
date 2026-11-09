import { FrameSounds } from "@fz/core/frame_sounds";
import { recordOf } from "@fz/core/records";
import {
  ROCK_KIND_IDS,
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
  rockKind,
} from "../../rules/catalog/rocks";
import type { FieldEvent, FieldEventKind } from "../field/frame";

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

/**
 * Names a flourish the scene plays: a broken rock's shards and dust, the
 * field's kick at a large break, a held hit's flash and spark, a blast's,
 * the Nova's, a spent Shield's or a lost ship's ring, the points scored, a
 * dash's trail, a lost ship's burst, its pilot bailing out, and the
 * field's shake. Each but the points moves, so plays only where motion is
 * welcome; the points show either way, rising only where it is.
 */
export type Flourish =
  | "shards"
  | "dust"
  | "kick"
  | "flash"
  | "spark"
  | "ring"
  | "points"
  | "trail"
  | "burst"
  | "bailout"
  | "shake";

/**
 * Says what an event calls for: the flourishes it plays, with motion and
 * without, and its sound.
 */
export interface EventEffects {
  /** What it plays where motion is welcome. */
  readonly flourishes: readonly Flourish[];
  /** What it plays where motion isn't welcome: none of what moves. */
  readonly still: readonly Flourish[];
  /** Its sound, or null; a sound plays with motion or without. */
  readonly sound: SoundName | null;
}

/** No flourish at all. */
const NONE: readonly Flourish[] = [];

/**
 * Returns what an event calls for whose flourishes all move, so none plays
 * where motion isn't welcome.
 */
function moving(
  sound: SoundName | null,
  flourishes: readonly Flourish[] = NONE,
): EventEffects {
  return { flourishes, still: NONE, sound };
}

/** What an event calls for that the scene plays nothing of. */
const QUIET = moving(null);

/** The sound each size of rock breaks with, from a boulder's low thump to a small rock's crack. */
const BREAK_SOUNDS: Readonly<Record<RockSize, SoundName>> = {
  boulder: "large",
  large: "large",
  medium: "medium",
  small: "small",
};

/** What a rock of each size calls for as it breaks: its shards and dust, and a large one's kick. */
const BROKEN: Readonly<Record<RockSize, EventEffects>> = recordOf(
  ROCK_SIZES,
  (size) =>
    moving(
      BREAK_SOUNDS[size],
      size === "boulder" || size === "large"
        ? ["shards", "dust", "kick"]
        : ["shards", "dust"],
    ),
);

/**
 * What a rock of each size that holds a hit calls for: its flash and
 * spark, and its size's break sound, as no sound is a held hit's own, and
 * the five hits a boulder holds would otherwise go unheard.
 */
const HELD: Readonly<Record<RockSize, EventEffects>> = recordOf(
  ROCK_SIZES,
  (size) => moving(BREAK_SOUNDS[size], ["flash", "spark"]),
);

/** The kinds of rock that ring as they hold a hit, whose ring is all a hit they hold calls for. */
const RINGING: ReadonlySet<RockKindId> = new Set(
  ROCK_KIND_IDS.filter((kind) =>
    rockKind(kind).traits.some((trait) => trait.kind === "rings"),
  ),
);

/**
 * What each event calls for, but a rock's break and a hit it holds, which its
 * kind and size decide.
 */
const EVENT_EFFECTS: Readonly<
  Record<Exclude<FieldEventKind, "broken" | "hit">, EventEffects>
> = {
  fired: moving("fired"),
  dashed: moving("dashed", ["trail"]),
  // The plan's sounds name none for it; iron's ring tells the guard is gone.
  shielded: moving("rung", ["ring"]),
  nova: moving("blast", ["ring"]),
  warned: moving("warned"),
  cleared: moving("cleared"),
  rung: moving("rung", ["flash", "spark"]),
  blast: moving("blast", ["ring"]),
  dropped: QUIET,
  caught: moving("caught"),
  faded: QUIET,
  lost: moving("lost", ["burst", "ring", "shake", "bailout"]),
  strayed: QUIET,
  home: moving("home"),
  gained: moving("gained"),
  scored: { flourishes: ["points"], still: ["points"], sound: null },
};

/**
 * Returns what an event calls for.
 *
 * @throws {RangeError} For a rock's break that names no size, or a hit it
 *   holds that names no kind or size, which the field's log never records.
 */
export function effectsOf(event: Readonly<FieldEvent>): EventEffects {
  switch (event.kind) {
    case "broken":
      return BROKEN[rockSizeOf(event)];
    case "hit":
      // A rock that rings logs its ring too, which plays for both.
      return RINGING.has(rockKindOf(event)) ? QUIET : HELD[rockSizeOf(event)];
    default:
      return EVENT_EFFECTS[event.kind];
  }
}

/**
 * Returns the kind of the rock an event happened to.
 *
 * @throws {RangeError} For an event that names no rock.
 */
export function rockKindOf(event: Readonly<FieldEvent>): RockKindId {
  if (event.rock === null) {
    throw new RangeError(`A "${event.kind}" event names no rock`);
  }
  return event.rock;
}

/**
 * Returns the size of the rock an event happened to.
 *
 * @throws {RangeError} For an event that names no rock's size.
 */
export function rockSizeOf(event: Readonly<FieldEvent>): RockSize {
  if (event.size === null) {
    throw new RangeError(`A "${event.kind}" event names no rock's size`);
  }
  return event.size;
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

/**
 * Returns the flourishes an event's effects play: all of them where motion is
 * welcome, else those that don't move.
 */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : effects.still;
}
