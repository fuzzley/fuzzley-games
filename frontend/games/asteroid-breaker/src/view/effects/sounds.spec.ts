import { SOUND_LEVELS, type SoundLevel } from "@fz/core/sound_mix";
import { PICKUP_IDS, type PickupId } from "../../rules/catalog/pickups";
import {
  ROCK_KINDS,
  ROCK_KIND_IDS,
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
  hasTrait,
} from "../../rules/catalog/rocks";
import { WEAPON_IDS, type WeaponId } from "../../rules/catalog/weapons";
import { hitRock } from "../../rules/rocks/rocks";
import { KEEPER, fieldFrom, placeRock } from "../../testing/field_picture";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import {
  SOUNDS,
  SOUND_NAMES,
  type SoundName,
  THRUST,
  createFrameSounds,
  detuneOf,
  soundOf,
} from "./sounds";

/** Describes what an event of the spec's names beside its kind. */
interface Made {
  readonly size?: RockSize | null;
  readonly rock?: RockKindId | null;
  readonly chain?: number;
  readonly pickup?: PickupId | null;
  readonly weapon?: WeaponId | null;
}

/**
 * Returns an event of a kind, of a rock of a kind and size, at a count in
 * its chain, of a pickup, or fired by a weapon, as given; a rock's size
 * alone names a stone.
 */
function eventOf(
  kind: FieldEventKind,
  {
    size = null,
    rock = size === null ? null : "stone",
    chain = 0,
    pickup = null,
    weapon = null,
  }: Made = {},
): FieldEvent {
  return {
    serial: 1,
    kind,
    x: 0,
    y: 0,
    rock,
    size,
    pickup,
    weapon,
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

/** Returns the hits that break a kind of rock at each size it comes in. */
function hitsOf(kind: RockKindId): Readonly<Partial<Record<RockSize, number>>> {
  return ROCK_KINDS[kind].hits;
}

/** Returns every size a kind of rock comes in, largest first. */
function sizesOf(kind: RockKindId): RockSize[] {
  return ROCK_SIZES.filter((size) => hitsOf(kind)[size] !== undefined);
}

/**
 * Returns an event for each of a rock's that the field logs of a kind at a
 * size: its break, counted in a chain and smashed, a hit it holds where it
 * takes more than one, its ring where it rings, and its blast where it
 * blasts.
 */
function rockEventsOf(rock: RockKindId, size: RockSize): FieldEvent[] {
  const holds = (hitsOf(rock)[size] ?? 0) > 1;
  return [
    eventOf("broken", { rock, size, chain: 1 }),
    eventOf("broken", { rock, size, chain: 0 }),
    ...(holds ? [eventOf("hit", { rock, size })] : []),
    ...(holds && hasTrait(rock, "rings")
      ? [eventOf("rung", { rock, size })]
      : []),
    ...(hasTrait(rock, "blasts") ? [eventOf("blast", { rock, size })] : []),
  ];
}

/** Every event that names nothing but its kind and place, with its sound. */
const EVENTS: readonly (readonly [FieldEventKind, SoundName | null])[] = [
  ["dashed", "dash"],
  ["shielded", "shield-break"],
  ["nova", "blast-volatile"],
  ["warned", "comet-warning"],
  ["cleared", "wave-clear"],
  ["dropped", null],
  ["faded", null],
  ["lost", "pod-lost"],
  ["knocked", "pod-hit"],
  ["recaught", "crew-caught"],
  ["floated", "crew-home"],
  ["strayed", null],
  ["joined", "stray-catch"],
  ["home", "stray-catch"],
  ["scored", null],
];

/** Each kind of rock at each size it comes in, with the sound it breaks with. */
const BREAKS: readonly (readonly [RockKindId, RockSize, SoundName])[] = [
  ["stone", "large", "break-stone-large"],
  ["stone", "medium", "break-stone-medium"],
  ["stone", "small", "break-stone-small"],
  ["crystal", "large", "break-crystal-large"],
  ["crystal", "medium", "break-crystal-medium"],
  ["ice", "large", "break-ice-large"],
  ["ice", "medium", "break-ice-medium"],
  ["ice", "small", "break-ice-small"],
  ["boulder", "boulder", "break-boulder"],
  ["iron", "large", "break-iron-large"],
  ["iron", "medium", "break-iron-medium"],
  ["iron", "small", "break-iron-small"],
  ["volatile", "large", "fuse-volatile"],
  ["volatile", "medium", "fuse-volatile"],
  ["lodestone", "large", "break-lodestone-large"],
  ["lodestone", "medium", "break-lodestone-medium"],
  ["lodestone", "small", "break-lodestone-small"],
];

/** Each kind of rock, with the sound a hit it holds plays, or null for one heard by its ring. */
const HITS: readonly (readonly [RockKindId, SoundName | null])[] = [
  ["stone", "hit-stone"],
  ["crystal", "hit-stone"],
  ["ice", "hit-stone"],
  ["boulder", "hit-boulder"],
  ["iron", null],
  ["volatile", "hit-stone"],
  ["lodestone", "hit-stone"],
];

/** Each weapon, with the sound its pull of fire plays. */
const SHOTS: readonly (readonly [WeaponId, SoundName])[] = [
  ["gun", "shot-gun"],
  ["spread", "shot-spread"],
  ["rapid", "shot-rapid"],
  ["lance", "shot-lance"],
];

/** Each pickup, with the sound its catch plays, or null for one heard by what it starts. */
const CATCHES: readonly (readonly [PickupId, SoundName | null])[] = [
  ["spread", "pickup-spread"],
  ["rapid", "pickup-rapid"],
  ["shield", "pickup-shield"],
  ["lance", "pickup-lance"],
  ["magnet", "pickup-magnet"],
  ["slow", "pickup-slow"],
  ["nova", null],
];

/** An event of every kind the field logs, in every case its sound turns on. */
const EVERY_EVENT: readonly FieldEvent[] = [
  ...EVENTS.map(([kind]) => eventOf(kind)),
  ...ROCK_KIND_IDS.flatMap((rock) =>
    sizesOf(rock).flatMap((size) => rockEventsOf(rock, size)),
  ),
  ...PICKUP_IDS.map((pickup) => eventOf("caught", { pickup })),
  ...WEAPON_IDS.map((weapon) => eventOf("fired", { weapon })),
];

/** The sounds of the sprite no event the field logs plays yet. */
const UNPLAYED: readonly SoundName[] = [
  "chain-ping",
  "chain-x2",
  "chain-x3",
  "chain-x4",
  "comet-pass",
  "burr-cling",
  "burr-shed",
  "burr-pop",
  "lodestone-hum",
  "near-miss",
  "pickup-drop",
  "pickup-fade",
  "effect-end",
  "slow-on",
  "slow-off",
  "spark",
  "stray-appear",
  "crew-loose",
  "tow-twang",
  "blast-volatile-small",
  "break-cluster",
  "shot-tail",
  "thrust-start",
  "thrust-stop",
  "dash-ready",
  "static-full",
  "static-down",
  "zap-dash",
  "zap-arc",
  "shield-up",
  "guard-end",
  "run-start",
  "wave-start",
  "sector-clear",
  "run-end",
  "new-best",
  "level-up",
  "tally-tick",
  "ui-move",
  "ui-select",
  "ui-back",
  "pause",
  "resume",
  "voice-whee",
  "voice-eep",
  "voice-ouch",
  "voice-yay",
  "voice-ooh",
  "voice-aww",
  "voice-cheer",
  "voice-hum",
];

describe("SOUNDS", () => {
  it("names the sounds of the plan but the beds, ninety-two of them", () => {
    expect(SOUND_NAMES).toHaveLength(92);
  });

  it.each([
    ["chain", true],
    ["hazards", false],
    ["pickups", true],
    ["rescue", true],
    ["rocks", false],
    ["ship", false],
    ["stingers", true],
    ["voice", true],
  ])("tunes every sound of the %s family: %s", (family, tuned) => {
    const tunings = SOUND_NAMES.filter(
      (name) => SOUNDS[name].family === family,
    ).map((name) => SOUNDS[name].tuned);

    expect(new Set(tunings)).toEqual(new Set([tuned]));
  });
});

describe("soundOf", () => {
  it.each(EVENTS)("plays, for %s, the %s sound", (kind, sound) => {
    expect(soundOf(eventOf(kind))).toBe(sound);
  });

  it.each(BREAKS)(
    "breaks a %s rock that is %s with the %s sound",
    (rock, size, sound) => {
      expect(soundOf(eventOf("broken", { rock, size, chain: 1 }))).toBe(sound);
    },
  );

  it("names a break for every kind of rock at every size it comes in", () => {
    expect(BREAKS.map(([rock, size]) => [rock, size])).toEqual(
      ROCK_KIND_IDS.flatMap((rock) =>
        sizesOf(rock).map((size) => [rock, size]),
      ),
    );
  });

  it.each(ROCK_KIND_IDS)(
    "plays a comet's smash for a %s rock smashed, which counts in no chain",
    (rock) => {
      const [size = "large"] = sizesOf(rock);

      expect(soundOf(eventOf("broken", { rock, size, chain: 0 }))).toBe(
        "comet-smash",
      );
    },
  );

  it.each(HITS)("plays a hit a %s rock holds with %s", (rock, sound) => {
    const [size = "large"] = sizesOf(rock);

    expect(soundOf(eventOf("hit", { rock, size }))).toBe(sound);
  });

  it("plays an iron rock's held hit once, by its ring", () => {
    const field = fieldFrom(KEEPER);
    const iron = placeRock(field, "large", 30, 20, "iron");
    const from = field.events.latest;
    hitRock(field, iron, 0, 0);

    const sounds: (SoundName | null)[] = [];
    field.events.forEachSince(from, (event) => {
      sounds.push(soundOf(event));
    });

    expect(sounds.filter((sound) => sound !== null)).toEqual(["hit-iron"]);
  });

  it.each([
    ["large", "blast-volatile"],
    ["medium", "blast-volatile"],
    ["small", "blast-volatile-small"],
  ] as const)("plays a %s blast with %s", (size, sound) => {
    expect(soundOf(eventOf("blast", { rock: "volatile", size }))).toBe(sound);
  });

  it.each(CATCHES)("plays the catch of a %s with %s", (pickup, sound) => {
    expect(soundOf(eventOf("caught", { pickup }))).toBe(sound);
  });

  it.each(SHOTS)("plays a pull of the %s with %s", (weapon, sound) => {
    expect(soundOf(eventOf("fired", { weapon }))).toBe(sound);
  });

  it("names a shot for every weapon", () => {
    expect(SHOTS.map(([weapon]) => weapon)).toEqual(WEAPON_IDS);
  });

  it("plays, of the sprite's sounds, none but those of events the field logs, the thrust's hum apart", () => {
    const played = new Set(EVERY_EVENT.map(soundOf));

    expect(
      SOUND_NAMES.filter((name) => name !== THRUST && !played.has(name)),
    ).toEqual(UNPLAYED);
  });

  it.each(["broken", "blast"] as const)(
    "throws for a rock's %s event that names no size",
    (kind) => {
      expect(() =>
        soundOf(eventOf(kind, { rock: "stone", size: null, chain: 1 })),
      ).toThrow(RangeError);
    },
  );

  it.each(["broken", "hit"] as const)(
    "throws for a rock's %s event that names no rock",
    (kind) => {
      expect(() =>
        soundOf(eventOf(kind, { rock: null, size: "small", chain: 1 })),
      ).toThrow(RangeError);
    },
  );

  it("throws for a break of a rock at a size its kind doesn't come in", () => {
    expect(() =>
      soundOf(eventOf("broken", { rock: "crystal", size: "small", chain: 1 })),
    ).toThrow(RangeError);
  });

  it("throws for a catch that names no pickup", () => {
    expect(() => soundOf(eventOf("caught"))).toThrow(RangeError);
  });

  it("throws for a pull of fire that names no weapon", () => {
    expect(() => soundOf(eventOf("fired"))).toThrow(RangeError);
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
    expect(detuneOf(eventOf("broken", { size: "small", chain }))).toBe(cents);
  });

  it("raises a smashed rock's break not at all, as it counts in no chain", () => {
    expect(detuneOf(eventOf("broken", { size: "small", chain: 0 }))).toBe(0);
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
      expect(detuneOf(eventOf(kind, { size: "small" }))).toBe(0);
    },
  );
});

describe("createFrameSounds", () => {
  it("plays each of the sprite's sounds heard, the loudest level first", () => {
    const sounds = createFrameSounds();
    for (const name of SOUND_NAMES) sounds.hear(name, 0);

    const levels: SoundLevel[] = [];
    sounds.playEach((name) => levels.push(SOUNDS[name].level));

    expect(levels).toEqual(
      [...SOUND_LEVELS]
        .reverse()
        .flatMap((level) =>
          SOUND_NAMES.filter((name) => SOUNDS[name].level === level).map(
            () => level,
          ),
        ),
    );
  });

  it("plays a frame's blast before the small breaks round it, which it ducks", () => {
    const sounds = createFrameSounds();
    sounds.hear("break-stone-small", 0);
    sounds.hear("hit-stone", 0);
    sounds.hear("blast-volatile", 0);

    const played: SoundName[] = [];
    sounds.playEach((name) => played.push(name));

    expect(played).toEqual([
      "blast-volatile",
      "break-stone-small",
      "hit-stone",
    ]);
  });
});
