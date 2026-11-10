// Brick Fuzz Pop's sound lab, which its dev server alone serves, at
// sound-lab/ (`@fz/dev/sound-lab`, in vite.config.ts): the sprite the scene
// will play, and moments of a round played as the game plays them, at a
// flight's pace and a round's rising breaks, to tune the sounds by at Q3.

import {
  type LabCue,
  type LabScene,
  type LabSound,
  mountSoundLab,
} from "@fz/dev/sound-lab-page";
import { BORED, MOST_CHARGE, ZAP_DELAY } from "../src/rules/tuning";
import spritemap from "../src/scene/sounds/sounds.json";
import spriteUrl from "../src/scene/sounds/sounds.wav?url";
import { SOUNDS, type SoundName } from "../src/view/effects/effects";

/** What plays each sound in the game, as `tools/build-sounds.mjs` describes its recipe. */
const PLAYS: Readonly<Record<SoundName, string>> = {
  notch: "Each notch the charge climbs or falls while it builds.",
  release: "A shot released.",
  boon: "A hot shot or a triple shot released.",
  knock: "A fuzzball turning off a side or the ceiling.",
  strike: "A brick struck that holds.",
  break:
    "A brick broken, raised along the round, as far as an octave; the bricks a frame breaks sound as one, raised for the last of them.",
  punch: "A charged fuzzball flying on through a brick it broke.",
  clank:
    "A fuzzball striking steel, a plate or a bumper, which earths any charge it carries.",
  zap: "A zap along a row, a column or the diagonals.",
  blast: "A bomb's blast.",
  bump: "A bumper's kick.",
  portal: "A fuzzball through a portal.",
  cage: "A cage opened and its friend freed.",
  land: "A fuzzball landing on the floor.",
  yawn: "A bored fuzzball's yawn, before it drops to the floor.",
  step: "The wall coming down a row.",
  jump: "The wall jumping a third of the field.",
  danger: "A brick standing over the danger line.",
  chime: "A level cleared.",
  lost: "A level lost.",
};

/**
 * How far each broken brick of a round is raised past the one before, in
 * cents, as `implementation-plan.md`'s V4 has the view's `detuneOf()` raise
 * them; the scenes take this and {@link BREAK_MOST_CENTS} from there once it
 * exists.
 */
const BREAK_STEP_CENTS = 100;

/** The most a broken brick is raised, in cents: an octave. */
const BREAK_MOST_CENTS = 1200;

/** How long a unit of flight takes at Normal, in seconds: 14 units a second. */
const UNIT_S = 1 / 14;

/** How long point and hold takes over a notch, in seconds: a quarter second. */
const NOTCH_S = 0.25;

/** How long after the press a charge held to the most is let go, in seconds. */
const CHARGED_S = (MOST_CHARGE + 1) * NOTCH_S;

/** Returns how far the game raises the round's `count`th broken brick, in cents. */
function breakDetune(count: number): number {
  return Math.min(Math.max(count - 1, 0) * BREAK_STEP_CENTS, BREAK_MOST_CENTS);
}

/**
 * Returns the one break the game plays for the bricks a frame breaks, raised
 * for the last of them, the round's `nth`.
 */
function broken(at: number, nth: number, x: number): LabCue<SoundName> {
  return { at, sound: "break", detune: breakDetune(nth), x };
}

/**
 * Returns a run of bricks broken one after another, each in a frame of its
 * own, a gap of flight apart, from the round's `first`th, across the field
 * from one place to another.
 */
function breaks(
  at: number,
  gap: number,
  { first, count, from, to, punched = false }: Breaks,
): LabCue<SoundName>[] {
  return Array.from({ length: count }, (_, i) => {
    const x = from + ((to - from) * i) / Math.max(count - 1, 1);
    const when = at + i * gap;
    const brick = broken(when, first + i, x);
    return punched
      ? [brick, { at: when, sound: "punch" as const, x }]
      : [brick];
  }).flat();
}

/** Describes a run of broken bricks for {@link breaks}. */
interface Breaks {
  /** Which of the round's breaks the first is, from 1. */
  readonly first: number;
  readonly count: number;
  /** Where across the field the run starts and ends, from -1 to 1. */
  readonly from: number;
  readonly to: number;
  /** Whether a charged fuzzball punches through each. */
  readonly punched?: boolean;
}

/** Returns a notch each quarter second, from a time, as point and hold charges. */
function notches(at: number, count: number): LabCue<SoundName>[] {
  return Array.from({ length: count }, (_, i) => ({
    at: at + (i + 1) * NOTCH_S,
    sound: "notch" as const,
  }));
}

/** Returns the notches of a charge held to the most, from a time, then its release. */
function chargeAndRelease(
  at: number,
  sound: "release" | "boon",
): LabCue<SoundName>[] {
  return [...notches(at, MOST_CHARGE), { at: at + CHARGED_S, sound }];
}

const SCENES: readonly LabScene<SoundName>[] = [
  {
    name: "A plain shot",
    what: "Aimed and let go at no charge: the fuzzball knocks off a side, strikes a tough brick, breaks a brick, knocks off the other side and lands, and the wall steps down.",
    cues: [
      { at: 0, sound: "release" },
      { at: 4 * UNIT_S, sound: "knock", x: -1 },
      { at: 8 * UNIT_S, sound: "strike", x: -0.4 },
      broken(12 * UNIT_S, 1, 0.2),
      { at: 17 * UNIT_S, sound: "knock", x: 1 },
      { at: 24 * UNIT_S, sound: "land", x: 0.5 },
      { at: 24 * UNIT_S + 0.3, sound: "step" },
    ],
  },
  {
    name: "Point and hold",
    what: "Held past five: the charge climbs a notch each quarter second to five, falls back to none and climbs again to two, and is let go there.",
    cues: [
      ...notches(0, 2 * MOST_CHARGE + 2),
      { at: (2 * MOST_CHARGE + 3) * NOTCH_S, sound: "release" },
    ],
  },
  {
    name: "A punch through the wall",
    what: "Charged to five and let go: it punches through five bricks, then rattles between the wall and the ceiling, each brick a semitone higher than the last, up to an octave.",
    cues: [
      ...chargeAndRelease(0, "release"),
      ...breaks(CHARGED_S + 5 * UNIT_S, UNIT_S, {
        first: 1,
        count: MOST_CHARGE,
        from: -0.1,
        to: 0,
        punched: true,
      }),
      ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => {
        const at = CHARGED_S + (11 + 3 * i) * UNIT_S;
        const x = i % 2 === 0 ? -0.6 + 0.15 * i : 0.6 - 0.1 * i;
        return [
          { at, sound: "knock" as const, x },
          broken(at + 1.5 * UNIT_S, MOST_CHARGE + 1 + i, x),
        ];
      }),
      { at: CHARGED_S + 40 * UNIT_S, sound: "land", x: 0.3 },
    ],
  },
  {
    name: "A zapper's row",
    what: "A row zapper broken: half a unit of flight later its zap breaks the row's six bricks, a column zapper among them, whose zap breaks its column's four half a unit after that, as one chain. The bricks a zap breaks at once sound as one break.",
    cues: [
      { at: 0, sound: "release" },
      broken(6 * UNIT_S, 1, 0),
      { at: (6 + ZAP_DELAY) * UNIT_S, sound: "zap", x: 0 },
      broken((6 + ZAP_DELAY) * UNIT_S, 7, 0),
      { at: (6 + 2 * ZAP_DELAY) * UNIT_S, sound: "zap", x: 0.4 },
      broken((6 + 2 * ZAP_DELAY) * UNIT_S, 11, 0.4),
      { at: 20 * UNIT_S, sound: "land", x: -0.2 },
    ],
  },
  {
    name: "Steel, a bumper and a portal",
    what: "A charged fuzzball earthed by steel, kicked by a bumper, through a portal and out of its twin, then a bomb broken, whose blast breaks five bricks around it, which sound as one break.",
    cues: [
      { at: 0, sound: "release" },
      { at: 5 * UNIT_S, sound: "clank", x: -0.5 },
      { at: 9 * UNIT_S, sound: "bump", x: 0.2 },
      { at: 13 * UNIT_S, sound: "portal", x: 0.6 },
      broken(17 * UNIT_S, 1, -0.7),
      { at: (17 + ZAP_DELAY) * UNIT_S, sound: "blast", x: -0.7 },
      broken((17 + ZAP_DELAY) * UNIT_S, 6, -0.7),
      { at: 26 * UNIT_S, sound: "land", x: -0.3 },
    ],
  },
  {
    name: "A jump and a hot shot",
    what: "The lower two-thirds cleared: the fuzzball lands, the wall jumps, and the next shot goes out hot, punching through the wall.",
    cues: [
      broken(0, 3, 0.3),
      { at: 8 * UNIT_S, sound: "land", x: 0.1 },
      { at: 8 * UNIT_S + 0.3, sound: "jump" },
      ...chargeAndRelease(8 * UNIT_S + 1.2, "boon"),
      ...breaks(8 * UNIT_S + 1.2 + CHARGED_S + 5 * UNIT_S, UNIT_S, {
        first: 1,
        count: 7,
        from: 0.1,
        to: 0.2,
        punched: true,
      }),
    ],
  },
  {
    name: "The danger line, a friend and a level's end",
    what: "The wall steps over the danger line; the next shot opens a cage and breaks the level's last brick, and the level is cleared. Then the lost level's sound, for its own.",
    cues: [
      { at: 0, sound: "land", x: -0.4 },
      { at: 0.3, sound: "step" },
      { at: 0.6, sound: "danger" },
      { at: 1.6, sound: "release" },
      { at: 1.6 + 6 * UNIT_S, sound: "strike", x: 0.3 },
      broken(1.6 + 12 * UNIT_S, 1, 0.3),
      { at: 1.6 + 12 * UNIT_S, sound: "cage", x: 0.3 },
      broken(1.6 + 18 * UNIT_S, 2, -0.6),
      { at: 1.6 + 26 * UNIT_S, sound: "land", x: 0 },
      { at: 1.6 + 26 * UNIT_S + 0.3, sound: "chime" },
      { at: 5, sound: "lost" },
    ],
  },
  {
    name: "A bored fuzzball",
    what: `A fuzzball that strikes nothing it can hurt for ${String(BORED)} units: it knocks about, yawns and drops to the floor.`,
    cues: [
      { at: 0, sound: "release" },
      ...[0, 1, 2, 3, 4].map((i): LabCue<SoundName> => ({
        at: (6 + 9 * i) * UNIT_S,
        sound: i % 2 === 0 ? "knock" : "clank",
        x: i % 2 === 0 ? -1 : 1,
      })),
      { at: BORED * UNIT_S, sound: "yawn", x: 0.2 },
      { at: BORED * UNIT_S + 0.8, sound: "land", x: 0.2 },
    ],
  },
];

const sounds: readonly LabSound<SoundName>[] = SOUNDS.map((name) => ({
  name,
  plays: PLAYS[name],
}));

mountSoundLab({
  game: "Brick Fuzz Pop",
  sprite: {
    url: spriteUrl,
    spritemap,
  },
  sounds,
  scenes: SCENES,
});
