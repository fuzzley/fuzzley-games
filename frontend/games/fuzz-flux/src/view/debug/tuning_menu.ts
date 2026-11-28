// The debug menu's sliders over the feel, one for each of its numbers, and
// the words it shows them in: each number named in words and shown in its
// unit, and the lines of `FEEL` that the numbers moved off the design's
// would replace, which Copy the numbers copies, so what is settled on at
// the feel gate is pasted straight back in. Only the debug menu's chunk
// loads it.

import { keysOf } from "@fz/core/records";
import { FEEL, type FeelTuning } from "../timeline/feel";
import { SLIDER_NAMES } from "./slider_names";

/**
 * Describes a slider of the debug menu: the number it tunes, its name and
 * its range.
 *
 * It is the shape of `@fz/game-ui/debug_menu`'s `TuningSlider`, which the
 * view can't import, as it takes no library of the shell.
 */
export interface TuningSlider {
  readonly id: keyof FeelTuning;
  readonly name: string;
  readonly least: number;
  readonly most: number;
  readonly step: number;
}

/**
 * The endings of the names of the feel's numbers that count whole things,
 * whose sliders step a whole one at a time at the least, as "madeTufts"
 * counts tufts. A count of a new kind of thing adds its plural here.
 */
const COUNT_ENDINGS = [
  "Tufts",
  "Rings",
  "Bits",
  "Lines",
  "Hops",
  "Flights",
  "Rungs",
  "Bubbles",
  "Zaps",
  "Steps",
] as const;

/** The feel's numbers that count whole things though their names don't end as a count's. */
const COUNTED: ReadonlySet<keyof FeelTuning> = new Set([
  "lowMovesLeft",
  "chordSecondFrom",
  "chordThirdFrom",
  "flightsInTurn",
]);

/**
 * The feel's numbers that are a share of a whole, as how far through a time
 * or how loud, whose sliders stop at all of it: past it they mean nothing,
 * and a fade would take less than no time. The hand's four moments through
 * its loop can still be set out of their order.
 */
const SHARES: ReadonlySet<keyof FeelTuning> = new Set([
  "refusedReach",
  "hopFadeFrom",
  "runInFadeFrom",
  "cushionShrink",
  "lessMotionFluff",
  "quickest",
  "frizzballMadeDim",
  "frizzballDim",
  "twoFrizzballsDim",
  "encoreGlow",
  "laterBunchVolume",
  "bubbleVolume",
  "struckBubbleVolume",
  "landVolume",
  "dashVolume",
  "twoFrizzballsBoomVolume",
  "handShowsFrom",
  "handSlidesFrom",
  "handSlidesTo",
  "handGoesFrom",
  "handOpacity",
  "chordSecondVolume",
  "chordThirdVolume",
  "gustLift",
]);

/** How many times the design's number a slider runs to. */
const MOST_TIMES = 3;

/** How many steps a slider takes over its range at the least, but a count's, which steps whole things. */
const LEAST_STEPS = 100;

/** The units of the feel's numbers, by the ending of their names, as the debug menu writes them. */
const UNITS = [
  ["Ms", "ms"],
  ["Px", "px"],
  ["Squares", "squares"],
] as const;

/** The comment that opens the lines Copy the numbers writes, naming their file and record. */
const LINES_FROM = "// src/view/timeline/feel.ts, FEEL";

/**
 * The debug menu's sliders, one for each number of the feel, in `FEEL`'s
 * order, each named in words (`SLIDER_NAMES`). Each runs from one step,
 * never 0, since some numbers divide, to three times the design's number,
 * or all of a share.
 */
export const TUNING_SLIDERS: readonly TuningSlider[] = keysOf(FEEL).map(
  (id) => {
    const step = stepOf(id);
    return {
      id,
      name: SLIDER_NAMES[id],
      least: step,
      most: mostOf(id, step),
      step,
    };
  },
);

/** Returns a number of the feel in its unit, as the debug menu writes it beside its slider: "120 ms", "2.5 px", "0.4 squares", "1.14". */
export function formatTuning(id: keyof FeelTuning, value: number): string {
  const written = writtenOf(id, value);
  const unit = UNITS.find(([ending]) => id.endsWith(ending));
  return unit === undefined ? written : `${written} ${unit[1]}`;
}

/**
 * Returns the lines of `FEEL` a tuning would replace, under a comment
 * naming the file: each number its slider writes otherwise than the
 * design's, by its id and as the file writes it, in its order, or a line
 * saying none has moved.
 */
export function tuningLines(tuned: FeelTuning): string {
  const moved = keysOf(FEEL).filter(
    (id) => writtenOf(id, tuned[id]) !== writtenOf(id, FEEL[id]),
  );
  return moved.length === 0
    ? `${LINES_FROM}: no number moved off the design's`
    : [
        LINES_FROM,
        ...moved.map((id) => `  ${id}: ${writtenOf(id, tuned[id])},`),
      ].join("\n");
}

/** Returns the top of a number's slider: three times the design's number, but all of a share at the most. */
function mostOf(id: keyof FeelTuning, step: number): number {
  const most = roundedTo(MOST_TIMES * FEEL[id], step);
  return SHARES.has(id) ? Math.min(1, most) : most;
}

/** Returns the step of a number's slider: the power of ten that crosses its range in a hundred steps or more, and a whole one at the least for a count. */
function stepOf(id: keyof FeelTuning): number {
  const step =
    10 ** Math.floor(Math.log10((MOST_TIMES * FEEL[id]) / LEAST_STEPS));
  return countsWhole(id) ? Math.max(1, step) : step;
}

/** Returns whether a number of the feel counts whole things. */
function countsWhole(id: keyof FeelTuning): boolean {
  return COUNTED.has(id) || COUNT_ENDINGS.some((ending) => id.endsWith(ending));
}

/** Returns a number of the feel as the debug menu writes it, to its slider's step. */
function writtenOf(id: keyof FeelTuning, value: number): string {
  return String(roundedTo(value, stepOf(id)));
}

/** Returns a number rounded to as many places as a step, a power of ten, has. */
function roundedTo(value: number, step: number): number {
  return Number(value.toFixed(Math.max(0, -Math.log10(step))));
}
