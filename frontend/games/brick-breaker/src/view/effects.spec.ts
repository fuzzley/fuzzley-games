import { fieldFrom } from "../testing/field_picture";
import {
  SOUNDS,
  type SoundName,
  createFrameSounds,
  detuneOf,
  effectsOf,
  flourishesOf,
} from "./effects";
import type { FieldEvent, FieldEventKind } from "./frame";

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
  it.each([
    [1, 0],
    [2, 100],
    [5, 400],
    [8, 700],
    [30, 700],
  ])("raises a brick broken %i into a streak by %i cents", (streak, cents) => {
    expect(detuneOf(eventOf("broken", 0, streak))).toBe(cents);
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
