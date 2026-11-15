// Asteroid Breaker's sound lab, which its dev server alone serves, at
// sound-lab/ (`@fz/dev/sound-lab`, in vite.config.ts): the uplift's sprite,
// played by the game's mix or plainly, each sound with its takes, beside the
// sprite the game played before; and scenes as the game plays them, each
// moment's events heard by the view's own `FieldSounds`, beside the same
// moments as the game played them before.

import {
  type LabCue,
  type LabScene,
  type LabSound,
  mountSoundLab,
} from "@fz/dev/sound-lab-page";
import { type PickupId, pickup } from "../src/rules/catalog/pickups";
import type { RockKindId, RockSize } from "../src/rules/catalog/rocks";
import type { LoggedRock } from "../src/rules/field/events";
import { type Field, createField, steerField } from "../src/rules/field/field";
import { endEffect } from "../src/rules/rocks/pickups";
import { createCrew } from "../src/rules/ship/pilots";
import { STILL, type Ship } from "../src/rules/ship/ship";
import { stepsIn } from "../src/rules/stepper";
import {
  COMET_WARNING_MS,
  HIT_GUARD_MS,
  NEW_SHIP_GUARD_MS,
  SHIELD_GUARD_MS,
  SHOT_EVERY_MS,
} from "../src/rules/tuning";
import spritemap from "../src/scene/sounds/sprite.json";
import spriteM4a from "../src/scene/sounds/sprite.m4a?url";
import spriteOgg from "../src/scene/sounds/sprite.ogg?url";
import { FieldSounds } from "../src/view/effects/field_sounds";
import {
  SOUNDS,
  SOUND_NAMES,
  type SoundName,
  THRUST,
} from "../src/view/effects/sounds";
import {
  BEFORE_PLAYS,
  BEFORE_SOUNDS,
  BEFORE_SPRITE,
  type BeforeName,
  beforeChainDetune as chainDetune,
} from "./sound-lab/before";
import { PLAYS } from "./sound-lab/plays";

/** The field the scenes play on, 72 units by 40, its ship in its middle. */
const TORUS = { width: 72, height: 40 };

/** Where the ship lies, in units. */
const SHIP = { x: TORUS.width / 2, y: TORUS.height / 2 };

/** The pilot a scene's stray and crew are, by color. */
const PILOT = 1;

/** The time between the gun's pulls while fire is held, in seconds. */
const SHOT_EVERY_S = SHOT_EVERY_MS / 1000;

/** How long a frame of a scene takes, in seconds, as the game's at 60 a second. */
const FRAME_S = 1 / 60;

/** What a scene does to its field at a time: events logged, or the ship steered. */
interface Moment {
  /** When, in seconds from the scene's start. */
  readonly at: number;
  readonly act: (field: Field) => void;
}

/** Returns a field to play a scene on: empty but for its ship, flying in its middle. */
function sceneField(): Field {
  const field = createField({
    torus: TORUS,
    cap: 16,
    lastFew: 0,
    seed: 1,
    pace: 1,
    waveKind: "stone",
    drops: 0,
    pool: [],
    pickupsAtOnce: 1,
    strays: 0,
    strayFirstMs: 0,
    cometEvery: null,
    crew: createCrew(),
    charge: 0,
    sparkReach: 1,
  });
  shipOn(field).waiting = false;
  return field;
}

/** Returns a scene field's ship, which it always has. */
function shipOn(field: Field): Ship {
  if (field.ship === null) throw new Error("A scene's field has a ship.");
  return field.ship;
}

/** Returns a moment at a time that changes the ship of a scene's field. */
function withShip(at: number, act: (ship: Ship) => void): Moment {
  return {
    at,
    act: (field) => {
      act(shipOn(field));
    },
  };
}

/** Returns the field's step at a time of a scene, in seconds from its start. */
function stepAt(at: number): number {
  return stepsIn(at * 1000);
}

/**
 * Returns a pickup caught at a time, its effect in play until a time it
 * runs out at, in seconds, or, given none, until it is spent.
 */
function caught(at: number, id: PickupId, runsOutAt?: number): Moment {
  return {
    at,
    act: (field) => {
      field.events.addPickup("caught", SHIP.x, SHIP.y, id);
      const inEffect = field.effects[pickup(id).effect.kind];
      inEffect.pickup = id;
      inEffect.endsAt = runsOutAt === undefined ? 0 : stepAt(runsOutAt);
    },
  };
}

/**
 * Returns the sounds of a scene as the game plays them: each frame's
 * moments acted on a field whose clock stands at the frame's time, then
 * the field and its events heard by the view's `FieldSounds`, as the scene
 * hears them, and what it plays; with the hums held beside them.
 */
function heard(
  moments: readonly Moment[],
  hums: readonly LabCue<SoundName>[] = [],
): LabCue<SoundName>[] {
  const field = sceneField();
  const sounds = new FieldSounds();
  const cues = [...hums];
  sounds.hearField(field, 0);
  let since = field.events.latest;
  const times = [...new Set(moments.map(({ at }) => at))].sort((a, b) => a - b);
  for (const at of times) {
    field.steps = stepAt(at);
    for (const moment of moments) if (moment.at === at) moment.act(field);
    sounds.hearField(field, at * 1000);
    field.events.forEachSince(since, (event) => {
      sounds.hear(event, field.torus.width);
    });
    since = field.events.latest;
    sounds.playEach((sound, detune, x, volume) => {
      cues.push({ at, sound, detune, x, volume });
    });
  }
  return cues;
}

/** Returns where across the field a place from -1 at its left edge to 1 at its right lies, in units. */
function unitsAcross(x: number): number {
  return ((x + 1) / 2) * TORUS.width;
}

/** Returns a rock of a kind and size at a place across the field, as its events log it. */
function rock(kind: RockKindId, size: RockSize, x: number): LoggedRock {
  return { x: unitsAcross(x), y: SHIP.y, kind, size, slot: 0 };
}

/** Returns the pulls of fire while it is held from one time to another, in seconds, every so often, then it let go a frame after the last. */
function burst(from: number, to: number, every = SHOT_EVERY_S): Moment[] {
  const count = Math.floor((to - from) / every) + 1;
  const pulls = Array.from({ length: count }, (_, i): Moment => ({
    at: from + i * every,
    act: (field) => {
      steerField(field, { ...STILL, fire: true });
      field.events.addFired(SHIP.x, SHIP.y, field.weapon);
    },
  }));
  const last = from + (count - 1) * every;
  return [...pulls, { at: last + FRAME_S, act: letGo }];
}

/** Lets go of fire. */
function letGo(field: Field): void {
  steerField(field, STILL);
}

/** Returns a rock's break at a time, at static's multiplier it scored at, 0 for one a comet smashed. */
function broken(
  at: number,
  kind: RockKindId,
  size: RockSize,
  times: number,
  x: number,
): Moment {
  return {
    at,
    act: (field) => {
      field.events.addBreak(rock(kind, size, x), times, 0, 0);
    },
  };
}

/** Returns static's rise to a step at a time, logged at the ship. */
function stepped(at: number, step: number): Moment {
  return {
    at,
    act: (field) => {
      field.events.addStep(SHIP.x, SHIP.y, step, false);
    },
  };
}

/** Returns the gun's shots before the uplift while fire is held from one time to another, in seconds, at a place across the field. */
function shots(from: number, to: number, x = 0): LabCue<BeforeName>[] {
  const count = Math.floor((to - from) / SHOT_EVERY_S) + 1;
  return Array.from({ length: count }, (_, i) => ({
    at: from + i * SHOT_EVERY_S,
    sound: "fired",
    x,
  }));
}

/**
 * Ten small rocks broken one after another, each its time, its count in
 * the chain the game counted before the uplift, static's multiplier it
 * scores at now, climbing from ×1 to ×4, and its place.
 */
const TEN_BREAKS = Array.from({ length: 10 }, (_, i) => ({
  at: 0.1 + i * 0.12,
  chain: i + 1,
  times: Math.min(1 + Math.floor(i / 3), 4),
  x: -0.8 + i * 0.18,
}));

/**
 * Static's rises among the ten breaks, each its time, a little before the
 * first break scored at a multiplier above the last, and the step it rose
 * to, ×2's first.
 */
const TEN_RISES = TEN_BREAKS.filter(
  ({ times }, i) => times > (TEN_BREAKS[i - 1]?.times ?? times),
).map(({ at, times }) => ({ at: at - 0.06, step: times - 1 }));

/** A large rock's pieces, each its size, its time, its count in the chain the game counted before the uplift and its place. */
const RUBBLE: readonly {
  size: Exclude<RockSize, "boulder">;
  at: number;
  chain: number;
  x: number;
}[] = [
  { size: "large", at: 0.3, chain: 1, x: -0.1 },
  { size: "medium", at: 0.6, chain: 2, x: -0.4 },
  { size: "medium", at: 0.74, chain: 3, x: 0.2 },
  { size: "small", at: 0.98, chain: 4, x: -0.6 },
  { size: "small", at: 1.1, chain: 5, x: -0.3 },
  { size: "small", at: 1.24, chain: 6, x: 0.3 },
  { size: "small", at: 1.36, chain: 7, x: 0.6 },
];

const SCENES: readonly LabScene<SoundName, BeforeName>[] = [
  {
    name: "Hold fire",
    what: `The gun held for two seconds, a pull every ${String(SHOT_EVERY_MS)} ms, then let go: the sound the game plays most, and, after, the tail that ends a burst.`,
    cues: heard(burst(0, 2)),
    before: shots(0, 2),
  },
  {
    name: "Breaks as static climbs",
    what: "Ten small rocks broken one after another under fire. Before, each rose a semitone on the last in a chain, up to a fifth; after, each breaks at its own pitch, and a bell under it rings the ladder's note for static's multiplier as static climbs from ×1 to ×4, its chime for each step it rises ringing a little before the first break scored there.",
    cues: heard([
      ...burst(0, 1.3),
      ...TEN_BREAKS.map(({ at, times, x }) =>
        broken(at, "stone", "small", times, x),
      ),
      ...TEN_RISES.map(({ at, step }) => stepped(at, step)),
    ]),
    before: [
      ...shots(0, 1.3),
      ...TEN_BREAKS.map(({ at, chain, x }) => ({
        at,
        sound: "small" as const,
        detune: chainDetune(chain),
        x,
      })),
    ],
  },
  {
    name: "A large rock to rubble",
    what: "A large rock broken under fire, its pieces broken in turn, down to the small ones, at ×1. Before, as one chain, each rose a semitone on the last.",
    cues: heard([
      ...burst(0, 1.4),
      ...RUBBLE.map(({ size, at, x }) => broken(at, "stone", size, 1, x)),
    ]),
    before: [
      ...shots(0, 1.4, -0.1),
      ...RUBBLE.map(({ size, at, chain, x }) => ({
        at,
        sound: size,
        detune: chainDetune(chain),
        x,
      })),
    ],
  },
  {
    name: "A blast in a crowd",
    what: "A volatile rock goes off, taking four rocks with it in its frame, then the pieces it threw are shot down: the mix at its busiest. After, the blast ducks the busy sounds of its frame, and the four breaks play as the largest two and their patter.",
    cues: heard([
      ...burst(0, 0.3),
      {
        at: 0.4,
        act: (field) => {
          field.events.addRock("blast", rock("volatile", "large", 0), 6);
        },
      },
      broken(0.4, "ice", "large", 1, -0.5),
      broken(0.4, "iron", "medium", 1, 0.4),
      broken(0.4, "stone", "small", 1, -0.2),
      broken(0.4, "stone", "small", 1, 0.2),
      ...burst(0.9, 1.6),
      broken(1.05, "stone", "small", 1, 0.7),
      broken(1.33, "iron", "small", 1, -0.6),
      broken(1.6, "stone", "small", 1, 0.1),
    ]),
    before: [
      ...shots(0, 0.3),
      { at: 0.4, sound: "blast", x: 0 },
      { at: 0.4, sound: "large", detune: chainDetune(1), x: -0.5 },
      { at: 0.4, sound: "medium", detune: chainDetune(2), x: 0.4 },
      { at: 0.4, sound: "small", detune: chainDetune(4), x: -0.2 },
      ...shots(0.9, 1.6, 0.2),
      { at: 1.05, sound: "small", detune: chainDetune(5), x: 0.7 },
      { at: 1.33, sound: "small", detune: chainDetune(6), x: -0.6 },
      { at: 1.6, sound: "small", detune: chainDetune(7), x: 0.1 },
    ],
  },
  {
    name: "Thrust and fire",
    what: "The thrust held for two and a half seconds while the gun fires and a rock breaks: the hum under everything else, a tick as the thrust is pressed and another as it is let go.",
    cues: heard(
      [
        withShip(0, (ship) => {
          ship.held.thrust = 1;
        }),
        ...burst(0.3, 2.2),
        broken(1.2, "stone", "medium", 1, 0.5),
        withShip(2.5, (ship) => {
          ship.held.thrust = 0;
        }),
      ],
      [{ at: 0, sound: THRUST, holdFor: 2.5 }],
    ),
    before: [
      { at: 0, sound: "thrust", holdFor: 2.5 },
      ...shots(0.3, 2.2),
      { at: 1.2, sound: "medium", detune: chainDetune(1), x: 0.5 },
    ],
  },
  {
    name: "A pickup",
    what: "A crystal broken lets a pickup go; the ship catches it, a Rapid, which fires twice as fast, 3 dB under the gun, until its time runs out. Before, every weapon fired the gun's shot.",
    cues: heard([
      broken(0, "crystal", "medium", 1, 0.3),
      {
        at: 0,
        act: (field) => {
          field.events.addPickup("dropped", unitsAcross(0.3), SHIP.y, "rapid");
        },
      },
      {
        at: 0.8,
        act: (field) => {
          field.events.addPickup("caught", SHIP.x, SHIP.y, "rapid");
          field.weapon = "rapid";
          field.effects.weapon.pickup = "rapid";
          field.effects.weapon.endsAt = stepAt(2.6);
        },
      },
      ...burst(1.1, 2.1, SHOT_EVERY_S / 2),
      {
        at: 2.6,
        act: (field) => {
          endEffect(field, "weapon");
        },
      },
    ]),
    before: [
      { at: 0, sound: "medium", detune: chainDetune(1), x: 0.3 },
      { at: 0.8, sound: "caught" },
      ...Array.from({ length: 15 }, (_, i) => ({
        at: 1.1 + (i * SHOT_EVERY_S) / 2,
        sound: "fired" as const,
      })),
    ],
  },
  {
    name: "A stray and the crew in tow",
    what: "A stray drifts in, and the ship catches it into the line in tow; a rock knocks it loose, the ship untouchable for a moment after, a time that ends with a tick, and the ship catches it again. The fuzzball says ooh as the stray drifts in, then keeps its patience, four seconds, through the catch and the knock, and says yay at the catch again. Before, a stray caught went home, and a hit cost a ship.",
    cues: heard([
      {
        at: 0,
        act: (field) => {
          field.events.addPilot(
            "strayed",
            unitsAcross(-1),
            SHIP.y,
            PILOT,
            field.crew,
          );
        },
      },
      {
        at: 1.5,
        act: (field) => {
          field.events.addPilot("joined", SHIP.x, SHIP.y, PILOT, field.crew);
        },
      },
      {
        at: 3,
        act: (field) => {
          field.events.addKnocked(SHIP.x, SHIP.y, PILOT, field.crew, 1, 0);
          shipOn(field).guardSteps = stepsIn(HIT_GUARD_MS) + 1;
        },
      },
      withShip(3 + HIT_GUARD_MS / 1000, (ship) => {
        ship.guardSteps = 0;
      }),
      {
        at: 5,
        act: (field) => {
          field.events.addPilot(
            "recaught",
            unitsAcross(0.4),
            SHIP.y,
            PILOT,
            field.crew,
          );
        },
      },
    ]),
    before: [
      { at: 1.5, sound: "home" },
      { at: 3, sound: "lost" },
    ],
  },
  {
    name: "A comet",
    what: "A comet's warning at the field's left edge, the comet's rush as it comes in, its warning over, then the comet smashing a rock as it crosses.",
    cues: heard([
      {
        at: 0,
        act: (field) => {
          field.events.add("warned", 0, SHIP.y);
          const comet = field.comets.slots[0];
          if (comet === undefined) return;
          comet.live = true;
          comet.x = 0;
          comet.y = SHIP.y;
          comet.warnSteps = stepsIn(COMET_WARNING_MS);
        },
      },
      {
        at: COMET_WARNING_MS / 1000,
        act: (field) => {
          const comet = field.comets.slots[0];
          if (comet !== undefined) comet.warnSteps = 0;
        },
      },
      broken(2, "stone", "medium", 0, -0.3),
    ]),
    before: [
      { at: 0, sound: "warned", x: -1 },
      { at: 2, sound: "medium", x: -0.3 },
    ],
  },
  {
    name: "A Shield and Slow",
    what: "A Shield caught, raised, then Slow caught, the field slowing; a rock spends the Shield, the ship untouchable for a second after, a time that ends with a tick; and Slow's time runs out, the field coming back. Before, each catch played one sound, and the Shield spent played iron's ring.",
    cues: heard([
      caught(0, "shield"),
      caught(1.2, "slow", 4.5),
      {
        at: 2.5,
        act: (field) => {
          field.events.add("shielded", SHIP.x, SHIP.y);
          endEffect(field, "guard");
          shipOn(field).guardSteps = stepsIn(SHIELD_GUARD_MS) + 1;
        },
      },
      withShip(2.5 + SHIELD_GUARD_MS / 1000, (ship) => {
        ship.guardSteps = 0;
      }),
      {
        at: 4.5,
        act: (field) => {
          endEffect(field, "pace");
        },
      },
    ]),
    before: [
      { at: 0, sound: "caught" },
      { at: 1.2, sound: "caught" },
      { at: 2.5, sound: "rung" },
    ],
  },
  {
    name: "A wave's first move",
    what: "The ship waits for the player's first move, which starts the wave with a lift; the ship is untouchable for two seconds after, a time that ends with a tick.",
    cues: heard([
      withShip(0, (ship) => {
        ship.waiting = true;
      }),
      withShip(0.5, (ship) => {
        ship.waiting = false;
        ship.guardSteps = stepsIn(NEW_SHIP_GUARD_MS);
      }),
      withShip(0.5 + NEW_SHIP_GUARD_MS / 1000, (ship) => {
        ship.guardSteps = 0;
      }),
    ]),
  },
  {
    name: "A dash",
    what: "A dash, the first, which the fuzzball whees at, as it does at one dash in three, then the tick as it has charged again, two and a half seconds on.",
    cues: heard([
      {
        at: 0,
        act: (field) => {
          field.events.addDash(SHIP.x, SHIP.y, 0);
          if (field.ship) field.ship.rechargeSteps = 1;
        },
      },
      {
        at: 2.5,
        act: (field) => {
          if (field.ship) field.ship.rechargeSteps = 0;
        },
      },
    ]),
    before: [{ at: 0, sound: "dashed" }],
  },
  {
    name: "A near miss, then a zap",
    what: "A rock passes close to the ship: the near miss, and the fuzzball's eep. Then, its patience run, a dash at full static: the zap in place of the dash, its arcs to three small rocks heard as one, each rock breaking at ×4 with the bell at ×4's note, static falling to its second step, and the whee, the scene's first dash. Before, neither was in the game.",
    cues: heard([
      {
        at: 0,
        act: (field) => {
          field.events.addGraze(SHIP.x, SHIP.y, 1, 0);
        },
      },
      {
        at: 4.5,
        act: (field) => {
          field.events.addDash(SHIP.x, SHIP.y, 0);
          field.events.addZap(SHIP.x, SHIP.y, 0);
          for (const x of [-0.5, 0.2, 0.6]) {
            field.events.addArc(rock("stone", "small", x), 3, 4);
            field.events.addBreak(rock("stone", "small", x), 4, 0, 0);
          }
          field.events.addStep(SHIP.x, SHIP.y, 2, true);
        },
      },
    ]),
  },
  {
    name: "A wave cleared, then the run's end",
    what: "A wave cleared, the fuzzball cheering, then a hit with no one in tow, which ends the run, and its aww. Before, the end was a ship lost.",
    cues: heard([
      {
        at: 0,
        act: (field) => {
          field.events.add("cleared", SHIP.x, SHIP.y);
        },
      },
      {
        at: 4.5,
        act: (field) => {
          field.events.addPilot("lost", SHIP.x, SHIP.y, PILOT, field.crew);
        },
      },
    ]),
    before: [
      { at: 0, sound: "cleared" },
      { at: 4.5, sound: "lost" },
    ],
  },
];

const sounds: readonly LabSound<SoundName>[] = SOUND_NAMES.map((name) => ({
  name,
  plays: PLAYS[name],
}));

const beforeSounds: readonly LabSound<BeforeName>[] = BEFORE_SOUNDS.map(
  (name) => ({ name, plays: BEFORE_PLAYS[name] }),
);

mountSoundLab<SoundName, BeforeName>({
  game: "Asteroid Breaker",
  sprite: { url: [spriteOgg, spriteM4a], spritemap },
  sounds,
  scenes: SCENES,
  mix: SOUNDS,
  before: { sprite: BEFORE_SPRITE, sounds: beforeSounds },
});
