// The numbers the debug menu tunes in play, which a development build
// offers, and a production one at `?debug`: the ship's flight, its gunnery
// and the rocks' speed, each starting at `tuning.ts`'s and written back as
// its lines, so a feel found by playing is pasted straight in.

import { keysOf } from "@fz/core/records";
import { ROCK_SIZES } from "../rules/catalog/rocks";
import type { Field } from "../rules/field";
import { tuneRockSpeed } from "../rules/rocks";
import { type Flight, TUNED_FLIGHT } from "../rules/ship";
import { type Gunnery, TUNED_GUNNERY } from "../rules/shots";
import { ROCK_SPEED } from "../rules/tuning";

/** Describes the numbers the debug menu tunes: how the ship flies, how its shots fly and fire, and how fast the rocks fly. */
export interface Tuning extends Flight, Gunnery {
  /** How fast the rocks fly against their size's speed in `tuning.ts`. */
  readonly rockSpeed: number;
}

/** The numbers `tuning.ts` gives, which the debug menu starts from and goes back to. */
export const TUNED: Tuning = {
  ...TUNED_FLIGHT,
  ...TUNED_GUNNERY,
  rockSpeed: 1,
};

/** Returns whether numbers differ from `tuning.ts`'s, as the debug menu has tuned them. */
export function isRetuned(tuning: Tuning): boolean {
  return keysOf(TUNED).some((key) => tuning[key] !== TUNED[key]);
}

/** Names a number the debug menu tunes by a slider: all but whether shots carry the ship's speed. */
export type TuningNumber = Exclude<keyof Tuning, "carryShip">;

/** Describes a slider of the debug menu: the number it tunes, its name and its range. */
export interface TuningSlider {
  readonly id: TuningNumber;
  readonly name: string;
  readonly least: number;
  readonly most: number;
  readonly step: number;
}

/** The debug menu's sliders, in the order it shows them. */
export const TUNING_SLIDERS: readonly TuningSlider[] = [
  { id: "thrust", name: "Thrust", least: 8, most: 60, step: 1 },
  { id: "topSpeed", name: "Top speed", least: 6, most: 30, step: 0.5 },
  {
    id: "coastHalfLifeMs",
    name: "Coasting: speed halves every",
    least: 300,
    most: 6000,
    step: 100,
  },
  {
    id: "keyTurnRate",
    name: "Turning by keys",
    least: 120,
    most: 600,
    step: 10,
  },
  {
    id: "headingTurnRate",
    name: "Turning toward a heading",
    least: 180,
    most: 1440,
    step: 20,
  },
  { id: "shotSpeed", name: "Shot speed", least: 16, most: 60, step: 1 },
  { id: "gunEveryMs", name: "A shot every", least: 60, most: 400, step: 5 },
  { id: "rockSpeed", name: "Rocks' speed", least: 0.5, most: 2, step: 0.05 },
];

/** Returns a tuned number in its unit, as the debug menu writes it: "24 u/s²", "1.5 s", "×1.25". */
export function formatTuning(id: TuningNumber, value: number): string {
  switch (id) {
    case "thrust":
      return `${numberOf(value)} u/s²`;
    case "topSpeed":
    case "shotSpeed":
      return `${numberOf(value)} u/s`;
    case "coastHalfLifeMs":
      return `${numberOf(value / 1000)} s`;
    case "keyTurnRate":
    case "headingTurnRate":
      return `${numberOf(value)}°/s`;
    case "gunEveryMs":
      return `${numberOf(value)} ms`;
    case "rockSpeed":
      return `×${value.toFixed(2)}`;
  }
}

/**
 * Returns the lines of `tuning.ts` a tuning would replace, each as it is
 * written there, the rocks' speed as each size's speed scaled, to four
 * places, as a speed of two scaled by a step of the slider comes to.
 */
export function tuningLines(tuning: Tuning): string {
  const scaled = (value: number): string =>
    numberOf(value * tuning.rockSpeed, 4);
  return [
    `export const THRUST = ${numberOf(tuning.thrust)};`,
    `export const TOP_SPEED = ${numberOf(tuning.topSpeed)};`,
    `export const COAST_HALF_LIFE_MS = ${numberOf(tuning.coastHalfLifeMs)};`,
    `export const KEY_TURN_RATE = ${numberOf(tuning.keyTurnRate)};`,
    `export const HEADING_TURN_RATE = ${numberOf(tuning.headingTurnRate)};`,
    `export const SHOT_SPEED = ${numberOf(tuning.shotSpeed)};`,
    `export const SHOTS_CARRY_SHIP = ${String(tuning.carryShip)};`,
    `export const SHOT_EVERY_MS = ${numberOf(tuning.gunEveryMs)};`,
    "export const ROCK_SPEED: Readonly<Record<RockSize, Span>> = {",
    ...ROCK_SIZES.map((size) => {
      const { least, most } = ROCK_SPEED[size];
      return `  ${size}: { least: ${scaled(least)}, most: ${scaled(most)} },`;
    }),
    "};",
  ].join("\n");
}

/** Returns the debug menu's numbers as a field holds them, which a new wave's setup hands it. */
export function fieldTuning(
  tuning: Tuning,
): Pick<Field, "flight" | "gunnery" | "rockSpeed"> {
  const {
    thrust,
    topSpeed,
    coastHalfLifeMs,
    keyTurnRate,
    headingTurnRate,
    shotSpeed,
    gunEveryMs,
    carryShip,
    rockSpeed,
  } = tuning;
  return {
    flight: { thrust, topSpeed, coastHalfLifeMs, keyTurnRate, headingTurnRate },
    gunnery: { shotSpeed, gunEveryMs, carryShip },
    rockSpeed,
  };
}

/** Tunes the field in play as the debug menu says, its rocks in flight and its ship among it, at once. */
export function tuneField(field: Field, tuning: Tuning): void {
  const { flight, gunnery, rockSpeed } = fieldTuning(tuning);
  field.flight = flight;
  field.gunnery = gunnery;
  tuneRockSpeed(field, rockSpeed);
}

/** Returns a number as `tuning.ts` writes it, to so many places at most, two unless given, as a slider's steps leave it. */
function numberOf(value: number, places = 2): string {
  const scale = 10 ** places;
  return String(Math.round(value * scale) / scale);
}
