// The numbers the rules read, from the design's "The feel, in numbers", in
// one file, so tuning one touches nothing else: lengths in field units, a
// unit a brick's side. The field's own and the aims, which both wall games
// share, are @fz/brick-wall/rules/field's and @fz/brick-wall/rules/aims', and
// the view keeps its own speeds and durations. The numbers the debug menu
// may retune are FlightRules' alone, which a rule is handed, and this module
// writes them only into FLIGHT_RULES, for the code that hands the rules
// theirs to import, and never a rule.

import type { MultiplierTier } from "@fz/core/math";

/** The hits a strike takes off a brick, a hot shot's aside. */
export const STRIKE_HITS = 1;

/** How wide a portal's eye is: the middle half of its cell, its edges a fuzzball's radius in from the cell's. */
export const EYE = 0.5;

/** How many hits a moss brick grows back after each round it survives, up to what it began with. */
export const MOSS_REGROWS = 1;

/**
 * How far a 45° face's line, x + y = c or x − y = c, stands off from the
 * line of its brick's own corner or long side, in c: `RADIUS` times the
 * square root of 2, written out, so the fuzzball's middle meets it a radius
 * out and no rule takes a square root.
 */
export const STAND_OFF = 0.3535533905932738;

/** The rallies at which a flight's playback quickens and the fuzzball's fur lifts: its 10th, 25th and 45th strikes. */
export const RALLY_MARKS = [10, 25, 45] as const;

/** Every count of `RALLY_MARKS` a flight's rally may have reached, from none to all three. */
export const MARK_COUNTS = [0, 1, 2, 3] as const satisfies readonly number[];

/** How many of `RALLY_MARKS` a flight's rally has reached. */
export type MarksReached = (typeof MARK_COUNTS)[number];

/**
 * Returns how many of `RALLY_MARKS` a flight's rally has reached: none to
 * a rally of 9, then one more at each of 10, 25 and 45, where the
 * fuzzball's fur lifts and the rally's number takes its next look.
 */
export function marksReached(rally: number): MarksReached {
  const [first, second, third] = RALLY_MARKS;
  if (rally >= third) return 3;
  if (rally >= second) return 2;
  return rally >= first ? 1 : 0;
}

/** The points a strike scores, before the rally's step. */
export const STRIKE_POINTS = 10;

/**
 * The rally's step: how many times a strike scores, from the strike of its
 * flight each step starts at, the highest first, as `@fz/core/math`'s
 * `multiplierAt()` reads them.
 */
export const RALLY_STEPS = [
  { from: 45, times: 5 },
  { from: 25, times: 4 },
  { from: 10, times: 3 },
  { from: 5, times: 2 },
] as const satisfies readonly MultiplierTier[];

/** The points each floor bounce a flight earns scores, a spring brick's among them and a hot shot's not. */
export const BOUNCE_POINTS = 100;

/** The points a jump of the wall scores. */
export const JUMP_POINTS = 100;

/** The points each star scores. */
export const STAR_POINTS = 200;

/** Par for a depth: its certificate's rounds times this, rounded up. */
export const PAR_SHARE = 1.5;

/** Holds the rules' numbers the debug menu may retune, which every rule is handed rather than reads. */
export interface FlightRules {
  /** How far a fuzzball flies without a strike before it yawns, at exactly this far, and drops home. */
  readonly bored: number;
  /** The farthest a flight flies before the guard brings it home: a guard no flight should meet. */
  readonly longest: number;
  /** How many turns running, with no flight between them, bring a fuzzball home: a guard no flight should meet. */
  readonly stillTurns: number;
  /** The rally a flight's first floor bounce is earned at, a whole number of strikes. */
  readonly firstBounce: number;
  /** How many strikes more each further floor bounce costs than the one before it did, a whole number, so every bounce comes at a rally. */
  readonly bounceStep: number;
  /** The most floor bounces a fuzzball holds: one earned while it holds them all is lost. */
  readonly mostBounces: number;
  /** The hits a hot shot's strike takes off a brick. */
  readonly hotHits: number;
  /** The floor bounces a hot shot leaves with, which score nothing. */
  readonly hotBounces: number;
  /** How many times the hatches hold a flight up between them before every one opens. */
  readonly hatchHolds: number;
  /** How many turns of a flight slide a bolt back on every lock in the field. */
  readonly boltTurns: number;
  /** How many turns of a shot the guide follows it to, where the player's setting doesn't ask for the first or the fifth. The scene's pools hold a guide of five turns at most. */
  readonly guideTurns: number;
  /** How far the guide runs on past its last turn. The scene's pools hold a guide of five turns at most and 1.5 units past them. */
  readonly guidePast: number;
}

/** The rules' numbers as the design sets them, untuned. */
export const FLIGHT_RULES: FlightRules = {
  bored: 60,
  longest: 4000,
  stillTurns: 8,
  firstBounce: 10,
  bounceStep: 5,
  mostBounces: 3,
  hotHits: 2,
  hotBounces: 1,
  hatchHolds: 3,
  boltTurns: 4,
  guideTurns: 3,
  guidePast: 1.5,
};

/**
 * Returns the rally at which a flight earns its `bounce`th floor bounce of
 * the ladder, counting from 1: the first at `firstBounce`, each next one
 * `bounceStep` dearer than the gap before it, so 10, 25, 45, 70, 100, 135
 * and on, whether or not the fuzzball has room to hold it.
 */
export function bounceRally(
  bounce: number,
  { firstBounce, bounceStep }: Pick<FlightRules, "firstBounce" | "bounceStep">,
): number {
  // The gaps are firstBounce, then a step more each: bounce of them in all,
  // the steps adding up to bounceStep times 0 + 1 + … + (bounce − 1).
  return bounce * firstBounce + (bounceStep * bounce * (bounce - 1)) / 2;
}

/** Describes the rungs of the floor bounce ladder a rally stands between. */
export interface BounceRungs {
  /** The rally the last floor bounce came at, or 0 before the first. */
  readonly from: number;
  /** The rally the next floor bounce comes at. */
  readonly at: number;
}

/**
 * Returns the rungs of the floor bounce ladder a rally stands between: the
 * rally the last floor bounce came at, and the one the next comes at, so a
 * rally of 10 stands between 10 and 25. `firstBounce` must be 1 at least.
 */
export function bounceRungs(
  rally: number,
  rules: Pick<FlightRules, "firstBounce" | "bounceStep">,
): BounceRungs {
  let from = 0;
  let bounce = 1;
  let at = bounceRally(bounce, rules);
  while (at <= rally) {
    from = at;
    bounce++;
    at = bounceRally(bounce, rules);
  }
  return { from, at };
}
