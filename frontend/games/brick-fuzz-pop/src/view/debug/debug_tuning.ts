// The numbers the debug menu tunes in play, which a development build
// offers, and a production one at `?debug`: how fast a flight plays back,
// how far the guide runs past its first turn and how far a fuzzball flies
// bored, each starting at the game's own and written back as the lines it
// would replace, so a number found by playing is pasted straight in.

import { keysOf } from "@fz/core/records";
import { type RoundRules, RULES } from "../../rules/round/round";
import { GUIDE_PAST_TURN } from "../../rules/tuning";
import { FLIGHT_PACE, type FlightPace } from "../round_play";

/** Describes the numbers the debug menu tunes. */
export interface TunedNumbers {
  /** How far a flight plays back in a second at Normal, in field units. */
  readonly normalPace: number;
  /** How far a flight plays back in a second at Fast, in field units. */
  readonly fastPace: number;
  /** How many times faster a flight plays back while fast-forward is held. */
  readonly fastForward: number;
  /** How long a flight plays before it speeds up by itself, where the settings let it. */
  readonly longFlightMs: number;
  /** How many times faster a long flight plays back once it has. */
  readonly longFlightSpeedUp: number;
  /** How far the guide runs on past the first turn, in field units. */
  readonly guidePastTurn: number;
  /** How far a fuzzball flies without taking a hit off a brick before it yawns, in field units. */
  readonly bored: number;
}

/** Names a number the debug menu tunes. */
export type TunedNumber = keyof TunedNumbers;

/** The numbers the game ships, which the debug menu starts from and goes back to. */
export const TUNED_NUMBERS: TunedNumbers = {
  normalPace: FLIGHT_PACE.unitsPerSecond.normal,
  fastPace: FLIGHT_PACE.unitsPerSecond.fast,
  fastForward: FLIGHT_PACE.fastForward,
  longFlightMs: FLIGHT_PACE.longFlightMs,
  longFlightSpeedUp: FLIGHT_PACE.longFlightSpeedUp,
  guidePastTurn: GUIDE_PAST_TURN,
  bored: RULES.bored,
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

/** The debug menu's sliders, in the order it shows them. */
export const TUNING_SLIDERS: readonly TuningSlider[] = [
  { id: "normalPace", name: "Normal speed", least: 4, most: 40, step: 1 },
  { id: "fastPace", name: "Fast speed", least: 4, most: 60, step: 1 },
  { id: "fastForward", name: "Fast-forward", least: 1, most: 10, step: 0.5 },
  {
    id: "longFlightMs",
    name: "A long flight speeds up after",
    least: 1000,
    most: 20000,
    step: 500,
  },
  {
    id: "longFlightSpeedUp",
    name: "A long flight speeds up by",
    least: 1,
    most: 4,
    step: 0.25,
  },
  {
    id: "guidePastTurn",
    name: "The guide past its first turn",
    least: 0,
    most: 12,
    step: 0.5,
  },
  { id: "bored", name: "Bored after", least: 10, most: 300, step: 5 },
];

/** Returns a tuned number in its unit, as the debug menu writes it: "14 u/s", "×4", "8 s", "1.5 units". */
export function formatTuning(id: TunedNumber, value: number): string {
  switch (id) {
    case "normalPace":
    case "fastPace":
      return `${numberOf(value)} u/s`;
    case "fastForward":
    case "longFlightSpeedUp":
      return `×${numberOf(value)}`;
    case "longFlightMs":
      return `${numberOf(value / 1000)} s`;
    case "guidePastTurn":
    case "bored":
      return `${numberOf(value)} units`;
  }
}

/**
 * Returns the lines a tuning would replace, each as its file writes it,
 * under a comment naming the file: `FLIGHT_PACE` in `round_play.ts`, then
 * `BORED` and `GUIDE_PAST_TURN` in `tuning.ts`.
 */
export function tuningLines(tuned: TunedNumbers): string {
  return [
    "// src/view/round_play.ts",
    "export const FLIGHT_PACE: FlightPace = {",
    `  unitsPerSecond: { normal: ${numberOf(tuned.normalPace)}, fast: ${numberOf(tuned.fastPace)} },`,
    `  fastForward: ${numberOf(tuned.fastForward)},`,
    `  longFlightMs: ${numberOf(tuned.longFlightMs)},`,
    `  longFlightSpeedUp: ${numberOf(tuned.longFlightSpeedUp)},`,
    "};",
    "// src/rules/tuning.ts",
    `export const BORED = ${numberOf(tuned.bored)};`,
    `export const GUIDE_PAST_TURN = ${numberOf(tuned.guidePastTurn)};`,
  ].join("\n");
}

/** Returns how fast a flight plays back at a tuning, as `RoundPlay` is handed it. */
export function paceOf(tuned: TunedNumbers): FlightPace {
  return {
    unitsPerSecond: { normal: tuned.normalPace, fast: tuned.fastPace },
    fastForward: tuned.fastForward,
    longFlightMs: tuned.longFlightMs,
    longFlightSpeedUp: tuned.longFlightSpeedUp,
  };
}

/** Returns the rules' numbers at a tuning, as `playRound()` is handed them. */
export function rulesOf(tuned: TunedNumbers): RoundRules {
  return { bored: tuned.bored };
}

/**
 * Returns whether a tuning has moved a number `playRound()` reads, which
 * every certificate was found on, so they are stale.
 */
export function staleCertificates(tuned: TunedNumbers): boolean {
  const rules = rulesOf(tuned);
  return keysOf(RULES).some((id) => rules[id] !== RULES[id]);
}

/** Returns a number as its file writes it, to two places at most, as a slider's steps leave it. */
function numberOf(value: number): string {
  return String(Math.round(value * 100) / 100);
}
