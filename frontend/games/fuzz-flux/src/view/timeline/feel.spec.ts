import { keysOf } from "@fz/core/records";
import { designText } from "../../testing/design_files";
import { FEEL, type FeelTuning } from "./feel";

/** The design's words, each run of spaces and line breaks one space, as a table's row and a paragraph read. */
const DESIGN = designText("design.md").replaceAll(/\s+/g, " ");

/** The sketch's feel, whose cues give each sound its gap. */
const SKETCH = designText("sketch/feel/feel.mjs");

/** A sound's gap, which the sketch's cues give and the design's words don't, but as "10 to 60 ms, by the sound". */
type SoundGap = Extract<keyof FeelTuning, `${string}SoundGapMs`>;

/**
 * Each number of the feel, and the design's words that set it, so a
 * number moved in the design and not here, or here and not there, fails.
 */
const WRITTEN = {
  pickUpMs: [120, "| Pick up | 120 |"],
  pickUpScale: [1.14, "Grows to 1.14"],
  swapMs: [140, "| Swap | 140 |"],
  refusedOutMs: [90, "90 out to a third of the way, 150 back"],
  refusedBackMs: [150, "90 out to a third of the way, 150 back"],
  refusedReach: [1 / 3, "90 out to a third of the way, 150 back"],
  huddleMs: [110, "| Huddle | 110 |"],
  huddleLean: [0.07, "leans 0.07 of a square together"],
  hopMs: [130, "| Hop off | 130 |"],
  hopScale: [1.42, "Swells to 1.42"],
  hopFadeFrom: [0.3, "Fades from 30% of the way"],
  hopGapMs: [12, "12 apart along the bunch"],
  bunchTufts: [5, "5 tufts each"],
  bubbleGapMs: [30, '"bip", 30 ms apart'],
  runInMs: [110, "| Run into a special | 110 |"],
  madeMs: [420, "| A special is made | 420 |"],
  madeScale: [1.5, "From 1.5 down to 1"],
  madeSpringRings: [2, "on a spring that rings twice"],
  madeGlowMs: [260, "A white flash for 260"],
  madeFurMs: [300, "Its second fur grows in over 300"],
  madeRings: [2, "A flash, 2 rings, 14 tufts"],
  madeTufts: [14, "A flash, 2 rings, 14 tufts"],
  fallWaitMs: [70, "| Wait before the fall | 70 |"],
  fallBaseMs: [80, "80 + 70 × D^0.7"],
  fallPerSquareMs: [70, "80 + 70 × D^0.7"],
  fallExponent: [0.7, "80 + 70 × D^0.7"],
  fallStretch: [0.08, "Stretches 8% along the fall"],
  laneGapMs: [16, "16 a column, 12 a fuzzball"],
  stackGapMs: [12, "16 a column, 12 a fuzzball"],
  landMs: [240, "| Landing | 240 |"],
  landSquash: [0.18, "Squashes 18% in 60"],
  landSquashMs: [60, "Squashes 18% in 60"],
  waveGapMs: [90, "| Between waves | 90 |"],
  quickenPerWave: [0.06, "6% quicker a wave, to 70% at the least"],
  quickest: [0.7, "6% quicker a wave, to 70% at the least"],
  dasherSquareMs: [30, "| Dasher | 30 a square |"],
  pufferInMs: [140, "140 in, then 45 a ring"],
  pufferRingMs: [45, "140 in, then 45 a ring"],
  pufferShrink: [0.72, "Shrinks to 0.72 while its neighbors lean in 0.08"],
  pufferLean: [0.08, "Shrinks to 0.72 while its neighbors lean in 0.08"],
  pufferRings: [2, "a white flash 110 ms long, 2 rings, 26 tufts"],
  pufferTufts: [26, "a white flash 110 ms long, 2 rings, 26 tufts"],
  flashMs: [110, "a white flash 110 ms long, 2 rings, 26 tufts"],
  flashGapMs: [350, "start every 350 ms at most"],
  wispMs: [480, "| Wisp | 480 |"],
  wispGapMs: [90, "3 wisps leave 90 apart"],
  frizzballStepMs: [40, "40 a fuzzball, 700 at most, then 160"],
  frizzballMostMs: [700, "40 a fuzzball, 700 at most, then 160"],
  frizzballHoldMs: [160, "40 a fuzzball, 700 at most, then 160"],
  pairMs: [300, "300 before they go off"],
  pairScale: [1.3, "the pair swells to 1.3"],
  cushionMs: [480, "480 for the cushion, 440 for the pile"],
  cushionPlump: [1.7, "by up to 1.7 times"],
  cushionTufts: [6, "6 tufts of its own color follow"],
  pileMs: [440, "480 for the cushion, 440 for the pile"],
  pileDuck: [0.84, "The pile ducks to 84%"],
  lastLayerMs: [70, "70, then it bursts"],
  lastLayerScale: [1.14, "It swells to 1.14 and bursts"],
  lastLayerTufts: [21, "21 tufts"],
  flightMs: [480, "480, 35 apart"],
  flightGapMs: [35, "480, 35 apart"],
  mostFlights: [14, "Past 14 flights to the goal"],
  gustMs: [520, "| A gust | 520 |"],
  gustLean: [0.16, "each fuzzball leans 0.16"],
  shakeMadePx: [2.5, "2.5 when a special is made"],
  shakeFrizzballMadePx: [5, "5 when it is a frizzball"],
  shakeDasherPx: [3, "3 for a dasher going off"],
  shakePufferPx: [6, "6 for a puffer or a frizzball"],
  shakeFrizzballPx: [6, "6 for a puffer or a frizzball"],
  shakeTwoDashersPx: [4, "4 for 2 dashers or a frizzball with another special"],
  shakeFrizzballAndSpecialPx: [
    4,
    "4 for 2 dashers or a frizzball with another special",
  ],
  shakeDasherAndPufferPx: [7, "7 for a dasher with a puffer"],
  shakeTwoPuffersPx: [10, "10 for 2 puffers or 2 frizzballs"],
  shakeTwoFrizzballsPx: [10, "10 for 2 puffers or 2 frizzballs"],
  shakeHalfLifeMs: [77, "halves every 77 ms and stops below 0.05 px"],
  shakeStopPx: [0.05, "halves every 77 ms and stops below 0.05 px"],
  mostLooseBits: [420, "At most 420 loose bits"],
  lessMotionFluff: [0.25, "a quarter of the fluff flies"],
  lessMotionCushionMs: [260, "fades where it lies in 260 ms"],
  lessMotionPileMs: [180, "takes its new shape in 180 ms"],
  blinkLeastMs: [3000, "every 3 to 8 seconds"],
  blinkMostMs: [8000, "every 3 to 8 seconds"],
  hintWaitMs: [7000, "after 7 seconds with no move"],
  hintHops: [2, "the careful player would make hop twice"],
  swipeSquares: [0.4, "0.4 of a square long"],
} as const satisfies Readonly<
  Record<Exclude<keyof FeelTuning, SoundGap>, readonly [number, string]>
>;

/** Each sound's gap, and the sketch's cue that gives it. */
const SKETCHED = {
  popSoundGapMs: [
    10,
    "sfx(`pop-${Math.min(9, rung + (hops % 6))}`, t, 0.6, 10);",
  ],
  landSoundGapMs: [
    60,
    'sfx("land", now, 0.7 + Math.min(0.3, far * 0.06), 60);',
  ],
  dashSoundGapMs: [60, 'sfx("dash", tb, b.what === "bigcross" ? 1 : 0.9, 60);'],
  puffSoundGapMs: [80, 'sfx("puff", tb, 1, 80);'],
  knockSoundGapMs: [
    30,
    "sfx(`knock-${Math.max(1, Math.min(3, s.left))}`, t, 1, 30);",
  ],
  breakSoundGapMs: [30, 'sfx("break", t, 1, 30);'],
  dustSoundGapMs: [40, 'sfx("dust", t, 1, 40);'],
  burrOffSoundGapMs: [30, 'sfx("burr-off", t, 1, 30);'],
  tickSoundGapMs: [30, 'sfx("tick", now, 1, 30);'],
  goalSoundGapMs: [200, 'sfx("goal", now, 1, 200);'],
} as const satisfies Readonly<Record<SoundGap, readonly [number, string]>>;

/** Each number of the feel, and the words that set it. */
const SET_BY: Readonly<Record<keyof FeelTuning, readonly [number, string]>> = {
  ...WRITTEN,
  ...SKETCHED,
};

/** The numbers the design writes in words, or in other units, where its words for the rest write each in digits. */
const IN_WORDS = new Set<keyof FeelTuning>([
  "refusedReach",
  "hopFadeFrom",
  "madeSpringRings",
  "fallStretch",
  "landSquash",
  "quickenPerWave",
  "quickest",
  "pileDuck",
  "lessMotionFluff",
  "blinkLeastMs",
  "blinkMostMs",
  "hintWaitMs",
  "hintHops",
]);

/** Returns a pattern that finds a number written whole, not as a part of another. */
function written(value: number): RegExp {
  return new RegExp(
    `(?<![\\d.])${String(value).replace(".", "\\.")}(?![\\d.])`,
  );
}

describe("FEEL", () => {
  it("names each number of the design's feel and its sketch's gaps, and nothing else", () => {
    expect(keysOf(FEEL)).toEqual([...keysOf(WRITTEN), ...keysOf(SKETCHED)]);
  });

  it.each(keysOf(SET_BY))("sets %s as its words do", (field) => {
    expect(FEEL[field]).toBe(SET_BY[field][0]);
  });

  it.each(keysOf(WRITTEN))(
    "finds the words that set %s in the design",
    (field) => {
      expect(DESIGN).toContain(WRITTEN[field][1]);
    },
  );

  it.each(keysOf(SKETCHED))(
    "finds the cue that sets %s in the sketch",
    (field) => {
      expect(SKETCH).toContain(SKETCHED[field][1]);
    },
  );

  it("gives a gap to each sound the sketch gives one", () => {
    expect(new Set(SKETCH.match(/sfx\([^;]*, \d+\);/g))).toEqual(
      new Set(Object.values(SKETCHED).map(([, cue]) => cue)),
    );
  });

  it.each(keysOf(SET_BY).filter((field) => !IN_WORDS.has(field)))(
    "finds %s's number in its words, written whole",
    (field) => {
      expect(SET_BY[field][1]).toMatch(written(SET_BY[field][0]));
    },
  );

  it("takes the refused swap's 240 ms as its lean out and its spring back", () => {
    expect(DESIGN).toContain("| Refused swap | 240 |");
    expect(FEEL.refusedOutMs + FEEL.refusedBackMs).toBe(240);
  });
});
