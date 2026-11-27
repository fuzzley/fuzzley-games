// The sound lab's scenes: the ladder, each sound that climbs it on every
// rung, and the design's ten reels (docs/fuzz-flux/sound/make-sounds.mjs),
// each played from the sprite as the scene plays it, each bunch's note,
// bubble and zap on its wave's rung of the ladder, 0 for a move's first
// wave as the design's reels count them, played from the take nearest it,
// and the same moments on the design's take beside them, each made at its
// rung's own pitch, as the design's reels are.

import type { LabCue, LabScene } from "@fz/dev/sound-lab-page";
import {
  LADDER_CENTS,
  type LadderedSound,
  noteVolumeOf,
  onRung,
} from "../../src/view/effects/ladder";
import type { SoundName } from "../../src/view/effects/sounds";
import { type DesignSound, type DesignTake, climbedTo } from "./design_take";

/** A sound the game and the design both play, neither on the ladder. */
type Plain = Exclude<SoundName & DesignSound, LadderedSound>;

/** Describes something a scene plays at a moment, in seconds from its start, as the game and the design both play it. */
type Moment =
  | { readonly at: number; readonly sound: Plain; readonly volume?: number }
  | {
      readonly at: number;
      /** A sound that climbs the ladder, on a rung, 0 at the foot. */
      readonly climbing: Exclude<LadderedSound, "note">;
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

/** How far apart the rungs of a scene of the ladder play, in seconds, as the design's reel of the ladder plays its notes. */
const RUNG_S = 0.36;

/** The sizes of bunch whose notes a scene of the ladder plays, each with its scene's name and what it plays. */
const BUNCHES = [
  {
    size: 3,
    name: "a bunch's note",
    what: "A bunch of 3's note, a little softer a rung up, with one take of its puff of air, where the design's own reel of the ladder plays three in turn,",
  },
  {
    size: 4,
    name: "a bunch of 4's chord",
    what: "A bunch of 4's chord, its note and the one 2 rungs up, 22 ms apart,",
  },
  {
    size: 5,
    name: "a bunch of 5's chord",
    what: "A bunch of 5's chord, its note and those 2 and 4 rungs up, 22 ms apart,",
  },
] as const;

/** The sounds but the note that climb the ladder, each with its scene's name and what it plays. */
const CLIMBERS = [
  { sound: "pop", name: "the bubbles", what: "A fuzzball's bubble" },
  { sound: "zap", name: "the zaps", what: "A frizzball's zap" },
] as const satisfies readonly {
  sound: Exclude<LadderedSound, "note">;
  name: string;
  what: string;
}[];

/** Returns a sound played at a moment, at its own loudness or times some. */
function heard(at: number, sound: Plain, volume?: number): Moment {
  return volume === undefined ? { at, sound } : { at, sound, volume };
}

/** Returns a bubble or a zap played at a moment on a rung, 0 at the foot, at its own loudness times some. */
function climbing(
  at: number,
  sound: Exclude<LadderedSound, "note">,
  rung: number,
  volume = 1,
): Moment {
  return { at, climbing: sound, rung, volume };
}

/**
 * Returns a bunch hopping off at a moment, on its wave's rung: its note,
 * then each fuzzball's bubble, a rung higher than the last.
 */
function bunch(at: number, rung: number, size: number): Moment[] {
  return [
    { at, bunchOf: size, rung },
    ...Array.from({ length: size }, (_, n) =>
      climbing(at + BUBBLES.after + n * BUBBLES.apart, "pop", rung + n, 0.8),
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

/**
 * Returns how the design's take plays a moment: its sound made at the
 * rung, a bunch's note as softer a rung up as the design makes it.
 */
function asDesign(moment: Moment): LabCue<DesignTake>[] {
  if ("sound" in moment) return [moment];
  if ("climbing" in moment) {
    const { at, climbing: sound, rung, volume } = moment;
    return [{ at, sound: climbedTo(sound, rung), volume }];
  }
  const { at, bunchOf, rung } = moment;
  const chord = bunchOf >= 5 ? "note-5" : bunchOf === 4 ? "note-4" : "note";
  return [{ at, sound: climbedTo(chord, rung) }];
}

/** Returns a scene of moments, as the game plays them and as the design's take does. */
function scene(
  name: string,
  what: string,
  moments: readonly Moment[],
): LabScene<SoundName, DesignTake> {
  return {
    name,
    what,
    cues: moments.flatMap(asGame),
    before: moments.flatMap(asDesign),
  };
}

/** Returns a scene of the ladder: something played on each of its rungs, from the foot up. */
function ladder(
  name: string,
  what: string,
  onEach: (at: number, rung: number) => Moment,
): LabScene<SoundName, DesignTake> {
  return scene(
    `The ladder: ${name}`,
    `${what} on each of the ladder's ${String(LADDER_CENTS.length)} rungs, C5 to A6, each played from the take nearest it; the design's take makes each at its rung.`,
    LADDER_CENTS.map((_, rung) => onEach(rung * RUNG_S, rung)),
  );
}

/** The lab's scenes, the ladder's first and then the design's reels, in its order. */
export const SCENES: readonly LabScene<SoundName, DesignTake>[] = [
  ...BUNCHES.map(({ size, name, what }) =>
    ladder(name, what, (at, rung) => ({ at, bunchOf: size, rung })),
  ),
  ...CLIMBERS.map(({ sound, name, what }) =>
    ladder(name, what, (at, rung) => climbing(at, sound, rung)),
  ),
  scene(
    "A move of five waves",
    "A swap, then five waves of bunches climbing the ladder with fuzzballs landing between, a dasher made of the third wave's 4, and the board cheering at waves 3 and 5.",
    [
      heard(0, "pick"),
      heard(0.12, "swap"),
      ...bunch(0.3, 0, 3),
      heard(0.66, "land"),
      ...bunch(0.82, 1, 3),
      heard(1.18, "land"),
      ...bunch(1.34, 2, 4),
      heard(1.4, "born-dasher", 0.8),
      heard(1.52, "chirp-1"),
      heard(1.78, "land"),
      ...bunch(1.94, 3, 3),
      heard(2.3, "land"),
      ...bunch(2.46, 4, 3),
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
      ...bunch(0.3, 0, 4),
      heard(0.36, "born-dasher"),
      heard(0.8, "land"),
      heard(1.5, "pick"),
      heard(1.62, "swap"),
      heard(1.78, "dash"),
      ...Array.from({ length: 7 }, (_, n) =>
        climbing(1.84 + n * 0.028, "pop", n, 0.8),
      ),
      heard(2.36, "land"),
      ...bunch(2.52, 1, 3),
      heard(2.9, "land"),
    ],
  ),
  scene(
    "A puffer made and set off",
    "A bunch of 5 makes a puffer, which, swapped, puffs the fuzzballs around it away in three quick rings of bubbles, and they land.",
    [
      heard(0, "swap"),
      ...bunch(0.18, 0, 5),
      heard(0.24, "born-puffer"),
      heard(0.72, "land"),
      heard(1.4, "swap"),
      heard(1.56, "puff"),
      ...Array.from({ length: 12 }, (_, n) =>
        climbing(
          1.72 + Math.floor(n / 4) * 0.04 + (n % 4) * 0.012,
          "pop",
          n % 6,
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
      ...bunch(0.18, 0, 5),
      heard(0.24, "born-frizz"),
      heard(0.9, "land"),
      heard(1.6, "swap"),
      ...Array.from({ length: 11 }, (_, n) =>
        climbing(1.8 + n * 0.04, "zap", n),
      ),
      heard(2.36, "frizz"),
      ...Array.from({ length: 11 }, (_, n) =>
        climbing(2.38 + n * 0.012, "pop", n % 7, 0.5),
      ),
      heard(3, "land"),
      ...bunch(3.16, 1, 3),
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
      ...bunch(0.18, 0, 3),
      heard(0.24, "knock-1"),
      heard(0.26, "dust"),
      heard(0.56, "land"),
      heard(1.1, "swap"),
      ...bunch(1.28, 0, 3),
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
      ...bunch(0, 0, 3),
      heard(0.06, "knock-3"),
      heard(0.42, "land"),
      ...bunch(0.8, 0, 3),
      heard(0.86, "knock-2"),
      heard(1.22, "land"),
      ...bunch(1.6, 0, 3),
      heard(1.66, "knock-1"),
      heard(2.02, "land"),
      ...bunch(2.4, 0, 3),
      heard(2.46, "break"),
      heard(2.9, "land"),
    ],
  ),
  scene(
    "A level cleared",
    "The last fuzzballs counted at their goal, the goal met and the level won, three spare moves set off in the encore, and three stars.",
    [
      ...bunch(0, 2, 3),
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
