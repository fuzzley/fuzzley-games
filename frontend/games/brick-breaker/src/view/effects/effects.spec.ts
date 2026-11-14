import { fieldFrom } from "../../testing/field_picture";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import {
  SOUNDS,
  type SoundName,
  createFrameSounds,
  detuneOf,
  effectsOf,
  flourishesOf,
} from "./effects";
import { STREAK_STEPS } from "./streak";

/** Returns an event of a kind, at a cell or none, at a length of streak. */
function eventOf(kind: FieldEventKind, cell = -1, streak = 0): FieldEvent {
  return { serial: 1, kind, x: 0, y: 0, cell, capsule: null, streak };
}

/** Every event, with the sound it plays and what of it moves. */
const EVENTS = [
  ["launched", null, []],
  ["wall", "wall", []],
  ["paddle", "paddle", []],
  ["hit", "hit", ["pop"]],
  ["broken", "broken", ["shards"]],
  ["blast", "blast", ["ring", "shake"]],
  ["regrown", null, ["grow"]],
  ["dropped", null, []],
  ["caught", "caught", []],
  ["missed", null, []],
  ["fired", "fired", []],
  ["netted", "paddle", []],
  ["lost", "lost", ["fade", "shake"]],
  ["cleared", "cleared", []],
  ["freed", null, []],
  ["plated", null, []],
  ["opened", null, []],
  ["seeking", null, []],
] as const;

describe("effectsOf", () => {
  const field = fieldFrom(["2#"]);

  it.each(EVENTS)(
    "plays, for %s, the %s sound and the flourishes %j",
    (kind, sound, flourishes) => {
      expect(effectsOf(eventOf(kind, 0), field)).toEqual({
        sound,
        flourishes,
      });
    },
  );

  it("rings a brick that never breaks as a ball hits it", () => {
    expect(effectsOf(eventOf("hit", 1), field)).toEqual({
      sound: "steel",
      flourishes: ["pop"],
    });
  });

  it.each(STREAK_STEPS)(
    "steps the streak as a brick breaks it to %i",
    (streak) => {
      expect(effectsOf(eventOf("broken", 0, streak), field)).toEqual({
        sound: "broken",
        flourishes: ["shards", "streak"],
      });
    },
  );

  it.each([1, 4, 6, 11, 21])(
    "plays no step as a brick breaks the streak to %i",
    (streak) => {
      expect(effectsOf(eventOf("broken", 0, streak), field)).toEqual({
        sound: "broken",
        flourishes: ["shards"],
      });
    },
  );
});

describe("flourishesOf", () => {
  const field = fieldFrom(["2#"]);

  it.each(EVENTS.map(([kind]) => kind))(
    "plays nothing that moves for %s where motion isn't welcome",
    (kind) => {
      const effects = effectsOf(eventOf(kind, 0), field);

      expect(flourishesOf(effects, false)).toEqual([]);
    },
  );

  it("plays an event's flourishes where motion is welcome", () => {
    const effects = effectsOf(eventOf("blast", 0), field);

    expect(flourishesOf(effects, true)).toEqual(["ring", "shake"]);
  });
});

describe("detuneOf", () => {
  it("climbs a major pentatonic scale, a note a brick, from the streak's first", () => {
    const cents = Array.from({ length: 9 }, (_, i) =>
      detuneOf(eventOf("broken", 0, i + 1)),
    );

    expect(cents).toEqual([0, 200, 400, 700, 900, 1200, 1400, 1600, 1900]);
  });

  it.each([10, 11, 30])(
    "holds a brick broken %i into a streak at an octave and a fifth",
    (streak) => {
      expect(detuneOf(eventOf("broken", 0, streak))).toBe(1900);
    },
  );

  it("raises a broken brick's sound none before the streak starts", () => {
    expect(detuneOf(eventOf("broken", 0, 0))).toBe(0);
  });

  it("raises no other event's sound", () => {
    expect(detuneOf(eventOf("hit", 0, 5))).toBe(0);
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
