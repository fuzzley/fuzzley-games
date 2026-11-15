// The field's energy, as the art kit's `fx.mjs` draws it
// (`docs/asteroid-breaker-uplift/art/lib/fx.mjs`): the tones a glowing
// thing is drawn in; the soft halo in each glowing thing's own color under
// it, under plain alpha, never an additive blend, as the kit's `glow()`
// draws one, which the scene shows as an image of one soft disc, tinted,
// turned, scaled and faded; each weapon's shot; the muzzle's flash; and
// the halo of the pod's flame.

import { clamp } from "@fz/core/math";
import { recordOf } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
  placed,
  polygon,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";
import { ROCK_KIND_IDS } from "../../rules/catalog/rocks";
import { WEAPON_IDS, type WeaponId } from "../../rules/catalog/weapons";
import { ROCK_OUTLINES, type Rock } from "../../rules/rocks/rocks";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { flameShare } from "./pod_art";
import { rockShape, sizesOf } from "./rock_art";
import type { RockGlow, RockShape } from "./rocks/rock_shape";
import { MOST_LINE } from "./shapes";

/**
 * Describes a soft halo a thing gives off, about the thing's middle as it
 * points along x, in field units: an ellipse fading to nothing, as long as
 * twice its reach along its way and as wide as twice its reach across it.
 */
export interface Halo {
  /** How far it reaches along its way, from its own middle. */
  readonly along: number;
  /** How far it reaches across its way. */
  readonly across: number;
  /** How far its middle lies from the thing's, along its way. */
  readonly ahead: number;
  /** How far its way is turned from the way the thing points, in radians. */
  readonly turn: number;
  /** How strongly it shows at its middle, from 0 to 1, before the palette's {@link BeltPalette.haloStrength}. */
  readonly strength: number;
}

/** Returns a round halo of a reach and a strength, about a thing's middle. */
export function roundHalo(reach: number, strength: number): Halo {
  return { along: reach, across: reach, ahead: 0, turn: 0, strength };
}

/**
 * Returns how opaque a halo of a strength shows in a palette: its own
 * strength times the palette's, as much as an image shows at most.
 */
export function haloAlpha(strength: number, palette: BeltPalette): number {
  return clamp(strength * palette.haloStrength, 0, 1);
}

/** Describes a halo a rock gives off, and whose light it is. */
export interface RockHalo extends Halo {
  /** Whose light it is, which the palette colors (`rockGlows`): a volatile rock's core or a crystal's gems. */
  readonly tone: RockGlow["tone"];
}

/** Returns a rock's glow as a halo, about its middle as it lies unturned, in field units. */
function haloOfGlow(glow: RockGlow, radius: number): RockHalo {
  return {
    tone: glow.tone,
    along: glow.r * radius,
    across: glow.r * radius,
    ahead: Math.hypot(glow.at.x, glow.at.y) * radius,
    turn: Math.atan2(glow.at.y, glow.at.x),
    strength: glow.strength,
  };
}

/** Each outline of each kind and size of rock's halos, by its shape, made once. */
const ROCK_HALOS: ReadonlyMap<RockShape, readonly RockHalo[]> = new Map(
  ROCK_KIND_IDS.flatMap((kind) =>
    sizesOf(kind).flatMap((size) =>
      Array.from({ length: ROCK_OUTLINES }, (_, outline) => {
        const shape = rockShape({ kind, size, outline });
        const radius = ROCK_RADIUS[size];
        return [
          shape,
          shape.glows.map((glow) => haloOfGlow(glow, radius)),
        ] as const;
      }),
    ),
  ),
);

/**
 * Returns the halos a rock gives off, a crystal's gems' and a volatile
 * rock's core's, each about the rock's middle as it lies unturned, so they
 * turn with it; none for a rock that doesn't glow.
 */
export function rockHalos(
  rock: Pick<Rock, "kind" | "size" | "outline">,
): readonly RockHalo[] {
  return ROCK_HALOS.get(rockShape(rock)) ?? [];
}

/** The most halos any rock gives off, which the scene makes as many images for in each rock's slot. */
export const MOST_ROCK_HALOS = Math.max(
  ...[...ROCK_HALOS.values()].map((halos) => halos.length),
);

/** White, which a glowing thing's middle is lifted toward on a dark field. */
const WHITE = 0xffffff;

/** Describes the tones a glowing thing of a color is drawn in, as the kit's `energyOf()` gives them. */
export interface Energy {
  /** Its middle, the brightest of it on a dark field and its densest ink on a light one. */
  readonly hot: number;
  /** Its own color, round its middle. */
  readonly body: number;
  /** The color its halo is tinted in. */
  readonly halo: number;
}

/**
 * Returns the tones a glowing thing of a color is drawn in, in a palette:
 * on a dark field its middle lifted nearly to white and its body a little
 * toward it, and on a light one, already the brightest thing there is, its
 * middle sunk toward the field's text and its body its own color, as ink
 * on paper; its halo is its own color in either.
 */
export function energyOf(
  color: number,
  palette: Pick<BeltPalette, "mode" | "shot">,
): Energy {
  return palette.mode === "light"
    ? { hot: mixTone(color, palette.shot, 0.45), body: color, halo: color }
    : {
        hot: mixTone(color, WHITE, 0.82),
        body: mixTone(color, WHITE, 0.22),
        halo: color,
      };
}

/**
 * Describes a weapon's shot as the kit cuts it (`makeShot()` in
 * `art/lib/fx.mjs`), in field units about the middle it hits with, pointing
 * along x.
 */
export interface ShotShape {
  /** Its body, outlined in the field's color and filled in its energy's body. */
  readonly body: readonly Point[];
  /** Its bright middle, in the field's text, the clearest color there is. */
  readonly core: readonly Point[];
  /** Its tail: how far it reaches behind the middle, and how far either side of its way at its foot. */
  readonly tail: { readonly reach: number; readonly half: number };
  /** Its halo, in the accent. */
  readonly halo: Halo;
  /** The lines flaring back from its sides, drawn only as fine marks. */
  readonly barbs: readonly (readonly Point[])[];
}

/** Returns points written as pairs, across and down, as the kit writes them. */
function pointsOf(pairs: readonly (readonly [number, number])[]): Point[] {
  return pairs.map(([x, y]) => ({ x, y }));
}

/** Returns a capsule along x, round at its nose and flat at its back, as the kit's `bolt()`. */
function bolt(back: number, nose: number, half: number): Point[] {
  const round = Array.from({ length: 7 }, (_, i) => {
    const a = -TURN / 4 + (i / 6) * (TURN / 2);
    return { x: nose - half + Math.cos(a) * half, y: Math.sin(a) * half };
  });
  return [{ x: back, y: -half }, ...round, { x: back, y: half }];
}

/**
 * Each weapon's shot, as the kit cuts it: the gun's bolt, Spread's three
 * lighter ones, Rapid's small dart and Lance's long needle with its barbs.
 */
export const SHOTS: Readonly<Record<WeaponId, ShotShape>> = {
  gun: {
    body: bolt(-0.42, 0.52, 0.18),
    core: bolt(-0.26, 0.42, 0.085),
    tail: { reach: 1.9, half: 0.16 },
    halo: { along: 1.05, across: 0.62, ahead: 0.05, turn: 0, strength: 0.95 },
    barbs: [],
  },
  spread: {
    body: bolt(-0.3, 0.4, 0.14),
    core: bolt(-0.18, 0.32, 0.065),
    tail: { reach: 1.25, half: 0.12 },
    halo: { along: 0.8, across: 0.46, ahead: 0.04, turn: 0, strength: 0.7 },
    barbs: [],
  },
  rapid: {
    body: pointsOf([
      [0.46, 0],
      [-0.24, 0.24],
      [-0.06, 0],
      [-0.24, -0.24],
    ]),
    core: pointsOf([
      [0.34, 0],
      [-0.1, 0.11],
      [-0.02, 0],
      [-0.1, -0.11],
    ]),
    tail: { reach: 1.15, half: 0.07 },
    halo: { along: 0.72, across: 0.5, ahead: 0.05, turn: 0, strength: 0.8 },
    barbs: [],
  },
  lance: {
    body: pointsOf([
      [1.6, 0],
      [0.95, 0.19],
      [-0.9, 0.09],
      [-1.25, 0],
      [-0.9, -0.09],
      [0.95, -0.19],
    ]),
    core: pointsOf([
      [1.42, 0],
      [0.92, 0.08],
      [-0.85, 0.035],
      [-0.85, -0.035],
      [0.92, -0.08],
    ]),
    tail: { reach: 2.3, half: 0.07 },
    halo: { along: 2, across: 0.56, ahead: 0.2, turn: 0, strength: 0.9 },
    barbs: [
      pointsOf([
        [0.78, 0.2],
        [0.42, 0.42],
      ]),
      pointsOf([
        [0.78, -0.2],
        [0.42, -0.42],
      ]),
    ],
  },
};

/**
 * The tail's three layers, back to front: how far each reaches, as a share
 * of the tail's reach, and how opaque it is, so it is strongest nearest the
 * shot, where the three overlap.
 */
const TAIL_LAYERS = [
  { share: 1, alpha: 0.3 },
  { share: 0.62, alpha: 0.45 },
  { share: 0.3, alpha: 0.6 },
] as const;

/** Where the tail's foot lies behind the middle, in field units. */
const TAIL_FOOT = 0.1;

/**
 * How far a shot's outline reaches past its body, in field units, where that
 * is more than a CSS pixel: half the kit's line round it, joined round, so
 * it holds that far out at the dart's and the needle's sharp corners too.
 */
export const SHOT_OUTLINE = 0.08;

/** How wide a lance's barbs are drawn, in field units, where that is more than a CSS pixel. */
const BARB_WIDTH = 0.09;

/** Each weapon's shot's frame's name. */
export const SHOT_FRAMES: Readonly<Record<WeaponId, string>> = recordOf(
  WEAPON_IDS,
  (weapon) => `shot-${weapon}`,
);

/** Returns the farthest of some points from the origin. */
function farthest(points: readonly Point[]): number {
  return Math.max(0, ...points.map(({ x, y }) => Math.hypot(x, y)));
}

/**
 * How far each weapon's shot's frame reaches from its middle, in field
 * units: its tail, its body with its outline at the widest a line gets, and
 * its barbs with half of it.
 */
export const SHOT_REACH: Readonly<Record<WeaponId, number>> = recordOf(
  WEAPON_IDS,
  (weapon) => {
    const { body, tail, barbs } = SHOTS[weapon];
    return Math.max(
      tail.reach,
      Math.hypot(TAIL_FOOT, tail.half),
      farthest(body) + MOST_LINE,
      farthest(barbs.flat()) + MOST_LINE / 2,
    );
  },
);

/**
 * Returns a weapon's shot's frame, drawn as the kit's `shotSvg()` draws it
 * but its halo, which the scene shows: its tail in three layers of its
 * body's tone, its body outlined in the field's color, a line round it
 * joined round as the kit's is, its middle in the field's text, and a
 * lance's barbs where the field keeps its fine marks.
 */
function shotArt(
  weapon: WeaponId,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): ArtFrame {
  const { body, core, tail, barbs } = SHOTS[weapon];
  const tones = energyOf(palette.accent, palette);
  const tails = TAIL_LAYERS.map(({ share, alpha }) =>
    polygon(
      placed(
        [
          { x: -TAIL_FOOT, y: -tail.half },
          { x: -tail.reach * share, y: 0 },
          { x: -TAIL_FOOT, y: tail.half },
        ],
        scale.unit,
      ),
      { color: tones.body, alpha },
    ),
  );
  const outlined = placed(body, scale.unit);
  const rim = {
    color: palette.outline,
    width: 2 * widthOf(SHOT_OUTLINE, scale),
  };
  const pen = { color: tones.body, width: widthOf(BARB_WIDTH, scale) };
  const flares: readonly DrawCommand[] = fine
    ? barbs.flatMap((barb) => stroke(placed(barb, scale.unit), pen))
    : [];
  return centered(SHOT_FRAMES[weapon], [
    ...tails,
    polygon(outlined, { color: palette.outline }),
    ...stroke([...outlined, ...outlined.slice(0, 1)], rim),
    polygon(outlined, { color: tones.body }),
    polygon(placed(core, scale.unit), { color: palette.shot }),
    ...flares,
  ]);
}

/** The muzzle's flash's frame's name. */
export const MUZZLE_FRAME = "muzzle";

/** Describes a beat of the muzzle's flash: how large it shows, how opaque, and how strongly its halo shows. */
export interface MuzzleBeat {
  readonly size: number;
  readonly alpha: number;
  readonly glow: number;
}

/**
 * The muzzle's flash's two beats, as the kit's `muzzleFlashSvg()` draws
 * them: whole, then the same star smaller and fainter, fading, so a still
 * of either reads as a flash. Its frame is the first; the second shows it
 * scaled and faded.
 */
export const MUZZLE_BEATS: readonly [MuzzleBeat, MuzzleBeat] = [
  { size: 1, alpha: 1, glow: 0.95 },
  { size: 0.64, alpha: 0.55, glow: 0.5 },
];

/** The muzzle's flash's star, about the muzzle, pointing along x, in field units. */
const MUZZLE_STAR = pointsOf([
  [1.3, 0],
  [0.3, 0.13],
  [0.52, 0.62],
  [0.08, 0.24],
  [-0.12, 0],
  [0.08, -0.24],
  [0.52, -0.62],
  [0.3, -0.13],
]);

/** The muzzle's flash's bright middle, in field units. */
const MUZZLE_CORE = pointsOf([
  [0.85, 0],
  [0.18, 0.1],
  [0, 0],
  [0.18, -0.1],
]);

/** How far the muzzle's flash's frame reaches from the muzzle, in field units, whole. */
export const MUZZLE_REACH = farthest(MUZZLE_STAR);

/** Returns the halo of a beat of the muzzle's flash, ahead of the muzzle, in the accent. */
export function muzzleHalo(beat: MuzzleBeat): Halo {
  return {
    along: 1.05 * beat.size,
    across: 1.05 * beat.size,
    ahead: 0.25 * beat.size,
    turn: 0,
    strength: beat.glow,
  };
}

/**
 * The halo of the pod's flame behind each engine, as the kit's pod draws
 * it: the flame's length at full thrust, in field units, as `pod_art.ts`'
 * flame frame draws it; how far behind its engine the halo's middle lies
 * and how far it reaches past the engine's width, as shares of the flame's
 * length; and how opaque it is in each mode, the kit's opacity for it,
 * which the palette's halo strength doesn't weaken again, the disc fading
 * as it does, as a rock's halo takes the kit's opacity alone.
 */
export const FLAME_GLOW = {
  full: 1.15,
  behind: 0.4,
  reach: 0.8,
  alpha: { light: 0.6, dark: 0.75 },
} as const;

/** Describes a halo written anew for each thing shown, so drawing makes nothing. */
export type WrittenHalo = { -readonly [K in keyof Halo]: Halo[K] };

/**
 * Writes the halo of the pod's flame behind an engine, at a thrust, from 0
 * to 1, into a record and returns it, about the pod's middle as it points:
 * round, as long as the flame, its middle a little behind the engine.
 */
export function flameHalo(
  engine: { readonly at: Point; readonly width: number },
  thrust: number,
  palette: Pick<BeltPalette, "mode" | "haloStrength">,
  into: WrittenHalo,
): Halo {
  const { full, behind, reach, alpha } = FLAME_GLOW;
  const flame = full * flameShare(thrust);
  const x = engine.at.x - behind * flame;
  into.along = reach * flame + engine.width;
  into.across = into.along;
  into.ahead = Math.hypot(x, engine.at.y);
  into.turn = Math.atan2(engine.at.y, x);
  into.strength = alpha[palette.mode] / palette.haloStrength;
  return into;
}

/** Returns the muzzle's flash's frame, whole: its star in the accent's body tone, its middle in the field's text. */
function muzzleArt(palette: BeltPalette, scale: ArtScale): ArtFrame {
  const tones = energyOf(palette.accent, palette);
  return centered(MUZZLE_FRAME, [
    polygon(placed(MUZZLE_STAR, scale.unit), { color: tones.body }),
    polygon(placed(MUZZLE_CORE, scale.unit), { color: palette.shot }),
  ]);
}

/**
 * Returns the frames of the field's energy, in a palette at a scale, the
 * fine marks only where the field keeps them: each weapon's shot and the
 * muzzle's flash.
 */
export function energyFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  return [
    ...WEAPON_IDS.map((weapon) => shotArt(weapon, palette, scale, fine)),
    muzzleArt(palette, scale),
  ];
}
