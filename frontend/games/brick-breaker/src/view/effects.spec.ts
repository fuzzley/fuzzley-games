import { fieldFrom } from "../testing/field_picture";
import {
  FrameSounds,
  type SoundName,
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

describe("FrameSounds", () => {
  /** Returns what a frame's sounds play, each as its name and how far it rose. */
  function played(sounds: FrameSounds): [SoundName, number][] {
    const plays: [SoundName, number][] = [];
    sounds.playEach((name, detune) => plays.push([name, detune]));
    return plays;
  }

  it("plays each sound heard once, at the most it rose", () => {
    const sounds = new FrameSounds();
    sounds.hear("broken", 100);
    sounds.hear("blast", 0);
    sounds.hear("broken", 300);
    sounds.hear("broken", 200);

    expect(played(sounds)).toEqual([
      ["broken", 300],
      ["blast", 0],
    ]);
  });

  it("plays them in the sprite's order, whatever order they were heard in", () => {
    const sounds = new FrameSounds();
    sounds.hear("blast", 0);
    sounds.hear("wall", 0);

    expect(played(sounds)).toEqual([
      ["wall", 0],
      ["blast", 0],
    ]);
  });

  it("plays a sound lowered below its own pitch", () => {
    const sounds = new FrameSounds();
    sounds.hear("lost", -100);

    expect(played(sounds)).toEqual([["lost", -100]]);
  });

  it("forgets the sounds it played", () => {
    const sounds = new FrameSounds();
    sounds.hear("wall", 0);
    played(sounds);

    expect(played(sounds)).toEqual([]);
  });
});
