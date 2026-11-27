// The sound lab's scenes: the ladder, and the design's ten reels
// (docs/fuzz-flux/sound/make-sounds.mjs), each played from the sprite as
// the scene plays it, each bunch's note, bubble and zap on its wave's rung
// of the ladder, played from the take nearest it, and the same moments on
// the design's take beside them, raised from its foot.

import { ladderCentsOf } from "@fz/core/note_ladder";
import type { LabCue, LabScene } from "@fz/dev/sound-lab-page";
import type designMap from "../../../../../docs/fuzz-flux/sound/sprite.json";
import {
  LADDER_CENTS,
  type LadderedSound,
  noteVolumeOf,
  onRung,
} from "../../src/view/effects/ladder";
import type { SoundName } from "../../src/view/effects/sounds";

/** A sound of the design's take, by its name in its sprite. */
export type DesignSound = keyof typeof designMap;

/** A sound the game and the design both play, neither on the ladder. */
type Plain = Exclude<SoundName & DesignSound, LadderedSound>;

/** Describes something a scene plays at a moment, in seconds from its start, as the game and the design both play it. */
type Moment =
  | { readonly at: number; readonly sound: Plain; readonly volume?: number }
  | {
      readonly at: number;
      /** A sound that climbs the ladder, on a rung, 1 at the foot. */
      readonly climbing: "pop" | "zap";
      readonly rung: number;
      readonly volume: number;
    }
  | {
      readonly at: number;
      /** A bunch's note, by its size, on its wave's rung. */
      readonly bunchOf: number;
      readonly rung: number;
    };

/** How a bunch's bubbles follow its note: the first's delay, and the time between two, in seconds. */
const BUBBLES = { after: 0.05, apart: 0.03 } as const;

/**
 * The notes a bunch of 4 or more plays over its own, as the scene plays
 * them: how many rungs up, from what size of bunch, how long after, in
 * seconds, and how loud against its own.
 */
const CHORD = [
  { up: 2, from: 4, after: 0.022, volume: 0.6 },
  { up: 4, from: 5, after: 0.044, volume: 0.5 },
] as const;

/** How far apart the notes of "The ladder" play, in seconds, as the design's reel plays them. */
const STEP_S = 0.36;

/** Returns a sound played at a moment, at its own loudness or times some. */
function heard(at: number, sound: Plain, volume?: number): Moment {
  return volume === undefined ? { at, sound } : { at, sound, volume };
}

/** Returns a bubble or a zap played at a moment on a rung, 1 at the foot, at its own loudness times some. */
function climbing(
  at: number,
  sound: "pop" | "zap",
  rung: number,
  volume = 1,
): Moment {
  return { at, climbing: sound, rung, volume };
}

/**
 * Returns a bunch hopping off at a moment, on a wave from 1: its note,
 * then each fuzzball's bubble, a rung higher than the last.
 */
function bunch(at: number, wave: number, size: number): Moment[] {
  return [
    { at, bunchOf: size, rung: wave },
    ...Array.from({ length: size }, (_, n) =>
      climbing(at + BUBBLES.after + n * BUBBLES.apart, "pop", wave + n, 0.8),
    ),
  ];
}

/** Returns a laddered sound on a rung as the game plays it: from the take nearest it, tuned the rest of the way. */
function onLadder(
  at: number,
  sound: LadderedSound,
  rung: number,
  volume: number,
): LabCue<SoundName> {
  const play = onRung(sound, rung);
  return { at, sound: play.sound, detune: play.cents, volume };
}

/** Returns how the game plays a moment. */
function asGame(moment: Moment): LabCue<SoundName>[] {
  if ("sound" in moment) return [moment];
  if ("climbing" in moment) {
    return [onLadder(moment.at, moment.climbing, moment.rung, moment.volume)];
  }
  const { at, bunchOf, rung } = moment;
  const volume = noteVolumeOf(rung);
  return [
    onLadder(at, "note", rung, volume),
    ...CHORD.filter(({ from }) => bunchOf >= from).map((note) =>
      onLadder(at + note.after, "note", rung + note.up, volume * note.volume),
    ),
  ];
}

/** Returns how the design's take plays a moment: its sound at the ladder's foot, raised to the rung. */
function asDesign(moment: Moment): LabCue<DesignSound>[] {
  if ("sound" in moment) return [moment];
  if ("climbing" in moment) {
    const { at, climbing: sound, rung, volume } = moment;
    return [{ at, sound, detune: ladderCentsOf(rung, LADDER_CENTS), volume }];
  }
  const { at, bunchOf, rung } = moment;
  return [
    {
      at,
      sound: bunchOf >= 5 ? "note-5" : bunchOf === 4 ? "note-4" : "note",
      detune: ladderCentsOf(rung, LADDER_CENTS),
      volume: noteVolumeOf(rung),
    },
  ];
}

/** Returns a scene of moments, as the game plays them and as the design's take does. */
function scene(
  name: string,
  what: string,
  moments: readonly Moment[],
): LabScene<SoundName, DesignSound> {
  return {
    name,
    what,
    cues: moments.flatMap(asGame),
    before: moments.flatMap(asDesign),
  };
}

/** The lab's scenes, the ladder first and then the design's reels, in its order. */
export const SCENES: readonly LabScene<SoundName, DesignSound>[] = [
  scene(
    "The ladder",
    `A bunch's note on each of the ladder's ${String(LADDER_CENTS.length)} rungs, C5 to A6, a little softer each rung, each played from the take nearest it; the design's take is raised from its foot, so its top note is cut short, where the design's own reel of the ladder, each note made at its pitch, rings all ten as long.`,
    Array.from({ length: LADDER_CENTS.length }, (_, n) => ({
      at: n * STEP_S,
      bunchOf: 3,
      rung: n + 1,
    })),
  ),
  scene(
    "A move of five waves",
    "A swap, then five waves of bunches climbing the ladder with fuzzballs landing between, a dasher made of the third wave's 4, and the board cheering at waves 3 and 5.",
    [
      heard(0, "pick"),
      heard(0.12, "swap"),
      ...bunch(0.3, 1, 3),
      heard(0.66, "land"),
      ...bunch(0.82, 2, 3),
      heard(1.18, "land"),
      ...bunch(1.34, 3, 4),
      heard(1.4, "born-dasher", 0.8),
      heard(1.52, "chirp-1"),
      heard(1.78, "land"),
      ...bunch(1.94, 4, 3),
      heard(2.3, "land"),
      ...bunch(2.46, 5, 3),
      heard(2.6, "chirp-2"),
      heard(2.84, "land"),
    ],
  ),
  scene(
    "A dasher made and set off",
    "A bunch of 4 makes a dasher, which, swapped, dashes along its row, its fuzzballs' bubbles climbing as they go; they land, and the next wave's bunch follows.",
    [
      heard(0, "pick"),
      heard(0.12, "swap"),
      ...bunch(0.3, 1, 4),
      heard(0.36, "born-dasher"),
      heard(0.8, "land"),
      heard(1.5, "pick"),
      heard(1.62, "swap"),
      heard(1.78, "dash"),
      ...Array.from({ length: 7 }, (_, n) =>
        climbing(1.84 + n * 0.028, "pop", n + 1, 0.8),
      ),
      heard(2.36, "land"),
      ...bunch(2.52, 2, 3),
      heard(2.9, "land"),
    ],
  ),
  scene(
    "A puffer made and set off",
    "A bunch of 5 makes a puffer, which, swapped, puffs the fuzzballs around it away in three quick rings of bubbles, and they land.",
    [
      heard(0, "swap"),
      ...bunch(0.18, 1, 5),
      heard(0.24, "born-puffer"),
      heard(0.72, "land"),
      heard(1.4, "swap"),
      heard(1.56, "puff"),
      ...Array.from({ length: 12 }, (_, n) =>
        climbing(
          1.72 + Math.floor(n / 4) * 0.04 + (n % 4) * 0.012,
          "pop",
          (n % 6) + 1,
          0.6,
        ),
      ),
      heard(2.3, "land"),
      heard(2.36, "land", 0.8),
    ],
  ),
  scene(
    "A frizzball made and set off",
    "A bunch of 5 makes a frizzball, whose static, swapped, leaps from fuzzball to fuzzball, a zap each a rung higher, then crackles as they hop off; they land, and the next wave's bunch follows.",
    [
      heard(0, "swap"),
      ...bunch(0.18, 1, 5),
      heard(0.24, "born-frizz"),
      heard(0.9, "land"),
      heard(1.6, "swap"),
      ...Array.from({ length: 11 }, (_, n) =>
        climbing(1.8 + n * 0.04, "zap", n + 1),
      ),
      heard(2.36, "frizz"),
      ...Array.from({ length: 11 }, (_, n) =>
        climbing(2.38 + n * 0.012, "pop", (n % 7) + 1, 0.5),
      ),
      heard(3, "land"),
      ...bunch(3.16, 2, 3),
      heard(3.54, "land"),
    ],
  ),
  scene(
    "Two puffers together",
    "Two puffers swapped together wind up and go off as one, the board cheering, and the fuzzballs land.",
    [
      heard(0, "swap"),
      heard(0.14, "pair"),
      heard(0.44, "big-puff"),
      heard(0.7, "chirp-3", 0.7),
      heard(1.5, "land"),
      heard(1.56, "land", 0.8),
    ],
  ),
  scene(
    "Bricks, a cage and dust",
    "A bunch knocks a layer off a brick, leaving 1, and dusts a square; the next bursts a brick and opens a cage, its fuzzball yipping as it hops out; then a burr is brushed off, and one spreads.",
    [
      heard(0, "swap"),
      ...bunch(0.18, 1, 3),
      heard(0.24, "knock-1"),
      heard(0.26, "dust"),
      heard(0.56, "land"),
      heard(1.1, "swap"),
      ...bunch(1.28, 1, 3),
      heard(1.34, "break"),
      heard(1.36, "cage"),
      heard(1.5, "yip"),
      heard(1.7, "land"),
      heard(2.2, "burr-off"),
      heard(2.7, "burr-spread"),
    ],
  ),
  scene(
    "A brick of 4 layers",
    "Four bunches beside a thick brick knock off its layers one at a time, its note climbing C4, D4, E4, until its last bursts on G4.",
    [
      ...bunch(0, 1, 3),
      heard(0.06, "knock-3"),
      heard(0.42, "land"),
      ...bunch(0.8, 1, 3),
      heard(0.86, "knock-2"),
      heard(1.22, "land"),
      ...bunch(1.6, 1, 3),
      heard(1.66, "knock-1"),
      heard(2.02, "land"),
      ...bunch(2.4, 1, 3),
      heard(2.46, "break"),
      heard(2.9, "land"),
    ],
  ),
  scene(
    "A level cleared",
    "The last fuzzballs counted at their goal, the goal met and the level won, three spare moves set off in the encore, and three stars.",
    [
      ...bunch(0, 3, 3),
      heard(0.42, "tick"),
      heard(0.47, "tick"),
      heard(0.52, "tick"),
      heard(0.6, "goal"),
      heard(1, "win"),
      heard(2.7, "encore"),
      heard(2.8, "dash", 0.7),
      heard(3.05, "encore"),
      heard(3.15, "puff", 0.7),
      heard(3.4, "encore"),
      heard(3.5, "dash", 0.7),
      heard(4.3, "star-1"),
      heard(4.65, "star-2"),
      heard(5, "star-3"),
    ],
  ),
  scene(
    "Out of moves, a sleepyhead, the wind",
    "Five moves left, then none and the level lost; a sleepyhead put to bed, the wind turning, the board shuffled, a hint and a swap refused.",
    [
      heard(0, "low"),
      heard(0.9, "lose"),
      heard(2.2, "bed"),
      heard(4, "gust"),
      heard(5.2, "shuffle"),
      heard(6.1, "hint"),
      heard(6.7, "refuse"),
    ],
  ),
];
