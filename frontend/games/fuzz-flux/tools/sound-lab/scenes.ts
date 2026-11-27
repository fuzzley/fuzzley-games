// The sound lab's scenes: the ladder, its top note's length beside its
// foot's, and the design's ten reels (docs/fuzz-flux/sound/make-sounds.mjs)
// played from the sprite as the scene plays it, each bunch's note, bubble
// and zap raised up the ladder by its wave, and the same cues on the
// design's take beside them.

import type { LabCue, LabScene } from "@fz/dev/sound-lab-page";
import spritemap from "../../src/scene/sounds/sprite.json";
import {
  LADDER_CENTS,
  noteVolumeOf,
  waveCentsOf,
} from "../../src/view/effects/ladder";
import type { SoundName } from "../../src/view/effects/sounds";

/** A sound a scene plays. */
type Cue = LabCue<SoundName>;

/** The note a bunch plays, by its size. */
const NOTES = {
  3: "note",
  4: "note-4",
  5: "note-5",
} as const satisfies Readonly<Record<number, SoundName>>;

/** How a bunch's bubbles follow its note: the first's delay, and the time between two, in seconds. */
const BUBBLES = { after: 0.05, apart: 0.03 } as const;

/** How far apart the notes of "The ladder" play, in seconds, as the design's reel plays them. */
const STEP_S = 0.36;

/** Returns a sound played at a moment, at its own loudness or times some. */
function heard(at: number, sound: SoundName, volume?: number): Cue {
  return volume === undefined ? { at, sound } : { at, sound, volume };
}

/** Returns a bubble or a zap played at a moment on a step of the ladder, from 1, at its own loudness times some. */
function raised(
  at: number,
  sound: "pop" | "zap",
  step: number,
  volume = 1,
): Cue {
  return { at, sound, detune: waveCentsOf(step), volume };
}

/** Returns a bunch's note, by its size, played at a moment on a wave's step, from 1, as soft as the wave plays it. */
function noted(at: number, wave: number, size: keyof typeof NOTES = 3): Cue {
  return {
    at,
    sound: NOTES[size],
    detune: waveCentsOf(wave),
    volume: noteVolumeOf(wave),
  };
}

/**
 * Returns a bunch hopping off at a moment, on a wave from 1: its note, then
 * each fuzzball's bubble, a step higher than the last.
 */
function bunch(at: number, wave: number, size: keyof typeof NOTES): Cue[] {
  return [
    noted(at, wave, size),
    ...Array.from({ length: size }, (_, n) =>
      raised(at + BUBBLES.after + n * BUBBLES.apart, "pop", wave + n, 0.8),
    ),
  ];
}

/** How long the note lasts in the sprite, in milliseconds. */
const NOTE_MS = Math.round(
  (spritemap.spritemap.note.end - spritemap.spritemap.note.start) * 1000,
);

/** How many times as fast as at its foot the ladder's top step plays a note. */
const TOP_RATE = 2 ** (waveCentsOf(LADDER_CENTS.length) / 1200);

/** Returns a scene whose cues play on the design's take too. */
function scene(
  name: string,
  what: string,
  cues: readonly Cue[],
): LabScene<SoundName, SoundName> {
  return { name, what, cues, before: cues };
}

/** The lab's scenes, the ladder first and then the design's reels, in its order. */
export const SCENES: readonly LabScene<SoundName, SoundName>[] = [
  scene(
    "The ladder",
    `A bunch's note on each of the ladder's ${String(LADDER_CENTS.length)} steps, C5 to A6, a little softer each step; the top step plays it ${TOP_RATE.toFixed(2)} times as fast as the foot, so it lasts ${String(Math.round(NOTE_MS / TOP_RATE))} ms of its ${String(NOTE_MS)}; the design's take, raised alike, lasts as little, where the design's own reel of the ladder, each note made at its pitch, rings all ten as long.`,
    Array.from({ length: LADDER_CENTS.length }, (_, n) =>
      noted(n * STEP_S, n + 1),
    ),
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
        raised(1.84 + n * 0.028, "pop", n + 1, 0.8),
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
        raised(
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
    "A bunch of 5 makes a frizzball, whose static, swapped, leaps from fuzzball to fuzzball, a zap each a step higher, then crackles as they hop off; they land, and the next wave's bunch follows.",
    [
      heard(0, "swap"),
      ...bunch(0.18, 1, 5),
      heard(0.24, "born-frizz"),
      heard(0.9, "land"),
      heard(1.6, "swap"),
      ...Array.from({ length: 11 }, (_, n) =>
        raised(1.8 + n * 0.04, "zap", n + 1),
      ),
      heard(2.36, "frizz"),
      ...Array.from({ length: 11 }, (_, n) =>
        raised(2.38 + n * 0.012, "pop", (n % 7) + 1, 0.5),
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
