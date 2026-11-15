// What drifts on the field to be caught, and what crosses it, as the art
// kit's `things.mjs` draws them
// (`docs/asteroid-breaker-uplift/art/lib/things.mjs`): each pickup as a
// round glass orb, its rim saying its group and its symbol bold in its
// middle, breathing and glowing while it floats; and the comet, a long cut
// wedge with a glowing tail, and its warning at the edge it comes in by.

import { createRandom } from "@fz/core/random";
import { recordOf } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  arcPoints,
  bandAlong,
  bounded,
  centered,
  circle,
  line,
  placed,
  polygon,
  rect,
  ring,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";
import {
  type EffectKind,
  PICKUP_IDS,
  type PickupId,
  pickup,
} from "../../rules/catalog/pickups";
import { type Floating, blinks } from "../../rules/rocks/drops";
import type { BeltPalette } from "../colors/palette";
import { inLight } from "../colors/rock_light";
import { mixTone } from "../colors/tones";
import { GOLDEN_ANGLE, blinkShown, breathShare } from "../effects/flourish";
import {
  CHEVRON_LITS,
  type ChevronLit,
  type LitChevron,
} from "../field/warning";
import { type Halo, energyOf } from "./energy";
import { type LitFrame, type Painted, flat, litFrame } from "./rock_art";
import { litBy } from "./rocks/light";
import {
  type Facing,
  between,
  facingOf,
  pointBetween,
  polar,
} from "./rocks/space";
import { MOST_LINE, MOST_MITER, outlineWidth, outward } from "./shapes";
import { SYMBOLS } from "./symbols";

/** An orb's sizes, in field units, as the kit has them: its radius, its rim's width, how far its halo reaches and its symbol's square. */
export const ORB = {
  radius: 1.1,
  rim: 0.17,
  halo: 2.05,
  symbol: 1.32,
} as const;

/**
 * How far a pickup's frame reaches from its middle, in field units, before
 * it breathes: its orb, and its outline at the widest a line gets.
 */
export const PICKUP_REACH = ORB.radius + MOST_LINE;

/** Names how an orb's rim says its pickup's group: one ring, a ring doubled, or four arcs. */
type OrbRim = "ring" | "double" | "arcs";

/**
 * The rim of each group's orb, by its effect's kind: one ring for a weapon,
 * doubled for what guards the ship, and four arcs for what changes the
 * field.
 */
const ORB_RIMS: Readonly<Record<EffectKind, OrbRim>> = {
  weapon: "ring",
  guard: "double",
  pull: "arcs",
  pace: "arcs",
};

/** How large an orb's symbol's square is against {@link ORB}'s, by its rim, so a doubled ring or the arcs' ends leave it room. */
const SYMBOL_SHARE: Readonly<Record<OrbRim, number>> = {
  ring: 1,
  double: 0.86,
  arcs: 0.96,
};

/** White, which an orb's glints are drawn in. */
const WHITE = 0xffffff;

/** How strongly the deeper glass shows over the glass, as the kit lays it. */
const DEEP_ALPHA = 0.55;

/** Describes the colors an orb is drawn in, mixed from the palette's field, accent and text. */
export interface OrbColors {
  /** Its glass, the field tinted with the accent. */
  readonly glass: number;
  /**
   * The glass deeper in it, a fine mark, as it shows over the glass: the
   * field tinted more with the accent, laid at {@link DEEP_ALPHA}, mixed
   * here so the disc is drawn whole.
   */
  readonly deep: number;
  /** Its symbol: the accent sunk toward the field's text on a light field, lifted toward white on a dark one. */
  readonly ink: number;
  /** The glint on its rim: the rim's accent nearly white. */
  readonly glint: number;
}

/** Returns the colors an orb is drawn in, in a palette, as the kit's `orbSvg()` mixes them. */
export function orbColors(palette: BeltPalette): OrbColors {
  const light = palette.mode === "light";
  const glass = mixTone(palette.field, palette.accent, light ? 0.13 : 0.26);
  const inner = mixTone(palette.field, palette.accent, light ? 0.24 : 0.4);
  return {
    glass,
    deep: mixTone(glass, inner, DEEP_ALPHA),
    ink: light
      ? mixTone(palette.accent, palette.shot, 0.42)
      : mixTone(palette.accent, WHITE, 0.74),
    glint: mixTone(palette.accent, WHITE, 0.9),
  };
}

/** The names of the pickups' frames, made once, so finding one makes nothing. */
export const PICKUP_FRAMES: Readonly<Record<PickupId, string>> = recordOf(
  PICKUP_IDS,
  (id) => `pickup-${id}`,
);

/** Returns the name of a pickup's frame, as it drifts. */
export function pickupFrame(id: PickupId): string {
  return PICKUP_FRAMES[id];
}

/**
 * Returns an orb's rim about its middle, in the accent: one ring, doubled
 * within, or four arcs cut at the top, the bottom and each side; a doubled
 * ring is one wider ring without the fine marks, as the kit draws it small.
 */
function rimOf(
  kind: OrbRim,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  const radius = ORB.radius * scale.unit;
  const rim = widthOf(ORB.rim, scale);
  const at = radius - rim / 2;
  const color = palette.accent;
  if (kind === "arcs") {
    const gap = fine ? 0.24 : 0.3;
    return Array.from({ length: 4 }, (_, i) => {
      const from = (i / 4) * TURN + gap;
      return stroke(arcPoints(ORIGIN, at, from, from + TURN / 4 - 2 * gap), {
        color,
        width: rim,
      });
    }).flat();
  }
  if (kind === "double" && !fine) {
    return [ring(ORIGIN, radius - rim * 0.85, { color, width: rim * 1.7 })];
  }
  const outer = ring(ORIGIN, at, { color, width: rim });
  if (kind === "ring") return [outer];
  return [
    outer,
    ring(ORIGIN, radius - rim - 0.14 * scale.unit, {
      color,
      width: widthOf(0.08, scale),
    }),
  ];
}

/**
 * Returns a pickup's frame, as the kit's `orbSvg()` draws it but its halo,
 * which the scene shows: a glass ball outlined in the field's color, the
 * glass deeper within it as a fine mark, its rim by its group, its symbol in
 * its ink, the cuts of a symbol drawn in the glass, and the glint on its rim
 * where the field's light falls, with a fine dot of it in the glass.
 */
function orbArt(
  id: PickupId,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): ArtFrame {
  const { unit, pixelRatio } = scale;
  const radius = ORB.radius * unit;
  const rim = widthOf(ORB.rim, scale);
  const colors = orbColors(palette);
  const kind = ORB_RIMS[pickup(id).effect.kind];
  const side = ORB.symbol * unit * SYMBOL_SHARE[kind];
  const square = { x: -side / 2, y: -side / 2, width: side, height: side };
  const inner: readonly DrawCommand[] = fine
    ? [
        circle({ x: 0.07 * radius, y: 0.1 * radius }, 0.74 * radius, {
          color: colors.deep,
        }),
      ]
    : [];
  const dot: readonly DrawCommand[] = fine
    ? [
        circle(
          polar(TURN * 0.615, 0.6 * radius),
          Math.max(0.8 * pixelRatio, 0.07 * unit),
          { color: WHITE, alpha: palette.mode === "light" ? 0.9 : 0.7 },
        ),
      ]
    : [];
  return centered(PICKUP_FRAMES[id], [
    circle(ORIGIN, radius + outlineWidth(scale), { color: palette.outline }),
    circle(ORIGIN, radius, { color: colors.glass }),
    ...inner,
    ...rimOf(kind, palette, scale, fine),
    ...SYMBOLS[id](square, {
      color: colors.ink,
      width: (fine ? 1.3 : 1.5) * pixelRatio,
      ground: { color: colors.glass, width: pixelRatio },
    }),
    ...stroke(arcPoints(ORIGIN, radius - rim / 2, TURN * 0.555, TURN * 0.68), {
      color: colors.glint,
      width: widthOf(ORB.rim * 0.62, scale),
    }),
    ...dot,
  ]);
}

/**
 * Returns the frames of what drifts on the field to be caught and what
 * crosses it, in a palette at a scale, the fine marks only where the field
 * keeps them: each pickup's orb, and the comet's and its warning's, but its
 * head, which the rocks' atlas lights ({@link cometHeadFrame}).
 */
export function thingsFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  return [
    ...PICKUP_IDS.map((id) => orbArt(id, palette, scale, fine)),
    ...cometFrames(palette, scale, fine),
  ];
}

/** Describes how an orb shows at a moment, written for each orb drawn. */
export interface OrbLook {
  /** How large it is drawn against its frame. */
  scale: number;
  /** How opaque it is drawn. */
  alpha: number;
  /** How far its halo reaches from its middle, in field units. */
  haloReach: number;
  /** How strongly its halo shows, before the palette's strength, or 0 for none. */
  haloStrength: number;
}

/** How much an orb swells as it breathes in, its halo widens with it, and its halo strengthens, as the kit has them. */
const ORB_BREATH = { swell: 0.07, widen: 0.1, glow: 0.28 } as const;

/** How strongly an orb's halo shows breathed out, before {@link ORB_BREATH}'s glow. */
const ORB_GLOW = 0.72;

/** How opaque an orb shows while it is dim, blinking off in its last seconds. */
export const ORB_DIM = 0.5;

/** Returns a new record of how an orb shows, at rest, for {@link orbLook} to write. */
export function restingLook(): OrbLook {
  return { scale: 1, alpha: 1, haloReach: ORB.halo, haloStrength: ORB_GLOW };
}

/**
 * Writes how an orb shows at a time, in seconds, its slot's phase on: as it
 * breathes, from out to in, where motion is welcome, else at rest, breathed
 * out; and, in its last seconds, dim for the off half of each blink, with no
 * halo, rather than gone, as the kit draws it.
 */
export function orbLook(
  blinking: boolean,
  seconds: number,
  phase: number,
  motion: boolean,
  into: OrbLook,
): OrbLook {
  const breath = breathShare(seconds, phase, motion);
  const dim = blinking && !blinkShown(seconds);
  into.scale = 1 + ORB_BREATH.swell * breath;
  into.alpha = dim ? ORB_DIM : 1;
  into.haloReach = ORB.halo * (1 + ORB_BREATH.widen * breath) * into.scale;
  into.haloStrength = dim ? 0 : ORB_GLOW + ORB_BREATH.glow * breath;
  return into;
}

/**
 * Writes how a pickup floating on the field shows at a time, in seconds, by
 * its record's slot, each a phase apart, as {@link orbLook} says, so its orb
 * and its halo breathe and blink as one.
 */
export function pickupLook(
  floating: Readonly<Floating>,
  slot: number,
  seconds: number,
  motion: boolean,
  into: OrbLook,
): OrbLook {
  return orbLook(blinks(floating), seconds, slot * GOLDEN_ANGLE, motion, into);
}

/**
 * Describes the comet, flying along x about the middle it hits with, in
 * field units, as the kit's `makeComet()` cuts it.
 */
export interface CometShape {
  /** Its head's. */
  readonly outline: readonly Point[];
  /** Its head's facets, each a triangle, and the way each faces. */
  readonly facets: readonly {
    readonly points: readonly Point[];
    readonly facing: Facing;
  }[];
  /** Its leading edge, which glows. */
  readonly edge: readonly Point[];
  /** The streaks of its tail behind its head: each across its way, where it starts, how far back it runs and how wide it is at its start. */
  readonly tail: readonly {
    readonly y: number;
    readonly from: number;
    readonly length: number;
    readonly half: number;
  }[];
  /** The thin lines beside it that say its speed. */
  readonly streaks: readonly {
    readonly y: number;
    readonly from: number;
    readonly length: number;
  }[];
}

/**
 * Returns the comet cut from a seed, as the kit cuts it, its corners jittered
 * as the kit's `seeded()` jitters them: a long, sharp wedge in facets
 * rising to two ridges, with a tail of streaks behind it.
 */
export function makeComet(seed: number): CometShape {
  const random = createRandom(seed * 577 + 31);
  const j = (): number => between(random, -0.05, 0.05);
  const nose = { x: 1.8, y: 0 };
  const s1 = { x: -0.12 + j(), y: -0.84 + j() };
  const b1 = { x: -1.08 + j(), y: -0.5 + j() };
  const notch = { x: -0.66, y: j() };
  const b2 = { x: -1.02 + j(), y: 0.56 + j() };
  const s2 = { x: -0.2 + j(), y: 0.86 + j() };
  const r1 = { x: 0.6, y: j() };
  const r2 = { x: -0.32, y: j() };
  const heights = new Map<Point, number>([
    [r1, 0.5],
    [r2, 0.72],
  ]);
  const facet = (
    a: Point,
    b: Point,
    c: Point,
  ): CometShape["facets"][number] => ({
    points: [a, b, c],
    facing: facingOf(
      a,
      heights.get(a) ?? 0,
      b,
      heights.get(b) ?? 0,
      c,
      heights.get(c) ?? 0,
    ),
  });
  return {
    outline: [nose, s1, b1, notch, b2, s2],
    facets: [
      facet(nose, s1, r1),
      facet(s1, r2, r1),
      facet(s1, b1, r2),
      facet(b1, notch, r2),
      facet(nose, r1, s2),
      facet(s2, r1, r2),
      facet(s2, r2, b2),
      facet(b2, r2, notch),
    ],
    edge: [pointBetween(s1, nose, 0.35), nose, pointBetween(s2, nose, 0.35)],
    tail: [
      { y: 0, from: -0.6, length: 6.4, half: 0.3 },
      { y: -0.36, from: -0.85, length: 4.3, half: 0.17 },
      { y: 0.38, from: -0.85, length: 4.8, half: 0.18 },
      { y: -0.66, from: -0.5, length: 2.6, half: 0.1 },
      { y: 0.68, from: -0.55, length: 3.0, half: 0.1 },
    ],
    streaks: [
      { y: -1.25, from: -0.6, length: 2.2 },
      { y: 1.3, from: -1.4, length: 2.8 },
      { y: -1.0, from: -4.2, length: 1.8 },
      { y: 1.05, from: -5.2, length: 1.6 },
      { y: -1.55, from: -3.2, length: 1.2 },
      { y: 0.2, from: -7.4, length: 1.5 },
    ],
  };
}

/** The comet every wave sends, cut from the kit's first seed. */
export const COMET = makeComet(1);

/** How wide a speed line beside the comet is drawn, in field units. */
const SPEED_LINE = 0.07;

/** How many of its speed lines the comet keeps without its fine marks, as the kit draws it small. */
const SMALL_STREAKS = 3;

/** How wide the comet's glowing edge is drawn, in field units. */
const EDGE_LINE = 0.08;

/** How far past its edges each of the comet's facets is grown, in device pixels, to close the seams between them, as a rock's are. */
const SEAM_PX = 0.5;

/**
 * How far behind the comet's middle its tail's frame's middle lies, in
 * field units, so the frame holds its tail alone.
 */
export const TAIL_BEHIND =
  -(
    Math.min(
      ...COMET.tail.map(({ from, length }) => from - length),
      ...COMET.streaks.map(({ from, length }) => from - length),
    ) +
    Math.max(
      ...COMET.tail.map(({ from }) => from),
      ...COMET.streaks.map(({ from }) => from),
    )
  ) / 2;

/**
 * How far the comet's head's frames reach from its middle, in field units:
 * its nose, and its outline at its widest mitred out as far as an outline
 * may reach, within the margin the comet leaves the field by, so its head
 * is out of sight as it goes.
 */
export const COMET_REACH =
  Math.max(...COMET.outline.map(({ x, y }) => Math.hypot(x, y))) +
  MOST_MITER * MOST_LINE;

/** How far the comet's tail's frame reaches from its own middle, in field units, its widest line and all. */
export const TAIL_REACH =
  Math.max(
    ...COMET.tail.flatMap(({ y, from, length, half }) => [
      Math.hypot(from + TAIL_BEHIND, Math.abs(y) + half),
      Math.hypot(from - length + TAIL_BEHIND, y),
    ]),
    ...COMET.streaks.flatMap(({ y, from, length }) => [
      Math.hypot(from + TAIL_BEHIND, y),
      Math.hypot(from - length + TAIL_BEHIND, y),
    ]),
  ) + MOST_LINE;

/** The names of the comet's frames and its warning's. */
export const COMET_FRAMES = {
  /** Its head, lit as a rock is, in the rocks' atlas. */
  head: "comet-head",
  /** Its glowing leading edge, over its head, a fine mark. */
  edge: "comet-edge",
  /** Its tail, about the tail's own middle, {@link TAIL_BEHIND} behind the comet's. */
  tail: "comet-tail",
  /** Its lane's wash, a sliver, which the scene stretches across the field. */
  lane: "comet-lane",
  /** A run of its lane's dashes, {@link LANE}'s run long, which the scene lays end to end. */
  dashes: "comet-dashes",
  /** How to play's picture of it, its head lit as the field lights it, framed by its head and tail together. */
  picture: "comet-picture",
} as const;

/** The comet's halos, as the kit glows round it: its head's, a little ahead of its middle, and its tail's, long behind it. */
export const COMET_HALOS: Readonly<Record<"head" | "tail", Halo>> = {
  head: { along: 2.1, across: 2.1, ahead: 0.5, turn: 0, strength: 0.75 },
  tail: { along: 4.4, across: 1.25, ahead: -2.6, turn: 0, strength: 0.7 },
};

/** Returns points of the comet in field units as device pixels, about its middle. */
function cometPoints(
  points: readonly Point[],
  scale: ArtScale,
): readonly Point[] {
  return placed(points, scale.unit);
}

/**
 * Returns the comet's head as the rocks' atlas lights it: outlined in the
 * field's color, each facet in the danger color facing its way.
 */
function headPainting(
  palette: BeltPalette,
  scale: ArtScale,
): readonly Painted[] {
  return [
    ...flat([
      polygon(outward(cometPoints(COMET.outline, scale), outlineWidth(scale)), {
        color: palette.outline,
      }),
    ]),
    ...COMET.facets.map(({ points, facing }) => ({
      command: polygon(outward(cometPoints(points, scale), SEAM_PX), {
        color: palette.comet,
      }),
      facing,
    })),
  ];
}

/** Returns the comet's head, in its inks and as its normal map, for the rocks' atlas, which lights it as it lights them. */
export function cometHeadFrame(
  palette: BeltPalette,
  scale: ArtScale,
): LitFrame {
  return litFrame(COMET_FRAMES.head, headPainting(palette, scale));
}

/** Returns the comet's glowing leading edge, in its energy's middle, where the field keeps its fine marks, else nothing. */
function edgeCommands(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly DrawCommand[] {
  if (!fine) return [];
  return stroke(cometPoints(COMET.edge, scale), {
    color: energyOf(palette.comet, palette).hot,
    width: widthOf(EDGE_LINE, scale),
  });
}

/**
 * Says how the comet's tail is drawn: moved on along the comet's way by a
 * distance, in field units, so a frame of it alone lies about its own
 * middle; its streaks as long as a share of theirs; and how many of its
 * speed lines it keeps.
 */
interface TailCut {
  readonly on: number;
  readonly length: number;
  readonly speedLines: number;
}

/** How How to play's picture of the comet cuts its tail: short, with no speed lines, so the comet's head stays large in the picture's small room. */
const PICTURE_TAIL: TailCut = { on: 0, length: 0.4, speedLines: 0 };

/**
 * Returns the comet's tail behind its middle, as the kit draws it but its
 * halo, which the scene shows, cut as it says: its speed lines, and each
 * streak in two layers of its energy's body, the first with its middle in
 * its energy's middle.
 */
function tailCommands(
  palette: BeltPalette,
  scale: ArtScale,
  cut: TailCut,
): readonly DrawCommand[] {
  const { body, hot } = energyOf(palette.comet, palette);
  const at = (x: number, y: number): Point => ({
    x: (x + cut.on) * scale.unit,
    y: y * scale.unit,
  });
  const lines = COMET.streaks
    .slice(0, cut.speedLines)
    .map(({ y, from, length }) =>
      line(at(from, y), at(from - length, y), {
        color: body,
        width: widthOf(SPEED_LINE, scale),
        alpha: 0.4,
      }),
    );
  const streaks = COMET.tail.flatMap(({ y, from, length, half }, i) => {
    const reach = length * cut.length;
    const shape = (share: number): readonly Point[] => [
      at(from, y - half),
      at(from - reach * share, y),
      at(from, y + half),
    ];
    const layers = [
      polygon(shape(1), { color: body, alpha: 0.28 }),
      polygon(shape(0.6), { color: body, alpha: 0.4 }),
    ];
    if (i > 0) return layers;
    // The first streak's middle, its sides drawn in toward its line.
    const narrow = (1 - 0.45) * half;
    return [
      ...layers,
      polygon(
        [
          at(from, y - narrow),
          at(from - reach * 0.34, y),
          at(from, y + narrow),
        ],
        { color: hot, alpha: 0.9 },
      ),
    ];
  });
  return [...lines, ...streaks];
}

/**
 * The comet's warning's chevrons, as the kit lays them, pointing into the
 * field: how far in from the edge each lies and how large it is, in field
 * units, and how strongly it shows held still, where motion isn't welcome.
 */
const CHEVRONS = [
  { x: 0.95, size: 1, still: 1 },
  { x: 2, size: 0.86, still: 0.7 },
  { x: 3.05, size: 0.72, still: 0.45 },
] as const;

/** How strongly a chevron shows while another is lit. */
const CHEVRON_DIM = 0.32;

/** Returns a chevron's halo while it is lit, as the kit glows round it, ahead of the edge its warning stands on, in its own place. */
function chevronHalo({ x, size }: (typeof CHEVRONS)[number]): Halo {
  return {
    along: 1.5 * size,
    across: 1.5 * size,
    ahead: x,
    turn: 0,
    strength: 0.8,
  };
}

/** Each chevron's halo while it is lit, from the edge in. */
export const CHEVRON_HALOS: Readonly<Record<LitChevron, Halo>> = {
  0: chevronHalo(CHEVRONS[0]),
  1: chevronHalo(CHEVRONS[1]),
  2: chevronHalo(CHEVRONS[2]),
};

/**
 * The sizes of the comet's warning, in field units: its bar on the edge,
 * how far it reaches each way along the edge and how wide it is, a
 * chevron's line, and the lit chevron's middle against it, on a dark field.
 */
const WARNING = { reach: 1.15, bar: 0.36, pen: 0.3, hot: 0.36 } as const;

/** How far the comet's warning reaches from the point on the edge it stands at, in field units: its farthest chevron's tip, mitred, and its bar's ends. */
export const WARNING_REACH = Math.max(
  ...CHEVRONS.map(
    ({ x, size }) => x + 0.4 * size + (WARNING.pen / 2) * Math.SQRT2,
  ),
  Math.hypot(WARNING.bar / 2, WARNING.reach),
);

/** Returns the name of the comet's warning's frame with a chevron lit, or held still. */
export function warningFrame(lit: ChevronLit): string {
  return `warning-${lit ?? "still"}`;
}

/** Returns the points of a chevron's line about the warning's point on the edge, in device pixels. */
function chevronPoints(
  chevron: (typeof CHEVRONS)[number],
  scale: ArtScale,
): readonly Point[] {
  const { x, size } = chevron;
  return placed(
    [
      { x: x - 0.4 * size, y: -0.8 * size },
      { x: x + 0.4 * size, y: 0 },
      { x: x - 0.4 * size, y: 0.8 * size },
    ],
    scale.unit,
  );
}

/**
 * Returns the comet's warning about the point on the field's edge it will
 * come in by, pointing along x into the field, as the kit's `warningSvg()`
 * draws it but its lane and its halo, which the scene shows: a bar on the
 * edge and three chevrons in the danger color, each a band mitred at its
 * tip at its own strength, the lit one whole with its middle in its
 * energy's on a dark field, or all three held still, each fainter.
 */
function warningCommands(
  lit: ChevronLit,
  palette: BeltPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const color = palette.comet;
  const bar = Math.max(2 * scale.pixelRatio, WARNING.bar * scale.unit);
  const pen = WARNING.pen * scale.unit;
  const reach = WARNING.reach * scale.unit;
  const { hot } = energyOf(color, palette);
  return [
    rect({ x: -bar / 2, y: -reach, width: bar, height: 2 * reach }, { color }),
    ...CHEVRONS.flatMap((chevron, i) => {
      const points = chevronPoints(chevron, scale);
      const alpha = lit === null ? chevron.still : lit === i ? 1 : CHEVRON_DIM;
      const band = polygon(bandAlong(points, pen), {
        color,
        ...(alpha === 1 ? {} : { alpha }),
      });
      return lit === i && palette.mode === "dark"
        ? [band, polygon(bandAlong(points, pen * WARNING.hot), { color: hot })]
        : [band];
    }),
  ];
}

/**
 * The comet's lane across the field, as the kit draws it, in field units:
 * how far it reaches each side of the comet's way, how far its wash runs
 * past each edge, so its soft ends lie off the field, how far in from the edge
 * its dashed line starts, each dash's length and the gap after it, how
 * many dashes a run of them holds, and how wide each is drawn.
 */
export const LANE = {
  half: 1,
  past: 1,
  dashesFrom: 3.9,
  dash: 0.7,
  run: 8,
  line: 0.1,
} as const;

/** How long a run of the lane's dashes is, in field units. */
export const DASH_RUN = LANE.run * 2 * LANE.dash;

/** How strongly the lane's dashes show. */
export const LANE_DASH_ALPHA = 0.45;

/** Returns how strongly the comet's lane's wash shows in a palette: a little more on a dark field. */
export function laneWashAlpha(palette: Pick<BeltPalette, "mode">): number {
  return palette.mode === "light" ? 0.07 : 0.09;
}

/**
 * How long the lane's wash's sliver is baked, in device pixels: long enough
 * that the half pixel at each end, which the atlas's filtering blends with
 * the gutter round it, stays within the wash's run past the field's edges
 * as it is stretched across the field.
 */
const SLIVER_PX = 64;

/**
 * Returns the lane's frames: its wash, a sliver as tall as the lane is wide,
 * filling its frame, which the scene stretches, and a run of its dashes,
 * each about its middle, in the danger color, whole, which the scene fades.
 */
function laneFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const color = palette.comet;
  const { unit } = scale;
  const half = LANE.half * unit;
  const run = DASH_RUN * unit;
  const width = widthOf(LANE.line, scale);
  return [
    centered(COMET_FRAMES.lane, [
      rect(
        { x: -SLIVER_PX / 2, y: -half, width: SLIVER_PX, height: 2 * half },
        { color },
      ),
    ]),
    centered(
      COMET_FRAMES.dashes,
      Array.from({ length: LANE.run }, (_, i) =>
        rect(
          {
            x: -run / 2 + i * 2 * LANE.dash * unit,
            y: -width / 2,
            width: LANE.dash * unit,
            height: width,
          },
          { color },
        ),
      ),
    ),
  ];
}

/** Returns How to play's picture of the comet: its head lit as the field's light lights it at rest, its edge and its tail. */
function cometPicture(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): ArtFrame {
  const head = headPainting(palette, scale).map(({ command, facing }) => ({
    ...command,
    color: inLight(command.color, litBy(facing, 0, palette.rockLight)),
  }));
  return bounded(COMET_FRAMES.picture, [
    ...tailCommands(palette, scale, PICTURE_TAIL),
    ...head,
    ...edgeCommands(palette, scale, fine),
  ]);
}

/**
 * Returns the comet's frames but its head, which the rocks' atlas lights,
 * and its warning's: its edge and its tail, its lane's, its warning with
 * each chevron lit and held still, and How to play's picture of it.
 */
function cometFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  return [
    centered(COMET_FRAMES.edge, edgeCommands(palette, scale, fine)),
    centered(
      COMET_FRAMES.tail,
      tailCommands(palette, scale, {
        on: TAIL_BEHIND,
        length: 1,
        speedLines: fine ? COMET.streaks.length : SMALL_STREAKS,
      }),
    ),
    ...laneFrames(palette, scale),
    ...CHEVRON_LITS.map((lit) =>
      centered(warningFrame(lit), warningCommands(lit, palette, scale)),
    ),
    cometPicture(palette, scale, fine),
  ];
}
