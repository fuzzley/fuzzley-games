import {
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
} from "../../rules/catalog/rocks";
import { hitRock } from "../../rules/rocks/rocks";
import { KEEPER, fieldFrom, placeRock } from "../../testing/field_picture";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import {
  type EventEffects,
  type Flourish,
  effectsOf,
  flourishesOf,
} from "./effects";

/** Returns an event of a kind, of a rock of a kind and size or of none. */
function eventOf(
  kind: FieldEventKind,
  size: RockSize | null = null,
  rock: RockKindId | null = size === null ? null : "stone",
): FieldEvent {
  return {
    serial: 1,
    kind,
    x: 0,
    y: 0,
    rock,
    size,
    pickup: null,
    weapon: null,
    pilot: null,
    inTow: 0,
    runOver: false,
    points: 0,
    times: 0,
    reach: 0,
    step: 0,
    fell: false,
    slot: -1,
    wayX: 0,
    wayY: 0,
  };
}

/** Every event but a rock's break and a hit it holds, with its flourishes with motion and without. */
const EVENTS: readonly (readonly [
  FieldEventKind,
  readonly Flourish[],
  readonly Flourish[],
])[] = [
  ["fired", [], []],
  ["dashed", ["trail"], []],
  ["shielded", ["ring"], []],
  ["warned", [], []],
  ["cleared", [], []],
  ["rung", ["flash", "spark"], []],
  ["blast", ["ring"], []],
  ["dropped", [], []],
  ["caught", [], []],
  ["faded", [], []],
  ["lost", ["burst", "ring", "shake", "bailout"], []],
  ["knocked", [], []],
  ["recaught", [], []],
  ["floated", [], []],
  ["strayed", [], []],
  ["joined", [], []],
  ["home", [], []],
  ["scored", ["points"], ["points"]],
  ["sparked", [], []],
  ["stepped", [], []],
  ["grazed", [], []],
  ["zapped", [], []],
  ["arced", [], []],
];

/** Each size of rock, with its break's flourishes, a large one's kicking the field. */
const BREAKS: readonly (readonly [RockSize, readonly Flourish[]])[] = [
  ["boulder", ["shards", "dust", "kick"]],
  ["large", ["shards", "dust", "kick"]],
  ["medium", ["shards", "dust"]],
  ["small", ["shards", "dust"]],
];

/** Every event, a stone's of each size among them, with what it calls for. */
const ALL_EFFECTS: readonly (readonly [string, EventEffects])[] = [
  ...EVENTS.map(([kind]) => [kind, effectsOf(eventOf(kind))] as const),
  ...ROCK_SIZES.flatMap((size) =>
    (["broken", "hit"] as const).map(
      (kind) => [`${kind} ${size}`, effectsOf(eventOf(kind, size))] as const,
    ),
  ),
];

describe("effectsOf", () => {
  it.each(EVENTS)(
    "plays, for %s, the flourishes %j with motion and %j without",
    (kind, flourishes, still) => {
      expect(effectsOf(eventOf(kind))).toEqual({ flourishes, still });
    },
  );

  it.each(BREAKS)(
    "breaks a %s rock with the flourishes %j, none without motion",
    (size, flourishes) => {
      expect(effectsOf(eventOf("broken", size))).toEqual({
        flourishes,
        still: [],
      });
    },
  );

  it.each(ROCK_SIZES)("flashes a %s rock that holds a hit", (size) => {
    expect(effectsOf(eventOf("hit", size))).toEqual({
      flourishes: ["flash", "spark"],
      still: [],
    });
  });

  it("plays an iron rock's held hit once, by its ring: one flash and one spark", () => {
    const field = fieldFrom(KEEPER);
    const iron = placeRock(field, "large", 30, 20, "iron");
    const from = field.events.latest;
    hitRock(field, iron, 0, 0);

    const effects: EventEffects[] = [];
    field.events.forEachSince(from, (event) => {
      effects.push(effectsOf(event));
    });

    expect(effects.flatMap(({ flourishes }) => flourishes)).toEqual([
      "flash",
      "spark",
    ]);
  });

  it.each(["broken", "hit"] as const)(
    "throws for a rock's %s event that names no size",
    (kind) => {
      expect(() => effectsOf(eventOf(kind, null, "stone"))).toThrow(RangeError);
    },
  );

  it("throws for a hit that names no rock", () => {
    expect(() => effectsOf(eventOf("hit", "small", null))).toThrow(RangeError);
  });
});

describe("flourishesOf", () => {
  it.each(ALL_EFFECTS)(
    "plays every flourish of %s where motion is welcome",
    (_, effects) => {
      expect(flourishesOf(effects, true)).toEqual(effects.flourishes);
    },
  );

  it.each(ALL_EFFECTS)(
    "plays only what doesn't move of %s where motion isn't welcome",
    (_, effects) => {
      expect(flourishesOf(effects, false)).toEqual(effects.still);
    },
  );

  it("shows the points scored where motion isn't welcome", () => {
    expect(flourishesOf(effectsOf(eventOf("scored")), false)).toEqual([
      "points",
    ]);
  });
});
