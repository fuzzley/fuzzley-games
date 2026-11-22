// The numbers the debug menu tunes in play, which a development build
// offers, and a production one at `?debug`: the ship's flight, its
// gunnery, the rocks' speed, how far sparks are drawn in, how fast static
// drains and how far a zap reaches, and how fast a burr flies and how much
// one clinging slows the ship, each starting at `tuning.ts`'s and written
// back as its lines, so a feel found by playing is pasted straight in.

import { isFiniteNumber, isRecord } from "@fz/core/json";
import { keysOf, pick } from "@fz/core/records";
import { ROCK_SIZES } from "../rules/catalog/rocks";
import type { Field } from "../rules/field/field";
import { TUNED_BURRING } from "../rules/hazards/burrs";
import { tuneRockSpeed } from "../rules/rocks/rocks";
import { type Flight, TUNED_FLIGHT } from "../rules/ship/ship";
import { type Gunnery, TUNED_GUNNERY } from "../rules/ship/shots";
import { TUNED_SPARKING } from "../rules/sparks/charge";
import { ROCK_SPEED } from "../rules/tuning";

/**
 * Describes the numbers the debug menu tunes: how the ship flies, how its
 * shots fly and fire, how fast the rocks fly, three of how sparks, static
 * and the zap work, and two of how burrs fly and cling.
 */
export interface Feel extends Flight, Gunnery {
  /** How fast the rocks fly against their size's speed in `tuning.ts`. */
  readonly rockSpeed: number;
  /**
   * How near the ship it draws a spark in from, before the speed's reach,
   * and never nearer than a pickup's or a Magnet's: the sparking's `reach`.
   */
  readonly sparkDrawReach: number;
  /** How fast static drains once it no longer holds, in a second: the sparking's `drain`. */
  readonly staticDrain: number;
  /** How near a dash's path a rock lies for a zap to arc to it: the sparking's `zapReach`. */
  readonly zapReach: number;
  /** How fast a burr flies, in units a second: the burring's `speed`. */
  readonly burrSpeed: number;
  /** How much of the ship's thrust and top speed each burr clinging takes: the burring's `slow`. */
  readonly burrSlow: number;
}

/** The numbers `tuning.ts` gives, which the debug menu starts from and goes back to. */
export const TUNED: Feel = {
  ...TUNED_FLIGHT,
  ...TUNED_GUNNERY,
  rockSpeed: 1,
  sparkDrawReach: TUNED_SPARKING.reach,
  staticDrain: TUNED_SPARKING.drain,
  zapReach: TUNED_SPARKING.zapReach,
  burrSpeed: TUNED_BURRING.speed,
  burrSlow: TUNED_BURRING.slow,
};

/** Names a number the debug menu tunes by a slider: all but whether shots carry the ship's speed. */
export type TuningNumber = Exclude<keyof Feel, "carryShip">;

/**
 * Describes a slider of the debug menu: the number it tunes, its name and
 * its range.
 *
 * It is the shape of `@fz/game-ui/debug_menu`'s `TuningSlider`, which the
 * view can't import, as it takes no library of the shell.
 */
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
  {
    id: "sparkDrawReach",
    name: "Sparks drawn in from",
    least: 3,
    most: 15,
    step: 0.5,
  },
  { id: "staticDrain", name: "Static drains", least: 0, most: 10, step: 0.5 },
  { id: "zapReach", name: "Zap's reach", least: 1, most: 15, step: 0.5 },
  { id: "burrSpeed", name: "Burrs' speed", least: 1, most: 8, step: 0.25 },
  {
    id: "burrSlow",
    name: "Each burr clinging slows the pod by",
    least: 0,
    most: 0.3,
    step: 0.05,
  },
];

/** Returns a tuned number in its unit, as the debug menu writes it: "24 u/s²", "1.5 s", "×1.25", "5 u", "20%". */
export function formatTuning(id: TuningNumber, value: number): string {
  switch (id) {
    case "thrust":
      return `${numberOf(value)} u/s²`;
    case "topSpeed":
    case "shotSpeed":
    case "burrSpeed":
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
    case "sparkDrawReach":
    case "zapReach":
      return `${numberOf(value)} u`;
    case "staticDrain":
      return `${numberOf(value)}/s`;
    case "burrSlow":
      return `${numberOf(value * 100)}%`;
  }
}

/**
 * Returns the lines of `tuning.ts` a tuning would replace, each as it is
 * written there, the rocks' speed as each size's speed scaled, to four
 * places, as a speed of two scaled by a step of the slider comes to.
 */
export function tuningLines(tuning: Feel): string {
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
    `export const STATIC_DRAIN = ${numberOf(tuning.staticDrain)};`,
    `export const SPARK_DRAW_REACH = ${numberOf(tuning.sparkDrawReach)};`,
    `export const ZAP_REACH = ${numberOf(tuning.zapReach)};`,
    `export const BURR_SPEED = ${numberOf(tuning.burrSpeed)};`,
    `export const BURR_SLOW = ${numberOf(tuning.burrSlow)};`,
  ].join("\n");
}

/**
 * Returns the debug menu's numbers as a field holds them, which a new
 * wave's setup hands it, the sparking's and the burring's other numbers
 * `tuning.ts`'s.
 */
export function fieldTuning(
  tuning: Feel,
): Pick<Field, "flight" | "gunnery" | "sparking" | "burring" | "rockSpeed"> {
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
    sparkDrawReach,
    staticDrain,
    zapReach,
    burrSpeed,
    burrSlow,
  } = tuning;
  return {
    flight: { thrust, topSpeed, coastHalfLifeMs, keyTurnRate, headingTurnRate },
    gunnery: { shotSpeed, gunEveryMs, carryShip },
    sparking: {
      ...TUNED_SPARKING,
      reach: sparkDrawReach,
      drain: staticDrain,
      zapReach,
    },
    burring: { ...TUNED_BURRING, speed: burrSpeed, slow: burrSlow },
    rockSpeed,
  };
}

/** Tunes the field in play as the debug menu says, its rocks in flight and its ship among it, at once. */
export function tuneField(field: Field, tuning: Feel): void {
  const { flight, gunnery, sparking, burring, rockSpeed } = fieldTuning(tuning);
  field.flight = flight;
  field.gunnery = gunnery;
  field.sparking = sparking;
  field.burring = burring;
  tuneRockSpeed(field, rockSpeed);
}

/**
 * Returns the numbers that set the feel as JSON carried them, such as a
 * bug report's, each of the kind `tuning.ts`'s is, or null where one isn't.
 */
export function readFeel(value: unknown): Feel | null {
  return isFeel(value) ? pick(value, keysOf(TUNED)) : null;
}

/** Returns whether a value read holds each number that sets the feel, of its kind. */
function isFeel(value: unknown): value is Feel {
  return (
    isRecord(value) &&
    keysOf(TUNED).every((id) => {
      const tuned = value[id];
      return typeof TUNED[id] === "boolean"
        ? typeof tuned === "boolean"
        : isFiniteNumber(tuned);
    })
  );
}

/** Returns a number as `tuning.ts` writes it, to so many places at most, two unless given, as a slider's steps leave it. */
function numberOf(value: number, places = 2): string {
  const scale = 10 ** places;
  return String(Math.round(value * scale) / scale);
}
