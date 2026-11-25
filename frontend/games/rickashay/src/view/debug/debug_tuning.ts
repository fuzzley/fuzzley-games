// The numbers the debug menu tunes in play, which a development build
// offers, and a production one at `?debug`: how fast a flight plays back
// at each setting and from each of its rally's marks, its dash home and
// fast-forward; how far the guide runs past its last turn; and the rules'
// boredom, floor bounce ladder and hatches. Each starts at the game's own
// and is written back as the lines it would replace, so a number found by
// playing is pasted straight in.

import { count } from "@fz/core/format";
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

/**
 * Describes a slider of the debug menu: the number it tunes, its name and
 * its range.
 *
 * It is the shape of `@fz/game-ui/debug_menu`'s `TuningSlider`, which the
 * view can't import, as it takes no library of the shell.
 */
export interface TuningSlider {
  readonly id: TunedNumber;
  readonly name: string;
  readonly least: number;
  readonly most: number;
  readonly step: number;
}

/** Returns a slider of a flight's speed, from 4 to 60 units a second. */
function speedSlider(id: TunedNumber, name: string): TuningSlider {
  return { id, name, least: 4, most: 60, step: 1 };
}

/**
 * The debug menu's sliders, in the order it shows them. The guide runs
 * 1.5 units past its last turn at most, as far as the scene's pools draw
 * it; a floor bounce comes at a rally of 1 at least.
 */
export const TUNING_SLIDERS: readonly TuningSlider[] = [
  speedSlider("normal", "Normal speed"),
  speedSlider("normal10", "Normal from the 10th strike"),
  speedSlider("normal25", "Normal from the 25th strike"),
  speedSlider("normal45", "Normal from the 45th strike"),
  speedSlider("fast", "Fast speed"),
  speedSlider("fast10", "Fast from the 10th strike"),
  speedSlider("fast25", "Fast from the 25th strike"),
  speedSlider("fast45", "Fast from the 45th strike"),
  { id: "dash", name: "Dash to the floor", least: 1, most: 6, step: 0.5 },
  { id: "fastForward", name: "Fast-forward", least: 1, most: 10, step: 0.5 },
  {
    id: "guidePast",
    name: "Guide past its last turn",
    least: 0,
    most: 1.5,
    step: 0.1,
  },
  { id: "bored", name: "Bored after", least: 10, most: 300, step: 5 },
  {
    id: "firstBounce",
    name: "First floor bounce",
    least: 1,
    most: 30,
    step: 1,
  },
  {
    id: "bounceStep",
    name: "Floor bounce step",
    least: 0,
    most: 20,
    step: 1,
  },
  { id: "hatchHolds", name: "Hatch holds", least: 0, most: 10, step: 1 },
];

/**
 * Returns a tuned number in its unit, as the debug menu writes it: "14
 * u/s", "×4", "1.5 units", "rally 10", "+5", "3 holds".
 */
export function formatTuning(id: TunedNumber, value: number): string {
  switch (id) {
    case "normal":
    case "normal10":
    case "normal25":
    case "normal45":
    case "fast":
    case "fast10":
    case "fast25":
    case "fast45":
      return `${numberOf(value)} u/s`;
    case "dash":
    case "fastForward":
      return `×${numberOf(value)}`;
    case "guidePast":
    case "bored":
      return `${numberOf(value)} units`;
    case "firstBounce":
      return `rally ${numberOf(value)}`;
    case "bounceStep":
      return `+${numberOf(value)}`;
    case "hatchHolds":
      return count(value, "hold", "holds");
  }
}

/**
 * Returns the lines a tuning would replace, each as its file writes it,
 * under a comment naming the file: `FLIGHT_PACE` in `pace.ts`, then the
 * numbers of `FLIGHT_RULES` it tunes in `tuning.ts`.
 */
export function tuningLines(tuned: TunedNumbers): string {
  const speeds = (...each: readonly number[]): string =>
    `[${each.map(numberOf).join(", ")}]`;
  return [
    "// src/view/play/pace.ts, FLIGHT_PACE",
    `  speeds: { normal: ${speeds(tuned.normal, tuned.normal10, tuned.normal25, tuned.normal45)}, fast: ${speeds(tuned.fast, tuned.fast10, tuned.fast25, tuned.fast45)} },`,
    `  dash: ${numberOf(tuned.dash)},`,
    `  fastForward: ${numberOf(tuned.fastForward)},`,
    "// src/rules/tuning.ts, FLIGHT_RULES",
    `  bored: ${numberOf(tuned.bored)},`,
    `  firstBounce: ${numberOf(tuned.firstBounce)},`,
    `  bounceStep: ${numberOf(tuned.bounceStep)},`,
    `  hatchHolds: ${numberOf(tuned.hatchHolds)},`,
    `  guidePast: ${numberOf(tuned.guidePast)},`,
  ].join("\n");
}

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

/** Returns a number as its file writes it, to two places at most, as a slider's steps leave it. */
function numberOf(value: number): string {
  return String(Math.round(value * 100) / 100);
}
