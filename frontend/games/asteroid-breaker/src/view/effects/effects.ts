import { recordOf } from "@fz/core/records";
import { ROCK_SIZES, type RockSize, hasTrait } from "../../rules/catalog/rocks";
import {
  type FieldEvent,
  type FieldEventKind,
  rockKindOf,
  rockSizeOf,
} from "../field/frame";
import { BOULDER_HOLD_MS } from "./timing";

/**
 * Names a flourish the scene plays: the muzzle's flash as a shot leaves, a
 * broken rock's break (its shards, dust and sparks), the field's kick at a
 * large rock's break, a held hit's flash and spark, a blast (its flash,
 * ring, embers and light), a vent's, a spent Shield's or a lost pod's ring, the
 * points scored, a dash's trail, a lost pod's burst, its pilot bailing
 * out, the field's shake at a boulder's break and the boulder's beats,
 * and, as a wave's last rock goes, the flourishes slowed and the wave's
 * ring. Each but the points and a blast moves, so plays only where motion
 * is welcome; the points show either way, rising only where it is, and a
 * blast's ring stands still at its reach where it isn't.
 */
export type Flourish =
  | "muzzle"
  | "break"
  | "kick"
  | "flash"
  | "spark"
  | "blast"
  | "ring"
  | "points"
  | "trail"
  | "burst"
  | "bailout"
  | "shake"
  | "boulder"
  | "slow"
  | "wave";

/** Says what an event calls for: the flourishes it plays, with motion and without. */
export interface EventEffects {
  /** What it plays where motion is welcome. */
  readonly flourishes: readonly Flourish[];
  /** What it plays where motion isn't welcome: none of what moves. */
  readonly still: readonly Flourish[];
}

/** No flourish at all. */
const NONE: readonly Flourish[] = [];

/**
 * Returns what an event calls for whose flourishes all move, so none plays
 * where motion isn't welcome.
 */
function moving(flourishes: readonly Flourish[] = NONE): EventEffects {
  return { flourishes, still: NONE };
}

/** What an event calls for that the scene plays no flourish of. */
const QUIET = moving();

/**
 * What a rock of each size plays as it breaks besides the break every rock
 * has: a large one's kick, and a boulder's shake and its beats.
 */
const OWN_BREAKS: Readonly<Record<RockSize, readonly Flourish[]>> = {
  boulder: ["shake", "boulder"],
  large: ["kick"],
  medium: NONE,
  small: NONE,
};

/** What a rock of each size calls for as it breaks: its break, and its own. */
const BROKEN: Readonly<Record<RockSize, EventEffects>> = recordOf(
  ROCK_SIZES,
  (size) => moving(["break", ...OWN_BREAKS[size]]),
);

/** What a rock of each size that holds a hit calls for: its flash and spark. */
const HELD: Readonly<Record<RockSize, EventEffects>> = recordOf(
  ROCK_SIZES,
  () => moving(["flash", "spark"]),
);

/**
 * What each event calls for, but a rock's break and a hit it holds, which its
 * kind and size decide.
 */
const EVENT_EFFECTS: Readonly<
  Record<Exclude<FieldEventKind, "broken" | "hit">, EventEffects>
> = {
  fired: moving(["muzzle"]),
  dashed: moving(["trail"]),
  shielded: moving(["ring"]),
  warned: QUIET,
  // The Cleared card tells the player, so the clearing's slow and its
  // ring keep no still mark.
  cleared: moving(["slow", "wave"]),
  rung: moving(["flash", "spark"]),
  // A blast keeps one still ring at its reach, which tells the player how
  // far it reached.
  blast: { flourishes: ["blast"], still: ["blast"] },
  // A piece knocked off comes away under the flash and spark of the hit
  // its boulder holds, which the hit plays.
  shed: QUIET,
  vented: moving(["ring"]),
  dropped: QUIET,
  caught: QUIET,
  faded: QUIET,
  // The run's end holds the field still, unshaken: `plan.md`'s budget
  // shakes it for a hit and a boulder alone.
  lost: moving(["burst", "ring", "bailout"]),
  // The crew's own flourishes are a later package's to choose.
  knocked: QUIET,
  recaught: QUIET,
  floated: QUIET,
  strayed: QUIET,
  joined: QUIET,
  home: QUIET,
  scored: { flourishes: ["points"], still: ["points"] },
  // Sparks', static's and the zap's own flourishes are a later package's to choose.
  sparked: QUIET,
  stepped: QUIET,
  grazed: QUIET,
  zapped: QUIET,
  arced: QUIET,
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
      return hasTrait(rockKindOf(event), "rings")
        ? QUIET
        : HELD[rockSizeOf(event)];
    default:
      return EVENT_EFFECTS[event.kind];
  }
}

/**
 * Returns how long the field holds still as an event happens, in
 * milliseconds, where motion is welcome: a boulder's break's first beat,
 * and nothing else's.
 */
export function holdMsOf(event: Readonly<FieldEvent>): number {
  return event.kind === "broken" && event.size === "boulder"
    ? BOULDER_HOLD_MS
    : 0;
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
