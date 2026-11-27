import { keysOf } from "@fz/core/records";
import { designText } from "../../testing/design_files";
import { FEEL, type FeelTuning } from "./feel";

/** The design's words, each run of spaces and line breaks one space, as a table's row and a paragraph read. */
const DESIGN = designText("design.md").replaceAll(/\s+/g, " ");

/** The sketch's feel, whose cues give each sound its gap. */
const SKETCH = designText("sketch/feel/feel.mjs");

/** A sound's gap, which the sketch's cues give and the design's words don't, but as "10 to 60 ms, by the sound". */
type SoundGap = Extract<keyof FeelTuning, `${string}SoundGapMs`>;

/** A number the sketch plays a move by that the design's words don't give. */
type Ported = keyof typeof PORTED;

/** A number the sound script plays a bunch's chord by that the design's words don't give. */
type Scored = keyof typeof SCORED;

/** A number the sketch's page shows a level's first move by, with its hand. */
type Styled = keyof typeof STYLED;

/** The design's sound script, whose notes a bunch's chord plays. */
const SOUND_SCRIPT = designText("sound/sounds.mjs").replaceAll(/\s+/g, " ");

/** The page the sketch's feel plays in, whose style draws the hint's hand. */
const SKETCH_PAGE = designText("mocks/feel.html").replaceAll(/\s+/g, " ");

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
  lowMovesLeft: [5, "At 5 moves the number turns to the warning color"],
  swipeSquares: [0.4, "0.4 of a square long"],
  fastPace: [1.6, "Normal or Fast, the sketch's 1.6 times"],
  hurriedPace: [4, "A tap plays the rest at 4 times the speed."],
  chordRungs: [2, "A bunch of 4 adds the note 2 steps up."],
  chordSecondFrom: [4, "A bunch of 4 adds the note 2 steps up."],
  chordThirdFrom: [5, "A bunch of 5 or more adds the note 4 steps up"],
} as const satisfies Readonly<
  Record<
    Exclude<keyof FeelTuning, SoundGap | Ported | Styled | Scored>,
    readonly [number, string]
  >
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

/**
 * Each number of the feel the sketch plays a move by that the design's
 * words don't give, and the sketch's code that sets it, each run of spaces
 * and line breaks one space, the number it sets marked «so».
 */
const PORTED = {
  putDownMs: [160, "tween(old, { sx: 1, sy: 1 }, «160», ease.spring);"],
  setOffWaitMs: [30, "let t0 = now + «30»;"],
  refusedWobble: [
    0.5,
    "s.shake = «0.5»; tween(s, { shake: 0 }, T.refuse, ease.out);",
  ],
  refusedCrossMs: [380, 'at(now + «380», () => (s.eye = "open"));'],
  wobbleSquares: [0.07, "Math.sin(now / 18) * s.shake * «0.07»"],
  wobbleRadianMs: [18, "Math.sin(now / «18») * s.shake * 0.07"],
  huddleScale: [0.93, "sx: «0.93», sy: 0.93, }, T.huddle * q,"],
  bunchGapMs: [50, "const when = tPop + order * «50»;"],
  hopFadeLength: [
    0.75,
    "tween(s, { a: 0 }, T.pop * «0.75», ease.in, now + T.pop * 0.3);",
  ],
  tuftPower: [1, "function fluff(x, y, c, count, power = «1») {"],
  mostWaveTufts: [
    6,
    "fluff(s.x, s.y, inkOf(s), 5 + Math.min(«6», wave), 1 + wave * 0.06);",
  ],
  tuftPowerPerWave: [
    0.06,
    "fluff(s.x, s.y, inkOf(s), 5 + Math.min(6, wave), 1 + wave * «0.06»);",
  ],
  hopRingSquares: [0.75, "ring(s.x, s.y, «0.75», inkOf(s), now, 220);"],
  hopRingMs: [220, "ring(s.x, s.y, 0.75, inkOf(s), now, «220»);"],
  runInScale: [0.5, "{ x: keeper.x, y: keeper.y, sx: «0.5», sy: 0.5 },"],
  runInFadeFrom: [
    0.5,
    "tween(s, { a: 0 }, T.merge * 0.5, ease.in, now + T.merge * «0.5»);",
  ],
  runInTufts: [3, "fluff(s.x, s.y, inkOf(s), «3»);"],
  madeLeadMs: [20, "at(when + T.merge - «20», () => {"],
  madeFurDownMs: [260, "tween(made, { lift: 0 }, «260», ease.out);"],
  madeWhiteRingSquares: [
    1.5,
    'ring(k.x, k.y, «1.5», colorOf(palette, null, "frizz"), now, 380);',
  ],
  madeWhiteRingMs: [
    380,
    'ring(k.x, k.y, 1.5, colorOf(palette, null, "frizz"), now, «380»);',
  ],
  madeInkRingSquares: [1, "ring(k.x, k.y, «1.0», inkOf(made), now + 60, 320);"],
  madeInkRingAfterMs: [
    60,
    "ring(k.x, k.y, 1.0, inkOf(made), now + «60», 320);",
  ],
  madeInkRingMs: [320, "ring(k.x, k.y, 1.0, inkOf(made), now + 60, «320»);"],
  madeTuftPower: [1.4, "fluff(k.x, k.y, inkOf(made), 14, «1.4»);"],
  madeStareMs: [560, "at(now + «560», () => { made.z = 0;"],
  frizzballMadeDim: [0.4, "dim = «0.4»;"],
  frizzballMadeDimWaitMs: [
    200,
    "tween(view, { dim: 0 }, 500, ease.in, now + «200»);",
  ],
  frizzballMadeDimMs: [
    500,
    "tween(view, { dim: 0 }, «500», ease.in, now + 200);",
  ],
  frizzballMadeLook: [0.9, "other.lx = Math.sign(k.x - other.x) * «0.9»;"],
  frizzballMadeStareMs: [
    620,
    'at(now + «620», () => { if (!other.gone && other.eye === "wide")',
  ],
  fallAfterHop: [0.6, "last = Math.max(last, when + n * 12 + T.pop * «0.6»);"],
  fallAfterMadeMs: [180, "last = Math.max(last, when + T.merge + «180»);"],
  markAboveSquares: [0.5, "y: cy - «0.5»,"],
  markMs: [620, 't0: now, d: «620», c: colorOf(palette, null, "text"),'],
  markRiseSquares: [
    0.5,
    "ctx.fillText(`×${m.r0}`, px, py - u * size * «0.5»);",
  ],
  fallLook: [0.8, "sprite.lx = gx * «0.8»;"],
  fallNarrow: [
    0.1,
    "1 - «0.1» * speed * Math.abs(gy) + 0.08 * speed * Math.abs(gx);",
  ],
  fallStretchGrowth: [1.4, "const speed = Math.min(1, run.u * «1.4»);"],
  landWiden: [0.16, "sx: 1 + «0.16» * Math.abs(gy) - 0.18 * Math.abs(gx),"],
  landBlinkAfterMs: [
    20,
    'if (sprite.t !== "sleepy") sprite.blink = now + «20»;',
  ],
  blinkMs: [110, "const blink = now > s.blink && now < s.blink + «110»;"],
  restWithoutFallMs: [
    150,
    "return step.falls.length ? rest + T.waveGap * q : last + «150»;",
  ],
  blastAfterMs: [
    20,
    "b.after === -1 ? tPop + (paired ? T.pair : «20») : reach[b.after](b.wait);",
  ],
  struckAfterBunchMs: [
    40,
    "h.src === -1 ? tPop + «40» : h.src === -2 ? -1 : reach[h.src](h.rank);",
  ],
  struckLookMs: [40, "at(t - (quiet ? «40» : 0), () => {"],
  streaksAfterMs: [
    40,
    "else reach[n] = (rank) => tb + «40» + rank * T.dashCell;",
  ],
  streakRunOnSquares: [4, "d: (Math.max(cols, rows) + «4») * T.dashCell,"],
  dasherStretchScale: [
    2.4,
    "{ sx: along ? «2.4» : 0.5, sy: along ? 0.5 : 2.4, a: 0 }, 170, ease.out,",
  ],
  dasherNarrowScale: [
    0.5,
    "{ sx: along ? 2.4 : «0.5», sy: along ? 0.5 : 2.4, a: 0 }, 170, ease.out,",
  ],
  dasherGoneMs: [
    170,
    "{ sx: along ? 2.4 : 0.5, sy: along ? 0.5 : 2.4, a: 0 }, «170», ease.out,",
  ],
  crossRingSquares: [2.2, "ring(c.x, c.y, «2.2», white, now, 360);"],
  crossRingMs: [360, "ring(c.x, c.y, 2.2, white, now, «360»);"],
  pufferReachSquares: [2.6, 'const far = b.what === "puff" ? «2.6» : 4.6;'],
  twoPuffersReachSquares: [4.6, 'const far = b.what === "puff" ? 2.6 : «4.6»;'],
  pufferLeanBackMs: [
    200,
    "tween(other, { px: 0, py: 0 }, «200», ease.spring, now + T.puffIn);",
  ],
  pufferBurstScale: [
    2.4,
    "tween(s, { sx: «2.4», sy: 2.4, a: 0, lift: 1 }, 160, ease.out);",
  ],
  pufferBurstMs: [
    160,
    "tween(s, { sx: 2.4, sy: 2.4, a: 0, lift: 1 }, «160», ease.out);",
  ],
  pufferRingSpreadMs: [340, "ring(c.x, c.y, far, white, now, «340»);"],
  pufferInkRing: [0.7, "ring(c.x, c.y, far * «0.7», ink, now + 50, 340);"],
  pufferInkRingAfterMs: [
    50,
    "ring(c.x, c.y, far * 0.7, ink, now + «50», 340);",
  ],
  twoPuffersTufts: [44, 'b.what === "puff" ? 26 : «44»,'],
  pufferTuftPower: [2, 'b.what === "puff" ? «2» : 2.8,'],
  twoPuffersTuftPower: [2.8, 'b.what === "puff" ? 2 : «2.8»,'],
  pufferFlashReach: [0.8, "flash(c.x, c.y, far * «0.8», white);"],
  pufferPush: [0.12, "const push = «0.12» * (1 - d / (far + 1.6));"],
  pufferPushReach: [1.6, "const push = 0.12 * (1 - d / (far + «1.6»));"],
  pufferPushMs: [
    70,
    "tween(other, { px: 0, py: 0 }, 260, ease.spring, now + «70»);",
  ],
  pufferPushBackMs: [
    260,
    "tween(other, { px: 0, py: 0 }, «260», ease.spring, now + 70);",
  ],
  wispBendSquares: [1.6, "bend: n % 2 ? «1.6» : -1.6,"],
  curveArc: [0.5, "const arc = Math.sin(e * Math.PI) * g.bend * «0.5»;"],
  curveRiseSquares: [0.35, "Math.sin(e * Math.PI) * «0.35»;"],
  wispTufts: [8, "fluff(to.x, to.y, ink, «8»);"],
  wispRingSquares: [0.9, "ring(to.x, to.y, «0.9», white);"],
  ringMs: [280, "function ring(x, y, r1, c, t0 = now, d = «280») {"],
  frizzballDim: [0.34, "dim = «0.34»;"],
  frizzballSwellScale: [
    1.25,
    "tween(s, { sx: «1.25», sy: 1.25 }, 200, ease.back);",
  ],
  frizzballSwellMs: [
    200,
    "tween(s, { sx: 1.25, sy: 1.25 }, «200», ease.back);",
  ],
  boltMs: [
    200,
    't0: now, d: «200», c: colorOf(palette, null, "spark"), w: 0.07,',
  ],
  frizzedLiftMs: [90, "tween(hit, { lift: 1 }, «90», ease.out);"],
  givenFurMs: [220, "tween(hit, { auraIn: 1 }, «220», ease.back);"],
  frizzballUndimMs: [260, "tween(view, { dim: 0 }, «260», ease.out);"],
  frizzballBurstScale: [
    2,
    "tween(s, { sx: «2», sy: 2, a: 0 }, 180, ease.out);",
  ],
  frizzballBurstMs: [180, "tween(s, { sx: 2, sy: 2, a: 0 }, «180», ease.out);"],
  frizzballTufts: [20, "fluff(c.x, c.y, white, «20», 2);"],
  frizzballTuftPower: [2, "fluff(c.x, c.y, white, 20, «2»);"],
  frizzballRingSquares: [3.4, "ring(c.x, c.y, «3.4», white, now, 420);"],
  frizzballRingMs: [420, "ring(c.x, c.y, 3.4, white, now, «420»);"],
  frizzballFlashSquares: [1.6, "flash(c.x, c.y, «1.6», white);"],
  frizzballPairAfterMs: [
    200,
    "reach[n] = (rank) => tb + count * arc + «200» + rank * 90;",
  ],
  frizzballPairStepMs: [
    90,
    "reach[n] = (rank) => tb + count * arc + 200 + rank * «90»;",
  ],
  twoFrizzballsStrikeAfterMs: [
    260,
    "reach[n] = (rank) => tb + «260» + rank * 26;",
  ],
  twoFrizzballsStepMs: [26, "reach[n] = (rank) => tb + 260 + rank * «26»;"],
  twoFrizzballsDim: [0.5, "dim = «0.5»;"],
  twoFrizzballsDimWaitMs: [
    200,
    "tween(view, { dim: 0 }, 700, ease.in, now + «200»);",
  ],
  twoFrizzballsDimMs: [
    700,
    "tween(view, { dim: 0 }, «700», ease.in, now + 200);",
  ],
  twoFrizzballsRing: [
    1.2,
    "ring(c.x, c.y, Math.max(cols, rows) * «1.2», white, now + 200, 620);",
  ],
  twoFrizzballsRingAfterMs: [
    200,
    "ring(c.x, c.y, Math.max(cols, rows) * 1.2, white, now + «200», 620);",
  ],
  twoFrizzballsRingMs: [
    620,
    "ring(c.x, c.y, Math.max(cols, rows) * 1.2, white, now + 200, «620»);",
  ],
  twoFrizzballsSparkRingAfterMs: [
    260,
    'colorOf(palette, null, "spark"), now + «260», 620,',
  ],
  pairRingSquares: [
    1.1,
    'ring(pb.x, pb.y, «1.1», colorOf(palette, null, "frizz"), now, T.pair);',
  ],
  pairTufts: [10, "fluff(pb.x, pb.y, inkOf(goes), «10», 1.2);"],
  pairTuftPower: [1.2, "fluff(pb.x, pb.y, inkOf(goes), 10, «1.2»);"],
  flightAfterMs: [40, "t0: now + «40» + (inAir % 6) * 35,"],
  flightsInTurn: [6, "t0: now + 40 + (inAir % «6») * 35,"],
  flightScale: [
    0.9,
    'const copy = { ...s, sx: «0.9», sy: 0.9, a: 1, lift: 0.4, eye: "happy", z: 5 };',
  ],
  flightLift: [
    0.4,
    'const copy = { ...s, sx: 0.9, sy: 0.9, a: 1, lift: «0.4», eye: "happy", z: 5 };',
  ],
  flightShrink: [0.45, "g.s.sx = g.s.sy = 0.9 - «0.45» * e;"],
  flightBendSpread: [2.4, "bend: (Math.random() - 0.5) * «2.4»,"],
  unflownCountMs: [200, "at(now + «200», landed);"],
  cheerAfterMs: [90, "at(tPop + «90», () => cheer(tier));"],
  cheerSquareGapMs: [22, "const wait = (s.x + s.y) * «22»;"],
  cheerStretch: [0.07, "{ sy: 1 + «0.07» * tier, sx: 1 - 0.04 * tier },"],
  cheerNarrow: [0.04, "{ sy: 1 + 0.07 * tier, sx: 1 - «0.04» * tier },"],
  cheerUpMs: [
    90,
    "tween(s, { sy: 1, sx: 1 }, 220, ease.spring, now + wait + «90»);",
  ],
  cheerDownMs: [
    220,
    "tween(s, { sy: 1, sx: 1 }, «220», ease.spring, now + wait + 90);",
  ],
  cheerHappyMs: [420, "at(now + wait + «420», () => {"],
  dustPuffMs: [320, "tween(sq, { puff: 0 }, «320», ease.out);"],
  shuffleShrink: [0.7, "tween(s, { sx: «0.7», sy: 0.7 }, 140, ease.out);"],
  shuffleShrinkMs: [140, "tween(s, { sx: 0.7, sy: 0.7 }, «140», ease.out);"],
  shuffleMoveAfterMs: [
    60,
    "tween(s, { x: to.x, y: to.y }, 380, ease.inOut, now + «60»);",
  ],
  shuffleMoveMs: [
    380,
    "tween(s, { x: to.x, y: to.y }, «380», ease.inOut, now + 60);",
  ],
  shuffleGrowAfterMs: [
    380,
    "tween(s, { sx: 1, sy: 1 }, 260, ease.spring, now + «380»);",
  ],
  shuffleGrowMs: [
    260,
    "tween(s, { sx: 1, sy: 1 }, «260», ease.spring, now + 380);",
  ],
  shuffleMs: [700, "t += «700»;"],
  winSoundAfterMs: [150, 'sfx("win", now + «150»);'],
  encoreAfterMs: [900, "let t = now + «900»;"],
  encoreFurMs: [200, "tween(s, { auraIn: 1 }, «200», ease.back);"],
  encoreGlow: [0.8, "glow(s, «0.8», 220);"],
  encoreGlowMs: [220, "glow(s, 0.8, «220»);"],
  encoreSpareMs: [230, "t += «230»;"],
  clearedCardAfterMs: [200, "at(t + «200», () => {"],
  starsAfterMs: [200, "sfx(`star-${n}`, now + «200» + n * 340);"],
  starGapMs: [340, "sfx(`star-${n}`, now + 200 + n * «340»);"],
  loseSoundAfterMs: [100, 'sfx("lose", now + «100»);'],
  overCardAfterMs: [500, "at(now + «500», () => card("],
  laterBunchVolume: [0.7, "order === 0 ? 1 : «0.7»,"],
  bubbleAfterMs: [
    50,
    "sfx(`pop-${Math.min(9, rung + n)}`, when + «50» + n * 30, 0.8);",
  ],
  bubbleVolume: [
    0.8,
    "sfx(`pop-${Math.min(9, rung + n)}`, when + 50 + n * 30, «0.8»);",
  ],
  madeSoundAfterMs: [60, "sfx(`born-${what}`, when + «60»);"],
  mostStruckBubbles: [
    14,
    "if (hops++ < «14») sfx(`pop-${Math.min(9, rung + (hops % 6))}`, t, 0.6, 10);",
  ],
  struckBubbleRungs: [
    6,
    "if (hops++ < 14) sfx(`pop-${Math.min(9, rung + (hops % «6»))}`, t, 0.6, 10);",
  ],
  struckBubbleVolume: [
    0.6,
    "if (hops++ < 14) sfx(`pop-${Math.min(9, rung + (hops % 6))}`, t, «0.6», 10);",
  ],
  landVolume: [0.7, 'sfx("land", now, «0.7» + Math.min(0.3, far * 0.06), 60);'],
  landVolumePerSquare: [
    0.06,
    'sfx("land", now, 0.7 + Math.min(0.3, far * «0.06»), 60);',
  ],
  dashVolume: [0.9, 'sfx("dash", tb, b.what === "bigcross" ? 1 : «0.9», 60);'],
  twoFrizzballsCrackleAfterMs: [200, 'sfx("frizz", tb + «200»);'],
  twoFrizzballsBoomAfterMs: [240, 'sfx("big-puff", tb + «240», 0.7);'],
  twoFrizzballsBoomVolume: [0.7, 'sfx("big-puff", tb + 240, «0.7»);'],
  mostZaps: [18, "for (let n = 0; n < Math.min(count, «18»); n++)"],
  crackleLeadMs: [20, 'sfx("frizz", tb + count * arc + T.frizzHold - «20»);'],
  tuftLifeMs: [420, "life: «420» + Math.random() * 380,"],
  tuftLifeSpreadMs: [380, "life: 420 + Math.random() * «380»,"],
  pufferBreathRadianMs: [380, "Math.sin(now / «380» + s.id) * 0.045"],
  pufferBreath: [0.045, "Math.sin(now / 380 + s.id) * «0.045»"],
  wispSwayRadianMs: [420, "Math.sin(now / «420» + s.id) * 0.07"],
  wispSway: [0.07, "Math.sin(now / 420 + s.id) * «0.07»"],
  staticStepMs: [110, "const turn = Math.floor(now / «110») % 6;"],
  staticStep: [0.52, "0.3 + turn * «0.52»,"],
  staticSteps: [6, "const turn = Math.floor(now / 110) % «6»;"],
  hintLookMs: [
    900,
    "at(now + «900», () => Object.assign(s, { lx: 0, ly: 0 }));",
  ],
  hintUpMs: [
    90,
    "tween(s, { sy: 1.16, sx: 0.9 }, «90», ease.out, now + wait);",
  ],
  hintStretch: [
    1.16,
    "tween(s, { sy: «1.16», sx: 0.9 }, 90, ease.out, now + wait);",
  ],
  hintNarrow: [
    0.9,
    "tween(s, { sy: 1.16, sx: «0.9» }, 90, ease.out, now + wait);",
  ],
  hintDownMs: [
    170,
    "tween(s, { sy: 1, sx: 1 }, «170», ease.spring, now + wait + 90);",
  ],
  hintHopGapMs: [260, "for (const wait of [0, «260»]) {"],
} as const satisfies Readonly<Record<string, readonly [number, string]>>;

/**
 * Each number of the feel the sketch's page shows a level's first move by,
 * with its hand, and the page's style that sets it, as `PORTED` quotes the
 * sketch's code, a share of the hand's loop marked as the style's percent.
 */
const STYLED = {
  handLoopMs: [1500, "animation: hand «1500»ms ease-in-out infinite;"],
  handShowsFrom: [
    0.15,
    "0%, «15»% { transform: translate(var(--x0), var(--y0)) scale(1.15); opacity: 0; }",
  ],
  handSlidesFrom: [
    0.25,
    "«25»% { transform: translate(var(--x0), var(--y0)) scale(1); opacity: .9; }",
  ],
  handSlidesTo: [
    0.6,
    "«60»%, 75% { transform: translate(var(--x1), var(--y1)) scale(1); opacity: .9; }",
  ],
  handGoesFrom: [
    0.75,
    "60%, «75»% { transform: translate(var(--x1), var(--y1)) scale(1); opacity: .9; }",
  ],
  handScale: [
    1.15,
    "0%, 15% { transform: translate(var(--x0), var(--y0)) scale(«1.15»); opacity: 0; }",
  ],
  handOpacity: [
    0.9,
    "25% { transform: translate(var(--x0), var(--y0)) scale(1); opacity: «.9»; }",
  ],
} as const satisfies Readonly<Record<string, readonly [number, string]>>;

/**
 * Each number of the feel the sound script plays a bunch's chord by that
 * the design's words don't give, and the script's code that sets it, as
 * `PORTED` quotes the sketch's, a time marked in seconds as the script
 * counts it.
 */
const SCORED = {
  chordGapMs: [
    22,
    "parts.push([mallet(rung(step + 2), { air: 0.1, seed: 9 }), «0.022», 0.6]);",
  ],
  chordSecondVolume: [
    0.6,
    "parts.push([mallet(rung(step + 2), { air: 0.1, seed: 9 }), 0.022, «0.6»]);",
  ],
  chordThirdVolume: [
    0.5,
    "parts.push([mallet(rung(step + 4), { air: 0.1, seed: 13 }), 0.044, «0.5»]);",
  ],
} as const satisfies Readonly<Record<string, readonly [number, string]>>;

/** Each number of the feel, and the words that set it. */
const SET_BY: Readonly<Record<keyof FeelTuning, readonly [number, string]>> = {
  ...WRITTEN,
  ...SKETCHED,
  ...PORTED,
  ...STYLED,
  ...SCORED,
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

/** The sketch's feel, each run of spaces and line breaks one space, as `PORTED` quotes its code. */
const SKETCH_CODE = SKETCH.replaceAll(/\s+/g, " ");

/** Returns the number a quote of the sketch's code marks, as a number, so that "«1.0»" is 1, or NaN for none. */
function markedIn(quote: string): number {
  const [, marked = ""] = /«([\d.]+)»/.exec(quote) ?? [];
  return marked === "" ? Number.NaN : Number(marked);
}

/** Returns how many times some code holds a quote of it, its mark taken out. */
function timesQuoted(quote: string, code: string = SKETCH_CODE): number {
  return code.split(quote.replaceAll(/[«»]/g, "")).length - 1;
}

/** Returns a pattern that finds a number written whole, not as a part of another. */
function written(value: number): RegExp {
  return new RegExp(
    `(?<![\\d.])${String(value).replace(".", "\\.")}(?![\\d.])`,
  );
}

describe("FEEL", () => {
  it("names each number of the design's feel, its sketch's gaps, the sketch's other numbers, its page's hand and its sound script's chord, and nothing else", () => {
    expect(keysOf(FEEL)).toEqual([
      ...keysOf(WRITTEN),
      ...keysOf(SKETCHED),
      ...keysOf(PORTED),
      ...keysOf(STYLED),
      ...keysOf(SCORED),
    ]);
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

  it.each(keysOf(PORTED))(
    "finds the code that sets %s in the sketch, once, its number marked there",
    (field) => {
      const [value, quote] = PORTED[field];

      expect({ times: timesQuoted(quote), marked: markedIn(quote) }).toEqual({
        times: 1,
        marked: value,
      });
    },
  );

  it.each(keysOf(STYLED))(
    "finds the style that sets %s on the sketch's page, once, its number marked there",
    (field) => {
      const [value, quote] = STYLED[field];

      expect({
        times: timesQuoted(quote, SKETCH_PAGE),
        marked: quote.includes("»%") ? markedIn(quote) / 100 : markedIn(quote),
      }).toEqual({ times: 1, marked: value });
    },
  );

  it("grows the hand as it goes, as far as it shrinks from as it shows", () => {
    expect(SKETCH_PAGE).toContain(
      `100% { transform: translate(var(--x1), var(--y1)) scale(${String(FEEL.handScale)}); opacity: 0; }`,
    );
  });

  it.each(keysOf(SCORED))(
    "finds the code that sets %s in the sound script, once, its number marked there",
    (field) => {
      const [value, quote] = SCORED[field];

      expect({
        times: timesQuoted(quote, SOUND_SCRIPT),
        marked: field.endsWith("Ms")
          ? Math.round(markedIn(quote) * 1000)
          : markedIn(quote),
      }).toEqual({ times: 1, marked: value });
    },
  );

  it("gives a gap to each sound the sketch gives one", () => {
    expect(new Set(SKETCH.match(/sfx\([^;]*, \d+\);/g))).toEqual(
      new Set(Object.values(SKETCHED).map(([, cue]) => cue)),
    );
  });

  it.each(
    [...keysOf(WRITTEN), ...keysOf(SKETCHED)].filter(
      (field) => !IN_WORDS.has(field),
    ),
  )("finds %s's number in its words, written whole", (field) => {
    expect(SET_BY[field][1]).toMatch(written(SET_BY[field][0]));
  });

  it("takes a chord's third note as far above its second as the second is above its first", () => {
    expect(DESIGN).toContain(
      `adds the note ${String(2 * FEEL.chordRungs)} steps up as well`,
    );
    expect(SOUND_SCRIPT).toContain(
      `rung(step + ${String(2 * FEEL.chordRungs)}), { air: 0.1, seed: 13 }), ${String((2 * FEEL.chordGapMs) / 1000)},`,
    );
  });

  it("takes the refused swap's 240 ms as its lean out and its spring back", () => {
    expect(DESIGN).toContain("| Refused swap | 240 |");
    expect(FEEL.refusedOutMs + FEEL.refusedBackMs).toBe(240);
  });
});
