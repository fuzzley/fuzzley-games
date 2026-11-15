import {
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
} from "../../rules/catalog/rocks";
import { hitRock } from "../../rules/rocks/rocks";
import { KEEPER, fieldFrom, placeRock } from "../../testing/field_picture";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import {
  SOUNDS,
  type SoundName,
  THRUST,
  createFrameSounds,
  detuneOf,
  soundOf,
} from "./sounds";

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
    inTow: 0,
    runOver: false,
    points: 0,
    times: 0,
    reach: 0,
    chain,
    slot: -1,
    wayX: 0,
    wayY: 0,
  };
}

/** Every event but a rock's break and a hit it holds, with its sound. */
const EVENTS: readonly (readonly [FieldEventKind, SoundName | null])[] = [
  ["fired", "fired"],
  ["dashed", "dashed"],
  ["shielded", "rung"],
  ["nova", "blast"],
  ["warned", "warned"],
  ["cleared", "cleared"],
  ["rung", "rung"],
  ["blast", "blast"],
  ["dropped", null],
  ["caught", "caught"],
  ["faded", null],
  ["lost", "lost"],
  ["knocked", null],
  ["recaught", null],
  ["floated", null],
  ["strayed", null],
  ["joined", null],
  ["home", "home"],
  ["scored", null],
];

/** Each size of rock, with the sound it breaks with. */
const BREAKS: readonly (readonly [RockSize, SoundName])[] = [
  ["boulder", "large"],
  ["large", "large"],
  ["medium", "medium"],
  ["small", "small"],
];

describe("soundOf", () => {
  it.each(EVENTS)("plays, for %s, the %s sound", (kind, sound) => {
    expect(soundOf(eventOf(kind))).toBe(sound);
  });

  it.each(BREAKS)("breaks a %s rock with the %s sound", (size, sound) => {
    expect(soundOf(eventOf("broken", size))).toBe(sound);
  });

  it.each(BREAKS)(
    "plays a %s rock's hit that holds with its break's %s sound",
    (size, sound) => {
      expect(soundOf(eventOf("hit", size))).toBe(sound);
    },
  );

  it("plays an iron rock's held hit once, by its ring", () => {
    const field = fieldFrom(KEEPER);
    const iron = placeRock(field, "large", 30, 20, "iron");
    const from = field.events.latest;
    hitRock(field, iron, 0, 0);

    const sounds: (SoundName | null)[] = [];
    field.events.forEachSince(from, (event) => {
      sounds.push(soundOf(event));
    });

    expect(sounds.filter((sound) => sound !== null)).toEqual(["rung"]);
  });

  it.each(["broken", "hit"] as const)(
    "throws for a rock's %s event that names no size",
    (kind) => {
      expect(() => soundOf(eventOf(kind, null, "stone"))).toThrow(RangeError);
    },
  );

  it("throws for a hit that names no rock", () => {
    expect(() => soundOf(eventOf("hit", "small", null))).toThrow(RangeError);
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

  // A ship gained's stays in the sprite, which the sound's own build makes
  // again, though no rule gains a ship.
  it("names the thrust's hum and a ship gained's among the sprite's sounds, which no event plays", () => {
    const played = [
      ...EVENTS.map(([kind]) => soundOf(eventOf(kind))),
      ...ROCK_SIZES.flatMap((size) =>
        (["broken", "hit"] as const).map((kind) =>
          soundOf(eventOf(kind, size)),
        ),
      ),
    ];

    expect(SOUNDS.filter((name) => !played.includes(name))).toEqual([
      "gained",
      THRUST,
    ]);
  });
});
