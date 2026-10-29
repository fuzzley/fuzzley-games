import type { FieldEvent, FieldEventKind, FieldView } from "./frame";

/** Names a sound of the game's sprite. */
export type SoundName =
  | "paddle"
  | "wall"
  | "hit"
  | "broken"
  | "steel"
  | "blast"
  | "caught"
  | "fired"
  | "lost"
  | "cleared";

/**
 * Names a flourish the scene plays: a hit brick's pop, a broken one's
 * shards, a blast's ring, the field's shake, a lost ball's fade and a
 * regrown brick's growing back. Each moves, so none plays where motion
 * isn't welcome.
 */
export type Flourish = "pop" | "shards" | "ring" | "shake" | "fade" | "grow";

/** Says what an event calls for: the flourishes it plays, and its sound. */
export interface EventEffects {
  readonly flourishes: readonly Flourish[];
  /** Its sound, or null; a sound plays with motion or without. */
  readonly sound: SoundName | null;
}

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
  cleared: { flourishes: [], sound: "cleared" },
};

/** What a hit on a brick that never breaks calls for. */
const UNBROKEN_HIT: EventEffects = { flourishes: ["pop"], sound: "steel" };

/** The flourishes played where motion isn't welcome. */
const STILL: readonly Flourish[] = [];

/** Returns what an event calls for, on the field as it stands. */
export function effectsOf(
  event: Readonly<FieldEvent>,
  field: FieldView,
): EventEffects {
  if (event.kind === "hit" && field.bricks[event.cell]?.whole === 0) {
    return UNBROKEN_HIT;
  }
  return EVENT_EFFECTS[event.kind];
}

/** Returns the flourishes an event's effects play: all of them where motion is welcome, else none. */
export function flourishesOf(
  effects: EventEffects,
  motion: boolean,
): readonly Flourish[] {
  return motion ? effects.flourishes : STILL;
}
