// The numbers the rules read, in one file, so tuning them touches nothing
// else: lengths in field units, a unit a brick's side. A number the kinds of
// brick differ by, such as a bumper's radius, a prism's angle or an X
// zapper's reach, is the kind's catalog entry's, and the view keeps its own
// durations and speeds. The debug menu retunes only what RoundRules hands
// the rules, never this module. tools/build-aims.mjs loads it in Node as it
// is, its types stripped, so it keeps to syntax Node can strip, such as no
// enum, and imports only types.

import type { MultiplierTier } from "@fz/core/math";

/** How many cells a row of the field holds. */
export const COLUMNS = 9;

/** The fewest rows a field holds, the floor's among them. */
export const LEAST_DEPTH = 11;

/** The most rows a field holds, the floor's among them. */
export const MOST_DEPTH = 22;

/** A fuzzball's radius, so it fits a gap one cell wide. */
export const RADIUS = 0.25;

/** The nearest a waiting fuzzball's middle comes to a side wall. */
export const SIDE_MARGIN = 0.5;

/** Where a level's first shot leaves from: the floor's middle. */
export const FIRST_X = 4.5;

/** The most charge a fuzzball holds, a hot shot's always. */
export const MOST_CHARGE = 5;

/** How many aims there are, a quarter of a degree apart. */
export const AIM_COUNT = 657;

/** The first aim's angle, in degrees counter-clockwise from the floor on the right. */
export const FIRST_AIM_DEGREES = 8;

/** How many aims a degree holds. */
export const AIMS_PER_DEGREE = 4;

/** How far behind one another a round's fuzzballs leave: a triple shot's mates, then the friends. */
export const LAUNCH_GAP = 0.7;

/** How many mates a triple shot sends out behind the player's fuzzball. */
export const TRIPLE_MATES = 2;

/** The most friends a crew holds. */
export const MOST_FRIENDS = 6;

/** How many inks a friend may be freed in, numbered from 0: the fuzzballs' own. */
export const FRIEND_INKS = 8;

/** The most fuzzballs in the air at once; a split that would pass it makes fewer. */
export const MOST_FUZZBALLS = 16;

/**
 * How far a fuzzball flies without taking a hit off a brick before it yawns
 * and drops to the floor: `RULES.bored` unless the debug menu retunes it.
 */
export const BORED = 60;

/** The farthest one fuzzball flies before it comes home, as a bored one does. */
export const MOST_FLIGHT = 600;

/** How many turns running, with no flight between them, bring a fuzzball home. */
export const STILL_TURNS = 8;

/** How many times a hot shot turns off the floor before it lands. */
export const HOT_BOUNCES = 1;

/** The hits a zap or a blast takes off each brick it reaches. */
export const ZAP_HITS = 2;

/** How far the flight goes on between a break and the zap or blast it sets off. */
export const ZAP_DELAY = 0.5;

/** How far the guide runs on past the first turn. */
export const GUIDE_PAST_TURN = 1.5;

/** How close in the flight contacts are met at one moment, as Brick Breaker's are. */
export const AT_ONCE = 1e-9;

/** The points a jump of the wall adds. */
export const JUMP_POINTS = 100;

/**
 * How a round's streak of broken bricks scores: from how many bricks each
 * multiplier starts, the highest first.
 */
export const STREAK = [
  { from: 20, times: 4 },
  { from: 10, times: 3 },
  { from: 5, times: 2 },
] as const satisfies readonly MultiplierTier[];

/** The points each star adds. */
export const STAR_POINTS = 200;

/** How many rounds past par still earn two stars. */
export const TWO_STARS_PAST_PAR = 3;

/** Par for a depth: the certificate's rounds times this, rounded up. */
export const PAR_SHARE = 1.5;
