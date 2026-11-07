import {
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
} from "../../rules/catalog/rocks";
import { hitRock } from "../../rules/rocks/rocks";
import { KEEPER, fieldFrom, placeRock } from "../../testing/field_picture";
import {
  type EventEffects,
  type Flourish,
  SOUNDS,
  type SoundName,
  THRUST,
  createFrameSounds,
  detuneOf,
  effectsOf,
  flourishesOf,
  rockKindOf,
  rockSizeOf,
} from "./effects";
import type { FieldEvent, FieldEventKind } from "../field/frame";

/** Returns an event of a kind, of a rock of a kind and size or of none, at a count in its chain. */
function eventOf(
  kind: FieldEventKind,
  size: RockSize | null = null,
  rock: RockKindId | null = size === null ? null : "stone",
  chain = 0,
): FieldEvent {
  return {
    serial: 1,
    kind,
    x: 0,
    y: 0,
    rock,
    size,
    pickup: null,
    pilot: null,
    fromHome: false,
    ships: 0,
    waiting: 0,
    points: 0,
    times: 0,
    reach: 0,
    chain,
    slot: -1,
    wayX: 0,
    wayY: 0,
  };
}

/** Every event but a rock's break and a hit it holds, with its sound and its flourishes with motion and without. */
const EVENTS: readonly (readonly [
  FieldEventKind,
  SoundName | null,
  readonly Flourish[],
  readonly Flourish[],
])[] = [
  ["fired", "fired", [], []],
  ["dashed", "dashed", ["trail"], []],
  ["shielded", "rung", ["ring"], []],
  ["nova", "blast", ["ring"], []],
  ["warned", "warned", [], []],
  ["cleared", "cleared", [], []],
  ["rung", "rung", ["flash", "spark"], []],
  ["blast", "blast", ["ring"], []],
  ["dropped", null, [], []],
  ["caught", "caught", [], []],
  ["faded", null, [], []],
  ["lost", "lost", ["burst", "ring", "shake", "bailout"], []],
  ["strayed", null, [], []],
  ["home", "home", [], []],
  ["gained", "gained", [], []],
  ["scored", null, ["points"], ["points"]],
];

/** Each size of rock, with the sound it breaks with and its break's flourishes, a large one's kicking the field. */
const BREAKS: readonly (readonly [RockSize, SoundName, readonly Flourish[]])[] =
  [
    ["boulder", "large", ["shards", "dust", "kick"]],
    ["large", "large", ["shards", "dust", "kick"]],
    ["medium", "medium", ["shards", "dust"]],
    ["small", "small", ["shards", "dust"]],
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
    "plays, for %s, the %s sound, the flourishes %j with motion and %j without",
    (kind, sound, flourishes, still) => {
      expect(effectsOf(eventOf(kind))).toEqual({ sound, flourishes, still });
    },
  );

  it.each(BREAKS)(
    "breaks a %s rock with the %s sound and the flourishes %j, none without motion",
    (size, sound, flourishes) => {
      expect(effectsOf(eventOf("broken", size))).toEqual({
        sound,
        flourishes,
        still: [],
      });
    },
  );

  it.each(BREAKS)(
    "flashes a %s rock that holds a hit, with its break's %s sound",
    (size, sound) => {
      expect(effectsOf(eventOf("hit", size))).toEqual({
        sound,
        flourishes: ["flash", "spark"],
        still: [],
      });
    },
  );

  it("plays an iron rock's held hit once, by its ring: one sound, one flash and one spark", () => {
    const field = fieldFrom(KEEPER);
    const iron = placeRock(field, "large", 30, 20, "iron");
    const from = field.events.latest;
    hitRock(field, iron, 0, 0);

    const effects: EventEffects[] = [];
    field.events.forEachSince(from, (event) => {
      effects.push(effectsOf(event));
    });

    expect(effects.flatMap(({ sound }) => (sound ? [sound] : []))).toEqual([
      "rung",
    ]);
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

describe("the rock an event names", () => {
  it("reads the kind and size of the rock an event happened to", () => {
    const event = eventOf("broken", "medium", "ice");

    expect([rockKindOf(event), rockSizeOf(event)]).toEqual(["ice", "medium"]);
  });

  it("throws for an event that names no rock", () => {
    expect(() => rockKindOf(eventOf("fired"))).toThrow(RangeError);
  });

  it("throws for an event that names no rock's size", () => {
    expect(() => rockSizeOf(eventOf("fired"))).toThrow(RangeError);
  });
});

describe("detuneOf", () => {
  it.each([
    [1, 0],
    [2, 100],
    [5, 400],
    [8, 700],
    [30, 700],
  ])("raises a break %i into its chain by %i cents", (chain, cents) => {
    expect(detuneOf(eventOf("broken", "small", "stone", chain))).toBe(cents);
  });

  it("raises a smashed rock's break not at all, as it counts in no chain", () => {
    expect(detuneOf(eventOf("broken", "small", "stone", 0))).toBe(0);
  });

  it("raises each of a field's breaks by its own count, smashed or not", () => {
    const field = fieldFrom(KEEPER);
    const rocks = [10, 20, 30].map((x) => placeRock(field, "small", x, 20));
    const [first, second, third] = rocks;
    if (!first || !second || !third) throw new Error("Three rocks were laid.");
    const from = field.events.latest;
    hitRock(field, first, 0, 0);
    hitRock(field, second, 0, 0);
    hitRock(field, third, 0, 0, "smashes");

    const cents: number[] = [];
    field.events.forEachSince(from, (event) => {
      if (event.kind === "broken") cents.push(detuneOf(event));
    });

    expect(cents).toEqual([0, 100, 0]);
  });

  it.each(["hit", "blast", "scored"] as const)(
    "raises no %s event's sound",
    (kind) => {
      expect(detuneOf(eventOf(kind, "small"))).toBe(0);
    },
  );
});

describe("createFrameSounds", () => {
  it("plays each of the sprite's sounds heard, in the sprite's order", () => {
    const sounds = createFrameSounds();
    for (const name of [...SOUNDS].reverse()) sounds.hear(name, 0);

    const played: SoundName[] = [];
    sounds.playEach((name) => played.push(name));

    expect(played).toEqual(SOUNDS);
  });

  it("names the thrust's hum among the sprite's sounds, which no event plays", () => {
    const played = ALL_EFFECTS.map(([, effects]) => effects.sound);

    expect(SOUNDS.filter((name) => !played.includes(name))).toEqual([THRUST]);
  });
});
