// The pod, Bumble: the ship of the uplift, built around its pilot, ported
// from the art kit's `docs/asteroid-breaker-uplift/art/lib/ship.mjs`. A
// round glass canopy sits at the middle the pod turns about, the pilot
// upright in it; the hull about it is cut in flat facets in the accent's
// ink, lit by the field's light as the rocks are, through a normal map; the
// canopy's glint keeps to the light however the hull turns. Its flame's
// colors are the kit's `fx.mjs`'s, at each of its two engines.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  arcPoints,
  bandAlong,
  centered,
  circle,
  placed,
  polygon,
  ring,
  stroke,
} from "@fz/phaser/shapes";
import { furReach } from "@fz/phaser/fuzzball";
import { FUZZBALL_GRID } from "@fz/style/fuzzball";
import { TURN } from "../../rules/angles";
import { stepsIn } from "../../rules/stepper";
import type { BeltPalette } from "../colors/palette";
import { DASH_TRAIL } from "../effects/timing";
import { type Tones, mixTone, tonesOf } from "../colors/tones";
import { type LitFrame, type Painted, flat, litFrame } from "./rock_art";
import { type Facing, facingOf, polar } from "./rocks/space";
import {
  MOST_LINE,
  MOST_MITER,
  dashedRing,
  outlineWidth,
  outward,
} from "./shapes";

/** Describes a flat face of the hull, in field units about the pod's middle, its nose along x. */
interface HullFacet {
  readonly points: readonly Point[];
  readonly facing: Facing;
  /** Whose ink it takes: the hull's, the accent, or the engines' metal, the field's muted text. */
  readonly part: "hull" | "trim";
}

/** Describes where a flame leaves the hull, pointing back, and how wide it is there, in field units. */
interface Engine {
  readonly at: Point;
  readonly width: number;
}

/** A corner of a facet: where it lies, and how high it stands. */
type Corner = readonly [x: number, y: number, z: number];

/** The names of the pod's frames but its flame's and its rim's gauge's. */
export const POD_FRAMES = {
  /** Its hull, lit through its normal map, in the rocks' atlas. */
  hull: "pod-hull",
  /** Its canopy's glass, shaded on its far side from the light where its marks show. */
  glass: "pod-glass",
  /** Its canopy's rim with the dash charged, lit toward the light; nothing where its fine marks don't show. */
  rim: "pod-rim",
  /** Its rim as the dash comes charged, a ring wider than the rim, which fades out. */
  flash: "pod-flash",
  /** The glint on its canopy, toward the light, over its pilot; nothing where its fine marks don't show. */
  glint: "pod-glint",
  /** The Shield's wash over the field about it, in the accent, which the scene shows faint. */
  wash: "pod-wash",
  /** The Shield's glass shell about it. */
  shield: "pod-shield",
  /** The dashed ring about it while nothing can touch it. */
  guard: "pod-guard",
  /** Its shape in the hull's ink, which a dash leaves behind it. */
  ghost: "pod-ghost",
  /** The two streaks behind it in a dash; nothing where its fine marks don't show. */
  streaks: "pod-streaks",
} as const;

/** The radius of the pod's canopy, in field units; its middle is the middle the pod turns about. */
export const CANOPY = 0.68;

/** How wide the canopy's rim is, in field units. */
const RIM = 0.1;

/** How much of the canopy's radius the pilot's fur fills, flat. */
const CANOPY_FILL = 0.8;

/**
 * How wide the pilot is drawn in the canopy, across the fuzzball's grid, in
 * field units, so its fur, flat, fills most of the canopy, as the kit's
 * `pilotSize()` makes it.
 */
export const PILOT_SIZE = (FUZZBALL_GRID * CANOPY_FILL * CANOPY) / furReach();

/** How far out the Shield's shell and the guard's ring lie, in field units. */
export const POD_RINGS = { shield: 1.64, guard: 1.84 } as const;

/** How many dashes the guard's ring is cut in, and the share of each the dash takes. */
const GUARD_DASHES = { count: 18, dash: 0.56 } as const;

/** How many steps the rim's gauge fills in, each a frame of its own. */
export const GAUGE_STEPS = 24;

/** How far behind the pod's middle its engines' bases lie, which the flame's frames are drawn about. */
export const ENGINES_BEHIND = 0.96;

/** The pod's engines, one each side of its tail. */
export const ENGINES: readonly Engine[] = [
  { at: { x: -ENGINES_BEHIND, y: 0.82 }, width: 0.32 },
  { at: { x: -ENGINES_BEHIND, y: -0.82 }, width: 0.32 },
];

/** How each of the flame's frames differs, as it flickers: its length, its width, and how far its tip sways. */
const FLICKERS = [
  { length: 1, width: 1, sway: 0 },
  { length: 0.8, width: 1.1, sway: 0.07 },
  { length: 1.14, width: 0.92, sway: -0.06 },
] as const;

/** How many frames the flame flickers through. */
export const FLICKER_FRAMES = FLICKERS.length;

/** How long each of the flame's flickers shows, in milliseconds. */
export const FLICKER_MS = 50;

/** How long the rim's flash takes as the dash comes charged, in milliseconds, and how much wider it grows as it fades. */
export const RIM_FLASH = { ms: 300, growth: 0.3 } as const;

/**
 * How strongly the scene shows each of the pod's frames it shows faint as a
 * whole, in each mode where they differ: the Shield's wash, the glint, the
 * dash's streaks, and the guard's ring between its blinks, full in them.
 */
export const POD_ALPHAS = {
  wash: { light: 0.1, dark: 0.14 },
  glint: { light: 1, dark: 0.9 },
  streaks: 0.4,
  guardBetween: 0.3,
} as const;

/** How many of the field's steps each of the flame's flickers shows for, made once. */
const FLICKER_STEPS = stepsIn(FLICKER_MS);

/** How long the flame is past its engine at no thrust, and how much more at full, in field units. */
const FLAME_LENGTH = { least: 0.4, more: 0.75 } as const;

/** How long the flame's bright middle is, and how wide, as shares of the flame's. */
const FLAME_CORE = { length: 0.58, width: 0.5, sway: 0.6 } as const;

/** How much of the way to white the flame's bright middle is in each mode, as the kit's `fx.mjs` lifts it. */
const FLAME_MIDDLE = { light: 0.62, dark: 0.82 } as const;

/** How much of the way to white the flame's body is in a dark palette, so it glows there; a light one's is the warning's own. */
const DARK_FLAME_BODY = 0.22;

/**
 * How the exhaust streams, as the kit's `puffSvg()` draws each puff: how
 * far behind an engine a puff is let go, how far it drifts on over its
 * life and how far either side of straight back, in degrees, how wide it
 * is as it is let go and as it fades, in field units, and how strong it
 * starts, fading faster than evenly.
 */
export const PUFF = {
  behind: 0.4,
  drift: 1.5,
  spread: 18,
  from: 0.13,
  to: 0.4,
  alpha: 0.8,
  fade: 1.2,
} as const;

/** How far through a puff's life its color is the flame's body, between its hot start and the field's muted text it fades to. */
const PUFF_BODY_AT = 0.2;

/** How many colors a puff's fade is given in, evenly through its life, so its color between them moves as the kit's does. */
const PUFF_COLORS = 6;

/** How far the dash's streaks run behind the pod's middle, and how far apart, as shares of its width. */
const STREAKS = { from: -1.1, to: -2.9, apart: 0.42 } as const;

/** How wide the pod is, across its engines, in field units. */
const POD_WIDTH = 2;

/** How much smaller each of a dash's ghosts is than the one laid after it, as a share of the pod's size. */
const GHOST_SHRINK = 0.08;

/**
 * Where the glass's shade lies: the far side of its disc from the light,
 * from a turn round from the way to the light to another, back along a
 * second disc as wide, set toward the light by a share of its radius.
 */
const SHADE = {
  from: 0.229,
  to: 0.771,
  backFrom: 0.729,
  backTo: 0.271,
  off: 0.26,
} as const;

/** How far either side of the way to the light the ready rim's lit arc runs, in turns. */
const RIM_LIT = 0.16;

/** How far the glass's glint runs, along a circle a share of the canopy's radius, before and after the way to the light, and where its dot is, in radians. */
const GLINT = { reach: 0.72, from: -0.36, to: 0.22, dot: 0.52 } as const;

/** How much wider the rim's flash is than the rim. */
const FLASH_WIDTH = 2.5;

/** How far in from the shell its inner ring and its glint lie, in field units, and where the glint runs and its dot is, in radians from the way to the light. */
const SHELL = {
  inner: 0.15,
  glint: 0.36,
  from: -0.3,
  to: 0.16,
  dot: 0.34,
} as const;

/** How strong the shell's inner ring is, and its glint. */
const SHELL_ALPHA = { inner: 0.6, glint: 0.85 } as const;

/** The widths of the pod's lines, in field units, and the fewest CSS pixels each is. */
const LINES = {
  rim: { units: RIM, least: 1.2 },
  glint: { units: 0.085, least: 1.3 },
  glintDot: { units: 0.05, least: 0.7 },
  shell: { units: 0.13, least: 1.6 },
  shellInner: { units: 0.04, least: 1 },
  shellGlint: { units: 0.1, least: 1.4 },
  shellDot: { units: 0.06, least: 0.8 },
  guard: { units: 0.11, least: 1.3 },
  streak: { units: 0.05, least: 1 },
} as const;

/** How wide the rim is, in CSS pixels, where the pod's fine marks don't show. */
const SMALL_RIM = 1;

/** How much wider the glass is, in CSS pixels, where the pod's fine marks don't show, as its rim is left off once the dash is charged. */
const SMALL_GLASS = 0.3;

/** How far each facet is grown past its edges, in device pixels, so no seam shows between two. */
const SEAM_PX = 0.5;

/** The hull's facets, back to front, made once. */
const FACETS: readonly HullFacet[] = bumble();

/** How far the hull's furthest corner lies from its middle, in field units: its prow's tip. */
const HULL_REACH = Math.max(
  ...FACETS.flatMap(({ points }) => points.map(({ x, y }) => Math.hypot(x, y))),
);

/**
 * How far the pod's frames drawn about its middle reach from it, in field
 * units: its hull's prow, its outline at its widest mitred out as far as an
 * outline may reach, or the guard's ring, at its widest, whichever is
 * further.
 */
export const POD_REACH = Math.max(
  HULL_REACH + MOST_MITER * MOST_LINE,
  POD_RINGS.guard + MOST_LINE / 2,
);

/** How far the dash's streaks reach from the pod's middle, in field units. */
export const STREAKS_REACH =
  Math.hypot(STREAKS.to, STREAKS.apart * POD_WIDTH) + MOST_LINE / 2;

/** How far the flame's frames reach from its engines' bases, at its longest, widest and most swayed. */
export const FLAME_REACH = Math.hypot(
  (FLAME_LENGTH.least + FLAME_LENGTH.more) *
    Math.max(...FLICKERS.map(({ length }) => length)),
  Math.max(...ENGINES.map(({ at }) => Math.abs(at.y))) +
    Math.max(...ENGINES.map(({ width }) => width)) +
    Math.max(...FLICKERS.map(({ sway }) => Math.abs(sway))),
);

// Made once, so finding a frame's name makes nothing.
const GAUGE_FRAMES: readonly string[] = Array.from(
  { length: GAUGE_STEPS + 1 },
  (_, step) => `pod-gauge-${String(step)}`,
);
const FLAME_FRAMES: readonly string[] = FLICKERS.map(
  (_, flicker) => `pod-flame-${String(flicker)}`,
);

/**
 * Returns the name of the rim's gauge's frame for a dash recharged a share
 * of the way, from 0 to 1, the share rounded down to its steps.
 */
export function gaugeFrame(share: number): string {
  const step = Math.floor(Math.min(1, Math.max(0, share)) * GAUGE_STEPS);
  return GAUGE_FRAMES[step] ?? `pod-gauge-${String(GAUGE_STEPS)}`;
}

/**
 * Returns the name of the flame's frame as it flickers, by a count that
 * goes on through its frames, round and round.
 */
export function flameFrame(flicker: number): string {
  const at = ((flicker % FLICKER_FRAMES) + FLICKER_FRAMES) % FLICKER_FRAMES;
  return FLAME_FRAMES[at] ?? "pod-flame-0";
}

/**
 * Returns which of the flame's flickers shows at a step of the field, by
 * the field's steps, so it holds still as the field does; its first where
 * motion isn't welcome.
 */
export function flameFlickerAt(steps: number, motion: boolean): number {
  return motion ? Math.floor(steps / FLICKER_STEPS) % FLICKER_FRAMES : 0;
}

/**
 * Returns how strongly the rim's flash shows a time after the dash came
 * charged, in milliseconds: all of it as it comes, fading to none.
 */
export function rimFlashAlpha(msSince: number): number {
  if (msSince < 0 || msSince >= RIM_FLASH.ms) return 0;
  return 1 - msSince / RIM_FLASH.ms;
}

/**
 * Returns how much larger the rim's flash is drawn a time after the dash
 * came charged, in milliseconds, than its frame: growing as it fades, where
 * motion is welcome.
 */
export function rimFlashScale(msSince: number, motion: boolean): number {
  if (!motion) return 1;
  return 1 + RIM_FLASH.growth * (1 - rimFlashAlpha(msSince));
}

/**
 * Returns how large a dash's ghost is drawn, by its count from where the
 * dash started, as a share of the pod's size: each smaller the further
 * back it lies, so the trail tapers.
 */
export function ghostScale(index: number): number {
  return 1 - (DASH_TRAIL - index) * GHOST_SHRINK;
}

/**
 * Returns how long the flame is drawn at a thrust from 0 to 1, as a share of
 * its frame's: a little at none, all of it at full.
 */
export function flameShare(thrust: number): number {
  const full = FLAME_LENGTH.least + FLAME_LENGTH.more;
  return (FLAME_LENGTH.least + FLAME_LENGTH.more * thrust) / full;
}

/** Returns a facet from its corners, facing as its first three lie. */
function cut(
  corners: readonly [Corner, Corner, Corner, ...Corner[]],
  part: HullFacet["part"] = "hull",
): HullFacet {
  const [a, b, c] = corners;
  return {
    points: corners.map(([x, y]) => ({ x, y })),
    facing: facingOf(
      { x: a[0], y: a[1] },
      a[2],
      { x: b[0], y: b[1] },
      b[2],
      { x: c[0], y: c[1] },
      c[2],
    ),
    part,
  };
}

/** Returns facets with their mirror images across the pod's line, each after the one it mirrors. */
function bothSides(facets: readonly HullFacet[]): readonly HullFacet[] {
  return facets.flatMap((facet) => [
    facet,
    {
      points: facet.points.map(({ x, y }) => ({ x, y: -y })).reverse(),
      facing: { x: facet.facing.x, y: -facet.facing.y, z: facet.facing.z },
      part: facet.part,
    },
  ]);
}

/** Returns a collar: a ring of facets sloping up from a rim to a seat, as a gem's bezel does. */
function collar(
  rim: number,
  seat: number,
  rise: number,
  sides: number,
): readonly HullFacet[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((i - 0.5) / sides) * TURN;
    const b = ((i + 0.5) / sides) * TURN;
    const at = (angle: number, radius: number, z: number): Corner => {
      const { x, y } = polar(angle, radius);
      return [x, y, z];
    };
    return cut([
      at(a, rim, 0),
      at(b, rim, 0),
      at(b, seat, rise),
      at(a, seat, rise),
    ]);
  });
}

/** Returns Bumble's facets, back to front: a round collar about the canopy, a short prow, and an engine nacelle each side of its tail. */
function bumble(): readonly HullFacet[] {
  const rim = 0.88;
  const tip: Corner = [1.44, 0, 0];
  const apex: Corner = [0.62, 0, 0.36];
  const ridgeFront: Corner = [-0.42, 0.82, 0.5];
  const ridgeRear: Corner = [-0.86, 0.82, 0.5];
  const shoulder = polar(0.5, rim);
  return [
    ...collar(rim, 0.74, 0.26, 12),
    ...bothSides([cut([tip, [shoulder.x, shoulder.y, 0], apex])]),
    // The nacelles ride on the collar's flanks, clear of the canopy.
    ...bothSides([
      cut(
        [
          [-0.86, 0.68, 0],
          [-0.86, 0.96, 0],
          [-0.96, 1, 0.02],
          [-0.96, 0.64, 0.02],
        ],
        "trim",
      ),
      cut([[-0.42, 1, 0], [-0.86, 1, 0], ridgeRear, ridgeFront]),
      cut([[-0.42, 0.64, 0], ridgeFront, ridgeRear, [-0.86, 0.64, 0]]),
      cut([[-0.1, 0.82, 0], [-0.42, 1, 0], ridgeFront]),
      cut([[-0.1, 0.82, 0], ridgeFront, [-0.42, 0.64, 0]]),
    ]),
  ];
}

/** Describes the colors a pod is drawn in, in a palette. */
export interface PodTones {
  /** Its hull's tones, of the accent, which its marks are drawn in; its facets are its ink, lit. */
  readonly hull: Tones;
  /** Its engines' metal: the field's muted text. */
  readonly trim: number;
  /** Its canopy's glass, behind the pilot, near the field's own color, so every pilot's ink reads on it. */
  readonly glass: number;
  /**
   * The glass's far side from the light, which the fur reaches over, with
   * less of the accent in a light palette than the kit's 0.3, so every
   * pilot's ink keeps 3:1 on it there too.
   */
  readonly glassShade: number;
  /** The rim, charged. */
  readonly rim: number;
  /** The rim where the light catches it, charged, and the part of its gauge charged. */
  readonly rimLit: number;
  /** The part of the rim's gauge yet to charge. */
  readonly rimDim: number;
  /** The flame's body. */
  readonly flame: number;
  /** The flame's bright middle. */
  readonly flameMiddle: number;
}

/** Returns the colors a pod is drawn in, in a palette, as the kit's `podTones()` and `fx.mjs`'s `energyOf()` mix them. */
export function podTones(palette: BeltPalette): PodTones {
  const light = palette.mode === "light";
  const hull = tonesOf(palette.accent, {
    mode: palette.mode,
    field: palette.field,
    text: palette.shot,
  });
  return {
    hull,
    trim: palette.muted,
    glass: mixTone(palette.field, palette.accent, light ? 0.14 : 0.08),
    glassShade: mixTone(palette.field, palette.accent, light ? 0.22 : 0.2),
    rim: light ? hull.deep : hull.shade,
    rimLit: light ? hull.ink : hull.lit,
    rimDim: mixTone(palette.accent, palette.field, light ? 0.62 : 0.66),
    flame: light
      ? palette.flame
      : mixTone(palette.flame, 0xffffff, DARK_FLAME_BODY),
    flameMiddle: mixTone(palette.flame, 0xffffff, FLAME_MIDDLE[palette.mode]),
  };
}

/**
 * Returns the colors a puff of exhaust fades through over its life, evenly
 * spaced, as the kit's `puffSvg()` fades it: from the flame's hot middle to
 * its body by a fifth of the way, then on to the field's muted text.
 */
export function puffColors(palette: BeltPalette): readonly number[] {
  const { flame } = podTones(palette);
  const hot =
    palette.mode === "light"
      ? mixTone(palette.flame, palette.shot, 0.45)
      : mixTone(palette.flame, 0xffffff, FLAME_MIDDLE.dark);
  return Array.from({ length: PUFF_COLORS }, (_, i) => {
    const at = i / (PUFF_COLORS - 1);
    return at <= PUFF_BODY_AT
      ? mixTone(hot, flame, at / PUFF_BODY_AT)
      : mixTone(flame, palette.muted, (at - PUFF_BODY_AT) / (1 - PUFF_BODY_AT));
  });
}

/** Returns how strongly a puff of exhaust shows a share through its life. */
export function puffAlpha(share: number): number {
  return PUFF.alpha * (1 - share) ** PUFF.fade;
}

/** Returns how wide a puff of exhaust is a share through its life, its radius in field units. */
export function puffRadius(share: number): number {
  return PUFF.from + (PUFF.to - PUFF.from) * share;
}

/** Returns the way to a palette's light across the field, in radians, which the pod's glints keep to. */
function towardLight(palette: BeltPalette): number {
  const { way } = palette.rockLight;
  return Math.atan2(way.y, way.x);
}

/** Returns a line's width at a scale, in device pixels: its field units', or its fewest CSS pixels where that is wider. */
function widthAt(
  line: { readonly units: number; readonly least: number },
  scale: ArtScale,
): number {
  return Math.max(line.least * scale.pixelRatio, line.units * scale.unit);
}

/**
 * Describes the canopy as drawn at a scale: the glass's radius, and the
 * rim's width and how far out its middle lies, in device pixels.
 */
interface Canopy {
  readonly glass: number;
  readonly rim: number;
  readonly rimAt: number;
}

/**
 * Returns the canopy as drawn at a scale: where the pod's fine marks don't
 * show, its glass a little wider and its rim a CSS pixel inside it, so the
 * rim can't close the gap between the pilot and the hull.
 */
function canopyAt(scale: ArtScale, fine: boolean): Canopy {
  const glass =
    CANOPY * scale.unit + (fine ? 0 : SMALL_GLASS * scale.pixelRatio);
  const rim = fine ? widthAt(LINES.rim, scale) : SMALL_RIM * scale.pixelRatio;
  return { glass, rim, rimAt: fine ? glass : glass - rim / 2 };
}

/**
 * Returns how far the pilot's fur may reach from its middle, on the
 * fuzzball's grid, as the canopy holds it: inside the rim where the pod's
 * fine marks show; else inside the glass, which shows no rim once the dash
 * is charged, and the gauge's thin ring over the fur's tips while it
 * recharges.
 */
export function canopyWithin(scale: ArtScale, fine: boolean): number {
  const { glass, rim } = canopyAt(scale, fine);
  const within = fine ? glass - rim / 2 : glass;
  return within / ((PILOT_SIZE * scale.unit) / FUZZBALL_GRID);
}

/** Returns the hull's facets at a scale, each grown past its edges by a seam, in its ink. */
function hullPainting(
  palette: BeltPalette,
  scale: ArtScale,
): readonly Painted[] {
  const outline = outlineWidth(scale);
  const ink = { hull: palette.accent, trim: palette.muted };
  const at = (points: readonly Point[]): readonly Point[] =>
    placed(points, scale.unit);
  return [
    ...flat([
      ...FACETS.map(({ points }) =>
        polygon(outward(at(points), outline), { color: palette.outline }),
      ),
      circle(ORIGIN, (CANOPY + RIM / 2) * scale.unit + outline, {
        color: palette.outline,
      }),
    ]),
    ...FACETS.map(({ points, facing, part }) => ({
      command: polygon(outward(at(points), SEAM_PX), { color: ink[part] }),
      facing,
    })),
  ];
}

/**
 * Returns the pod's hull, in its inks and as its normal map, for the rocks'
 * atlas, which lights it as it lights them: outlined in the field's color,
 * each facet in the accent's ink, or the engines' metal, facing its way.
 */
export function podHullFrame(palette: BeltPalette, scale: ArtScale): LitFrame {
  return litFrame(POD_FRAMES.hull, hullPainting(palette, scale));
}

/** Returns the canopy's glass about the pod's middle, shaded on its far side from the light where the pod's fine marks show. */
function glassCommands(
  palette: BeltPalette,
  tones: PodTones,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  const { glass } = canopyAt(scale, fine);
  const disc = circle(ORIGIN, glass, { color: tones.glass });
  if (!fine) return [disc];
  const light = towardLight(palette);
  const off = polar(light, glass * SHADE.off);
  const shade = [
    ...arcPoints(
      ORIGIN,
      glass,
      light + TURN * SHADE.from,
      light + TURN * SHADE.to,
    ),
    ...arcPoints(
      off,
      glass,
      light + TURN * SHADE.backFrom,
      light + TURN * SHADE.backTo,
    ),
  ];
  return [disc, polygon(shade, { color: tones.glassShade })];
}

/** Returns the rim's gauge with the dash recharged a number of its steps: dim all round, lit clockwise from the top. */
function gaugeCommands(
  step: number,
  tones: PodTones,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  const { rim, rimAt } = canopyAt(scale, fine);
  const dim = ring(ORIGIN, rimAt, { color: tones.rimDim, width: rim });
  if (step === 0) return [dim];
  const top = -TURN / 4;
  return [
    dim,
    polygon(
      bandAlong(
        arcPoints(ORIGIN, rimAt, top, top + (TURN * step) / GAUGE_STEPS),
        rim,
      ),
      {
        color: tones.rimLit,
      },
    ),
  ];
}

/** Returns the rim with the dash charged, lit toward the light, or nothing where the pod's fine marks don't show. */
function rimCommands(
  palette: BeltPalette,
  tones: PodTones,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  if (!fine) return [];
  const { rim, rimAt } = canopyAt(scale, fine);
  const light = towardLight(palette);
  return [
    ring(ORIGIN, rimAt, { color: tones.rim, width: rim }),
    polygon(
      bandAlong(
        arcPoints(
          ORIGIN,
          rimAt,
          light - TURN * RIM_LIT,
          light + TURN * RIM_LIT,
        ),
        rim,
      ),
      { color: tones.rimLit },
    ),
  ];
}

/** Returns the glass's glint, toward the light, or nothing where the pod's fine marks don't show. */
function glintCommands(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  if (!fine) return [];
  const { glass } = canopyAt(scale, fine);
  const light = towardLight(palette);
  const reach = glass * GLINT.reach;
  const style = { color: palette.glint, width: widthAt(LINES.glint, scale) };
  return [
    ...stroke(
      arcPoints(ORIGIN, reach, light + GLINT.from, light + GLINT.to),
      style,
    ),
    circle(polar(light + GLINT.dot, reach), widthAt(LINES.glintDot, scale), {
      color: palette.glint,
    }),
  ];
}

/** Returns the Shield's glass shell: a ring in the hull's ink, and, where the pod's fine marks show, a lit ring inside it and a glint toward the light. */
function shieldCommands(
  palette: BeltPalette,
  tones: PodTones,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  const shell = POD_RINGS.shield * scale.unit;
  const outer = ring(ORIGIN, shell, {
    color: tones.hull.ink,
    width: widthAt(LINES.shell, scale),
  });
  if (!fine) return [outer];
  const light = towardLight(palette);
  const glintAt = shell - SHELL.glint * scale.unit;
  const glint = palette.mode === "light" ? tones.hull.ink : palette.glint;
  return [
    outer,
    ring(ORIGIN, shell - SHELL.inner * scale.unit, {
      color: tones.hull.lit,
      width: widthAt(LINES.shellInner, scale),
      alpha: SHELL_ALPHA.inner,
    }),
    polygon(
      bandAlong(
        arcPoints(ORIGIN, glintAt, light + SHELL.from, light + SHELL.to),
        widthAt(LINES.shellGlint, scale),
      ),
      { color: glint, alpha: SHELL_ALPHA.glint },
    ),
    circle(polar(light + SHELL.dot, glintAt), widthAt(LINES.shellDot, scale), {
      color: glint,
      alpha: SHELL_ALPHA.glint,
    }),
  ];
}

/** Returns a flame's outline behind an engine, in field units about the engines' bases: a teardrop from its base to its tip. */
function flameOutline(
  engine: Engine,
  length: number,
  width: number,
  sway: number,
): readonly Point[] {
  const half = (engine.width * width) / 2;
  const pieces = 9;
  const near: Point[] = [];
  const far: Point[] = [];
  for (let i = 0; i <= pieces; i++) {
    const t = i / pieces;
    const wide = half * (1 - t) ** 0.7 * (1 + 0.6 * t);
    const x = engine.at.x + ENGINES_BEHIND - length * t;
    const y = engine.at.y + sway * t * t;
    near.push({ x, y: y - wide });
    far.unshift({ x, y: y + wide });
  }
  return [...near, ...far];
}

/** Returns the flame at full thrust in one of its flickers, behind each engine, about the engines' bases: its body, then its bright middle. */
function flameCommands(
  flicker: (typeof FLICKERS)[number],
  tones: PodTones,
  scale: ArtScale,
): readonly DrawCommand[] {
  const length = (FLAME_LENGTH.least + FLAME_LENGTH.more) * flicker.length;
  return ENGINES.flatMap((engine) => [
    polygon(
      placed(
        flameOutline(engine, length, flicker.width, flicker.sway),
        scale.unit,
      ),
      {
        color: tones.flame,
      },
    ),
    polygon(
      placed(
        flameOutline(
          { at: engine.at, width: engine.width * FLAME_CORE.width },
          length * FLAME_CORE.length,
          flicker.width,
          flicker.sway * FLAME_CORE.sway,
        ),
        scale.unit,
      ),
      { color: tones.flameMiddle },
    ),
  ]);
}

/** Returns the pod's shape in the hull's ink, its facets and its canopy as one, which a dash leaves behind it. */
function ghostCommands(
  tones: PodTones,
  scale: ArtScale,
): readonly DrawCommand[] {
  return [
    ...FACETS.map(({ points }) =>
      polygon(outward(placed(points, scale.unit), SEAM_PX), {
        color: tones.hull.ink,
      }),
    ),
    circle(ORIGIN, (CANOPY + RIM / 2) * scale.unit, { color: tones.hull.ink }),
  ];
}

/** Returns the two streaks behind the pod in a dash, or nothing where its fine marks don't show. */
function streakCommands(
  tones: PodTones,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  if (!fine) return [];
  const style = { color: tones.hull.lit, width: widthAt(LINES.streak, scale) };
  return [-1, 1].flatMap((side) => {
    const y = side * STREAKS.apart * POD_WIDTH * scale.unit;
    return stroke(
      [
        { x: STREAKS.from * scale.unit, y },
        { x: STREAKS.to * scale.unit, y },
      ],
      style,
    );
  });
}

/**
 * Returns the pod's frames for the field's atlas, drawn in a palette at a
 * scale, its fine marks only where the field keeps them: its glass, its
 * rim charged and its gauge at each step, its flash, its glint, the
 * Shield's wash and shell, the guard's ring, its flame as it flickers, its
 * ghost and its streaks. Its hull is the rocks' atlas's
 * (`podHullFrame()`), lit.
 */
export function podFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  const tones = podTones(palette);
  const { rim, rimAt } = canopyAt(scale, fine);
  const guard = POD_RINGS.guard * scale.unit;
  const around = (TURN * guard) / GUARD_DASHES.count;
  return [
    centered(POD_FRAMES.glass, glassCommands(palette, tones, scale, fine)),
    centered(POD_FRAMES.rim, rimCommands(palette, tones, scale, fine)),
    ...GAUGE_FRAMES.map((name, step) =>
      centered(name, gaugeCommands(step, tones, scale, fine)),
    ),
    centered(POD_FRAMES.flash, [
      ring(ORIGIN, rimAt, { color: tones.rimLit, width: rim * FLASH_WIDTH }),
    ]),
    centered(POD_FRAMES.glint, glintCommands(palette, scale, fine)),
    centered(POD_FRAMES.wash, [
      circle(ORIGIN, POD_RINGS.shield * scale.unit, { color: palette.accent }),
    ]),
    centered(POD_FRAMES.shield, shieldCommands(palette, tones, scale, fine)),
    centered(
      POD_FRAMES.guard,
      dashedRing(
        guard,
        {
          dash: around * GUARD_DASHES.dash,
          gap: around * (1 - GUARD_DASHES.dash),
        },
        { color: tones.hull.ink, width: widthAt(LINES.guard, scale) },
      ),
    ),
    ...FLICKERS.map((flicker, i) =>
      centered(flameFrame(i), flameCommands(flicker, tones, scale)),
    ),
    centered(POD_FRAMES.ghost, ghostCommands(tones, scale)),
    centered(POD_FRAMES.streaks, streakCommands(tones, scale, fine)),
  ];
}
