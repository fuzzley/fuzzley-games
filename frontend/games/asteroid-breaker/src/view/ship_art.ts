import { SHIP_LENGTH } from "../rules/tuning";
import type { BeltPalette } from "./palette";
import {
  type ArtFrame,
  type ArtScale,
  type Point,
  centered,
  circle,
  cubicPoints,
  dashedRing,
  outlineWidth,
  outward,
  placed,
  polygon,
  quadraticPoints,
  ring,
  widthOf,
} from "./shapes";

/** Describes the ship's outlines, in its own units, its nose along x. */
interface ShipOutlines {
  readonly hull: readonly Point[];
  /** Its fins, the one on its left of its heading, then its right. */
  readonly fins: readonly (readonly Point[])[];
}

/** The names of the ship's frames. */
export const SHIP_FRAMES = {
  /** Its hull, fins and window, its middle the frame's. */
  ship: "ship",
  /** Its flame at full thrust, its base the frame's middle, so the scene stretches it from there. */
  flame: "flame",
  /** The ring around a new ship while nothing can touch it. */
  guard: "guard",
  /** The ring around a ship the Shield guards. */
  shield: "shield",
} as const;

// The ship as the design mock draws it, in its own units: from its fins'
// tips at -1.12 to its nose at 1.25, about its middle.

/** Where the ship's nose is, in its own units. */
const NOSE = 1.25;

/** Where the tips of the ship's fins are, in its own units. */
const FIN_TIPS = -1.12;

/** How many field units one of the ship's own is, so it spans {@link SHIP_LENGTH}. */
const SHIP_UNIT = SHIP_LENGTH / (NOSE - FIN_TIPS);

/** Where the ship's window is along it, and its radius, in its own units. */
const OWN_WINDOW = { x: 0.38, radius: 0.4 } as const;

/** Where the flame's base is along the ship, in its own units. */
const FLAME_BASE = -0.85;

/** How long the flame is past its base at no thrust, and how much more at full, in the ship's own units. */
const FLAME_LENGTH = { least: 0.55, more: 1.05 } as const;

/** How far out the guard's ring and the Shield's are, and how wide, in field units. */
const RINGS = {
  guard: { radius: 1.75, width: 0.12 },
  shield: { radius: 1.65, width: 0.14 },
} as const;

/** How long each of the guard's dashes is, and each gap, in field units. */
const GUARD_DASH = { dash: 0.35, gap: 0.3 } as const;

/** The ship's outlines, in its own units. */
const OUTLINES: ShipOutlines = {
  hull: hullOutline(),
  fins: [finOutline(-1), finOutline(1)],
};

/** Where the ship's window lies, which its pilot sits in: how far along the ship its middle is, and its radius, in field units. */
export const WINDOW = {
  x: OWN_WINDOW.x * SHIP_UNIT,
  radius: OWN_WINDOW.radius * SHIP_UNIT,
} as const;

/** How far the ship's frames reach from its middle, its rings the farthest, in field units. */
export const SHIP_REACH = 2;

/** How far behind the ship's middle its flame's base is, in field units. */
export const FLAME_BEHIND = -FLAME_BASE * SHIP_UNIT;

/** Returns how long the flame is drawn at a thrust from 0 to 1, as a share of its frame's: a little at none, all of it at full. */
export function flameShare(thrust: number): number {
  const full = FLAME_LENGTH.least + FLAME_LENGTH.more;
  return (FLAME_LENGTH.least + FLAME_LENGTH.more * thrust) / full;
}

/** Returns how far behind the ship's middle its flame's tip is at a thrust from 0 to 1, in field units, where its exhaust streams from. */
export function flameTip(thrust: number): number {
  const length = FLAME_LENGTH.least + FLAME_LENGTH.more * thrust;
  return FLAME_BEHIND + length * SHIP_UNIT;
}

/** Returns the hull's outline, from its nose round its right side and back. */
function hullOutline(): readonly Point[] {
  const nose = { x: NOSE, y: 0 };
  const right = { x: -0.55, y: 0.66 };
  const left = { x: -0.55, y: -0.66 };
  return [
    ...cubicPoints(nose, { x: 1.05, y: 0.55 }, { x: 0.15, y: 0.78 }, right),
    ...cubicPoints(right, { x: -1.08, y: 0.58 }, { x: -1.08, y: -0.58 }, left),
    ...cubicPoints(left, { x: 0.15, y: -0.78 }, { x: 1.05, y: -0.55 }, nose),
  ];
}

/** Returns a fin's outline, on the side a sign says: below the ship's line for 1, above for -1. */
function finOutline(side: number): readonly Point[] {
  const root = { x: -0.25, y: 0.55 * side };
  const tip = { x: FIN_TIPS, y: 1 * side };
  return [
    root,
    ...quadraticPoints(root, { x: -0.7, y: 1.05 * side }, tip),
    ...quadraticPoints(
      tip,
      { x: -1.05, y: 0.6 * side },
      { x: -0.8, y: 0.3 * side },
    ),
  ];
}

/** Returns the flame's outline at full thrust, in the ship's own units. */
function flameOutline(): readonly Point[] {
  const length = FLAME_LENGTH.least + FLAME_LENGTH.more;
  const reach = FLAME_BASE - length;
  const bend = FLAME_BASE - 0.1 - 0.55 * (length - 0.1);
  const top = { x: FLAME_BASE, y: -0.3 };
  const tip = { x: reach, y: 0 };
  return [
    top,
    ...quadraticPoints(top, { x: bend, y: -0.2 }, tip),
    ...quadraticPoints(tip, { x: bend, y: 0.2 }, { x: FLAME_BASE, y: 0.3 }),
  ];
}

/** Returns the frames of the ship: itself, its flame, and the rings that guard it. */
export function shipFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const own = SHIP_UNIT * scale.unit;
  const outline = outlineWidth(scale);
  const body = (points: readonly Point[]): readonly Point[] =>
    placed(points, own);
  const parts = [...OUTLINES.fins, OUTLINES.hull].flatMap((points) => [
    polygon(outward(body(points), outline), palette.outline),
    polygon(body(points), palette.accent),
  ]);
  return [
    centered(SHIP_FRAMES.ship, [
      ...parts,
      circle(
        WINDOW.x * scale.unit,
        0,
        WINDOW.radius * scale.unit,
        palette.field,
      ),
    ]),
    centered(SHIP_FRAMES.flame, [
      polygon(placed(flameOutline(), own, -FLAME_BASE * own), palette.flame),
    ]),
    centered(
      SHIP_FRAMES.guard,
      dashedRing(
        RINGS.guard.radius * scale.unit,
        widthOf(RINGS.guard.width, scale),
        {
          dash: GUARD_DASH.dash * scale.unit,
          gap: GUARD_DASH.gap * scale.unit,
        },
        palette.accent,
      ),
    ),
    centered(SHIP_FRAMES.shield, [
      ring(
        0,
        0,
        RINGS.shield.radius * scale.unit,
        widthOf(RINGS.shield.width, scale),
        palette.accent,
      ),
    ]),
  ];
}
