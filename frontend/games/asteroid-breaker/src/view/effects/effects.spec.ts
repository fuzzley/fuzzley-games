import { keysOf } from "@fz/core/records";
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
  holdMsOf,
} from "./effects";
import { RINGS } from "./flourish";
import { BOULDER_HOLD_MS } from "./timing";

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
    burrs: 0,
  };
}

/** Every event but a rock's break and a hit it holds, with its flourishes with motion and without. */
const EVENTS: readonly (readonly [
  FieldEventKind,
  readonly Flourish[],
  readonly Flourish[],
])[] = [
  ["fired", ["muzzle"], []],
  ["dashed", ["trail"], ["mark"]],
  ["shielded", ["ring"], ["mark"]],
  ["warned", [], []],
  ["cleared", ["slow", "wave"], []],
  ["rung", ["flash", "spark"], []],
  ["blast", ["blast"], ["blast"]],
  ["shed", [], []],
  ["vented", ["ring"], []],
  ["dropped", ["ring"], []],
  ["caught", [], []],
  ["faded", ["ring"], []],
  ["lost", ["burst", "ring", "bailout"], []],
  ["knocked", [], []],
  ["recaught", [], []],
  ["floated", [], []],
  ["strayed", ["ring"], []],
  ["joined", [], []],
  ["home", [], []],
  ["scored", ["points"], ["points"]],
  ["sparked", [], []],
  ["stepped", [], []],
  ["grazed", [], []],
  ["zapped", [], []],
  ["arced", [], []],
  ["burred", [], []],
  ["clung", [], []],
  ["popped", [], []],
  ["shaken", [], []],
];

/**
 * Each size of rock, with its break's flourishes, a large one's kicking the
 * field and a boulder's shaking it and playing its beats.
 */
const BREAKS: readonly (readonly [RockSize, readonly Flourish[]])[] = [
  ["boulder", ["break", "shake", "boulder"]],
  ["large", ["break", "kick"]],
  ["medium", ["break"]],
  ["small", ["break"]],
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

  it("shakes the field for a boulder's break alone, as the budget has it", () => {
    const shaking = ALL_EFFECTS.filter(([, { flourishes }]) =>
      flourishes.includes("shake"),
    ).map(([name]) => name);

    expect(shaking).toEqual(["broken boulder"]);
  });
});

describe("holdMsOf", () => {
  it("holds the field still for a boulder's break's first beat", () => {
    expect(holdMsOf(eventOf("broken", "boulder"))).toBe(BOULDER_HOLD_MS);
  });

  it.each(["large", "medium", "small"] as const)(
    "holds the field still for no %s rock's break",
    (size) => {
      expect(holdMsOf(eventOf("broken", size))).toBe(0);
    },
  );

  it("holds the field still for no hit a boulder holds", () => {
    expect(holdMsOf(eventOf("hit", "boulder"))).toBe(0);
  });

  it.each(EVENTS.map(([kind]) => kind))(
    "holds the field still for no %s event",
    (kind) => {
      expect(holdMsOf(eventOf(kind))).toBe(0);
    },
  );
});

describe("the rings", () => {
  it("rings out for exactly the events the rings' table has a ring for, moving or still", () => {
    const ringing = EVENTS.flatMap(([kind, flourishes, still]) =>
      [...flourishes, ...still].some(
        (flourish) => flourish === "ring" || flourish === "mark",
      )
        ? [kind]
        : [],
    );

    expect([...ringing].sort()).toEqual([...keysOf(RINGS)].sort());
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
