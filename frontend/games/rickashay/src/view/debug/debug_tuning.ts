// The numbers the debug menu tunes in play, which a development build
// offers, and a production one at `?debug`: how fast a flight plays back
// at each setting and from each of its rally's marks, its dash home and
// fast-forward; how far the guide runs past its last turn; and the rules'
// boredom, floor bounce ladder and hatches. Each starts at the game's own,
// and the game plays at them as tuned. The menu's own sliders and words are
// in `tuning_menu.ts`, which only the menu's chunk loads.

import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";
import { FLIGHT_PACE, type FlightPace, type Speeds } from "../play/pace";

/** Describes the numbers the debug menu tunes. */
export interface TunedNumbers {
  /** How far a flight plays back in a second at Normal from its release, in field units. */
  readonly normal: number;
  /** How far a flight plays back in a second at Normal from its 10th strike, in field units. */
  readonly normal10: number;
  /** How far a flight plays back in a second at Normal from its 25th strike, in field units. */
  readonly normal25: number;
  /** How far a flight plays back in a second at Normal from its 45th strike, in field units. */
  readonly normal45: number;
  /** How far a flight plays back in a second at Fast from its release, in field units. */
  readonly fast: number;
  /** How far a flight plays back in a second at Fast from its 10th strike, in field units. */
  readonly fast10: number;
  /** How far a flight plays back in a second at Fast from its 25th strike, in field units. */
  readonly fast25: number;
  /** How far a flight plays back in a second at Fast from its 45th strike, in field units. */
  readonly fast45: number;
  /** How many times its speed a flight flies from its last strike to the floor. */
  readonly dash: number;
  /** How many times faster a flight plays back while fast-forward is on. */
  readonly fastForward: number;
  /** How far the guide runs on past its last turn, in field units. */
  readonly guidePast: number;
  /** How far a fuzzball flies without a strike before it yawns, in field units. */
  readonly bored: number;
  /** The rally a flight's first floor bounce comes at. */
  readonly firstBounce: number;
  /** How many strikes more each further floor bounce costs than the one before it. */
  readonly bounceStep: number;
  /** How many times the hatches hold a flight up before every one opens. */
  readonly hatchHolds: number;
}

/** Names a number the debug menu tunes. */
export type TunedNumber = keyof TunedNumbers;

/** The numbers of the rules a certificate was found on, which leave it stale as one moves. */
const CERTIFIED_NUMBERS = [
  "bored",
  "firstBounce",
  "bounceStep",
  "hatchHolds",
] as const satisfies readonly (TunedNumber & keyof FlightRules)[];

const [NORMAL, NORMAL_10, NORMAL_25, NORMAL_45] = FLIGHT_PACE.speeds.normal;
const [FAST, FAST_10, FAST_25, FAST_45] = FLIGHT_PACE.speeds.fast;

/** The numbers the game ships, which the debug menu starts from and goes back to. */
export const TUNED_NUMBERS: TunedNumbers = {
  normal: NORMAL,
  normal10: NORMAL_10,
  normal25: NORMAL_25,
  normal45: NORMAL_45,
  fast: FAST,
  fast10: FAST_10,
  fast25: FAST_25,
  fast45: FAST_45,
  dash: FLIGHT_PACE.dash,
  fastForward: FLIGHT_PACE.fastForward,
  guidePast: FLIGHT_RULES.guidePast,
  bored: FLIGHT_RULES.bored,
  firstBounce: FLIGHT_RULES.firstBounce,
  bounceStep: FLIGHT_RULES.bounceStep,
  hatchHolds: FLIGHT_RULES.hatchHolds,
};

/** Returns how fast a flight plays back at a tuning, as the round's play is handed it. */
export function tunedPace(tuned: TunedNumbers): FlightPace {
  const normal: Speeds = [
    tuned.normal,
    tuned.normal10,
    tuned.normal25,
    tuned.normal45,
  ];
  const fast: Speeds = [tuned.fast, tuned.fast10, tuned.fast25, tuned.fast45];
  return {
    speeds: { normal, fast },
    dash: tuned.dash,
    fastForward: tuned.fastForward,
  };
}

/** Returns the rules' numbers at a tuning, as a round and the guide are handed them. */
export function tunedRules(tuned: TunedNumbers): FlightRules {
  return {
    ...FLIGHT_RULES,
    guidePast: tuned.guidePast,
    bored: tuned.bored,
    firstBounce: tuned.firstBounce,
    bounceStep: tuned.bounceStep,
    hatchHolds: tuned.hatchHolds,
  };
}

/**
 * Returns whether a tuning has moved a number `playRound()` reads, which
 * every certificate and rally line was found on, so they are stale: the
 * guide's length and the pace leave them be.
 */
export function staleCertificates(tuned: TunedNumbers): boolean {
  return CERTIFIED_NUMBERS.some((id) => tuned[id] !== FLIGHT_RULES[id]);
}
