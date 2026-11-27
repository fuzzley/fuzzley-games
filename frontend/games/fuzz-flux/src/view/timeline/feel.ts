// The feel: every number the design gives a move's motion, its effects and
// their limits, the sounds' gaps as its sketch gives them, every other
// number its sketch plays a move by, the numbers its sketch plays the board
// by between moves and the hand its page shows a level's first move with,
// the count of moves left at which the bar warns, and the numbers its sound
// script plays a bunch's chord by, as one record of numbers, which the view
// is handed and the debug menu's `createTuning()` takes. Nothing in the view
// reads one from a module, so retuning changes numbers, never code. Times
// are in milliseconds, lengths in squares, shakes in pixels across their
// whole width, and a sound's volume 1 at its own loudness.

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
  /** How few moves left turn the count to the warning color, as the low sound plays once. */
  readonly lowMovesLeft: number;
  /** How far a swipe goes, along its longer way, before it is read as one. */
  readonly swipeSquares: number;
  /** How many times as fast as Normal the Fast speed plays a move. */
  readonly fastPace: number;
  /** How many times as fast, on top of the speed chosen, a tap plays the rest of the encore and the level's end. */
  readonly hurriedPace: number;
  /** How many rungs up the ladder each note of a bunch's chord plays above the one before. */
  readonly chordRungs: number;
  /** The least bunch whose chord plays a second note. */
  readonly chordSecondFrom: number;
  /** The least bunch whose chord plays a third note. */
  readonly chordThirdFrom: number;
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

  // The numbers the sketch plays a move by that the design's words don't
  // give, in the order a move plays them.

  /** How long a fuzzball put down takes to spring back to its size. */
  readonly putDownMs: number;
  /** How long a special set off where it stands waits before it goes off. */
  readonly setOffWaitMs: number;
  /** How hard the two of a refused swap shake their heads as they lean out, dying away over the refused swap. */
  readonly refusedWobble: number;
  /** How long they look cross. */
  readonly refusedCrossMs: number;
  /** How far a head shaken with a wobble of 1 sways each way. */
  readonly wobbleSquares: number;
  /** How long a wobble's sway takes to turn a radian. */
  readonly wobbleRadianMs: number;
  /** How small a bunch shrinks as it huddles. */
  readonly huddleScale: number;
  /** How far apart the bunches of a wave hop off. */
  readonly bunchGapMs: number;
  /** How much of a hop's time its fade takes. */
  readonly hopFadeLength: number;
  /** How hard tufts fly where nothing throws them harder, as a run-in's and the first wave's hops' do. */
  readonly tuftPower: number;
  /** The most tufts a later wave adds to each fuzzball that hops off, a tuft a wave. */
  readonly mostWaveTufts: number;
  /** How much harder its tufts fly for each wave before its own. */
  readonly tuftPowerPerWave: number;
  /** How far the ring a fuzzball leaves as it hops off spreads. */
  readonly hopRingSquares: number;
  /** How long that ring takes to spread. */
  readonly hopRingMs: number;
  /** How small the rest of a bunch shrinks as it runs into the special it makes. */
  readonly runInScale: number;
  /** How far through its run it starts to fade, which it takes the rest of the way to do. */
  readonly runInFadeFrom: number;
  /** How many tufts each fuzzball that runs in leaves. */
  readonly runInTufts: number;
  /** How long before the run-in ends the special shows. */
  readonly madeLeadMs: number;
  /** How long a special made takes to lay its fur down. */
  readonly madeFurDownMs: number;
  /** How far the white ring spreads as a special is made. */
  readonly madeWhiteRingSquares: number;
  /** How long it takes to spread. */
  readonly madeWhiteRingMs: number;
  /** How far the ring in the special's color spreads. */
  readonly madeInkRingSquares: number;
  /** How long after the white one it starts. */
  readonly madeInkRingAfterMs: number;
  /** How long it takes to spread. */
  readonly madeInkRingMs: number;
  /** How hard the tufts fly as a special is made. */
  readonly madeTuftPower: number;
  /** How long a special made stands wide-eyed over the board. */
  readonly madeStareMs: number;
  /** How far the board dims as a frizzball is made. */
  readonly frizzballMadeDim: number;
  /** How long it stays dim before it brightens. */
  readonly frizzballMadeDimWaitMs: number;
  /** How long it takes to brighten. */
  readonly frizzballMadeDimMs: number;
  /** How far toward the frizzball made everyone on the board looks. */
  readonly frizzballMadeLook: number;
  /** How long they look at it, wide-eyed. */
  readonly frizzballMadeStareMs: number;
  /** How much of a hop's time after a bunch's last hop is due passes before the board's wait to fall starts. */
  readonly fallAfterHop: number;
  /** How long the board waits to fall after a bunch's run-in ends. */
  readonly fallAfterMadeMs: number;
  /** How far above a bunch's middle its wave's mark shows. */
  readonly markAboveSquares: number;
  /** How long a wave's mark shows. */
  readonly markMs: number;
  /** How far it rises as it shows. */
  readonly markRiseSquares: number;
  /** How far down along its fall a fuzzball looks as it falls. */
  readonly fallLook: number;
  /** How much a falling fuzzball narrows across its fall. */
  readonly fallNarrow: number;
  /** How many times as fast as its fall a falling fuzzball's stretch grows, so that it is whole at 1 over this of the way. */
  readonly fallStretchGrowth: number;
  /** How much a landing widens across its fall as it squashes. */
  readonly landWiden: number;
  /** How long after it lands a fuzzball blinks. */
  readonly landBlinkAfterMs: number;
  /** How long a blink keeps the eyes shut. */
  readonly blinkMs: number;
  /** How long a wave that lets nothing fall waits after its last moment. */
  readonly restWithoutFallMs: number;
  /** How long after a wave's bunches hop off a special the move sets off goes off. */
  readonly blastAfterMs: number;
  /** How long after a wave's bunches hop off they strike what stands beside them. */
  readonly struckAfterBunchMs: number;
  /** How long before a blast takes a fuzzball it goes wide-eyed. */
  readonly struckLookMs: number;
  /** How long after a dasher goes off its streaks set out. */
  readonly streaksAfterMs: number;
  /** How far past the board's longer side a streak runs on. */
  readonly streakRunOnSquares: number;
  /** How far a dasher going off stretches along its streaks, as a scale. */
  readonly dasherStretchScale: number;
  /** How narrow it grows across them, as a scale. */
  readonly dasherNarrowScale: number;
  /** How long it takes to stretch out and fade. */
  readonly dasherGoneMs: number;
  /** How far the white ring of two dashers, or a dasher with a puffer, going off spreads. */
  readonly crossRingSquares: number;
  /** How long it takes to spread. */
  readonly crossRingMs: number;
  /** How far a puffer reaches as it goes off: its neighbors in it lean in, and its white ring spreads to it. */
  readonly pufferReachSquares: number;
  /** How far two puffers reach. */
  readonly twoPuffersReachSquares: number;
  /** How long a puffer's neighbors take to spring back from leaning in. */
  readonly pufferLeanBackMs: number;
  /** How big a puffer swells as it bursts. */
  readonly pufferBurstScale: number;
  /** How long it takes to burst and fade. */
  readonly pufferBurstMs: number;
  /** How long its rings take to spread, each as a whole, where `pufferRingMs` is its blast's time a ring out. */
  readonly pufferRingSpreadMs: number;
  /** How far its ring in its color spreads, a share of its reach. */
  readonly pufferInkRing: number;
  /** How long after its white ring that one starts. */
  readonly pufferInkRingAfterMs: number;
  /** How many tufts fly as two puffers go off. */
  readonly twoPuffersTufts: number;
  /** How hard a puffer's tufts fly. */
  readonly pufferTuftPower: number;
  /** How hard two puffers' fly. */
  readonly twoPuffersTuftPower: number;
  /** How far its flash reaches, a share of its reach. */
  readonly pufferFlashReach: number;
  /** How far it pushes back what stands beside it at the least distance, less the farther away. */
  readonly pufferPush: number;
  /** How far past its reach its push goes. */
  readonly pufferPushReach: number;
  /** How long what it pushes takes to go back. */
  readonly pufferPushMs: number;
  /** How long it takes to spring home. */
  readonly pufferPushBackMs: number;
  /** How far aside a wisp's flight bends, each wisp the other way from the last. */
  readonly wispBendSquares: number;
  /** How much of a curved flight's bend it arcs out at its middle. */
  readonly curveArc: number;
  /** How far a curved flight rises at its middle. */
  readonly curveRiseSquares: number;
  /** How many tufts fly where a wisp lands. */
  readonly wispTufts: number;
  /** How far the white ring where it lands spreads. */
  readonly wispRingSquares: number;
  /** How long a ring with no time of its own takes to spread. */
  readonly ringMs: number;
  /** How far the board dims as a frizzball goes off. */
  readonly frizzballDim: number;
  /** How big the frizzball swells as it goes off. */
  readonly frizzballSwellScale: number;
  /** How long it takes to swell. */
  readonly frizzballSwellMs: number;
  /** How long a bolt of static stays. */
  readonly boltMs: number;
  /** How long a fuzzball a bolt reaches takes to stand its fur on end. */
  readonly frizzedLiftMs: number;
  /** How long the fur a frizzball gives a fuzzball takes to grow in. */
  readonly givenFurMs: number;
  /** How long the board takes to brighten once the frizzball has gone off. */
  readonly frizzballUndimMs: number;
  /** How big the frizzball swells as it bursts. */
  readonly frizzballBurstScale: number;
  /** How long it takes to burst and fade. */
  readonly frizzballBurstMs: number;
  /** How many tufts fly as it bursts. */
  readonly frizzballTufts: number;
  /** How hard they fly. */
  readonly frizzballTuftPower: number;
  /** How far its white ring spreads. */
  readonly frizzballRingSquares: number;
  /** How long it takes to spread. */
  readonly frizzballRingMs: number;
  /** How far its flash reaches. */
  readonly frizzballFlashSquares: number;
  /** How long after its static has reached them all a frizzball swapped with a special strikes the first of the fuzzballs it gave that special's fur. */
  readonly frizzballPairAfterMs: number;
  /** How long it takes to reach each after. */
  readonly frizzballPairStepMs: number;
  /** How long after two frizzballs go off they strike the first square. */
  readonly twoFrizzballsStrikeAfterMs: number;
  /** How long they take to reach each after. */
  readonly twoFrizzballsStepMs: number;
  /** How far the board dims as two frizzballs go off. */
  readonly twoFrizzballsDim: number;
  /** How long it stays dim before it brightens. */
  readonly twoFrizzballsDimWaitMs: number;
  /** How long it takes to brighten. */
  readonly twoFrizzballsDimMs: number;
  /** How far their white ring spreads, a share of the board's longer side. */
  readonly twoFrizzballsRing: number;
  /** How long after they go off it starts. */
  readonly twoFrizzballsRingAfterMs: number;
  /** How long it and their ring of static take to spread. */
  readonly twoFrizzballsRingMs: number;
  /** How long after they go off their ring of static, as wide as the board's longer side, starts. */
  readonly twoFrizzballsSparkRingAfterMs: number;
  /** How far the ring of two specials swapped together spreads as one runs into the other. */
  readonly pairRingSquares: number;
  /** How many tufts fly as it does. */
  readonly pairTufts: number;
  /** How hard they fly. */
  readonly pairTuftPower: number;
  /** How long after a fuzzball is gathered its copy sets off to its goal. */
  readonly flightAfterMs: number;
  /** How many copies set off a gap apart before the next starts again with no gap. */
  readonly flightsInTurn: number;
  /** How big a copy is as it sets off to its goal, as a scale. */
  readonly flightScale: number;
  /** How far its fur stands as it flies. */
  readonly flightLift: number;
  /** How much smaller it grows on the way, as a scale. */
  readonly flightShrink: number;
  /** How wide the spread of bends its flight takes, half of it each way. */
  readonly flightBendSpread: number;
  /** How long a fuzzball gathered with no flight takes to be counted. */
  readonly unflownCountMs: number;
  /** How long after a wave's bunches hop off the board cheers. */
  readonly cheerAfterMs: number;
  /** How far apart, a square right or down, the fuzzballs hop as the board cheers. */
  readonly cheerSquareGapMs: number;
  /** How much taller each of the board's cheers stretches a fuzzball than the one before. */
  readonly cheerStretch: number;
  /** How much narrower. */
  readonly cheerNarrow: number;
  /** How long a fuzzball takes to stretch up as it cheers. */
  readonly cheerUpMs: number;
  /** How long it takes to spring back. */
  readonly cheerDownMs: number;
  /** How long it looks happy. */
  readonly cheerHappyMs: number;
  /** How long a square's puff of dust lasts as a layer comes off. */
  readonly dustPuffMs: number;
  /** How hard a sleepyhead a blast ruffles shakes its head, dying away. */
  readonly ruffledWobble: number;
  /** How long it shakes its head. */
  readonly ruffledMs: number;
  /** How long after the board lands a sleepyhead on a bed starts to sink to it. */
  readonly bedAfterMs: number;
  /** How long it takes to sink, shrink and fade away. */
  readonly bedMs: number;
  /** How far it sinks, past the board's edge. */
  readonly bedSinkSquares: number;
  /** How small it shrinks as it sinks, as a scale. */
  readonly bedScale: number;
  /** How far apart the sleepyheads a wave puts to bed sink, the board waiting as long for each. */
  readonly bedGapMs: number;
  /** How long before its hop a fuzzball of a bunch sheds what it wears, such as a burr brushed off. */
  readonly hopShedLeadMs: number;
  /** How many tufts of a burr fly as a fuzzball of a bunch sheds it. */
  readonly burrInBunchTufts: number;
  /** How many tufts of a burr fly as a bunch beside it or a blast brushes it off. */
  readonly burrOffTufts: number;
  /** How long the fuzzball it came off looks happy. */
  readonly burrOffHappyMs: number;
  /** How long a burr spreading takes to hop across to the fuzzball it spreads to. */
  readonly burrSpreadMs: number;
  /** How far aside its hop bends. */
  readonly burrSpreadBendSquares: number;
  /** How big it is as it hops, as a scale. */
  readonly burrSpreadScale: number;
  /** How small the fuzzball it lands on squashes, as a scale. */
  readonly burrLandScale: number;
  /** How long that takes. */
  readonly burrLandSquashMs: number;
  /** How long the fuzzball takes to spring back. */
  readonly burrLandBackMs: number;
  /** How long the board waits for a burr's spread before it goes on. */
  readonly burrSpreadHoldMs: number;
  /** How small a shuffled fuzzball shrinks before it moves. */
  readonly shuffleShrink: number;
  /** How long it takes to shrink. */
  readonly shuffleShrinkMs: number;
  /** How long after the shuffle starts it moves. */
  readonly shuffleMoveAfterMs: number;
  /** How long it takes to move. */
  readonly shuffleMoveMs: number;
  /** How long after the shuffle starts it grows back. */
  readonly shuffleGrowAfterMs: number;
  /** How long it takes to grow back. */
  readonly shuffleGrowMs: number;
  /** How long the shuffle takes. */
  readonly shuffleMs: number;
  /** How long after the move that clears a level its win sounds. */
  readonly winSoundAfterMs: number;
  /** How long after that move the encore starts. */
  readonly encoreAfterMs: number;
  /** How long the fur a spare move gives a fuzzball takes to grow in. */
  readonly encoreFurMs: number;
  /** How white the fuzzball glows as it does. */
  readonly encoreGlow: number;
  /** How long it glows. */
  readonly encoreGlowMs: number;
  /** How long a spare move waits after it makes its special before it sets it off. */
  readonly encoreSpareMs: number;
  /** How long after the encore the Cleared card shows. */
  readonly clearedCardAfterMs: number;
  /** How long after the card shows its first star waits before the gap to it. */
  readonly starsAfterMs: number;
  /** How far apart its stars light. */
  readonly starGapMs: number;
  /** How long after a level's last move with goals left its loss sounds. */
  readonly loseSoundAfterMs: number;
  /** How long after that move the Out of moves card shows. */
  readonly overCardAfterMs: number;
  /** How loud the note of each bunch of a wave after its first plays. */
  readonly laterBunchVolume: number;
  /** How long after a bunch's note its bubbles start. */
  readonly bubbleAfterMs: number;
  /** How loud a bubble plays. */
  readonly bubbleVolume: number;
  /** How long after a bunch's note the sound of the special it makes plays. */
  readonly madeSoundAfterMs: number;
  /** The most bubbles a wave's blasts play as they take fuzzballs. */
  readonly mostStruckBubbles: number;
  /** How many rungs those bubbles cycle through, a rung up from the wave's each, the sixth back at the wave's own. */
  readonly struckBubbleRungs: number;
  /** How loud they play. */
  readonly struckBubbleVolume: number;
  /** How loud a landing plays after no fall at all. */
  readonly landVolume: number;
  /** How much louder it plays for each square of the fall, to its own loudness. */
  readonly landVolumePerSquare: number;
  /** How loud a dasher's sound plays, but with a puffer, where it plays at its own loudness. */
  readonly dashVolume: number;
  /** How long after two frizzballs go off their crackle plays. */
  readonly twoFrizzballsCrackleAfterMs: number;
  /** How long after they go off their boom plays. */
  readonly twoFrizzballsBoomAfterMs: number;
  /** How loud their boom plays. */
  readonly twoFrizzballsBoomVolume: number;
  /** The most zaps a frizzball's static plays as it leaps. */
  readonly mostZaps: number;
  /** How long before the fuzzballs a frizzball reaches hop its crackle plays. */
  readonly crackleLeadMs: number;
  /** The least time a tuft of fluff flies for. */
  readonly tuftLifeMs: number;
  /** How much longer than that one may fly. */
  readonly tuftLifeSpreadMs: number;

  // The numbers the sketch plays the board by between moves: its life, the
  // hint's hops, and the hand its page shows a level's first move by.

  /** How long a puffer's breath takes to turn a radian. */
  readonly pufferBreathRadianMs: number;
  /** How far a puffer's ruff swells and shrinks each way as it breathes, as a share of its size. */
  readonly pufferBreath: number;
  /** How long a wisp's sway takes to turn a radian. */
  readonly wispSwayRadianMs: number;
  /** How far a wisp's seed-head sways each way, in radians. */
  readonly wispSway: number;
  /** How long the frizzball's static stands before it crackles a step round. */
  readonly staticStepMs: number;
  /** How far round each step turns it, in radians. */
  readonly staticStep: number;
  /** How many steps round it crackles before it starts again. */
  readonly staticSteps: number;
  /** How long the hint's two fuzzballs look at each other. */
  readonly hintLookMs: number;
  /** How long each of their hops takes to stretch them up. */
  readonly hintUpMs: number;
  /** How tall each hop stretches them, as a scale. */
  readonly hintStretch: number;
  /** How narrow, as a scale. */
  readonly hintNarrow: number;
  /** How long each takes to spring back. */
  readonly hintDownMs: number;
  /** How far apart their hops start. */
  readonly hintHopGapMs: number;
  /** How long the hand takes to show a level's first move once, which it shows again and again until the move is made. */
  readonly handLoopMs: number;
  /** How far through its loop it starts to show on the first fuzzball, shrinking from `handScale` to its size. */
  readonly handShowsFrom: number;
  /** How far through its loop, wholly shown, it starts to slide to the second. */
  readonly handSlidesFrom: number;
  /** How far through its loop it reaches the second. */
  readonly handSlidesTo: number;
  /** How far through its loop it starts to fade away, growing to `handScale`. */
  readonly handGoesFrom: number;
  /** How big it is as it shows and as it goes, as a scale. */
  readonly handScale: number;
  /** How opaque it is once wholly shown, 1 for not at all see-through. */
  readonly handOpacity: number;

  // The numbers the sound script plays a bunch's chord by.

  /** How long after the one before each note of a bunch's chord plays. */
  readonly chordGapMs: number;
  /** How loud the chord's second note plays, as a share of its first. */
  readonly chordSecondVolume: number;
  /** How loud the chord's third note plays, as a share of its first. */
  readonly chordThirdVolume: number;
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
  lowMovesLeft: 5,
  swipeSquares: 0.4,
  fastPace: 1.6,
  hurriedPace: 4,
  chordRungs: 2,
  chordSecondFrom: 4,
  chordThirdFrom: 5,
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
  putDownMs: 160,
  setOffWaitMs: 30,
  refusedWobble: 0.5,
  refusedCrossMs: 380,
  wobbleSquares: 0.07,
  wobbleRadianMs: 18,
  huddleScale: 0.93,
  bunchGapMs: 50,
  hopFadeLength: 0.75,
  tuftPower: 1,
  mostWaveTufts: 6,
  tuftPowerPerWave: 0.06,
  hopRingSquares: 0.75,
  hopRingMs: 220,
  runInScale: 0.5,
  runInFadeFrom: 0.5,
  runInTufts: 3,
  madeLeadMs: 20,
  madeFurDownMs: 260,
  madeWhiteRingSquares: 1.5,
  madeWhiteRingMs: 380,
  madeInkRingSquares: 1,
  madeInkRingAfterMs: 60,
  madeInkRingMs: 320,
  madeTuftPower: 1.4,
  madeStareMs: 560,
  frizzballMadeDim: 0.4,
  frizzballMadeDimWaitMs: 200,
  frizzballMadeDimMs: 500,
  frizzballMadeLook: 0.9,
  frizzballMadeStareMs: 620,
  fallAfterHop: 0.6,
  fallAfterMadeMs: 180,
  markAboveSquares: 0.5,
  markMs: 620,
  markRiseSquares: 0.5,
  fallLook: 0.8,
  fallNarrow: 0.1,
  fallStretchGrowth: 1.4,
  landWiden: 0.16,
  landBlinkAfterMs: 20,
  blinkMs: 110,
  restWithoutFallMs: 150,
  blastAfterMs: 20,
  struckAfterBunchMs: 40,
  struckLookMs: 40,
  streaksAfterMs: 40,
  streakRunOnSquares: 4,
  dasherStretchScale: 2.4,
  dasherNarrowScale: 0.5,
  dasherGoneMs: 170,
  crossRingSquares: 2.2,
  crossRingMs: 360,
  pufferReachSquares: 2.6,
  twoPuffersReachSquares: 4.6,
  pufferLeanBackMs: 200,
  pufferBurstScale: 2.4,
  pufferBurstMs: 160,
  pufferRingSpreadMs: 340,
  pufferInkRing: 0.7,
  pufferInkRingAfterMs: 50,
  twoPuffersTufts: 44,
  pufferTuftPower: 2,
  twoPuffersTuftPower: 2.8,
  pufferFlashReach: 0.8,
  pufferPush: 0.12,
  pufferPushReach: 1.6,
  pufferPushMs: 70,
  pufferPushBackMs: 260,
  wispBendSquares: 1.6,
  curveArc: 0.5,
  curveRiseSquares: 0.35,
  wispTufts: 8,
  wispRingSquares: 0.9,
  ringMs: 280,
  frizzballDim: 0.34,
  frizzballSwellScale: 1.25,
  frizzballSwellMs: 200,
  boltMs: 200,
  frizzedLiftMs: 90,
  givenFurMs: 220,
  frizzballUndimMs: 260,
  frizzballBurstScale: 2,
  frizzballBurstMs: 180,
  frizzballTufts: 20,
  frizzballTuftPower: 2,
  frizzballRingSquares: 3.4,
  frizzballRingMs: 420,
  frizzballFlashSquares: 1.6,
  frizzballPairAfterMs: 200,
  frizzballPairStepMs: 90,
  twoFrizzballsStrikeAfterMs: 260,
  twoFrizzballsStepMs: 26,
  twoFrizzballsDim: 0.5,
  twoFrizzballsDimWaitMs: 200,
  twoFrizzballsDimMs: 700,
  twoFrizzballsRing: 1.2,
  twoFrizzballsRingAfterMs: 200,
  twoFrizzballsRingMs: 620,
  twoFrizzballsSparkRingAfterMs: 260,
  pairRingSquares: 1.1,
  pairTufts: 10,
  pairTuftPower: 1.2,
  flightAfterMs: 40,
  flightsInTurn: 6,
  flightScale: 0.9,
  flightLift: 0.4,
  flightShrink: 0.45,
  flightBendSpread: 2.4,
  unflownCountMs: 200,
  cheerAfterMs: 90,
  cheerSquareGapMs: 22,
  cheerStretch: 0.07,
  cheerNarrow: 0.04,
  cheerUpMs: 90,
  cheerDownMs: 220,
  cheerHappyMs: 420,
  dustPuffMs: 320,
  ruffledWobble: 0.6,
  ruffledMs: 300,
  bedAfterMs: 20,
  bedMs: 520,
  bedSinkSquares: 1.3,
  bedScale: 0.8,
  bedGapMs: 300,
  hopShedLeadMs: 70,
  burrInBunchTufts: 6,
  burrOffTufts: 7,
  burrOffHappyMs: 400,
  burrSpreadMs: 240,
  burrSpreadBendSquares: 0.5,
  burrSpreadScale: 0.5,
  burrLandScale: 0.86,
  burrLandSquashMs: 80,
  burrLandBackMs: 220,
  burrSpreadHoldMs: 320,
  shuffleShrink: 0.7,
  shuffleShrinkMs: 140,
  shuffleMoveAfterMs: 60,
  shuffleMoveMs: 380,
  shuffleGrowAfterMs: 380,
  shuffleGrowMs: 260,
  shuffleMs: 700,
  winSoundAfterMs: 150,
  encoreAfterMs: 900,
  encoreFurMs: 200,
  encoreGlow: 0.8,
  encoreGlowMs: 220,
  encoreSpareMs: 230,
  clearedCardAfterMs: 200,
  starsAfterMs: 200,
  starGapMs: 340,
  loseSoundAfterMs: 100,
  overCardAfterMs: 500,
  laterBunchVolume: 0.7,
  bubbleAfterMs: 50,
  bubbleVolume: 0.8,
  madeSoundAfterMs: 60,
  mostStruckBubbles: 14,
  struckBubbleRungs: 6,
  struckBubbleVolume: 0.6,
  landVolume: 0.7,
  landVolumePerSquare: 0.06,
  dashVolume: 0.9,
  twoFrizzballsCrackleAfterMs: 200,
  twoFrizzballsBoomAfterMs: 240,
  twoFrizzballsBoomVolume: 0.7,
  mostZaps: 18,
  crackleLeadMs: 20,
  tuftLifeMs: 420,
  tuftLifeSpreadMs: 380,
  pufferBreathRadianMs: 380,
  pufferBreath: 0.045,
  wispSwayRadianMs: 420,
  wispSway: 0.07,
  staticStepMs: 110,
  staticStep: 0.52,
  staticSteps: 6,
  hintLookMs: 900,
  hintUpMs: 90,
  hintStretch: 1.16,
  hintNarrow: 0.9,
  hintDownMs: 170,
  hintHopGapMs: 260,
  handLoopMs: 1500,
  handShowsFrom: 0.15,
  handSlidesFrom: 0.25,
  handSlidesTo: 0.6,
  handGoesFrom: 0.75,
  handScale: 1.15,
  handOpacity: 0.9,
  chordGapMs: 22,
  chordSecondVolume: 0.6,
  chordThirdVolume: 0.5,
};
