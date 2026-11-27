// The names of the game's sounds, the one list the sound script builds
// the sprite from, the view's cues name and the scene plays by, in the
// order the design's "Sound" lists them and the sprite holds them; and,
// by sound, the gaps kept between two of one sound and the waves the
// board's cheers play at.

import type { FeelTuning } from "../timeline/feel";

/** The game's sounds, in the order the sprite holds them. */
export const SOUNDS = [
  // Picking up, swapping, a swap refused, and fuzzballs landing.
  "pick",
  "swap",
  "refuse",
  "land",
  // A bunch's note, and each fuzzball's bubble as it leaves, each at the
  // ladder's foot and at three rungs up it (`ladder.ts`). A bunch of 4
  // adds the note 2 rungs up, and one of 5 or more the note 4 up as well,
  // each a little later.
  "note",
  "note-g5",
  "note-d6",
  "note-a6",
  "pop",
  "pop-g5",
  "pop-d6",
  "pop-a6",
  // A special made.
  "born-dasher",
  "born-puffer",
  "born-wisp",
  "born-frizz",
  // A special going off: the frizzball's static leaping from fuzzball to
  // fuzzball, a zap each, on the ladder as the bubbles are, then its
  // crackle.
  "dash",
  "puff",
  "wisp",
  "zap",
  "zap-g5",
  "zap-d6",
  "zap-a6",
  "frizz",
  // Two specials winding up together, and two puffers going off.
  "pair",
  "big-puff",
  // A brick losing a layer, by the layers left, its last bursting, a cage
  // opened and its fuzzball's yip, and a square dusted.
  "knock-3",
  "knock-2",
  "knock-1",
  "break",
  "cage",
  "yip",
  "dust",
  // A burr brushed off and one spreading, a sleepyhead put to bed, the
  // wind turning, and the board shuffled with no move left.
  "burr-off",
  "burr-spread",
  "bed",
  "gust",
  "shuffle",
  // A fuzzball counted at its goal, a goal met, and the moves running low.
  "tick",
  "goal",
  "low",
  // The board cheering at waves 3, 5, 7 and 9.
  "chirp-1",
  "chirp-2",
  "chirp-3",
  "chirp-4",
  // The end of a level: the encore, the win and its stars, or the loss.
  "encore",
  "win",
  "star-1",
  "star-2",
  "star-3",
  "lose",
  // A hint, and a button on a card.
  "hint",
  "button",
] as const satisfies readonly string[];

/** A sound's name, such as "knock-2". */
export type SoundName = (typeof SOUNDS)[number];

/**
 * Each sound that keeps a least time between two starts, with the feel's
 * number for it. A cue of a sound that climbs the ladder names the sound,
 * whichever of its takes plays it, so its gap holds across its takes.
 */
export const GAPPED = {
  pop: "popSoundGapMs",
  land: "landSoundGapMs",
  dash: "dashSoundGapMs",
  puff: "puffSoundGapMs",
  "knock-3": "knockSoundGapMs",
  "knock-2": "knockSoundGapMs",
  "knock-1": "knockSoundGapMs",
  break: "breakSoundGapMs",
  dust: "dustSoundGapMs",
  "burr-off": "burrOffSoundGapMs",
  tick: "tickSoundGapMs",
  goal: "goalSoundGapMs",
} as const satisfies Readonly<Partial<Record<SoundName, keyof FeelTuning>>>;

/** The wave of a move at which each of the board's cheers plays. */
export const CHEERS = {
  "chirp-1": 3,
  "chirp-2": 5,
  "chirp-3": 7,
  "chirp-4": 9,
} as const satisfies Readonly<Partial<Record<SoundName, number>>>;
