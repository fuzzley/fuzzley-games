// The feel: every number the design gives a move's motion, its effects and
// their limits, the sounds' gaps as its sketch gives them, as one record of
// numbers, which the view is handed and the
// debug menu's `createTuning()` takes. Nothing in the view reads one from a
// module, so retuning changes numbers, never code. Times are in
// milliseconds, lengths in squares, and shakes in pixels across their whole
// width.

/** Describes the feel of a move, each number named for its moment. */
export interface FeelTuning {
  /** How long a fuzzball picked up takes to grow. */
  readonly pickUpMs: number;
  /** How big it grows. */
  readonly pickUpScale: number;
  /** How long a swap takes to slide. */
  readonly swapMs: number;
  /** How long a refused swap takes to lean out. */
  readonly refusedOutMs: number;
  /** How long it takes to spring back. */
  readonly refusedBackMs: number;
  /** How far of the way to its neighbor it leans. */
  readonly refusedReach: number;
  /** How long a bunch huddles before it hops off. */
  readonly huddleMs: number;
  /** How far a bunch leans together as it huddles. */
  readonly huddleLean: number;
  /** How long a gathered fuzzball takes to hop off. */
  readonly hopMs: number;
  /** How big it swells as it hops. */
  readonly hopScale: number;
  /** How far through its hop it starts to fade. */
  readonly hopFadeFrom: number;
  /** How far apart along a bunch its fuzzballs hop. */
  readonly hopGapMs: number;
  /** How many tufts each fuzzball of a bunch leaves. */
  readonly bunchTufts: number;
  /** How far apart the bubbles under a bunch's note sound. */
  readonly bubbleGapMs: number;
  /** How long the rest of a bunch takes to run into the special it makes. */
  readonly runInMs: number;
  /** How long a special made takes to settle from its swell. */
  readonly madeMs: number;
  /** How big a special made swells. */
  readonly madeScale: number;
  /** How many times the spring it settles on rings. */
  readonly madeSpringRings: number;
  /** How long its white glow lasts. */
  readonly madeGlowMs: number;
  /** How long its second fur takes to grow in. */
  readonly madeFurMs: number;
  /** How many rings spread as it is made. */
  readonly madeRings: number;
  /** How many tufts fly as it is made. */
  readonly madeTufts: number;
  /** How long the board waits before it falls. */
  readonly fallWaitMs: number;
  /** How long a fall takes before its squares count. */
  readonly fallBaseMs: number;
  /** How long a fall takes for its squares, by the power `fallExponent` of how many. */
  readonly fallPerSquareMs: number;
  /** The power of a fall's squares its time takes. */
  readonly fallExponent: number;
  /** How much a fuzzball stretches along its fall. */
  readonly fallStretch: number;
  /** How far apart the columns start to fall, left to right. */
  readonly laneGapMs: number;
  /** How far apart the fuzzballs of a column start to fall, bottom first. */
  readonly stackGapMs: number;
  /** How long a landing takes to squash and spring back. */
  readonly landMs: number;
  /** How much a landing squashes. */
  readonly landSquash: number;
  /** How long a landing takes to squash. */
  readonly landSquashMs: number;
  /** How long the board waits between waves. */
  readonly waveGapMs: number;
  /** How much quicker each wave after the first plays. */
  readonly quickenPerWave: number;
  /** The quickest a later wave plays, of the first's time. */
  readonly quickest: number;
  /** How long a dasher's streaks take to run a square. */
  readonly dasherSquareMs: number;
  /** How long a puffer takes to breathe in. */
  readonly pufferInMs: number;
  /** How long its blast takes to spread a ring. */
  readonly pufferRingMs: number;
  /** How small it shrinks as it breathes in. */
  readonly pufferShrink: number;
  /** How far its neighbors lean in. */
  readonly pufferLean: number;
  /** How many rings spread as it goes off. */
  readonly pufferRings: number;
  /** How many tufts fly as it goes off. */
  readonly pufferTufts: number;
  /** How long the soft disc where a puffer or a frizzball goes off lasts. */
  readonly flashMs: number;
  /** How far apart two flashes start at the least. */
  readonly flashGapMs: number;
  /** How long a wisp's flight takes. */
  readonly wispMs: number;
  /** How far apart the three wisps of two swapped together set off. */
  readonly wispGapMs: number;
  /** How long a frizzball's static takes to leap to each fuzzball. */
  readonly frizzballStepMs: number;
  /** The longest its static takes to reach them all. */
  readonly frizzballMostMs: number;
  /** How long they stand frizzed before they hop. */
  readonly frizzballHoldMs: number;
  /** How long two specials swapped together wind up before they go off. */
  readonly pairMs: number;
  /** How big the pair swells as it winds up. */
  readonly pairScale: number;
  /** How long a brick's top cushion takes to tumble off. */
  readonly cushionMs: number;
  /** How much it plumps up as it tumbles. */
  readonly cushionPlump: number;
  /** How many tufts follow it. */
  readonly cushionTufts: number;
  /** How long the cushions left take to spring up and settle. */
  readonly pileMs: number;
  /** How low the pile ducks as it is hit. */
  readonly pileDuck: number;
  /** How long a brick's last cushion swells before it bursts. */
  readonly lastLayerMs: number;
  /** How big it swells. */
  readonly lastLayerScale: number;
  /** How many tufts it bursts into. */
  readonly lastLayerTufts: number;
  /** How long a fuzzball's copy takes to fly to its goal. */
  readonly flightMs: number;
  /** How far apart the copies set off. */
  readonly flightGapMs: number;
  /** The most that fly at once, those past it counted with no flight. */
  readonly mostFlights: number;
  /** How long a gust takes to cross the board. */
  readonly gustMs: number;
  /** How far each fuzzball leans with it. */
  readonly gustLean: number;
  /** How much the board shakes as a special is made. */
  readonly shakeMadePx: number;
  /** How much it shakes as a frizzball is made. */
  readonly shakeFrizzballMadePx: number;
  /** How much it shakes as a dasher goes off. */
  readonly shakeDasherPx: number;
  /** How much it shakes as a puffer goes off. */
  readonly shakePufferPx: number;
  /** How much it shakes as a frizzball goes off. */
  readonly shakeFrizzballPx: number;
  /** How much it shakes as two dashers go off together. */
  readonly shakeTwoDashersPx: number;
  /** How much it shakes as a frizzball goes off with another special. */
  readonly shakeFrizzballAndSpecialPx: number;
  /** How much it shakes as a dasher goes off with a puffer. */
  readonly shakeDasherAndPufferPx: number;
  /** How much it shakes as two puffers go off together. */
  readonly shakeTwoPuffersPx: number;
  /** How much it shakes as two frizzballs go off together. */
  readonly shakeTwoFrizzballsPx: number;
  /** How long a shake takes to halve. */
  readonly shakeHalfLifeMs: number;
  /** How small a shake stops at. */
  readonly shakeStopPx: number;
  /** The most loose bits on the board at once. */
  readonly mostLooseBits: number;
  /** How much of the fluff flies with Less motion on. */
  readonly lessMotionFluff: number;
  /** How long a brick's knocked cushion takes to fade where it lies, with Less motion on. */
  readonly lessMotionCushionMs: number;
  /** How long the pile takes to take its new shape, with Less motion on. */
  readonly lessMotionPileMs: number;
  /** The least time between a fuzzball's blinks. */
  readonly blinkLeastMs: number;
  /** The most time between them. */
  readonly blinkMostMs: number;
  /** How long the board waits with no move before it hints. */
  readonly hintWaitMs: number;
  /** How many times the hint's two fuzzballs hop. */
  readonly hintHops: number;
  /** How far a swipe goes, along its longer way, before it is read as one. */
  readonly swipeSquares: number;
  /** The least time between two starts of a fuzzball's bubble as it leaves, a cue sooner after the last dropped, as each gap below drops its sound's. */
  readonly popSoundGapMs: number;
  /** The least time between two landings' sounds. */
  readonly landSoundGapMs: number;
  /** The least time between two dashers' sounds. */
  readonly dashSoundGapMs: number;
  /** The least time between two puffers' sounds. */
  readonly puffSoundGapMs: number;
  /** The least time between two sounds of a brick losing a layer, by its layers left. */
  readonly knockSoundGapMs: number;
  /** The least time between two sounds of a brick's last layer bursting. */
  readonly breakSoundGapMs: number;
  /** The least time between two sounds of a square dusted. */
  readonly dustSoundGapMs: number;
  /** The least time between two sounds of a burr brushed off. */
  readonly burrOffSoundGapMs: number;
  /** The least time between two ticks of a fuzzball counted. */
  readonly tickSoundGapMs: number;
  /** The least time between two sounds of a goal met. */
  readonly goalSoundGapMs: number;
}

/** The feel as the design sets it, which the game plays at and the debug menu tunes from. */
export const FEEL: FeelTuning = {
  pickUpMs: 120,
  pickUpScale: 1.14,
  swapMs: 140,
  refusedOutMs: 90,
  refusedBackMs: 150,
  refusedReach: 1 / 3,
  huddleMs: 110,
  huddleLean: 0.07,
  hopMs: 130,
  hopScale: 1.42,
  hopFadeFrom: 0.3,
  hopGapMs: 12,
  bunchTufts: 5,
  bubbleGapMs: 30,
  runInMs: 110,
  madeMs: 420,
  madeScale: 1.5,
  madeSpringRings: 2,
  madeGlowMs: 260,
  madeFurMs: 300,
  madeRings: 2,
  madeTufts: 14,
  fallWaitMs: 70,
  fallBaseMs: 80,
  fallPerSquareMs: 70,
  fallExponent: 0.7,
  fallStretch: 0.08,
  laneGapMs: 16,
  stackGapMs: 12,
  landMs: 240,
  landSquash: 0.18,
  landSquashMs: 60,
  waveGapMs: 90,
  quickenPerWave: 0.06,
  quickest: 0.7,
  dasherSquareMs: 30,
  pufferInMs: 140,
  pufferRingMs: 45,
  pufferShrink: 0.72,
  pufferLean: 0.08,
  pufferRings: 2,
  pufferTufts: 26,
  flashMs: 110,
  flashGapMs: 350,
  wispMs: 480,
  wispGapMs: 90,
  frizzballStepMs: 40,
  frizzballMostMs: 700,
  frizzballHoldMs: 160,
  pairMs: 300,
  pairScale: 1.3,
  cushionMs: 480,
  cushionPlump: 1.7,
  cushionTufts: 6,
  pileMs: 440,
  pileDuck: 0.84,
  lastLayerMs: 70,
  lastLayerScale: 1.14,
  lastLayerTufts: 21,
  flightMs: 480,
  flightGapMs: 35,
  mostFlights: 14,
  gustMs: 520,
  gustLean: 0.16,
  shakeMadePx: 2.5,
  shakeFrizzballMadePx: 5,
  shakeDasherPx: 3,
  shakePufferPx: 6,
  shakeFrizzballPx: 6,
  shakeTwoDashersPx: 4,
  shakeFrizzballAndSpecialPx: 4,
  shakeDasherAndPufferPx: 7,
  shakeTwoPuffersPx: 10,
  shakeTwoFrizzballsPx: 10,
  shakeHalfLifeMs: 77,
  shakeStopPx: 0.05,
  mostLooseBits: 420,
  lessMotionFluff: 0.25,
  lessMotionCushionMs: 260,
  lessMotionPileMs: 180,
  blinkLeastMs: 3000,
  blinkMostMs: 8000,
  hintWaitMs: 7000,
  hintHops: 2,
  swipeSquares: 0.4,
  popSoundGapMs: 10,
  landSoundGapMs: 60,
  dashSoundGapMs: 60,
  puffSoundGapMs: 80,
  knockSoundGapMs: 30,
  breakSoundGapMs: 30,
  dustSoundGapMs: 40,
  burrOffSoundGapMs: 30,
  tickSoundGapMs: 30,
  goalSoundGapMs: 200,
};
