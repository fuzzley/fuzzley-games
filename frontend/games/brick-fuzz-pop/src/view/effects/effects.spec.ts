import type {
  BallRole,
  FlightEvent,
  TurnOff,
  ZapPattern,
} from "../../rules/flight/events";
import type { Boon } from "../../rules/shot";
import { AT_ONCE } from "../../rules/tuning";
import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import {
  type Beat,
  type EventEffects,
  FlightEffects,
  SOUNDS,
  type SoundName,
  beatEffectsOf,
  breakDetune,
  createFrameSounds,
  detuneOf,
  flourishesOf,
} from "./effects";

/** When the events made here happen, but where a spec says. */
const AT = 3;

/** Returns a fuzzball's launch, in a role. */
function launch(role: BallRole, ball = 0): FlightEvent {
  return {
    at: 0,
    kind: "launch",
    ball,
    role,
    x: 4.5,
    y: 0.25,
    dx: 0,
    dy: 1,
    charge: 0,
    hot: false,
  };
}

/** Returns a fuzzball's turn off something, at a moment. */
function turn(off: TurnOff, { ball = 0, at = AT } = {}): FlightEvent {
  return { at, kind: "turn", ball, x: 1, y: 1, dx: 1, dy: 0, off };
}

/** Returns a fuzzball's strike, which takes hits off a brick and leaves it some, at a moment. */
function strike(
  [took, left]: readonly [took: number, left: number],
  { ball = 0, at = AT } = {},
): FlightEvent {
  return {
    at,
    kind: "strike",
    ball,
    cell: 8,
    took,
    left,
    charge: 0,
    earthed: false,
  };
}

/** Returns a brick's break, the round's `streak`th. */
function broken(streak: number): FlightEvent {
  return {
    at: AT,
    kind: "break",
    cell: 8,
    brick: "brick",
    by: "fuzzball",
    streak,
    points: 10,
  };
}

/** Returns a zap that lands in a pattern. */
function zap(pattern: ZapPattern): FlightEvent {
  return { at: AT, kind: "zap", cell: 8, pattern, reaches: [7] };
}

/** Returns what each event calls for, read in order through a round's flight whose shot carries a boon or none. */
function effectsOf(
  events: readonly FlightEvent[],
  boon: Boon | null = null,
): EventEffects[] {
  const effects = new FlightEffects();
  effects.begin(boon);
  return events.map((event) => effects.effectsOf(event));
}

/** Returns what the last of some events calls for, read in order through a flight. */
function lastEffectsOf(events: readonly FlightEvent[]): EventEffects {
  return effectsOf(events).at(-1) ?? { flourishes: [], sound: null };
}

/** Returns the sounds a fixture's flight plays, those of the events that play one, in order. */
function soundsOf(fixture: keyof typeof FLIGHT_FIXTURES): SoundName[] {
  const { start, round } = FLIGHT_FIXTURES[fixture];
  return effectsOf(round.flight.events, start.boon).flatMap(({ sound }) =>
    sound === null ? [] : [sound],
  );
}

/** What a turn off each thing calls for. */
const TURNS = [
  ["side", "knock"],
  ["ceiling", "knock"],
  ["face", null],
  ["corner", null],
  ["bumper", "bump"],
] as const;

/** Each event whose effects hang on nothing but its kind, with the sound it plays and what of it moves. */
const PLAIN_EVENTS = [
  [broken(1), "break", ["shards"]],
  [zap("row"), "zap", ["bolt"]],
  [zap("column"), "zap", ["bolt"]],
  [zap("cross"), "zap", ["bolt"]],
  [zap("x"), "zap", ["bolt"]],
  [zap("blast"), "blast", ["ring"]],
  [{ at: AT, kind: "recharge", ball: 0, cell: 8 }, null, []],
  [{ at: AT, kind: "portal", ball: 0, from: 8, to: 17 }, "portal", []],
  [{ at: AT, kind: "split", ball: 0, cell: 8, into: [1, 2] }, null, []],
  [{ at: AT, kind: "free", cell: 8, ink: 2 }, "cage", ["hop"]],
  [{ at: AT, kind: "yawn", ball: 0, x: 1, y: 1 }, "yawn", []],
  [{ at: AT, kind: "land", ball: 0, x: 1 }, "land", []],
] as const satisfies readonly (readonly [
  FlightEvent,
  SoundName | null,
  readonly string[],
])[];

/** Each beat, with the sound it plays and what of it moves. */
const BEATS = [
  ["notch", "notch", []],
  ["step", "step", []],
  ["jump", "jump", ["flash", "flare"]],
  ["danger", "danger", []],
  ["cleared", "chime", []],
  ["lost", "lost", ["shake"]],
] as const satisfies readonly (readonly [Beat, SoundName, readonly string[]])[];

describe("SOUNDS", () => {
  it("names the game's twenty sounds", () => {
    expect(SOUNDS).toHaveLength(20);
  });

  it("names each sound once", () => {
    expect(new Set(SOUNDS).size).toBe(SOUNDS.length);
  });

  it.each(SOUNDS)("names %s in a word, in lower case", (name) => {
    expect(name).toMatch(/^[a-z]+$/);
  });
});

describe("FlightEffects", () => {
  it.each([
    [null, "release"],
    ["hot", "boon"],
    ["triple", "boon"],
  ] as const)(
    "plays the release of a shot with the boon %s as %s",
    (boon, sound) => {
      expect(effectsOf([launch("player")], boon)).toEqual([
        { sound, flourishes: [] },
      ]);
    },
  );

  it.each(["mate", "friend", "split"] as const)(
    "plays nothing as a %s leaves",
    (role) => {
      expect(effectsOf([launch(role, 1)], "triple")).toEqual([
        { sound: null, flourishes: [] },
      ]);
    },
  );

  it.each(TURNS)("plays, for a turn off the %s, the %s sound", (off, sound) => {
    expect(effectsOf([turn(off)])).toEqual([{ sound, flourishes: [] }]);
  });

  it.each(PLAIN_EVENTS)(
    "plays, for %j, the %s sound and the flourishes %j",
    (event, sound, flourishes) => {
      expect(effectsOf([event])).toEqual([{ sound, flourishes }]);
    },
  );

  it("swells a brick that holds a strike, and knocks it", () => {
    expect(lastEffectsOf([turn("face"), strike([1, 2])])).toEqual({
      sound: "strike",
      flourishes: ["swell"],
    });
  });

  it.each([
    ["steel, which has no hits", 0],
    ["a plate or a shell, whose brick has hits", 2],
  ])("clanks a strike on %s that takes no hit, and swells it", (_, left) => {
    expect(lastEffectsOf([turn("face"), strike([0, left])])).toEqual({
      sound: "clank",
      flourishes: ["swell"],
    });
  });

  it("leaves a brick its fuzzball broke and turned off to its break", () => {
    expect(lastEffectsOf([turn("face"), strike([1, 0])])).toEqual({
      sound: null,
      flourishes: [],
    });
  });

  it("punches through a brick its fuzzball broke and flew on through, unturned", () => {
    expect(lastEffectsOf([turn("side", { at: 1 }), strike([2, 0])])).toEqual({
      sound: "punch",
      flourishes: ["streak"],
    });
  });

  it("leaves a brick broken as its fuzzball turned within a moment's reach to its break", () => {
    const struck = strike([1, 0], { at: AT + AT_ONCE / 2 });

    expect(lastEffectsOf([turn("face"), struck])).toEqual({
      sound: null,
      flourishes: [],
    });
  });

  it("punches through a brick its fuzzball turned just past a moment's reach of", () => {
    const struck = strike([1, 0], { at: AT + 2 * AT_ONCE });

    expect(lastEffectsOf([turn("face"), struck]).sound).toBe("punch");
  });

  it("punches through a brick when another fuzzball turned at that moment", () => {
    expect(
      lastEffectsOf([turn("face", { ball: 1 }), strike([1, 0], { ball: 2 })]),
    ).toEqual({ sound: "punch", flourishes: ["streak"] });
  });

  it("leaves a strike on a bumper to the bumper's kick", () => {
    expect(lastEffectsOf([turn("bumper"), strike([0, 0])])).toEqual({
      sound: null,
      flourishes: [],
    });
  });

  it("clanks steel its fuzzball strikes after an earlier kick off a bumper", () => {
    expect(lastEffectsOf([turn("bumper", { at: 1 }), strike([0, 0])])).toEqual({
      sound: "clank",
      flourishes: ["swell"],
    });
  });

  it("forgets the last flight's turns as it begins another", () => {
    const effects = new FlightEffects();
    effects.begin(null);
    effects.effectsOf(turn("face"));

    effects.begin(null);
    const struck = effects.effectsOf(strike([1, 0]));

    expect(struck.sound).toBe("punch");
  });

  it.each([
    ["plain", ["release", "knock", "strike", "land"]],
    ["punch", ["release", "knock", "punch", "break", "strike", "land"]],
    [
      "punchThrough",
      [
        ...["release", "knock"],
        ...["punch", "break", "punch", "break", "punch", "break"],
        ...["knock", "knock", "land"],
      ],
    ],
    ["hotShot", ["boon", "knock", "punch", "break", "clank", "land"]],
  ] as const)("plays the %s fixture's flight as %j", (fixture, sounds) => {
    expect(soundsOf(fixture)).toEqual(sounds);
  });

  it("plays a triple shot's release as a boon's, and its mates' leaving as nothing", () => {
    const { start, round } = FLIGHT_FIXTURES.triple;
    const launches = round.flight.events.filter(
      ({ kind }) => kind === "launch",
    );

    expect(effectsOf(launches, start.boon).map(({ sound }) => sound)).toEqual([
      "boon",
      null,
      null,
    ]);
  });
});

describe("beatEffectsOf", () => {
  it.each(BEATS)(
    "plays, for %s, the %s sound and the flourishes %j",
    (beat, sound, flourishes) => {
      expect(beatEffectsOf(beat)).toEqual({ sound, flourishes });
    },
  );
});

describe("flourishesOf", () => {
  /** What every event and beat calls for, but a launch and a turn's, which move nothing. */
  const EVERY = [
    ...PLAIN_EVENTS.map(([event]) => lastEffectsOf([event])),
    lastEffectsOf([turn("face"), strike([1, 2])]),
    lastEffectsOf([strike([1, 0])]),
    ...BEATS.map(([beat]) => beatEffectsOf(beat)),
  ];

  it.each(EVERY)(
    "plays nothing of %j where motion isn't welcome",
    (effects) => {
      expect(flourishesOf(effects, false)).toEqual([]);
    },
  );

  it("plays all of what an event calls for where motion is welcome", () => {
    expect(flourishesOf(beatEffectsOf("jump"), true)).toEqual([
      "flash",
      "flare",
    ]);
  });
});

describe("breakDetune", () => {
  it.each([
    [1, 0],
    [2, 100],
    [5, 400],
    [13, 1200],
    [30, 1200],
  ])("raises the round's broken brick %i by %i cents", (streak, cents) => {
    expect(breakDetune(streak)).toBe(cents);
  });
});

describe("detuneOf", () => {
  it("raises a broken brick's sound by its place in the round", () => {
    expect(detuneOf(broken(5))).toBe(breakDetune(5));
  });

  it("raises no other event's sound", () => {
    expect(detuneOf(strike([1, 2]))).toBe(0);
  });
});

describe("createFrameSounds", () => {
  it("plays each of the sprite's sounds heard, in the sprite's order", () => {
    const sounds = createFrameSounds();
    for (const name of [...SOUNDS].reverse()) sounds.hear(name, 0);

    const played: SoundName[] = [];
    sounds.playEach((name) => played.push(name));

    expect(played).toEqual(SOUNDS);
  });
});
