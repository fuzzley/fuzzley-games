// The sparks a broken rock sheds, and a burr popped, in slots made once:
// each flies a little way out from where it was shed and hangs there a
// while, until it blinks out or the ship draws it in and the pod, or a
// bubble in tow, gathers it, which scores it and builds static.

import { TURN } from "../angles";
import { rockKind } from "../catalog/rocks";
import { type ScoreField, scoreSpark } from "../field/scoring";
import type { Rock } from "../rocks/rocks";
import type { Pilot } from "../ship/pilots";
import type { TowLink } from "../ship/tow";
import { stepsIn } from "../stepper";
import {
  type Moving,
  type Place,
  type Torus,
  distanceSquared,
  pullToward,
  wrap,
} from "../torus";
import {
  MOST_SPARKS,
  SPARKS_SHED,
  SPARK_BLINK_MS,
  SPARK_FLIGHT,
  SPARK_FLIGHT_MS,
  SPARK_GATHER_REACH,
  SPARK_LIFE_MS,
  SPARK_PULL_SPEED,
  SPARK_STATIC,
  STEP_S,
} from "../tuning";
import { type ChargeField, raiseStatic } from "./charge";

/** Describes a spark a broken rock shed, out on the field until it is gathered or goes. */
export interface Spark extends Moving {
  /** Whether it is on the field; a slot that isn't waits for the next spark shed. */
  live: boolean;
  /** Where it was a step ago, for the scene to draw between, as the ship's is. */
  lastX: number;
  lastY: number;
  /** The way it flies out from the rock that shed it, in units a second, until it hangs. */
  wayX: number;
  wayY: number;
  /** The step it was shed at, from which its flight out, its hang and its blink are timed. */
  shedAt: number;
}

/** Describes what of the field a broken rock sheds its sparks on, which the rocks' rules hand on. */
export interface ShedField {
  /** A slot for each spark that can be out at once, {@link MOST_SPARKS}. */
  readonly sparks: readonly Spark[];
  readonly steps: number;
}

/**
 * Describes what of the field the sparks act on: their slots, the ship that
 * draws them in, how far it draws them from, who gathers them, the points
 * and the static they build, and the field they wrap on.
 */
export interface SparkField extends ShedField, ScoreField, ChargeField {
  readonly setup: {
    /** How far the ship draws sparks in from, against the field's sparking, by the speed. */
    readonly sparkReach: number;
  };
  /** How near the ship a pickup is drawn in to it from, from which a Magnet draws sparks too. */
  readonly pullReach: number;
  /** A link for each of the most that ride in tow, of which the first as many as the crew has in tow ride. */
  readonly tow: readonly Readonly<TowLink>[];
  readonly torus: Torus;
  readonly charge: ChargeField["charge"];
}

/** The share of the way from the least flight out to the most each spark after the first is moved on by. */
const FLIGHT_SHARE_STEP = (Math.sqrt(5) - 1) / 2;

/** Returns the field's spark slots, as many as can be out at once, none out. */
export function createSparks(): Spark[] {
  return Array.from({ length: MOST_SPARKS }, () => ({
    live: false,
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    wayX: 0,
    wayY: 0,
    shedAt: 0,
  }));
}

/** Returns how many sparks a rock sheds as it breaks: its size's, and its kind's more. */
export function sparksShedBy(
  rock: Readonly<Pick<Rock, "kind" | "size">>,
): number {
  let more = 0;
  for (const trait of rockKind(rock.kind).traits) {
    if (trait.kind === "sheds") more += trait.sparks;
  }
  return SPARKS_SHED[rock.size] + more;
}

/**
 * Sheds a broken rock's sparks from its place, spread around it from the way
 * it faces, as {@link shedSparksFrom} sheds them.
 */
export function shedSparks(field: ShedField, rock: Readonly<Rock>): void {
  shedSparksFrom(field, rock, rock.angle, sparksShedBy(rock));
}

/**
 * Sheds sparks from a place, spread evenly around it from a way, each to
 * fly a way of its own out, from the least flight to the most, into a free
 * slot or else the oldest spark's.
 */
export function shedSparksFrom(
  field: ShedField,
  from: Readonly<Place>,
  angle: number,
  count: number,
): void {
  const flightS = stepsIn(SPARK_FLIGHT_MS) * STEP_S;
  const { least, most } = SPARK_FLIGHT;
  for (let n = 0; n < count; n++) {
    const spark = slotFor(field.sparks);
    const heading = angle + (n * TURN) / count;
    const out = least + (most - least) * ((n * FLIGHT_SHARE_STEP) % 1);
    spark.live = true;
    spark.x = from.x;
    spark.y = from.y;
    spark.lastX = from.x;
    spark.lastY = from.y;
    spark.wayX = (Math.cos(heading) * out) / flightS;
    spark.wayY = (Math.sin(heading) * out) / flightS;
    spark.shedAt = field.steps;
  }
}

/**
 * Moves each spark on a step, or lets it go as its time runs out: one
 * within the ship's reach is drawn in toward it, any other flies out, from
 * the step after it was shed for its flight's time, then hangs, and the pod
 * or a bubble in tow gathers one within its reach.
 */
export function stepSparks(field: SparkField): void {
  const { ship, torus } = field;
  const reach = drawReach(field);
  const pull = SPARK_PULL_SPEED * STEP_S;
  const flies = stepsIn(SPARK_FLIGHT_MS);
  for (const spark of field.sparks) {
    if (!spark.live) continue;
    const age = field.steps - spark.shedAt;
    if (age >= stepsIn(SPARK_LIFE_MS)) {
      spark.live = false;
      continue;
    }
    spark.lastX = spark.x;
    spark.lastY = spark.y;
    const drawn = ship !== null && pullToward(spark, ship, reach, pull, torus);
    if (!drawn && age > 0 && age <= flies) flyOut(spark, torus);
    const by = gathererOf(field, spark);
    if (by !== null) gather(field, spark, by);
  }
}

/** Lets every spark go, as the wave is cleared. */
export function clearSparks(field: Pick<ShedField, "sparks">): void {
  for (const spark of field.sparks) spark.live = false;
}

/** Returns whether a spark is in its last second, which it blinks through, at a step. */
export function sparkBlinks(spark: Readonly<Spark>, steps: number): boolean {
  return steps - spark.shedAt >= stepsIn(SPARK_LIFE_MS - SPARK_BLINK_MS);
}

/**
 * Returns how far the ship draws sparks in from: the field's sparking's
 * reach, farther at a speed that says so, or the Magnet's, the farther.
 */
export function drawReach(
  field: Pick<SparkField, "sparking" | "setup" | "pullReach">,
): number {
  return Math.max(
    field.sparking.reach * field.setup.sparkReach,
    field.pullReach,
  );
}

/** Returns a free spark slot, or the oldest spark's, which a new one takes. */
function slotFor(sparks: readonly Spark[]): Spark {
  const free = sparks.find((spark) => !spark.live);
  if (free) return free;
  return sparks.reduce((oldest, spark) =>
    spark.shedAt < oldest.shedAt ? spark : oldest,
  );
}

/** Flies a spark a step along its way out, across the wrap. */
function flyOut(spark: Spark, torus: Torus): void {
  spark.x = wrap(spark.x + spark.wayX * STEP_S, torus.width);
  spark.y = wrap(spark.y + spark.wayY * STEP_S, torus.height);
}

/**
 * Returns the pilot who gathers a spark: the one at the controls, as the
 * pod reaches it, or else the first in tow whose bubble does; null for none,
 * and once the run is over.
 */
function gathererOf(field: SparkField, spark: Readonly<Place>): Pilot | null {
  const { ship, crew, torus } = field;
  if (ship === null || crew.pilot === null) return null;
  if (reaches(ship, spark, torus)) return crew.pilot;
  for (let link = 0; link < crew.tow.length; link++) {
    const bubble = field.tow[link];
    if (bubble !== undefined && reaches(bubble, spark, torus)) {
      return crew.tow[link] ?? null;
    }
  }
  return null;
}

/** Returns whether the pod or a bubble in tow at a place reaches a spark to gather it. */
function reaches(
  by: Readonly<Place>,
  spark: Readonly<Place>,
  torus: Torus,
): boolean {
  return (
    distanceSquared(torus, by.x, by.y, spark.x, spark.y) <=
    SPARK_GATHER_REACH ** 2
  );
}

/**
 * Gathers a spark: it goes, scores its points times static's multiplier,
 * logged at its place with who gathered it, and then adds to static.
 */
function gather(field: SparkField, spark: Spark, by: Pilot): void {
  spark.live = false;
  if (scoreSpark(field, spark.x, spark.y, by)) {
    raiseStatic(field, SPARK_STATIC);
  }
}
