import { keysOf } from "@fz/core/records";
import { BRICK_KIND_IDS, type BrickKindId } from "../../rules/catalog/bricks";
import { OWN_INK } from "../../rules/paddle/balls";
import { fieldFrom } from "../../testing/field_picture";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import {
  DelayedSound,
  type Flourish,
  SOUNDS,
  type SoundName,
  createFrameSounds,
  detuneOf,
  effectsOf,
  flourishesOf,
  soundDelayOf,
} from "./effects";
import { STREAK_STEPS } from "./streak";
import { HOLD_MS } from "./timing";

/** Returns an event of a kind, at a cell or none, at a length of streak. */
function eventOf(kind: FieldEventKind, cell = -1, streak = 0): FieldEvent {
  return {
    serial: 1,
    kind,
    x: 0,
    y: 0,
    cell,
    capsule: null,
    streak,
    way: 0,
    ink: OWN_INK,
  };
}

/**
 * Every event's voice: the sound it plays and what of it moves, on a tough
 * brick. A new event fails to compile until its voice is written here.
 */
const VOICES_OF_EVENTS: Readonly<
  Record<FieldEventKind, readonly [SoundName | null, readonly Flourish[]]>
> = {
  launched: [null, []],
  wall: ["wall", []],
  paddle: ["paddle", ["squash", "dip"]],
  hit: ["hit", ["pop"]],
  broken: ["broken", ["shards"]],
  blast: ["blast", ["ring", "shake"]],
  regrown: [null, ["grow"]],
  dropped: [null, []],
  caught: ["caught", []],
  missed: [null, []],
  fired: ["fired", []],
  netted: ["paddle", []],
  lost: ["lost", ["fade", "shake"]],
  cleared: ["cleared", ["hold"]],
  freed: ["cage", []],
  plated: ["plate", []],
  opened: ["gates", ["open"]],
  seeking: ["seeker", []],
  bumped: ["bumper", ["pop"]],
  portalled: ["portal", []],
  slid: [null, ["slide"]],
};

/** Every event, with the sound it plays and what of it moves. */
const EVENTS = keysOf(VOICES_OF_EVENTS).map(
  (kind) => [kind, ...VOICES_OF_EVENTS[kind]] as const,
);

/**
 * Every kind of brick's voice: the sound of a hit that leaves it standing,
 * and of its breaking, or null for one that never breaks. A new kind fails
 * to compile until its voice is written here, and the field below holds one.
 */
const VOICES_OF_KINDS: Readonly<
  Record<BrickKindId, readonly [SoundName, SoundName | null]>
> = {
  plain: ["hit", "broken"],
  tough: ["hit", "broken"],
  steel: ["steel", null],
  blast: ["hit", "broken"],
  gift: ["hit", "broken"],
  ghost: ["hit", "broken"],
  regrow: ["hit", "broken"],
  cage: ["cage", "broken"],
  plated: ["hit", "broken"],
  key: ["hit", "key"],
  gate: ["steel", null],
  bumper: ["bumper", null],
  portal: ["steel", null],
  slider: ["hit", "broken"],
};

/** A field that holds a brick of every kind. */
const EVERY_KIND = fieldFrom(["o2#*?~+cuk=O@", ">"]);

/** Returns the cell of the field's brick of a kind, or throws for a kind it holds none of. */
function cellOf(kind: BrickKindId): number {
  const brick = EVERY_KIND.bricks.find((each) => each?.kind === kind);
  if (!brick) throw new Error(`The field holds no ${kind} brick.`);
  return brick.cell;
}

/** A streak's first step, at which a brick broken plays the step. */
const FIRST_STEP = 5;

/** Every kind that breaks, with the sound of its breaking. */
const BREAKING_KINDS = BRICK_KIND_IDS.flatMap((kind) => {
  const broken = VOICES_OF_KINDS[kind][1];
  return broken === null ? [] : [[kind, broken] as const];
});

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

  it.each(BRICK_KIND_IDS.map((kind) => [kind, VOICES_OF_KINDS[kind][0]]))(
    "plays, for a hit on a %s brick that holds, the %s sound and a pop",
    (kind, sound) => {
      const event = eventOf("hit", cellOf(kind));

      expect(effectsOf(event, EVERY_KIND)).toEqual({
        sound,
        flourishes: ["pop"],
      });
    },
  );

  it.each(BREAKING_KINDS)(
    "plays, for a %s brick broken, the %s sound and its shards",
    (kind, sound) => {
      const event = eventOf("broken", cellOf(kind), 1);

      expect(effectsOf(event, EVERY_KIND)).toEqual({
        sound,
        flourishes: ["shards"],
      });
    },
  );

  it.each(BREAKING_KINDS)(
    "plays, for a %s brick broken at a streak's step, the %s sound and the step",
    (kind, sound) => {
      const event = eventOf("broken", cellOf(kind), FIRST_STEP);

      expect(effectsOf(event, EVERY_KIND)).toEqual({
        sound,
        flourishes: ["shards", "streak"],
      });
    },
  );

  it.each([
    ["hit", 0, "hit", ["pop"]],
    ["broken", 1, "broken", ["shards"]],
    ["broken", FIRST_STEP, "broken", ["shards", "streak"]],
  ] as const)(
    "plays, for a %s with no brick at its cell, at a streak of %i, the %s sound and %j",
    (kind, streak, sound, flourishes) => {
      expect(effectsOf(eventOf(kind, -1, streak), field)).toEqual({
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

  it.each([15, 25, 30])(
    "steps the streak as a brick breaks it to the level's mark of %i",
    (mark) => {
      const event = eventOf("broken", 0, mark);

      expect(effectsOf(event, fieldFrom(["2#"], { mark }))).toEqual({
        sound: "broken",
        flourishes: ["shards", "streak"],
      });
    },
  );

  it.each([1, 4, 6, 11, 15, 21, 25])(
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

describe("soundDelayOf", () => {
  const field = fieldFrom(["2#"]);

  it("has the clear's chord wait out the last brick's hold", () => {
    expect(soundDelayOf(effectsOf(eventOf("cleared"), field))).toBe(HOLD_MS);
  });

  it.each(EVENTS.map(([kind]) => kind).filter((kind) => kind !== "cleared"))(
    "plays the sound of %s at once",
    (kind) => {
      expect(soundDelayOf(effectsOf(eventOf(kind, 0), field))).toBe(0);
    },
  );
});

describe("DelayedSound", () => {
  /** Returns the sounds a frame's sounds play once a delayed sound has had its turn at a time. */
  function playedAt(delayed: DelayedSound, now: number): [SoundName, number][] {
    const sounds = createFrameSounds();
    delayed.playDue(now, sounds);
    const played: [SoundName, number][] = [];
    sounds.playEach((name, detune) => {
      played.push([name, detune]);
    });
    return played;
  }

  it("plays a sound once its time comes, and only once", () => {
    const delayed = new DelayedSound();
    delayed.wait("cleared", 100, 1000);

    const played = [999, 1000, 1001].map((now) => playedAt(delayed, now));

    expect(played).toEqual([[], [["cleared", 100]], []]);
  });

  it("says which sound waits", () => {
    const delayed = new DelayedSound();

    delayed.wait("cleared", 0, 1000);

    expect([delayed.isWaiting("cleared"), delayed.isWaiting("broken")]).toEqual(
      [true, false],
    );
  });

  it("plays a sound waiting whenever it is due, asked at Infinity", () => {
    const delayed = new DelayedSound();
    delayed.wait("cleared", 0, 1000);

    const played = playedAt(delayed, Infinity);

    expect({ played, waiting: delayed.isWaiting("cleared") }).toEqual({
      played: [["cleared", 0]],
      waiting: false,
    });
  });
});
