import { fieldFrom } from "../testing/field_picture";
import { effectsOf, flourishesOf } from "./effects";
import type { FieldEvent, FieldEventKind } from "./frame";

/** Returns an event of a kind, at a cell or none. */
function eventOf(kind: FieldEventKind, cell = -1): FieldEvent {
  return { serial: 1, kind, x: 0, y: 0, cell, capsule: null };
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
