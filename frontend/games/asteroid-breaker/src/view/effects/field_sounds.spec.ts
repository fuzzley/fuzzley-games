import { gainOf } from "@fz/core/sound_mix";
import type { RockKindId, RockSize } from "../../rules/catalog/rocks";
import type { LoggedRock } from "../../rules/field/events";
import { type Field, steerField } from "../../rules/field/field";
import { endEffects } from "../../rules/rocks/pickups";
import { STILL } from "../../rules/ship/ship";
import { KEEPER, fieldFrom } from "../../testing/field_picture";
import {
  BURST_PULLS,
  FieldSounds,
  MOST_BREAKS_HEARD,
  TAIL_WITHIN_MS,
} from "./field_sounds";
import type { SoundName } from "./sounds";

/** Describes a play of a sound as the spec's frames hear it. */
interface Played {
  readonly name: SoundName;
  readonly detune: number;
  readonly across: number;
  readonly volume: number;
}

/** A field with a ship in it, on which the spec's events happen. */
const SHIP_PICTURE = [...KEEPER, "", "", "....^"];

/** How long a frame of the spec's takes, in milliseconds, but where it says. */
const FRAME_MS = 16;

/** Hears a frame of a field's sounds, so long after the last, and returns what played. */
type Frame = (afterMs?: number) => Played[];

/**
 * Returns the frames of a field's sounds: each call hears the field the
 * spec shows as it now stands and its events since the last, a frame after
 * it unless it says, and returns what played. The first call takes the
 * field in.
 */
function listenTo(shown: () => Field): Frame {
  const sounds = new FieldSounds();
  let since = shown().events.latest;
  let now = 0;
  return (afterMs = FRAME_MS) => {
    const field = shown();
    now += afterMs;
    sounds.hearField(field, now);
    field.events.forEachSince(since, (event) => {
      sounds.hear(event, field.torus.width);
    });
    since = field.events.latest;
    const played: Played[] = [];
    sounds.playEach((name, detune, across, volume) => {
      played.push({ name, detune, across, volume });
    });
    return played;
  };
}

/** Returns a field with a ship in it, and its frames of sound, the first taken in. */
function shipField(): { field: Field; frame: Frame } {
  const field = fieldFrom(SHIP_PICTURE);
  const frame = listenTo(() => field);
  frame();
  return { field, frame };
}

/** Returns a rock at a place on a field, as its events record it. */
function rockAt(
  field: Field,
  share: number,
  size: RockSize,
  kind: RockKindId = "stone",
): LoggedRock {
  return { x: field.torus.width * share, y: 5, kind, size, slot: 0 };
}

/** Returns the names of what played. */
function namesOf(played: readonly Played[]): SoundName[] {
  return played.map(({ name }) => name);
}

/** Logs a number of pulls of the gun at a place on a field. */
function pull(field: Field, count: number, x = 0): void {
  for (let pulled = 0; pulled < count; pulled++) {
    field.events.addFired(x, 5, "gun");
  }
}

/** Returns where the ship is across its field, from -1 to 1. */
function shipAcross(field: Field): number {
  return ((field.ship?.x ?? 0) / field.torus.width) * 2 - 1;
}

describe("FieldSounds", () => {
  describe("an event's sound", () => {
    it("plays where the event happened across the field, at its level and its own pitch", () => {
      const { field, frame } = shipField();

      field.events.addPickup("dropped", field.torus.width * 0.75, 5, "spread");

      expect(frame()).toEqual([
        { name: "pickup-drop", detune: 0, across: 0.5, volume: 1 },
      ]);
    });

    it("plays once a frame, where it was first heard", () => {
      const { field, frame } = shipField();

      field.events.addPickup("faded", 0, 5, "spread");
      field.events.addPickup("faded", field.torus.width / 2, 5, "rapid");

      expect(frame()).toEqual([
        { name: "pickup-fade", detune: 0, across: -1, volume: 1 },
      ]);
    });

    it("plays again in the next frame that hears it", () => {
      const { field, frame } = shipField();
      field.events.add("warned", 0, 5);
      frame();

      field.events.add("warned", 0, 5);

      expect(namesOf(frame())).toEqual(["comet-warning"]);
    });

    it("plays nothing in a frame that heard nothing", () => {
      const { frame } = shipField();

      expect(frame()).toEqual([]);
    });

    it("plays the Rapid's shot 3 dB under the gun's", () => {
      const { field, frame } = shipField();

      field.events.addFired(0, 5, "rapid");

      expect(frame().map(({ volume }) => volume)).toEqual([gainOf(-3)]);
    });

    it("plays the line snapping after the pod's hit as one is knocked loose", () => {
      const { field, frame } = shipField();

      field.events.addKnocked(0, 5, 1, field.crew, 1, 0);

      expect(namesOf(frame())).toEqual(["pod-hit", "crew-loose"]);
    });

    it("plays a frame's sounds the loudest first, so a blast ducks the breaks round it", () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.5, "small"), 1, 0, 0);
      field.events.addRock("blast", rockAt(field, 0.5, "large", "volatile"), 6);

      expect(namesOf(frame())).toEqual([
        "blast-volatile",
        "chain-ping",
        "break-stone-small",
      ]);
    });
  });

  describe("a chain's breaks", () => {
    it("ring one bell a frame, at the highest step of the ladder its breaks reached, where it was reached", () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.5, "small"), 4, 0, 0);
      field.events.addBreak(rockAt(field, 0.75, "small"), 3, 0, 0);

      expect(frame()).toContainEqual({
        name: "chain-ping",
        detune: 700,
        across: 0,
        volume: 1,
      });
    });

    it("ring the bell at the highest step the chain reached, where it reached it, though a lower step rings higher", () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.5, "small"), 13, 0, 0);
      field.events.addBreak(rockAt(field, 0.75, "small"), 14, 0, 0);

      expect(frame()).toContainEqual({
        name: "chain-ping",
        detune: 2800,
        across: 0.5,
        volume: 1,
      });
    });

    it("break at their own pitch, the ladder in the bell alone", () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.5, "small"), 8, 0, 0);

      expect(frame()).toContainEqual({
        name: "break-stone-small",
        detune: 0,
        across: 0,
        volume: 1,
      });
    });

    it.each([
      [5, "chain-x2"],
      [10, "chain-x3"],
      [20, "chain-x4"],
    ] as const)(
      "chime as the %ith break reaches a multiplier: %s",
      (chain, chime) => {
        const { field, frame } = shipField();

        field.events.addBreak(rockAt(field, 0.5, "small"), chain, 0, 0);

        expect(namesOf(frame())).toContain(chime);
      },
    );

    it("ring no bell for a rock a comet smashed, which counts in no chain", () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.5, "small"), 0, 0, 0);

      expect(namesOf(frame())).toEqual(["comet-smash"]);
    });

    it(`play each its own sound, ${MOST_BREAKS_HEARD} in a frame`, () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.25, "small"), 1, 0, 0);
      field.events.addBreak(rockAt(field, 0.5, "large", "ice"), 2, 0, 0);
      field.events.addBreak(rockAt(field, 0.75, "medium", "iron"), 3, 0, 0);

      expect(namesOf(frame()).sort()).toEqual(
        [
          "break-ice-large",
          "break-iron-medium",
          "break-stone-small",
          "chain-ping",
        ].sort(),
      );
    });

    it(`play as the two largest and the crowd's patter, at the middle of where they broke, more than ${MOST_BREAKS_HEARD} in a frame`, () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.25, "small"), 1, 0, 0);
      field.events.addBreak(rockAt(field, 0.5, "medium", "iron"), 2, 0, 0);
      field.events.addBreak(rockAt(field, 0.75, "large", "ice"), 3, 0, 0);
      field.events.addBreak(rockAt(field, 1, "small", "ice"), 4, 0, 0);

      const played = frame();

      expect([
        namesOf(played)
          .filter((name) => name !== "chain-ping")
          .sort(),
        played.find(({ name }) => name === "break-cluster")?.across,
      ]).toEqual([
        ["break-cluster", "break-ice-large", "break-iron-medium"],
        0.25,
      ]);
    });

    it("play the two largest sounds of a crowd whose largest two breaks sound alike", () => {
      const { field, frame } = shipField();

      field.events.addBreak(rockAt(field, 0.25, "large"), 1, 0, 0);
      field.events.addBreak(rockAt(field, 0.5, "medium", "ice"), 2, 0, 0);
      field.events.addBreak(rockAt(field, 0.75, "large"), 3, 0, 0);
      field.events.addBreak(rockAt(field, 1, "small"), 4, 0, 0);

      expect(
        namesOf(frame())
          .filter((name) => name !== "chain-ping")
          .sort(),
      ).toEqual(["break-cluster", "break-ice-medium", "break-stone-large"]);
    });

    it("count afresh in the next frame", () => {
      const { field, frame } = shipField();
      for (let broken = 0; broken <= MOST_BREAKS_HEARD; broken++) {
        field.events.addBreak(rockAt(field, 0.5, "small"), 1, 0, 0);
      }
      frame();

      field.events.addBreak(rockAt(field, 0.5, "medium"), 1, 0, 0);

      expect(namesOf(frame())).toEqual(["break-stone-medium", "chain-ping"]);
    });
  });

  describe("a burst of fire", () => {
    it("ends with its tail as fire is let go, where its last pull was fired", () => {
      const { field, frame } = shipField();
      steerField(field, { ...STILL, fire: true });
      pull(field, BURST_PULLS - 1);
      frame();
      pull(field, 1, field.torus.width / 2);
      frame();

      steerField(field, STILL);

      expect(frame()).toEqual([
        { name: "shot-tail", detune: 0, across: 0, volume: 1 },
      ]);
    });

    it("has no tail after fewer pulls than a burst", () => {
      const { field, frame } = shipField();
      steerField(field, { ...STILL, fire: true });
      pull(field, BURST_PULLS - 1);
      frame();

      steerField(field, STILL);

      expect(frame()).toEqual([]);
    });

    it.each([
      ["while fire is held", { ...STILL, fire: true }],
      ["while it fires by itself", { ...STILL, autoFire: true }],
    ])("has no tail %s", (_, steer) => {
      const { field, frame } = shipField();
      steerField(field, steer);
      pull(field, BURST_PULLS);
      frame();

      expect(frame()).toEqual([]);
    });

    it("has no tail as fire is let go long after its last pull, as after a pause", () => {
      const { field, frame } = shipField();
      steerField(field, { ...STILL, fire: true });
      pull(field, BURST_PULLS);
      frame();

      steerField(field, STILL);

      expect(frame(TAIL_WITHIN_MS + 1)).toEqual([]);
    });

    it("has its tail once", () => {
      const { field, frame } = shipField();
      steerField(field, { ...STILL, fire: true });
      pull(field, BURST_PULLS);
      frame();
      steerField(field, STILL);
      frame();

      expect(frame()).toEqual([]);
    });
  });

  describe("the dash", () => {
    it("ticks as it has charged again, at the ship", () => {
      const { field, frame } = shipField();
      const ship = field.ship;
      if (!ship) throw new Error("The picture has a ship.");
      ship.rechargeSteps = 10;
      frame();

      ship.rechargeSteps = 0;

      expect(frame()).toEqual([
        { name: "dash-ready", detune: 0, across: shipAcross(field), volume: 1 },
      ]);
    });

    it("ticks not at all while it charges", () => {
      const { field, frame } = shipField();
      const ship = field.ship;
      if (!ship) throw new Error("The picture has a ship.");
      ship.rechargeSteps = 10;
      frame();

      ship.rechargeSteps = 9;

      expect(frame()).toEqual([]);
    });

    it("ticks not at all as the run ends while it charges", () => {
      const { field, frame } = shipField();
      const ship = field.ship;
      if (!ship) throw new Error("The picture has a ship.");
      ship.rechargeSteps = 10;
      frame();

      field.ship = null;

      expect(frame()).toEqual([]);
    });

    it("ticks not at all for the ship of a new field, though the last one's charged", () => {
      let shown = fieldFrom(SHIP_PICTURE);
      const frame = listenTo(() => shown);
      const ship = shown.ship;
      if (!ship) throw new Error("The picture has a ship.");
      ship.rechargeSteps = 10;
      frame();

      shown = fieldFrom(SHIP_PICTURE);

      expect(frame()).toEqual([]);
    });
  });

  describe("an effect", () => {
    it.each([
      ["weapon", "spread", "effect-end"],
      ["pull", "magnet", "effect-end"],
      ["pace", "slow", "slow-off"],
    ] as const)(
      "of the %s group plays, as its time runs out, %s's end: %s",
      (kind, pickup, sound) => {
        const { field, frame } = shipField();
        field.effects[kind].pickup = pickup;
        field.effects[kind].endsAt = 100;
        frame();

        field.steps = 100;
        field.effects[kind].pickup = null;
        field.effects[kind].endsAt = 0;

        expect(frame()).toEqual([
          { name: sound, detune: 0, across: shipAcross(field), volume: 1 },
        ]);
      },
    );

    it("plays no end as it is ended before its time, as a wave is cleared", () => {
      const { field, frame } = shipField();
      field.effects.weapon.pickup = "spread";
      field.effects.weapon.endsAt = 100;
      frame();

      field.steps = 60;
      endEffects(field);

      expect(frame()).toEqual([]);
    });

    it("plays no end as one of its group caught starts its time over", () => {
      const { field, frame } = shipField();
      field.effects.weapon.pickup = "spread";
      field.effects.weapon.endsAt = 100;
      frame();

      field.steps = 60;
      field.effects.weapon.pickup = "rapid";
      field.effects.weapon.endsAt = 300;

      expect(frame()).toEqual([]);
    });
  });
});
