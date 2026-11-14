import { recordOf } from "@fz/core/records";
import {
  eyesCommands,
  fuzzballCommands,
  fuzzballWearing,
  wornSparks,
} from "@fz/phaser/fuzzball";
import { showsDetail } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  centered,
  circle,
  frameAround,
  line,
  lineWidth,
  polygon,
  ring,
  roundRect,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import { BALL_KIND_IDS, type BallKindId } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS, type BrickKindId } from "../../rules/catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  type CapsuleTone,
  capsule,
} from "../../rules/catalog/capsules";
import { OWN_INK } from "../../rules/paddle/balls";
import {
  BALL_RADIUS,
  BOLT_LENGTH,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  CAPSULE_HEIGHT,
  CAPSULE_WIDTH,
  FRIEND_INKS,
} from "../../rules/tuning";
import type { BricksPalette } from "../colors/palette";
import { BRICK_ART, type BrickLook, brickFrame } from "./brick_art";
import { FUR, REACH, STREAK_FUR, streakStep } from "./fuzzball_art";
import { paddleFrames } from "./paddle_art";
import { streakArt } from "./streak_art";
import { SYMBOLS } from "./symbols";

/**
 * Describes a capsule as drawn: its size, its outline's width, and its
 * outline's, its body's, its lip's and its shine's colors.
 */
export interface CapsuleShape {
  readonly width: number;
  readonly height: number;
  readonly line: number;
  readonly outline: number;
  readonly body: number;
  readonly lip: number;
  readonly shine: number;
}

/**
 * Says how a capsule is drawn: its outline, its lip, its body and a good
 * one's shine, filling its frame, and the square its symbol takes.
 */
export interface CapsuleLook {
  readonly commands: readonly DrawCommand[];
  readonly symbol: Area;
}

/** Draws a capsule at a scale, and says where its symbol goes. */
export type DrawCapsule = (shape: CapsuleShape, scale: ArtScale) => CapsuleLook;

/** The names of the frames that aren't a brick's, a ball's, a capsule's, a tag's or the paddle's. */
export const FRAMES = {
  /** A laser's bolt, in the cannons' color. */
  bolt: "bolt",
  /** A broken brick's shard, white, so the scene tints it as the brick was. */
  shard: "shard",
  /** A ball's eyes, about its body's middle, which the scene turns the way it goes. */
  eyes: "ball-eyes",
  /** A fire ball's ember. */
  ember: "ember",
  /** A blast's ring, at its widest. */
  ring: "ring",
  /**
   * A seeking ball's sight, about its middle, as the Seeker's symbol is
   * drawn: a ring round the ball, clear of its fur, and four ticks out from
   * it.
   */
  sight: "sight",
  /** The frame around each of the last bricks a level needs, once they glow. */
  glow: "glow",
} as const;

/** How wide a tag is, in field units. */
const TAG_SIZE = 0.8;

/** How wide a blast's ring is at its widest, in field units. */
const RING_SIZE = 4;

/**
 * A seeking ball's sight, as shares of a ball's radius: how far its ring
 * lies from the ball's middle, clear of fur on end and its sparks, and how
 * far out its ticks reach.
 */
const SIGHT = { ring: 1.7, ticks: 2.4 } as const;

/** The ways a sight's ticks point: up, right, down and left. */
const SIGHT_WAYS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** How big a shard is, in field units. */
const SHARD_SIZE = 0.35;

/** How big an ember is, in field units. */
const EMBER_SIZE = 0.2;

/** How wide a bolt is, in field units. */
const BOLT_WIDTH = 0.14;

/**
 * The kit's capsule, after `capsule()` in
 * `docs/archive/brick-breaker-uplift/art/scene.mjs`, 80 tall: how far its
 * lip lies below its body, a good one's and a bad one's; its shine, how far
 * below the body's top and how tall; how far a bad one's ends point; and how
 * wide its symbol is.
 */
const KIT_CAPSULE = {
  height: 80,
  drop: { good: 6, bad: 8 },
  shine: { below: 6, height: 7 },
  point: 22,
  symbol: 40,
} as const;

/**
 * How much of its face's height a capsule's symbol takes where a brick is
 * too small for its finest detail, and its shine is left out.
 */
const SYMBOL_SHARE = 0.85;

// Made once, so finding a frame's name makes nothing.
const BALL_FRAMES: Readonly<Record<BallKindId, string>> = recordOf(
  BALL_KIND_IDS,
  (kind) => `ball-${kind}`,
);
const STREAK_BALL_FRAMES: readonly string[] = STREAK_FUR.map((_, step) =>
  step === 0 ? BALL_FRAMES.normal : `ball-normal-x${String(step + 1)}`,
);
const FACED_BALL_FRAMES: Readonly<Record<BallKindId, string>> = recordOf(
  BALL_KIND_IDS,
  (kind) => `ball-${kind}-faced`,
);
const FRIEND_BALL_FRAMES: readonly (readonly string[])[] = Array.from(
  { length: FRIEND_INKS },
  (_, ink) =>
    STREAK_FUR.map(
      (_, step) =>
        `ball-friend-${String(ink)}${step === 0 ? "" : `-x${String(step + 1)}`}`,
    ),
);
const CAPSULE_FRAMES: Readonly<Record<CapsuleId, string>> = recordOf(
  CAPSULE_IDS,
  (id) => `capsule-${id}`,
);
const TAG_FRAMES: Readonly<Record<CapsuleId, string>> = recordOf(
  CAPSULE_IDS,
  (id) => `tag-${id}`,
);

/**
 * How each tone of capsule is drawn, as the kit draws it: a good one a pill
 * with a shine along its top, a bad one pointed at each end, each on a lip
 * that shows below it, outlined, its symbol about its middle.
 */
export const CAPSULE_ART = {
  good: (shape, scale) => {
    const { width, height, line, outline, body, lip, shine } = shape;
    const drop = capsuleDrop(KIT_CAPSULE.drop.good, scale);
    const face = faceOf(shape, drop);
    const detail = showsDetail(scale, BRICK_WIDTH);
    const shineArea = {
      x: width / 4,
      y: line + kitLength(KIT_CAPSULE.shine.below, height),
      width: width / 2,
      height: kitLength(KIT_CAPSULE.shine.height, height),
    };
    return {
      commands: [
        roundRect({ x: 0, y: 0, width, height }, height / 2, {
          color: outline,
        }),
        roundRect({ ...face, y: face.y + drop }, face.height / 2, {
          color: lip,
        }),
        roundRect(face, face.height / 2, { color: body }),
        ...(detail
          ? [roundRect(shineArea, shineArea.height / 2, { color: shine })]
          : []),
      ],
      // Below its shine, it sits at the pill's middle rather than its face's.
      symbol: symbolSquare(
        shape,
        detail,
        face,
        detail ? height / 2 : face.y + face.height / 2,
      ),
    };
  },
  bad: (shape, scale) => {
    const { width, height, line, outline, body, lip } = shape;
    const drop = capsuleDrop(KIT_CAPSULE.drop.bad, scale);
    const point = kitLength(KIT_CAPSULE.point, height);
    const half = height / 2;
    // Where the outline's slanted edges lie a line's width in: where they
    // meet its middle, and where they meet its top and its foot.
    const tip = (line * Math.hypot(point, half)) / half;
    const corner = point + tip - (point * line) / half;
    const face = faceOf(shape, drop);
    // The face's ends point at a line's width in from the outline's upper
    // edges, its lip's from its lower ones, as the lip lies `drop` below.
    const facePoints = (by: number): readonly Point[] => {
      const top = face.y + by;
      const foot = top + face.height;
      const middle = (top + foot) / 2;
      const end = tip + (point * drop) / height;
      return [
        { x: corner, y: top },
        { x: width - corner, y: top },
        { x: width - end, y: middle },
        { x: width - corner, y: foot },
        { x: corner, y: foot },
        { x: end, y: middle },
      ];
    };
    return {
      commands: [
        polygon(
          [
            { x: point, y: 0 },
            { x: width - point, y: 0 },
            { x: width, y: half },
            { x: width - point, y: height },
            { x: point, y: height },
            { x: 0, y: half },
          ],
          { color: outline },
        ),
        polygon(facePoints(drop), { color: lip }),
        polygon(facePoints(0), { color: body }),
      ],
      symbol: symbolSquare(
        shape,
        showsDetail(scale, BRICK_WIDTH),
        face,
        face.y + face.height / 2,
      ),
    };
  },
} as const satisfies Readonly<Record<CapsuleTone, DrawCapsule>>;

/**
 * Returns how far a capsule's lip lies below its body, in whole device
 * pixels, a CSS pixel at least, so a bad one's gold shows at any size.
 */
function capsuleDrop(kit: number, scale: ArtScale): number {
  return widthOf((kit * CAPSULE_HEIGHT) / KIT_CAPSULE.height, scale);
}

/**
 * Returns the box a capsule's face fills: a line's width in from its
 * outline, and short of its foot by its lip, which shows below.
 */
function faceOf({ width, height, line }: CapsuleShape, drop: number): Area {
  return {
    x: line,
    y: line,
    width: width - 2 * line,
    height: height - 2 * line - drop,
  };
}

/** Returns a length of the kit's capsule on a capsule so many device pixels tall. */
function kitLength(length: number, height: number): number {
  return (length * height) / KIT_CAPSULE.height;
}

/**
 * Returns the square a capsule's symbol takes, about a point down its
 * middle: as wide as the kit's, half the capsule's height, or, where a brick
 * is too small for its finest detail, {@link SYMBOL_SHARE} of its face's
 * height, so it still reads.
 */
function symbolSquare(
  { width, height }: CapsuleShape,
  detail: boolean,
  face: Area,
  middle: number,
): Area {
  const side = detail
    ? kitLength(KIT_CAPSULE.symbol, height)
    : face.height * SYMBOL_SHARE;
  return {
    x: (width - side) / 2,
    y: middle - side / 2,
    width: side,
    height: side,
  };
}

/**
 * Returns the name of a ball's frame as it flies at a streak, by the balls'
 * kind and its ink: its body and fur, without its eyes, a normal ball's fur
 * lifted by the streak's multiplier, and in a friend's ink where it is one.
 */
export function ballFrame(
  kind: BallKindId,
  streak: number,
  ink = OWN_INK,
): string {
  if (kind !== "normal") return BALL_FRAMES[kind];
  return normalFramesOf(ink)[streakStep(streak)] ?? BALL_FRAMES.normal;
}

/**
 * Returns the color a ball is drawn in, by the balls' kind and its ink,
 * which its tail and its streak's ring take: a friend's ink for a normal
 * ball that is one, and its kind's otherwise, as a fire or blast ball's
 * look is its kind's, whoever it is.
 */
export function ballColor(
  kind: BallKindId,
  ink: number,
  palette: BricksPalette,
): number {
  if (kind !== "normal") return palette.balls[kind];
  return palette.friendInks[ink] ?? palette.balls.normal;
}

/**
 * Returns the names of a normal ball's frames in its ink, at each step of
 * the streak: a friend's, or the player's own for {@link OWN_INK}, which
 * names no friend.
 */
function normalFramesOf(ink: number): readonly string[] {
  return FRIEND_BALL_FRAMES[ink] ?? STREAK_BALL_FRAMES;
}

/**
 * Returns how many device pixels a unit of the fuzzball's grid is drawn at,
 * so a normal ball's fur, outlined, reaches the ball's edge.
 */
export function ballGrid(scale: ArtScale): number {
  return Math.max(0, BALL_RADIUS * scale.unit - lineWidth(scale)) / REACH;
}

/** Returns the name of a capsule's frame, as it falls. */
export function capsuleFrame(id: CapsuleId): string {
  return CAPSULE_FRAMES[id];
}

/** Returns the name of a capsule's tag, under the paddle while its effect lasts. */
export function tagFrame(id: CapsuleId): string {
  return TAG_FRAMES[id];
}

/**
 * Returns a kind of ball's frames: the fuzzball in its kind's fur and color,
 * outlined in the palette's outline, as it flies, a normal ball's at each
 * step of the streak, and with its eyes.
 */
function ballArt(
  kind: BallKindId,
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const by = ballGrid(scale);
  const outline = { color: palette.outline, width: lineWidth(scale) };
  const body = fuzzballCommands(by, {
    color: palette.balls[kind],
    outline,
    fur: FUR[kind],
  });
  const flying =
    kind === "normal"
      ? normalBallArt(STREAK_BALL_FRAMES, palette.balls[kind], palette, scale)
      : [centered(BALL_FRAMES[kind], body)];
  return [...flying, facedArt(FACED_BALL_FRAMES[kind], body, by, palette)];
}

/** Returns the friends' frames, a normal ball's in each friend's ink. */
function friendBallArt(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return FRIEND_BALL_FRAMES.flatMap((names, ink) =>
    normalBallArt(names, ballColor("normal", ink, palette), palette, scale),
  );
}

/**
 * Returns a normal ball's frames in a color, by their names: the fuzzball,
 * outlined in the palette's outline, as it flies at each step of the
 * streak, as one with its sparks where it has them.
 */
function normalBallArt(
  names: readonly string[],
  color: number,
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const by = ballGrid(scale);
  const outline = { color: palette.outline, width: lineWidth(scale) };
  const sparks = wornSparks(
    by,
    {
      color: palette.streakSparks,
      // A unit of the fuzzball's grid, as the kit's, a CSS pixel at least.
      width: widthOf(by / scale.unit, scale),
    },
    outline,
  );
  return STREAK_FUR.map((look, step) =>
    centered(
      names[step] ?? BALL_FRAMES.normal,
      fuzzballWearing(
        by,
        { color, outline, fur: look.fur },
        look.sparks ? sparks : {},
      ),
    ),
  );
}

/** Returns a ball's frame with its eyes, in the marks' color, over its body, `by` device pixels to a unit of the fuzzball's grid. */
function facedArt(
  name: string,
  body: readonly DrawCommand[],
  by: number,
  palette: BricksPalette,
): ArtFrame {
  return centered(name, [
    ...body,
    ...eyesCommands(by, { color: palette.mark }),
  ]);
}

/**
 * Returns a seeking ball's sight about the ball's middle, in a good
 * capsule's color, as the Seeker's is: a ring round the ball and a tick out
 * from it each way, up, right, down and left, outlined as a ball is, so it
 * shows over a brick of any tint.
 */
function sightCommands(
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const radius = SIGHT.ring * BALL_RADIUS * scale.unit;
  const reach = SIGHT.ticks * BALL_RADIUS * scale.unit;
  // Each outline reaches past its tick's end, as the tick is cut square.
  const drawn = (color: number, wider: number): readonly DrawCommand[] => {
    const style = { color, width: width + 2 * wider };
    return [
      ring(ORIGIN, radius, style),
      ...SIGHT_WAYS.map(({ x, y }) =>
        line(
          { x: x * radius, y: y * radius },
          { x: x * (reach + wider), y: y * (reach + wider) },
          style,
        ),
      ),
    ];
  };
  return [...drawn(palette.outline, width), ...drawn(palette.capsules.good, 0)];
}

/** Returns how a capsule of a tone is drawn in a palette at a scale: its size in whole device pixels, its outline's width and its colors. */
export function capsuleShape(
  tone: CapsuleTone,
  palette: BricksPalette,
  scale: ArtScale,
): CapsuleShape {
  return {
    width: Math.round(CAPSULE_WIDTH * scale.unit),
    height: Math.round(CAPSULE_HEIGHT * scale.unit),
    line: lineWidth(scale),
    outline: palette.outline,
    body: palette.capsules[tone],
    lip: palette.capsuleLips[tone],
    shine: palette.capsuleShine,
  };
}

/** Returns a capsule's frame: its tone's shape and color, outlined, with its symbol. */
function capsuleArt(
  id: CapsuleId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const { tone } = capsule(id);
  const shape = capsuleShape(tone, palette, scale);
  const { commands, symbol } = CAPSULE_ART[tone](shape, scale);
  return {
    name: CAPSULE_FRAMES[id],
    width: shape.width,
    height: shape.height,
    commands: [
      ...commands,
      ...SYMBOLS[id](symbol, { color: palette.mark, width: shape.line }),
    ],
  };
}

/** Returns a capsule's tag: its symbol alone, in its tone's color. */
function tagArt(
  id: CapsuleId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const side = Math.round(TAG_SIZE * scale.unit);
  return {
    name: TAG_FRAMES[id],
    width: side,
    height: side,
    commands: SYMBOLS[id](
      { x: 0, y: 0, width: side, height: side },
      { color: palette.capsules[capsule(id).tone], width: lineWidth(scale) },
    ),
  };
}

/** Returns the frames of the balls' eyes, the bolts and the flourishes. */
function otherArt(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const line = lineWidth(scale);
  const bolt = {
    x: 0,
    y: 0,
    width: Math.max(2 * line, Math.round(BOLT_WIDTH * scale.unit)),
    height: Math.round(BOLT_LENGTH * scale.unit),
  };
  const shard = Math.max(2, Math.round(SHARD_SIZE * scale.unit));
  const ember = Math.max(2, Math.round(EMBER_SIZE * scale.unit));
  const blastRing = Math.round(RING_SIZE * scale.unit);
  const glow = {
    x: 0,
    y: 0,
    width: Math.round(BRICK_WIDTH * scale.unit) + 2 * line,
    height: Math.round(BRICK_HEIGHT * scale.unit) + 2 * line,
  };
  return [
    centered(
      FRAMES.eyes,
      eyesCommands(ballGrid(scale), { color: palette.mark }),
    ),
    {
      name: FRAMES.bolt,
      width: bolt.width,
      height: bolt.height,
      commands: [
        roundRect(bolt, bolt.width / 2, { color: palette.paddleInks.cannon }),
      ],
    },
    {
      name: FRAMES.shard,
      width: shard,
      height: shard,
      commands: [
        polygon(
          within({ x: 0, y: 0, width: shard, height: shard }, [
            [0, 1],
            [1, 0.6],
            [0.35, 0],
          ]),
          { color: 0xffffff },
        ),
      ],
    },
    {
      name: FRAMES.ember,
      width: ember,
      height: ember,
      commands: [
        circle({ x: ember / 2, y: ember / 2 }, ember / 2, {
          color: palette.balls.fire,
        }),
      ],
    },
    {
      name: FRAMES.ring,
      width: blastRing,
      height: blastRing,
      commands: [
        ring({ x: blastRing / 2, y: blastRing / 2 }, blastRing / 2 - line, {
          color: palette.bricks.blast,
          width: 2 * line,
        }),
      ],
    },
    centered(FRAMES.sight, sightCommands(palette, scale)),
    {
      name: FRAMES.glow,
      width: glow.width,
      height: glow.height,
      commands: frameAround(glow, { color: palette.glow, width: 2 * line }),
    },
  ];
}

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * brick kind in each tint and state, each ball kind as it flies and with
 * its eyes, a normal ball as it flies in each friend's ink too, each
 * capsule and its tag, the balls' eyes, the paddle's ends, cannons and
 * hooks, the bolt and the flourishes.
 */
export function atlasFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...BRICK_KIND_IDS.flatMap((kind) => BRICK_ART[kind].frames(palette, scale)),
    ...BALL_KIND_IDS.flatMap((kind) => ballArt(kind, palette, scale)),
    ...friendBallArt(palette, scale),
    ...CAPSULE_IDS.map((id) => capsuleArt(id, palette, scale)),
    ...CAPSULE_IDS.map((id) => tagArt(id, palette, scale)),
    ...paddleFrames(palette, scale),
    ...otherArt(palette, scale),
    ...streakArt(scale),
  ];
}

/** Names a picture of each brick kind, ball kind and capsule, for How to play. */
export interface Pictures {
  readonly bricks: Readonly<Record<BrickKindId, string>>;
  readonly balls: Readonly<Record<BallKindId, string>>;
  readonly capsules: Readonly<Record<CapsuleId, string>>;
}

/**
 * Returns a brick as How to play pictures one of its kind: whole at a hit,
 * shown, in the first tint, of the first pair and heading nowhere, but for
 * what its look changes.
 */
function pictured(
  kind: BrickKindId,
  look: Partial<Omit<BrickLook, "kind">> = {},
): BrickLook {
  return {
    kind,
    tint: 0,
    whole: 1,
    hits: 1,
    shown: true,
    pair: 0,
    heading: 0,
    ...look,
  };
}

/** How How to play pictures each kind of brick: a tough one with a hit taken, a ghost still hidden, and a slider heading right. */
const PICTURED_BRICKS: Readonly<Record<BrickKindId, BrickLook>> = {
  plain: pictured("plain"),
  tough: pictured("tough", { tint: 5, whole: 3, hits: 2 }),
  steel: pictured("steel", { whole: 0, hits: 0 }),
  blast: pictured("blast"),
  gift: pictured("gift"),
  ghost: pictured("ghost", { tint: 6, whole: 2, hits: 2, shown: false }),
  regrow: pictured("regrow", { tint: 3 }),
  cage: pictured("cage", { whole: 2, hits: 2 }),
  plated: pictured("plated", { whole: 2, hits: 2 }),
  key: pictured("key"),
  gate: pictured("gate", { whole: 0, hits: 0 }),
  bumper: pictured("bumper", { whole: 0, hits: 0 }),
  portal: pictured("portal", { whole: 0, hits: 0 }),
  slider: pictured("slider", { heading: 1 }),
};

/** The frames How to play's pictures are taken from. */
export const PICTURE_FRAMES: Pictures = {
  bricks: recordOf(BRICK_KIND_IDS, (kind) => brickFrame(PICTURED_BRICKS[kind])),
  balls: FACED_BALL_FRAMES,
  capsules: CAPSULE_FRAMES,
};
