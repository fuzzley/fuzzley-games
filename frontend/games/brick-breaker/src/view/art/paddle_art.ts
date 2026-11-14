// The paddle's frames, after `paddle()` in
// `docs/archive/brick-breaker-uplift/art/scene.mjs`: a bar in the accent on
// a darker lip, a pale pad along its top and a cap at each end with a bolt
// in it; velcro hooks along its top while it catches, and a cannon over each
// end while it fires. The kit draws the paddle 75 tall, and every length
// here is the kit's, as a share of the paddle's height.
//
// The scene draws the paddle at any width from these frames and a few
// rectangles it sizes by `paddleShape()`, so the frames hold only what keeps
// its shape as the paddle widens: its ends, a hook and a cannon.

import { showsDetail } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  arcPoints,
  centered,
  circle,
  roundRect,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { CAPSULE_IDS, capsule } from "../../rules/catalog/capsules";
import { BRICK_WIDTH, PADDLE_HEIGHT, PADDLE_WIDTH } from "../../rules/tuning";
import type { BricksPalette } from "../colors/palette";

/** The names of the paddle's frames. */
export const PADDLE_FRAMES = {
  /** Its left end, a cap over its lip with a bolt in it, about the cap's middle; the scene flips it for the right. */
  end: "paddle-end",
  /** A laser's cannon, a barrel on a base, about where the base meets the paddle's top. */
  cannon: "cannon",
  /** One of a catching paddle's velcro hooks, about its foot on the paddle's top. */
  hook: "hook",
} as const;

/** How tall the kit draws the paddle; its other lengths are shares of this. */
const KIT_HEIGHT = 75;

/** How far the kit's lip lies below its bar. */
const KIT_LIP = 11;

/** How far in from each end the body starts, over each cap: a share of the cap's radius. */
const INNER = 0.95;

/** Where the kit's pad lies: how far down from the top, how tall, and how far in from the body's ends. */
const KIT_PAD = { top: 8, height: 11, inset: 9 } as const;

/** Each cap's bolt: the kit's radius, and how far its middle lies from the paddle's end, a share of the cap's radius. */
const KIT_BOLT = { radius: 5.5, from: 0.55 } as const;

/**
 * The kit's velcro hooks: how far apart they stand, how far the outermost
 * stands in from the body's ends, how far below the top the stem starts,
 * how far above it it rises, the curl's radius at its top, and how wide its
 * line is.
 */
const KIT_HOOK = {
  pitch: 19,
  margin: 12,
  foot: 2,
  stem: 7,
  curl: 4.5,
  width: 3.4,
} as const;

/** The kit's cannon about where its base meets the paddle's top: its barrel, its base, and their corners' radius. */
const KIT_CANNON = {
  barrel: { x: -10, y: -26, width: 20, height: 30 },
  base: { x: -16, y: -6, width: 32, height: 12 },
  radius: 4,
} as const;

/** The widest a paddle grows, in field units: its own width, or a capsule's. */
export const WIDEST_PADDLE = Math.max(
  PADDLE_WIDTH,
  ...CAPSULE_IDS.map((id) => {
    const { effect } = capsule(id);
    return effect.kind === "paddle-size" ? effect.width : 0;
  }),
);

/**
 * The most hooks a paddle shows: as many as the kit stands along the widest
 * paddle, an odd number, as `hookCount()` stands, and a pair more, as a
 * rounding may fit another pair.
 */
export const MOST_HOOKS =
  2 *
    Math.floor(
      ((WIDEST_PADDLE / PADDLE_HEIGHT) * KIT_HEIGHT -
        INNER * (KIT_HEIGHT - KIT_LIP) -
        2 * KIT_HOOK.margin) /
        KIT_HOOK.pitch /
        2,
    ) +
  3;

/** Says how the paddle's parts lie, in device pixels, which its frames and the scene's rectangles agree on. */
export interface PaddleShape {
  /** How tall it is, its lip included: a whole number of device pixels. */
  readonly height: number;
  /** How tall its bar is, above its lip: each cap's width, a whole number of device pixels. */
  readonly bar: number;
  /** How far its lip lies below its bar: a whole number of device pixels. */
  readonly lip: number;
  /** How far in from each end its body starts, over its caps. */
  readonly inner: number;
  /** Where its pad lies: how far down from its top and how tall, in whole device pixels, and how far in from its body's ends. */
  readonly pad: {
    readonly top: number;
    readonly height: number;
    readonly inset: number;
  };
  /** How far apart a catching paddle's hooks stand, and how far the outermost stands in from its body's ends. */
  readonly hooks: { readonly pitch: number; readonly margin: number };
}

/**
 * Returns how the paddle's parts lie at a scale: its height a whole number
 * of device pixels, as the rules' {@link PADDLE_HEIGHT} at the unit, and
 * the kit's lengths shares of it; its hooks twice as far apart where a
 * brick is too small for its finest detail (`showsDetail()`), so they don't
 * run together.
 */
export function paddleShape(scale: ArtScale): PaddleShape {
  const height = Math.round(PADDLE_HEIGHT * scale.unit);
  const lip = Math.round(kit(KIT_LIP, height));
  const bar = height - lip;
  const inner = (INNER * bar) / 2;
  const spread = showsDetail(scale, BRICK_WIDTH) ? 1 : 2;
  return {
    height,
    bar,
    lip,
    inner,
    pad: {
      top: Math.round(kit(KIT_PAD.top, height)),
      height: Math.max(1, Math.round(kit(KIT_PAD.height, height))),
      inset: kit(KIT_PAD.inset, height),
    },
    hooks: {
      pitch: Math.max(1, spread * kit(KIT_HOOK.pitch, height)),
      margin: kit(KIT_HOOK.margin, height),
    },
  };
}

/**
 * Returns how many hooks a catching paddle so many device pixels wide
 * shows: as many as stand a pitch apart along its body, short of the
 * margin at each end, an odd number, {@link MOST_HOOKS} at most.
 *
 * The scene stands them about the paddle's middle, so with an odd number
 * each stands a whole number of pitches from it, where it stood as the
 * paddle widens or narrows, and they come and go in pairs.
 */
export function hookCount(width: number, shape: PaddleShape): number {
  const room = width - 2 * shape.inner - 2 * shape.hooks.margin;
  if (room < 0) return 0;
  const pairs = Math.floor(room / shape.hooks.pitch / 2);
  return Math.min(MOST_HOOKS, 2 * pairs + 1);
}

/**
 * Returns the paddle's frames in a palette at a scale: its left end, a
 * laser's cannon and a velcro hook, each about the point the scene puts it
 * at, so each image's middle is that point.
 */
export function paddleFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const shape = paddleShape(scale);
  return [
    centered(PADDLE_FRAMES.end, endCommands(palette, scale, shape)),
    centered(PADDLE_FRAMES.cannon, cannonCommands(palette, shape)),
    centered(PADDLE_FRAMES.hook, hookCommands(palette, scale, shape)),
  ];
}

/**
 * Returns the paddle's left end about its cap's middle: its lip's round
 * end, its cap over it, and, where a brick shows its finest detail, a bolt
 * in the marks' color toward its outer side.
 */
function endCommands(
  { paddleInks, mark }: BricksPalette,
  scale: ArtScale,
  { height, bar, lip }: PaddleShape,
): readonly DrawCommand[] {
  const radius = bar / 2;
  const bolt = (KIT_BOLT.from - 1) * radius;
  return [
    circle({ x: 0, y: lip }, radius, { color: paddleInks.lip }),
    circle({ x: 0, y: 0 }, radius, { color: paddleInks.cap }),
    ...(showsDetail(scale, BRICK_WIDTH)
      ? [
          circle({ x: bolt, y: 0 }, kit(KIT_BOLT.radius, height), {
            color: mark,
          }),
        ]
      : []),
  ];
}

/** Returns a laser's cannon about where its base meets the paddle's top: its barrel, and its base in the paddle's lip over it. */
function cannonCommands(
  { paddleInks }: BricksPalette,
  { height }: PaddleShape,
): readonly DrawCommand[] {
  const radius = kit(KIT_CANNON.radius, height);
  return [
    roundRect(kitArea(KIT_CANNON.barrel, height), radius, {
      color: paddleInks.cannon,
    }),
    roundRect(kitArea(KIT_CANNON.base, height), radius, {
      color: paddleInks.lip,
    }),
  ];
}

/**
 * Returns a velcro hook about its foot on the paddle's top: a stem from
 * inside the bar up past its top, curled over to the right at its head, a
 * CSS pixel wide at least.
 */
function hookCommands(
  { paddleInks }: BricksPalette,
  scale: ArtScale,
  { height }: PaddleShape,
): readonly DrawCommand[] {
  const curl = kit(KIT_HOOK.curl, height);
  const head = { x: curl, y: -kit(KIT_HOOK.stem, height) };
  return stroke(
    [
      { x: 0, y: kit(KIT_HOOK.foot, height) },
      ...arcPoints(head, curl, Math.PI, 2 * Math.PI),
    ],
    {
      color: paddleInks.hook,
      width: widthOf(KIT_HOOK.width / KIT_HEIGHT, {
        unit: height,
        pixelRatio: scale.pixelRatio,
      }),
    },
  );
}

/** Returns a length of the kit's paddle on a paddle so many device pixels tall. */
function kit(length: number, height: number): number {
  return (length * height) / KIT_HEIGHT;
}

/** Returns an area of the kit's paddle on a paddle so many device pixels tall. */
function kitArea(area: Area, height: number): Area {
  return {
    x: kit(area.x, height),
    y: kit(area.y, height),
    width: kit(area.width, height),
    height: kit(area.height, height),
  };
}
