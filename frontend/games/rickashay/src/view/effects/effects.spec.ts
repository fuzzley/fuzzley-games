import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type {
  Flight,
  FlightEvent,
  RoundStart,
  TurnOff,
} from "../../rules/flight/events";
import { WALL_LEGEND } from "../../rules/levels/legend";
import {
  FLIGHT_FIXTURES,
  type FixtureName,
} from "../../testing/flight_fixtures";
import { BEATS } from "../run_state";
import {
  type EventEffects,
  type Flourish,
  QUIET,
  beatEffectsOf,
  callsOut,
  createFrameSounds,
  flightEffects,
  flourishesOf,
} from "./effects";
import { RALLY_CENTS, SOUNDS, type SoundName } from "./sounds";

/** The rally mark of the levels these specs play, past every hand-made flight's rally. */
const MARK = 20;

/** When the events made here happen. */
const AT = 3;

/**
 * Where the flights made here start: a field 11 deep, its wall a row of
 * steel, a ramp, a hatch, a gem, a spring brick, a brick, a gap, a lock of
 * 2 bolts and a gap, from the left, in field row 5, so each brick's wall
 * cell is its column.
 */
const START: RoundStart = {
  wall: wallFrom(["#L=GSo.y."], WALL_LEGEND, { lowestRow: 5 }),
  depth: 11,
  x: 4.5,
  hot: false,
};

/** Each brick of {@link START} by its wall cell. */
const STEEL = 0;
const RAMP = 1;
const HATCH = 2;
const GEM = 3;
const SPRING = 4;
const BRICK = 5;
const GAP = 6;
const LOCK = 7;

/** Returns a flight of events made by hand, along no track, as the effects read one. */
function flightOf(events: readonly FlightEvent[]): Flight {
  return {
    track: { ball: 0, role: "player", waypoints: [] },
    events,
    held: 0,
    length: AT,
    rally: 0,
    turns: 0,
    marks: [],
    lastStrike: null,
  };
}

/** Returns a turn off something, the cells it met as given. */
function turn(off: TurnOff, cells: readonly number[] = []): FlightEvent {
  return { at: AT, kind: "turn", x: 1, y: 1, dx: 1, dy: 0, off, cells };
}

/** Returns a strike on a cell of {@link START}, at a rally, breaking its brick or not. */
function strike(
  cell: number,
  { rally = 1, broke = false }: { rally?: number; broke?: boolean } = {},
): FlightEvent {
  return { at: AT, kind: "strike", cell, took: 1, broke, rally };
}

/** Returns what each of some events calls for, as a flight from {@link START}, to a rally mark. */
function effectsOf(
  events: readonly FlightEvent[],
  start: RoundStart = START,
  mark = MARK,
): readonly EventEffects[] {
  return flightEffects(start, flightOf(events), mark);
}

/** Returns what the last of some events calls for, as a flight from {@link START}. */
function lastEffectsOf(
  events: readonly FlightEvent[],
  start: RoundStart = START,
  mark = MARK,
): EventEffects {
  return effectsOf(events, start, mark).at(-1) ?? QUIET;
}

/** Returns the sounds some effects play, by name. */
function soundsOf(effects: EventEffects): SoundName[] {
  return effects.sounds.map(({ sound }) => sound);
}

/** Returns the sounds a fixture's flight plays, every event's in order. */
function fixtureSounds(name: FixtureName): SoundName[] {
  const { start, round } = FLIGHT_FIXTURES[name];
  return flightEffects(start, round.flight, MARK).flatMap(soundsOf);
}

/** Returns the flourishes a fixture's flight plays, every event's in order. */
function fixtureFlourishes(name: FixtureName): Flourish[] {
  const { start, round } = FLIGHT_FIXTURES[name];
  return flightEffects(start, round.flight, MARK).flatMap(
    ({ flourishes }) => flourishes,
  );
}

/** Returns a list's entries, each as many times as given, in turn. */
function times<const T>(count: number, ...each: T[]): T[] {
  return Array.from({ length: count }, () => each).flat();
}

describe("flightEffects, over the hand-made flights", () => {
  it.each([
    ["plain", ["knock", "strike", "land"]],
    ["cleared", ["knock", "strike", "break", "land"]],
    ["lost", ["knock", "strike", "land"]],
    ["jumped", ["knock", "strike", "break", "land"]],
    ["shielded", ["knock", "plate", "land"]],
    [
      "rally",
      [
        "knock",
        ...times(6, "strike", "knock"),
        ...times(4, "knock", "strike"),
        "earn",
        "knock",
        "knock",
        "spend",
        "knock",
        "strike",
        "land",
      ],
    ],
    [
      "spring",
      [
        "knock",
        "strike",
        "break",
        "spring",
        "earn",
        "spend",
        "knock",
        "strike",
        "break",
        "land",
      ],
    ],
    [
      "hot",
      ["knock", "strike", "break", "spend", "knock", "strike", "break", "land"],
    ],
    [
      "bolt",
      [
        "knock",
        "plate",
        "spend",
        "knock",
        "bolt",
        "unlock",
        "strike",
        "break",
        "land",
      ],
    ],
    [
      "hatch",
      [
        "knock",
        "knock",
        "knock",
        "thud",
        "knock",
        "thud",
        "knock",
        "knock",
        "thud",
        "swing",
        "knock",
        "knock",
        "land",
      ],
    ],
    ["teleport", ["portal", "knock", "knock", "knock", "land"]],
    ["bored", [...times(7, "knock"), "yawn", "land"]],
    ["guard", [...times(6, "knock"), "land"]],
  ] as const satisfies readonly (readonly [
    FixtureName,
    readonly SoundName[],
  ])[])("plays the %s flight's sounds", (name, sounds) => {
    expect(fixtureSounds(name)).toEqual(sounds);
  });

  it.each([
    ["plain", [{ kind: "swell", cell: 8 }, { kind: "streak" }]],
    ["cleared", [{ kind: "shards", cell: 8 }, { kind: "streak" }]],
    ["shielded", [{ kind: "spark", cell: 8 }]],
    [
      "spring",
      [
        { kind: "shards", cell: 8 },
        { kind: "kick" },
        { kind: "shards", cell: 1 },
        { kind: "streak" },
      ],
    ],
    [
      "bolt",
      [
        { kind: "spark", cell: 8 },
        { kind: "kick" },
        { kind: "slide" },
        { kind: "shards", cell: 1 },
        { kind: "streak" },
      ],
    ],
    [
      "hatch",
      [
        { kind: "dip", cell: 0 },
        { kind: "dip", cell: 5 },
        { kind: "dip", cell: 6 },
        { kind: "swing" },
      ],
    ],
    [
      "teleport",
      [
        { kind: "draw-in", cell: 6 },
        { kind: "let-out", cell: 29 },
      ],
    ],
    ["bored", []],
  ] as const satisfies readonly (readonly [
    FixtureName,
    readonly Flourish[],
  ])[])("plays the %s flight's flourishes", (name, flourishes) => {
    expect(fixtureFlourishes(name)).toEqual(flourishes);
  });

  it("rings at the rally's 10th strike alone, and streaks from its last alone", () => {
    const { start, round } = FLIGHT_FIXTURES.rally;
    const strikes = round.flight.events.flatMap((event, index) =>
      event.kind === "strike" ? [index] : [],
    );

    const effects = flightEffects(start, round.flight, MARK);

    expect(
      strikes.map((index) =>
        (effects[index]?.flourishes ?? [])
          .filter(({ kind }) => kind === "ring" || kind === "streak")
          .map(({ kind }) => kind),
      ),
    ).toEqual([[], [], [], [], [], [], [], [], [], ["ring"], ["streak"]]);
  });

  it("says what each of a flight's events calls for, one each, in its order", () => {
    const { start, round } = FLIGHT_FIXTURES.hatch;

    const effects = flightEffects(start, round.flight, MARK);

    expect(effects).toHaveLength(round.flight.events.length);
  });
});

describe("flightEffects, at a turn", () => {
  it.each([
    ["wall", "knock"],
    ["ceiling", "knock"],
  ] as const)("knocks off a %s", (off, sound) => {
    expect(soundsOf(lastEffectsOf([turn(off)]))).toEqual([sound]);
  });

  it("clanks off steel", () => {
    expect(lastEffectsOf([turn("brick", [STEEL])])).toEqual({
      sounds: [{ sound: "clank", detune: 0 }],
      flourishes: [],
    });
  });

  it("rings off a ramp, which flashes along its long face", () => {
    expect(lastEffectsOf([turn("brick", [RAMP])])).toEqual({
      sounds: [{ sound: "ring", detune: 0 }],
      flourishes: [{ kind: "flash", cell: RAMP }],
    });
  });

  it("clanks once off steel met twice at a moment, and rings off a ramp met with it", () => {
    const steel: RoundStart = {
      ...START,
      wall: wallFrom(["##L......"], WALL_LEGEND, { lowestRow: 5 }),
    };

    const effects = lastEffectsOf([turn("brick", [0, 1, 2])], steel);

    expect([soundsOf(effects), effects.flourishes]).toEqual([
      ["clank", "ring"],
      [{ kind: "flash", cell: 2 }],
    ]);
  });

  it.each([
    ["a hatch's bar, which its hold speaks for", "bar", [HATCH]],
    [
      "the cut of a hatch's bar's end, which its hold speaks for too",
      "brick",
      [HATCH],
    ],
    ["a brick, which its strike speaks for", "brick", [BRICK]],
    ["a lock, which its shielding speaks for", "brick", [LOCK]],
    ["the floor, which the bounce spent speaks for", "floor", []],
    ["a cell with no brick", "brick", [GAP]],
  ] as const)("calls for nothing itself off %s", (_, off, cells) => {
    expect(lastEffectsOf([turn(off, cells)])).toBe(QUIET);
  });
});

describe("flightEffects, at a strike", () => {
  it("strikes a brick that holds, which swells", () => {
    const [effects] = effectsOf([strike(BRICK), strike(BRICK)]);

    expect(effects).toEqual({
      sounds: [{ sound: "strike", detune: 0 }],
      flourishes: [{ kind: "swell", cell: BRICK }],
    });
  });

  it("breaks a brick, which bursts into shards", () => {
    const [effects] = effectsOf([strike(BRICK, { broke: true }), strike(GEM)]);

    expect(effects).toEqual({
      sounds: [
        { sound: "strike", detune: 0 },
        { sound: "break", detune: 0 },
      ],
      flourishes: [{ kind: "shards", cell: BRICK }],
    });
  });

  it.each([
    ["a gem that holds", strike(GEM), ["strike", "gem"]],
    [
      "a gem it breaks",
      strike(GEM, { broke: true }),
      ["strike", "break", "gem"],
    ],
    [
      "a spring brick it breaks",
      strike(SPRING, { broke: true }),
      ["strike", "break", "spring"],
    ],
  ] as const)("strikes %s", (_, event, sounds) => {
    expect(soundsOf(lastEffectsOf([event]))).toEqual(sounds);
  });

  it.each([
    [9, false],
    [10, true],
    [11, false],
    [25, true],
    [45, true],
  ])("rings at a rally of %i: %s", (rally, rings) => {
    const [effects] = effectsOf([strike(BRICK, { rally }), strike(BRICK)]);

    expect(effects?.flourishes.some(({ kind }) => kind === "ring")).toBe(rings);
  });

  it.each([
    [4, []],
    [5, ["call"]],
    [6, []],
  ])(
    "calls at a rally of %i on a level whose rally mark is 5",
    (rally, call) => {
      const effects = lastEffectsOf([strike(BRICK, { rally })], START, 5);

      expect(soundsOf(effects).filter((sound) => sound === "call")).toEqual(
        call,
      );
    },
  );

  it("streaks from the flight's last strike, though more follow at its moment", () => {
    const effects = effectsOf([
      strike(BRICK),
      strike(GEM),
      { at: AT, kind: "bounce-earned", by: "rally", held: 1, kept: true },
      { at: 9, kind: "land", x: 2 },
    ]);

    expect(
      effects.map(({ flourishes }) =>
        flourishes.some(({ kind }) => kind === "streak"),
      ),
    ).toEqual([false, true, false, false]);
  });
});

describe("flightEffects, on the rally's notes", () => {
  it("climbs the rally fixture's strikes a step of the five-note scale a strike, to two octaves up at the 11th", () => {
    const { start, round } = FLIGHT_FIXTURES.rally;

    const effects = flightEffects(start, round.flight, MARK);

    expect(
      round.flight.events.flatMap((event, index) =>
        event.kind === "strike" ? [effects[index]?.sounds[0]] : [],
      ),
    ).toEqual(RALLY_CENTS.map((detune) => ({ sound: "strike", detune })));
  });

  it.each([11, 12, 30])(
    "holds the strike's note two octaves up at a rally of %i",
    (rally) => {
      const effects = lastEffectsOf([strike(BRICK, { rally })]);

      expect(effects.sounds[0]).toEqual({ sound: "strike", detune: 2400 });
    },
  );

  it.each([
    ["a gem", GEM, ["break", "gem", "call"]],
    ["a spring brick", SPRING, ["break", "spring", "call"]],
  ] as const)(
    "raises none of the other sounds of a strike that breaks %s at the rally mark",
    (_, cell, sounds) => {
      const effects = lastEffectsOf(
        [strike(cell, { rally: 5, broke: true })],
        START,
        5,
      );

      expect(effects.sounds.slice(1)).toEqual(
        sounds.map((sound) => ({ sound, detune: 0 })),
      );
    },
  );

  it("plays a floor bounce's chord on the note the rally has reached", () => {
    const { start, round } = FLIGHT_FIXTURES.rally;

    const effects = flightEffects(start, round.flight, MARK);

    const earned = round.flight.events.findIndex(
      ({ kind }) => kind === "bounce-earned",
    );
    expect(effects[earned]?.sounds).toEqual([{ sound: "earn", detune: 2100 }]);
  });

  it("plays a spring brick's floor bounce on the first strike's note", () => {
    const { start, round } = FLIGHT_FIXTURES.spring;

    const effects = flightEffects(start, round.flight, MARK);

    const earned = round.flight.events.findIndex(
      ({ kind }) => kind === "bounce-earned",
    );
    expect(effects[earned]?.sounds).toEqual([{ sound: "earn", detune: 0 }]);
  });
});

describe("flightEffects, at the rest of a flight's events", () => {
  it.each([
    [
      "a plated face",
      { at: AT, kind: "shielded", cell: BRICK, by: "plate" },
      { sounds: ["plate"], flourishes: [{ kind: "spark", cell: BRICK }] },
    ],
    [
      "a lock still shut",
      { at: AT, kind: "shielded", cell: LOCK, by: "lock" },
      { sounds: ["plate"], flourishes: [{ kind: "spark", cell: LOCK }] },
    ],
    [
      "a floor bounce earned",
      { at: AT, kind: "bounce-earned", by: "spring", held: 2, kept: false },
      { sounds: ["earn"], flourishes: [] },
    ],
    [
      "a floor bounce spent",
      { at: AT, kind: "bounce-spent", held: 0 },
      { sounds: ["spend"], flourishes: [{ kind: "kick" }] },
    ],
    [
      "a hold",
      { at: AT, kind: "hold", cell: HATCH, left: 2 },
      { sounds: ["thud"], flourishes: [{ kind: "dip", cell: HATCH }] },
    ],
    [
      "the hatches opening",
      { at: AT, kind: "hatches-open" },
      { sounds: ["swing"], flourishes: [{ kind: "swing" }] },
    ],
    [
      "a bolt that opens no lock",
      { at: AT, kind: "bolt", drawn: 1 },
      { sounds: ["bolt"], flourishes: [{ kind: "slide" }] },
    ],
    [
      "the bolt that opens a lock",
      { at: AT, kind: "bolt", drawn: 2 },
      { sounds: ["bolt", "unlock"], flourishes: [{ kind: "slide" }] },
    ],
    [
      "a bolt past the lock's last",
      { at: AT, kind: "bolt", drawn: 3 },
      { sounds: ["bolt"], flourishes: [{ kind: "slide" }] },
    ],
    [
      "a portal",
      { at: AT, kind: "teleport", from: 6, to: 24 },
      {
        sounds: ["portal"],
        flourishes: [
          { kind: "draw-in", cell: 6 },
          { kind: "let-out", cell: 24 },
        ],
      },
    ],
    [
      "a yawn",
      { at: AT, kind: "bored", x: 1, y: 1 },
      { sounds: ["yawn"], flourishes: [] },
    ],
    [
      "a guard, which should never be met",
      { at: AT, kind: "guard", x: 1, y: 1, by: "length" },
      { sounds: [], flourishes: [] },
    ],
    [
      "the landing",
      { at: AT, kind: "land", x: 1 },
      { sounds: ["land"], flourishes: [] },
    ],
  ] as const satisfies readonly (readonly [
    string,
    FlightEvent,
    { sounds: readonly SoundName[]; flourishes: readonly Flourish[] },
  ])[])("calls for %s's sounds and flourishes", (_, event, called) => {
    const effects = lastEffectsOf([event]);

    expect({
      sounds: soundsOf(effects),
      flourishes: effects.flourishes,
    }).toEqual(called);
  });

  it("opens no lock above the ceiling, out of the field", () => {
    const high: RoundStart = {
      ...START,
      wall: wallFrom(["x........"], WALL_LEGEND, { lowestRow: 11 }),
    };

    const effects = lastEffectsOf([{ at: AT, kind: "bolt", drawn: 1 }], high);

    expect(soundsOf(effects)).toEqual(["bolt"]);
  });
});

describe("beatEffectsOf", () => {
  it.each([
    ["release", ["release"], []],
    ["hot-release", ["hot-release"], []],
    ["step", ["step"], []],
    ["jump", ["jump"], [{ kind: "jump-line" }, { kind: "flare" }]],
    ["danger", ["danger"], []],
    ["cleared", ["chime"], []],
    ["lost", ["lost"], [{ kind: "shake" }]],
  ] as const)(
    "calls for the %s's sounds and flourishes",
    (beat, sounds, flourishes) => {
      const effects = beatEffectsOf(beat);

      expect([soundsOf(effects), effects.flourishes]).toEqual([
        sounds,
        flourishes,
      ]);
    },
  );

  it("calls for something at every beat", () => {
    expect(BEATS.filter((beat) => beatEffectsOf(beat) === QUIET)).toEqual([]);
  });
});

describe("callsOut", () => {
  it.each([
    [4, false],
    [5, true],
  ])(
    "says whether a strike at a rally of %i calls out on a level whose rally mark is 5",
    (rally, calls) => {
      const effects = lastEffectsOf([strike(BRICK, { rally })], START, 5);

      expect(callsOut(effects)).toBe(calls);
    },
  );
});

describe("flourishesOf", () => {
  const SPRING_SPENT: EventEffects = lastEffectsOf([
    { at: AT, kind: "bounce-spent", held: 0 },
  ]);

  it("plays every flourish where motion is welcome", () => {
    expect(flourishesOf(SPRING_SPENT, true)).toEqual([{ kind: "kick" }]);
  });

  it("plays none where motion isn't", () => {
    expect(flourishesOf(SPRING_SPENT, false)).toEqual([]);
  });
});

describe("createFrameSounds", () => {
  it("plays each sound a frame heard once, at the most it rose, in the sprite's order", () => {
    const sounds = createFrameSounds();
    sounds.hear("strike", 200);
    sounds.hear("knock", 0);
    sounds.hear("strike", 900);
    const played: [SoundName, number][] = [];

    sounds.playEach((name, detune) => played.push([name, detune]));

    expect(played).toEqual([
      ["knock", 0],
      ["strike", 900],
    ]);
  });

  it("knows every sound of the sprite", () => {
    const sounds = createFrameSounds();
    for (const name of SOUNDS) sounds.hear(name, 0);
    const played: SoundName[] = [];

    sounds.playEach((name) => played.push(name));

    expect(played).toEqual(SOUNDS);
  });
});
