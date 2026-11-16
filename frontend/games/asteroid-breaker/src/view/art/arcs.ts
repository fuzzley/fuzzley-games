// The arcs of static, as the art kit draws them: the zap's
// (`docs/archive/asteroid-breaker-uplift/art/lib/fx.mjs`' `makeArc()`,
// `arcSvg()` and `zapFx()`, placed as its zap mock places them), leaping from
// the pod's hull to the rim of each rock the zap strikes, anew every few frames
// where motion is welcome, fading, a spark where each lands; and those crawling
// over the hull at full static (`ship.mjs`' `podSvg()`), from facet to facet.
// Each is a jagged line, cut from a seed in its own frame, in shares of its
// length, as a zap strikes or once for the hull, and placed each frame where it
// runs into records made once, so a frame of play makes none.

import { clamp, lerp, shareDone } from "@fz/core/math";
import { createRandom } from "@fz/core/random";
import {
  type ArtFrame,
  type ArtScale,
  ORIGIN,
  centered,
  polygon,
} from "@fz/phaser/shapes";
import { isStaticFull } from "../../rules/sparks/charge";
import {
  type Moving,
  type Place,
  type Torus,
  across,
  copyShift,
  wrap,
} from "../../rules/torus";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import {
  type Drawn,
  type FieldEvent,
  type FieldView,
  rockKindOf,
  rockSizeOf,
} from "../field/frame";
import { rimToward, sparkPoints } from "./breaks";
import {
  type Energy,
  type Halo,
  type WrittenHalo,
  energyOf,
  haloAlpha,
} from "./energy";
import { HULL_RUNS, type HullRun } from "./pod_art";
import { isFine } from "./rock_art";

/** Describes a jagged line, written again into a record made once: the places it runs through, and how many of them it now does. */
export interface ArcLine {
  count: number;
  readonly at: readonly Moving[];
}

/**
 * Describes an arc of static, written again into a record made once: its
 * main line, from end to end, and the branches off it, how many of them it
 * now has.
 */
export interface Arc {
  readonly main: ArcLine;
  readonly branches: readonly ArcLine[];
  branchCount: number;
}

/**
 * How an arc of static is cut, as the kit's `makeArc()`: a step of its
 * zigzag for so many units of its length, between the fewest steps and the
 * most; how far each kink is thrown, as a share of its length, less on an
 * arc longer than `swayUpTo` units, and how far the whole bows; and each
 * branch: how far it turns off the arc, in radians, how long it is, as a
 * share of the arc, and at most, in how many steps, and how far a kink of
 * it is thrown.
 */
export const ARC_CUT = {
  stepLength: 1.05,
  fewestSteps: 5,
  mostSteps: 12,
  sway: 0.065,
  swayUpTo: 9,
  bow: 0.05,
  branch: {
    turn: { least: 0.5, most: 0.95 },
    share: { least: 0.16, most: 0.26 },
    longest: 2.6,
    steps: 3,
    sway: 0.16,
  },
} as const;

/** The most branches an arc has. */
export const MOST_BRANCHES = 2;

/** Returns a number drawn evenly from a span. */
function between(random: () => number, least: number, most: number): number {
  return least + (most - least) * random();
}

/** Returns a line with room for so many places, running through none. */
function createLine(places: number): ArcLine {
  return {
    count: 0,
    at: Array.from({ length: places }, () => ({ x: 0, y: 0 })),
  };
}

/** Writes one of a line's places. */
function setAt(line: ArcLine, index: number, x: number, y: number): void {
  const at = line.at[index];
  if (at) {
    at.x = x;
    at.y = y;
  }
}

/** Returns a record an arc is written into, with room for its longest line and its branches, running through none. */
export function createArc(): Arc {
  return {
    main: createLine(ARC_CUT.mostSteps + 1),
    branches: Array.from({ length: MOST_BRANCHES }, () =>
      createLine(ARC_CUT.branch.steps + 1),
    ),
    branchCount: 0,
  };
}

/**
 * Writes a line that zigzags from one place to another, in so many steps,
 * each kink thrown to the other side of it from the last, as lightning's
 * are, into a record, as the kit's `zigzag()`.
 */
function zigzag(
  random: () => number,
  from: Readonly<Place>,
  toX: number,
  toY: number,
  steps: number,
  sway: number,
  into: ArcLine,
): void {
  const { x, y } = from;
  const dx = toX - x;
  const dy = toY - y;
  const bow = between(random, -ARC_CUT.bow, ARC_CUT.bow);
  let side = random() < 0.5 ? -1 : 1;
  setAt(into, 0, x, y);
  for (let i = 1; i < steps; i++) {
    const share = (i + between(random, -0.3, 0.3)) / steps;
    const off =
      side * between(random, 0.3, 1) * sway + bow * Math.sin(share * Math.PI);
    if (random() < 0.8) side = -side;
    setAt(into, i, x + dx * share - dy * off, y + dy * share + dx * off);
  }
  setAt(into, steps, toX, toY);
  into.count = steps + 1;
}

/** Returns how many steps an arc so long, in field units, zigzags in, as the kit's `makeArc()` counts them, one of no length as one of {@link LEAST_ARC}. */
export function arcSteps(length: number): number {
  return clamp(
    Math.round(Math.max(length, LEAST_ARC) / ARC_CUT.stepLength),
    ARC_CUT.fewestSteps,
    ARC_CUT.mostSteps,
  );
}

/**
 * Writes an arc of static so long, in field units, cut from a seed, with so
 * many branches, `MOST_BRANCHES` at most, into a record and returns it, as
 * the kit's `makeArc()` cuts one: in its own frame, each place as far
 * along it and as far across it as a share of its length, its start at
 * (0, 0) and its end at (1, 0), so {@link placeArc} lays it between any two
 * places, stretched and turned, as the kit's would be cut between them.
 * One of no length is cut as one of {@link LEAST_ARC}.
 */
export function cutArc(
  length: number,
  seed: number,
  branches: number,
  into: Arc,
): Arc {
  const random = createRandom(seed * 613 + 11);
  const cut = Math.max(length, LEAST_ARC);
  const steps = arcSteps(cut);
  const sway = ARC_CUT.sway * Math.min(1, ARC_CUT.swayUpTo / cut);
  zigzag(random, ORIGIN, 1, 0, steps, sway, into.main);
  into.branchCount = Math.min(branches, into.branches.length);
  for (let i = 0; i < into.branchCount; i++) {
    const line = into.branches[i];
    const start = into.main.at[2 + Math.floor(random() * (steps - 3))];
    if (line && start) cutBranch(random, i, start, cut, line);
  }
  return into;
}

/**
 * Writes an arc's branch, the first or one after it, off a place on its main
 * line, of an arc so long, in field units, into a record, in shares of the
 * arc's length, as the kit's `makeArc()`: turned off to one side, the next
 * to the other.
 */
function cutBranch(
  random: () => number,
  index: number,
  start: Readonly<Place>,
  cut: number,
  into: ArcLine,
): void {
  const { branch } = ARC_CUT;
  const side = index % 2 === 0 ? 1 : -1;
  const angle = side * between(random, branch.turn.least, branch.turn.most);
  const reach =
    Math.min(
      branch.longest,
      cut * between(random, branch.share.least, branch.share.most),
    ) / cut;
  zigzag(
    random,
    start,
    start.x + Math.cos(angle) * reach,
    start.y + Math.sin(angle) * reach,
    branch.steps,
    branch.sway,
    into,
  );
}

/** Writes a line cut in an arc's own frame laid between two places into another line. */
function placeLine(
  cut: ArcLine,
  from: Readonly<Place>,
  dx: number,
  dy: number,
  into: ArcLine,
): void {
  for (let i = 0; i < cut.count; i++) {
    const { x, y } = cut.at[i] ?? ORIGIN;
    setAt(into, i, from.x + x * dx - y * dy, from.y + x * dy + y * dx);
  }
  into.count = cut.count;
}

/**
 * Writes an arc cut in its own frame (`cutArc()`) laid between two places,
 * in field units, into a record and returns it: stretched to run from the
 * one to the other and turned their way.
 */
export function placeArc(
  cut: Arc,
  from: Readonly<Place>,
  to: Readonly<Place>,
  into: Arc,
): Arc {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  placeLine(cut.main, from, dx, dy, into.main);
  into.branchCount = Math.min(cut.branchCount, into.branches.length);
  for (let i = 0; i < into.branchCount; i++) {
    const line = cut.branches[i];
    const placed = into.branches[i];
    if (line && placed) placeLine(line, from, dx, dy, placed);
  }
  return into;
}

/**
 * Writes how far off the copies of an arc past the field's edges lie into
 * a record and returns it: across, `x`, and down, `y`, each 0 where it
 * reaches past no edge that way, and both for its copy at the corner where
 * it reaches past two, by the bounds of its every line, grown by how far
 * its strokes reach past them ({@link ARC_OVERHANG}). An arc starts within
 * its reach of the field and is shorter than half the field's short side,
 * as a zap's are.
 */
export function arcShift(arc: Arc, torus: Torus, into: Moving): Moving {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (let line = -1; line < arc.branchCount; line++) {
    const { at, count } =
      line < 0 ? arc.main : (arc.branches[line] ?? arc.main);
    for (let i = 0; i < count; i++) {
      const { x, y } = at[i] ?? ORIGIN;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  const { width, height } = torus;
  const acrossReach = (right - left) / 2 + ARC_OVERHANG;
  const downReach = (bottom - top) / 2 + ARC_OVERHANG;
  into.x = copyShift((left + right) / 2, acrossReach, width) * width;
  into.y = copyShift((top + bottom) / 2, downReach, height) * height;
  return into;
}

/**
 * A zap's arc, as the kit's `zapFx()`: how long it lasts, in milliseconds,
 * how often it leaps anew where motion is welcome, from when it fades to
 * nothing at its end, and how many branches its first leap has and each
 * after it.
 */
export const ZAP_ARC = {
  ms: 180,
  leapMs: 45,
  fadeFromMs: 90,
  firstBranches: 2,
  branches: 1,
} as const;

/** How far from the pod's middle a zap's arc leaps from, in field units: past its hull, as the kit's zap mock leaps. */
export const ARC_FROM = 1.2;

/** How far into a rock a zap's arc lands, as a share of how far its rim lies from its middle toward the pod, as the kit's zap mock lands it. */
export const ARC_RIM = 0.86;

/** The least a zap's arc runs, in field units, between the hull and the rock's rim: one to a rock any nearer the pod is drawn none. */
export const LEAST_ARC = 0.3;

/**
 * How many seeds a zap's arcs are cut from for each count of steps, as a
 * held hit's sparks are: cut once, so a zap makes nothing as it strikes,
 * each leap's chosen by the kit's seed for it.
 */
export const ZAP_ARC_SEEDS = 32;

/**
 * A zap's arcs, cut once: for each count of steps, from the fewest, an arc
 * from each of {@link ZAP_ARC_SEEDS} seeds, as long as its steps run, with
 * a first leap's branches, as the kit cuts one of any length with as many
 * steps, up to eight, and one a little longer or shorter swaying a little
 * more or less than the kit's. A later leap draws only the first branch,
 * which the kit cuts the same as a leap's one.
 */
const ZAP_CUTS: readonly (readonly Arc[])[] = Array.from(
  { length: ARC_CUT.mostSteps - ARC_CUT.fewestSteps + 1 },
  (_, fewer) =>
    Array.from({ length: ZAP_ARC_SEEDS }, (_, seed) =>
      cutArc(
        (ARC_CUT.fewestSteps + fewer) * ARC_CUT.stepLength,
        seed,
        ZAP_ARC.firstBranches,
        createArc(),
      ),
    ),
);

/** An arc that runs through no places, laid where a zap has none. */
const NO_ARC = createArc();

/** Returns which leap a zap's arc is on, a time after it struck, in milliseconds: anew every few frames where motion is welcome, the first held where it isn't. */
export function zapLeap(msSince: number, motion: boolean): number {
  return motion ? Math.floor(msSince / ZAP_ARC.leapMs) : 0;
}

/** Returns how strongly a zap's arc shows a time after it struck, in milliseconds: whole, then fading to nothing at its end. */
export function zapStrength(msSince: number): number {
  return (
    1 - shareDone(ZAP_ARC.fadeFromMs, msSince, ZAP_ARC.ms - ZAP_ARC.fadeFromMs)
  );
}

/** Returns the seed a zap's arc is cut from on a leap, from the serial of the event that struck its rock, as the kit's `zapFx()` seeds it. */
export function zapSeed(serial: number, leap: number): number {
  return serial * 31 + leap * 7;
}

/** Returns how many branches a zap's arc has on a leap. */
export function zapBranches(leap: number): number {
  return leap === 0 ? ZAP_ARC.firstBranches : ZAP_ARC.branches;
}

/**
 * Describes a zap's arc to a rock as it struck, written into a record made
 * once: where the pod zapped from, on the field, where the rock lay, how
 * far its rim lay from its middle toward the pod, in field units, how many
 * steps its arc zigzags in, as long as it then ran, and the serial of the
 * event that logged it, which its every leap is seeded by.
 */
export interface ZapStrike {
  readonly pod: Moving;
  readonly rock: Moving;
  rim: number;
  steps: number;
  serial: number;
}

/** Returns a record a zap's arc to a rock is written into. */
export function createZapStrike(): ZapStrike {
  return {
    pod: { x: 0, y: 0 },
    rock: { x: 0, y: 0 },
    rim: 0,
    steps: ARC_CUT.fewestSteps,
    serial: 0,
  };
}

/**
 * Writes a zap's arc to a rock, from its `arced` event on the field, into a
 * record and returns it: where the pod zapped from, back along the arc's
 * way as far as it leapt, where the rock lay, how far its rim lay toward
 * the pod, its outline turned as the rock was, while its slot holds it,
 * as a held hit's spark is thrown from (`rimToward()`), else as far as a
 * rock of its size's, how many steps its arc zigzags in, as long as it
 * then runs, and the event's serial.
 */
export function strikeOf(
  event: Readonly<FieldEvent>,
  field: Pick<FieldView, "rocks" | "torus">,
  into: ZapStrike,
): ZapStrike {
  const { torus } = field;
  const kind = rockKindOf(event);
  const size = rockSizeOf(event);
  const rock = field.rocks[event.slot];
  const rim =
    rock?.kind === kind && rock.size === size
      ? rimToward(rock, Math.atan2(-event.wayY, -event.wayX))
      : ROCK_RADIUS[size];
  into.pod.x = wrap(event.x - event.wayX * event.reach, torus.width);
  into.pod.y = wrap(event.y - event.wayY * event.reach, torus.height);
  into.rock.x = event.x;
  into.rock.y = event.y;
  into.rim = rim;
  into.steps = arcSteps(event.reach - ARC_FROM - rim * ARC_RIM);
  into.serial = event.serial;
  return into;
}

/**
 * Writes a zap's arc on a leap, laid between where it runs, into a record
 * and returns it: the one cut from the kit's seed for it, among
 * {@link ZAP_ARC_SEEDS}, in as many steps as it struck in, with as many
 * branches as its leap has.
 */
export function zapArc(
  strike: Readonly<ZapStrike>,
  leap: number,
  ends: Readonly<ArcEnds>,
  into: Arc,
): Arc {
  const cuts = ZAP_CUTS[strike.steps - ARC_CUT.fewestSteps] ?? [];
  const cut = cuts[zapSeed(strike.serial, leap) % ZAP_ARC_SEEDS] ?? NO_ARC;
  placeArc(cut, ends.from, ends.to, into);
  into.branchCount = Math.min(into.branchCount, zapBranches(leap));
  return into;
}

/** Describes where a zap's arc runs on the field, written again into a record made once: from the hull's edge to the rock's rim, its end the short way across the wrap from its start, so it may lie off the field. */
export interface ArcEnds {
  readonly from: Moving;
  readonly to: Moving;
}

/**
 * Writes where a zap's arc runs, from the hull's edge of a pod at a place to
 * just inside the rim of a rock at another, its rim so far from its middle
 * toward the pod, the short way across the wrap, into a record, and
 * returns whether it runs at all: not where the rock lies so near the pod
 * that the arc would run under {@link LEAST_ARC}.
 */
export function zapEnds(
  pod: Readonly<Place>,
  rock: Readonly<Place>,
  rim: number,
  torus: Torus,
  into: ArcEnds,
): boolean {
  const offX = across(pod.x, rock.x, torus.width);
  const offY = across(pod.y, rock.y, torus.height);
  const apart = Math.hypot(offX, offY);
  const landing = apart - rim * ARC_RIM;
  if (landing - ARC_FROM < LEAST_ARC) return false;
  const wayX = offX / apart;
  const wayY = offY / apart;
  into.from.x = pod.x + wayX * ARC_FROM;
  into.from.y = pod.y + wayY * ARC_FROM;
  into.to.x = pod.x + wayX * landing;
  into.to.y = pod.y + wayY * landing;
  return true;
}

/**
 * The spark where a zap's arc lands, as the kit's `spark()` draws it there:
 * how far its points reach on the first leap, in field units, and how much
 * less on each after it, how far each leap turns it, in radians, its
 * waist, its middle, as a share of its points and of its waist, and its
 * halo, as far as a share of its points and as strong.
 */
export const ARC_SPARK = {
  reach: 0.55,
  shrink: 0.08,
  turn: 0.6,
  pinch: 0.24,
  middle: { share: 0.62, pinch: 0.8 },
  halo: { share: 1.9, strength: 0.8 },
} as const;

/** The frame of the spark where a zap's arc lands, as large as it is on the first leap. */
export const ARC_SPARK_FRAME = "arc-spark";

/** Returns how large the spark where a zap's arc lands is drawn on a leap, as a share of its frame. */
export function arcSparkScale(leap: number): number {
  return (ARC_SPARK.reach - ARC_SPARK.shrink * leap) / ARC_SPARK.reach;
}

/** Returns how far the spark where a zap's arc lands is turned on a leap, in radians. */
export function arcSparkTurn(leap: number): number {
  return ARC_SPARK.turn * leap;
}

/**
 * Writes the halo of the spark where a zap's arc lands on a leap, at a
 * strength, into a record and returns it: round, as far past its points
 * as the kit's.
 */
export function arcSparkHalo(
  leap: number,
  strength: number,
  into: WrittenHalo,
): Halo {
  const reach = ARC_SPARK.reach * arcSparkScale(leap) * ARC_SPARK.halo.share;
  into.along = reach;
  into.across = reach;
  into.ahead = 0;
  into.turn = 0;
  into.strength = ARC_SPARK.halo.strength * strength;
  return into;
}

/** Describes how a line of an arc is stroked: as wide as a share of the field's unit, never under a width in CSS pixels, and as opaque. */
export interface ArcStroke {
  readonly width: number;
  readonly least: number;
  readonly alpha: number;
}

/**
 * How a zap's arc is stroked, back to front, as the kit's `arcSvg()`: in
 * which tone of the accent's energy, how wide and how opaque, its halo's
 * at the palette's halo strength.
 */
export const ZAP_STROKES: readonly (ArcStroke & {
  readonly tone: keyof Energy;
})[] = [
  { tone: "halo", width: 0.62, least: 0, alpha: 0.2 },
  { tone: "body", width: 0.26, least: 2, alpha: 0.6 },
  { tone: "hot", width: 0.11, least: 1.1, alpha: 1 },
];

/** How far a zap's arc's widest stroke, its halo's, reaches past its line on either side, in field units. */
export const ARC_OVERHANG =
  Math.max(...ZAP_STROKES.map((stroke) => stroke.width)) / 2;

/** How much narrower an arc's branch is stroked than its main line, as a share of its width. */
export const BRANCH_WEIGHT = 0.62;

/** Returns how wide a stroke of an arc's line of a weight is drawn at a scale, in device pixels. */
export function arcWidth(
  stroke: ArcStroke,
  weight: number,
  scale: ArtScale,
): number {
  return Math.max(
    stroke.least * scale.pixelRatio,
    stroke.width * weight * scale.unit,
  );
}

/** Returns how opaque a stroke of a zap's arc is at a strength, its halo's as the palette lets a halo show. */
export function zapAlpha(
  stroke: (typeof ZAP_STROKES)[number],
  strength: number,
  palette: BeltPalette,
): number {
  const alpha = stroke.alpha * strength;
  return stroke.tone === "halo" ? haloAlpha(alpha, palette) : alpha;
}

/** Returns the frame of the spark where a zap's arc lands: its points in the accent's body and its middle in its hot tone, as the kit's `spark()`. */
function arcSparkArt(palette: BeltPalette, scale: ArtScale): ArtFrame {
  const tones = energyOf(palette.accent, palette);
  const reach = ARC_SPARK.reach * scale.unit;
  const { middle, pinch } = ARC_SPARK;
  return centered(ARC_SPARK_FRAME, [
    polygon(sparkPoints(reach, pinch, 0), { color: tones.body }),
    polygon(sparkPoints(reach * middle.share, pinch * middle.pinch, 0), {
      color: tones.hot,
    }),
  ]);
}

/** Returns the arcs' frames, in a palette at a scale: the spark where a zap's arc lands. */
export function arcFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [arcSparkArt(palette, scale)];
}

/**
 * The arcs crawling over the hull at full static, as the kit's `podSvg()`
 * draws them: how many, fewer where the pod is drawn without its fine
 * marks; how far each runs past the middles of the two facets it joins, at
 * each end, as a share of the run between them; in how many steps, each
 * kink thrown as far as a share of its length either way; and how often
 * they crawl anew where motion is welcome, in milliseconds.
 */
export const HULL_ARCS = {
  most: 3,
  fewer: 2,
  overrun: 0.15,
  steps: 4,
  sway: 0.2,
  everyMs: 100,
} as const;

/**
 * How the arcs crawling over the hull are stroked, back to front, as the
 * kit's: in the pilot's ink, then a core in {@link HULL_ARC_CORE}.
 */
export const HULL_STROKES: readonly (ArcStroke & {
  readonly tone: "ink" | "core";
})[] = [
  { tone: "ink", width: 0.17, least: 2.2, alpha: 0.5 },
  { tone: "core", width: 0.06, least: 1, alpha: 1 },
];

/** The color of the core of the arcs crawling over the hull, in every palette, as the kit's: white. */
export const HULL_ARC_CORE = 0xffffff;

/**
 * Returns the ink the arcs crawling over the hull are drawn in, the
 * pilot's, or null where none crawl: short of full static, at which the
 * next dash is a zap, or with no pilot at the controls.
 */
export function hullArcInk(
  field: Pick<FieldView, "charge" | "sparking" | "crew">,
  palette: Pick<BeltPalette, "pilots" | "accent">,
): number | null {
  const { pilot } = field.crew;
  if (pilot === null || !isStaticFull(field)) return null;
  return palette.pilots[pilot] ?? palette.accent;
}

/**
 * How many sets of the arcs crawling over the hull are cut, once, each from
 * its own seed, which they crawl through in turn, about three seconds'
 * worth before the first comes round again.
 */
export const HULL_ARC_SEEDS = 32;

/**
 * Returns the seed the arcs crawling over the hull are cut from at a time,
 * in milliseconds: a new one every so often where motion is welcome, so
 * they crawl, and the same one always where it isn't, so they hold still.
 */
export function hullArcSeed(now: number, motion: boolean): number {
  return motion ? Math.floor(now / HULL_ARCS.everyMs) % HULL_ARC_SEEDS : 0;
}

/** Returns records the arcs crawling over the hull are written into, as many as there are at most. */
export function createHullArcs(): readonly ArcLine[] {
  return Array.from({ length: HULL_ARCS.most }, () =>
    createLine(HULL_ARCS.steps + 1),
  );
}

/**
 * Writes a jagged line along a run of the hull, past each end by the hull
 * arcs' overrun, each kink thrown either way, as the kit's `jagged()`, in
 * field units about the pod's middle, its nose along x, into a record.
 */
function jagged(
  random: () => number,
  { from, to }: HullRun,
  into: ArcLine,
): void {
  const { overrun, steps, sway } = HULL_ARCS;
  const startX = lerp(from.x, to.x, -overrun);
  const startY = lerp(from.y, to.y, -overrun);
  const dx = lerp(from.x, to.x, 1 + overrun) - startX;
  const dy = lerp(from.y, to.y, 1 + overrun) - startY;
  for (let i = 0; i <= steps; i++) {
    const share = i / steps;
    const off = i === 0 || i === steps ? 0 : between(random, -sway, sway);
    setAt(
      into,
      i,
      startX + dx * share - dy * off,
      startY + dy * share + dx * off,
    );
  }
  into.count = steps + 1;
}

/**
 * Returns so many arcs crawling over the hull, cut from a seed, spread round
 * the hull's runs (`HULL_RUNS`) from one the seed picks, in field units
 * about the pod's middle, its nose along x, as the kit's `podSvg()` cuts
 * them.
 */
function cutHullArcs(seed: number, count: number): readonly ArcLine[] {
  const random = createRandom(seed * 613 + 11);
  const runs = HULL_RUNS.length;
  const first = Math.floor(between(random, 0, runs));
  return Array.from({ length: count }, (_, i) => {
    const line = createLine(HULL_ARCS.steps + 1);
    const run = HULL_RUNS[(first + Math.floor((i * runs) / count)) % runs];
    if (run) jagged(random, run, line);
    return line;
  });
}

/**
 * The arcs crawling over the hull, cut once from each of
 * {@link HULL_ARC_SEEDS} seeds: three where the pod's fine marks show, and
 * two, spread as the kit spreads two, where they don't, as its `small`.
 */
const HULL_ARC_CUTS = {
  fine: Array.from({ length: HULL_ARC_SEEDS }, (_, seed) =>
    cutHullArcs(seed, HULL_ARCS.most),
  ),
  small: Array.from({ length: HULL_ARC_SEEDS }, (_, seed) =>
    cutHullArcs(seed, HULL_ARCS.fewer),
  ),
} as const;

/**
 * Writes the arcs crawling over the hull of a pod drawn at a scale, cut from
 * a seed, onto the field where the pod is drawn, turned as it is, into
 * records, and returns how many: three, or two where the pod's fine marks
 * don't show, as many as the records hold.
 */
export function hullArcs(
  seed: number,
  scale: ArtScale,
  pod: Readonly<Drawn>,
  into: readonly ArcLine[],
): number {
  const cuts = HULL_ARC_CUTS[isFine(scale) ? "fine" : "small"];
  const arcs = cuts[seed % HULL_ARC_SEEDS] ?? [];
  const cos = Math.cos(pod.angle);
  const sin = Math.sin(pod.angle);
  const count = Math.min(arcs.length, into.length);
  for (let line = 0; line < count; line++) {
    const cut = arcs[line];
    const placed = into[line];
    if (cut && placed) {
      for (let i = 0; i < cut.count; i++) {
        const { x, y } = cut.at[i] ?? ORIGIN;
        setAt(placed, i, pod.x + x * cos - y * sin, pod.y + x * sin + y * cos);
      }
      placed.count = cut.count;
    }
  }
  return count;
}
