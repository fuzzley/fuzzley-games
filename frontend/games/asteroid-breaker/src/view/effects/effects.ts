import { recordOf } from "@fz/core/records";
import { ROCK_SIZES, type RockSize, hasTrait } from "../../rules/catalog/rocks";
import {
  type FieldEvent,
  type FieldEventKind,
  rockKindOf,
  rockSizeOf,
} from "../field/frame";

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

/** What a rock of each size calls for as it breaks: its shards and dust, and a large one's kick. */
const BROKEN: Readonly<Record<RockSize, EventEffects>> = recordOf(
  ROCK_SIZES,
  (size) =>
    moving(
      size === "boulder" || size === "large"
        ? ["shards", "dust", "kick"]
        : ["shards", "dust"],
    ),
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
  fired: QUIET,
  dashed: moving(["trail"]),
  shielded: moving(["ring"]),
  nova: moving(["ring"]),
  warned: QUIET,
  cleared: QUIET,
  rung: moving(["flash", "spark"]),
  blast: moving(["ring"]),
  dropped: QUIET,
  caught: QUIET,
  faded: QUIET,
  lost: moving(["burst", "ring", "shake", "bailout"]),
  // The crew's own flourishes are a later package's to choose.
  knocked: QUIET,
  recaught: QUIET,
  floated: QUIET,
  strayed: QUIET,
  joined: QUIET,
  home: QUIET,
  scored: { flourishes: ["points"], still: ["points"] },
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
 * Returns the flourishes an event's effects play: all of them where motion is
 * welcome, else those that don't move.
 */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : effects.still;
}
