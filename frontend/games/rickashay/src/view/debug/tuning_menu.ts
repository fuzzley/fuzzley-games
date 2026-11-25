// The debug menu's sliders over the numbers it tunes, and the words it
// shows them in: each in its unit, and the lines a tuning would replace, so
// a number found by playing is pasted straight in. Kept apart from
// `debug_tuning.ts`, which the game plays by, so only the menu's chunk
// loads them.

import { count } from "@fz/core/format";
import type { TunedNumber, TunedNumbers } from "./debug_tuning";

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

/** Returns a number as its file writes it, to two places at most, as a slider's steps leave it. */
function numberOf(value: number): string {
  return String(Math.round(value * 100) / 100);
}
