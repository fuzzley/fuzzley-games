import type { Brick } from "../rules/bricks";
import { BALL_KIND_IDS, type BallKindId } from "../rules/catalog/balls";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKindId,
} from "../rules/catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  type CapsuleTone,
  capsule,
} from "../rules/catalog/capsules";
import { TINTS } from "../rules/level";
import {
  BALL_RADIUS,
  BOLT_LENGTH,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  CAPSULE_HEIGHT,
  CAPSULE_WIDTH,
  PADDLE_HEIGHT,
} from "../rules/tuning";
import type { FieldMetrics } from "./field_metrics";
import type { BricksPalette } from "./palette";

/** Says where a point of a drawing is, in device pixels from its frame's top left corner. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Describes one shape of a frame's drawing, in device pixels from the frame's top left corner. */
export type DrawCommand =
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly color: number;
    }
  | {
      readonly kind: "roundRect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly radius: number;
      readonly color: number;
    }
  | {
      readonly kind: "circle";
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly color: number;
    }
  | {
      /** A circle's outline, its line's middle at the radius. */
      readonly kind: "ring";
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly width: number;
      readonly color: number;
    }
  | {
      readonly kind: "line";
      readonly from: Point;
      readonly to: Point;
      readonly width: number;
      readonly color: number;
    }
  | {
      readonly kind: "polygon";
      readonly points: readonly Point[];
      readonly color: number;
    };

/** Describes a frame of the atlas: its name, its size in device pixels and its drawing. */
export interface ArtFrame {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Its shapes, each drawn over those before it. */
  readonly commands: readonly DrawCommand[];
  /** For a frame a nine-slice stretches, the width of each end it keeps whole. */
  readonly ends?: number;
}

/** What the art is drawn at: a field unit's device pixels, and a CSS pixel's. */
export type ArtScale = Pick<FieldMetrics, "unit" | "pixelRatio">;

/** What a brick's frame shows of it. */
export type BrickLook = Pick<
  Brick,
  "kind" | "tint" | "whole" | "hits" | "shown"
>;

/** Says where a shape's box lies in its frame, in device pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Says how a kind of brick is drawn. */
export interface BrickArt {
  /** Returns the name of the frame a brick of the kind shows, as it stands. */
  readonly frameOf: (brick: BrickLook) => string;
  /** Returns every frame a brick of the kind may show. */
  readonly frames: (
    palette: BricksPalette,
    scale: ArtScale,
  ) => readonly ArtFrame[];
}

/** Draws what lies inside a ball's outline, in a circle at a point. */
export type DrawBall = (
  x: number,
  y: number,
  radius: number,
  palette: BricksPalette,
  scale: ArtScale,
) => readonly DrawCommand[];

/** Draws a capsule's shape, its outline and its body, in a frame of a size. */
export type DrawCapsule = (
  width: number,
  height: number,
  line: number,
  outline: number,
  body: number,
) => readonly DrawCommand[];

/** Draws a capsule's symbol, in a square at a point, in a color. */
export type DrawSymbol = (
  x: number,
  y: number,
  side: number,
  color: number,
) => readonly DrawCommand[];

/** The names of the frames that aren't a brick's, a ball's, a capsule's or a tag's. */
export const FRAMES = {
  paddle: "paddle",
  /** A laser's cannon, over each end of the paddle. */
  cannon: "cannon",
  /** A catching paddle's rim, along its top, stretched to its width. */
  rim: "rim",
  bolt: "bolt",
  /** A broken brick's shard, white, so the scene tints it as the brick was. */
  shard: "shard",
  /** A fire ball's ember. */
  ember: "ember",
  /** A blast's ring, at its widest. */
  ring: "ring",
} as const;

/** How far in from its cell a brick is drawn, on each side, in field units. */
const BRICK_INSET = 0.05;

/** How round a brick's corners are, in field units. */
const BRICK_CORNER = 0.12;

/** How wide a line is, in field units, where that is more than a CSS pixel. */
const LINE = 0.06;

/** How big a mark's dot (a pip or a rivet) is across its middle, in field units. */
const DOT = 0.09;

/** How far apart a tough brick's pips are, in field units. */
const PIP_SPACING = 0.32;

/** How long a ghost brick's dashes are, and the gaps between, in field units. */
const DASH = 0.25;

/** How wide a tag is, in field units. */
const TAG_SIZE = 0.8;

/** How wide a blast's ring is at its widest, in field units. */
const RING_SIZE = 4;

/** How big a shard is, in field units. */
const SHARD_SIZE = 0.35;

/** How big an ember is, in field units. */
const EMBER_SIZE = 0.2;

/** How wide a bolt is, in field units. */
const BOLT_WIDTH = 0.14;

/** How wide a cannon is, and how tall, in field units. */
const CANNON = { width: 0.3, height: 0.4 } as const;

/** How much of a capsule's height inside its outline its symbol takes. */
const SYMBOL_SHARE = 0.85;

/** How deep a bad capsule's notches are, as a share of its height. */
const NOTCH = 0.3;

/**
 * Each crack a tough brick shows for a hit it took, a zigzag from its top
 * to its bottom, in shares of its body, placed clear of its pips.
 */
const CRACKS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0.1, 0],
    [0.17, 0.5],
    [0.12, 1],
  ],
  [
    [0.9, 0],
    [0.83, 0.5],
    [0.88, 1],
  ],
  [
    [0.3, 0],
    [0.36, 0.45],
    [0.31, 1],
  ],
];

/** Returns the names of the frames of a brick drawn in each tint. */
function tinted(kind: string): readonly string[] {
  return Array.from({ length: TINTS }, (_, tint) => `${kind}-${String(tint)}`);
}

const PLAIN_FRAMES = tinted("plain");
const GHOST_FRAMES = tinted("ghost");
const REGROW_FRAMES = tinted("regrow");

/** A tough brick's frames, by the hits it takes whole, then the hits it has left, then its tint. */
const TOUGH_FRAMES = Array.from(
  { length: BRICK_KINDS.tough.mostHits + 1 },
  (_, whole) =>
    Array.from({ length: whole + 1 }, (_, hits) =>
      tinted(`tough-${String(whole)}-${String(hits)}`),
    ),
);

// Made once, so finding a frame's name makes nothing. Object.fromEntries()
// types its keys as strings; these keys are the catalogs' ids.
const BALL_FRAMES = Object.fromEntries(
  BALL_KIND_IDS.map((kind) => [kind, `ball-${kind}`]),
) as Readonly<Record<BallKindId, string>>;
const CAPSULE_FRAMES = Object.fromEntries(
  CAPSULE_IDS.map((id) => [id, `capsule-${id}`]),
) as Readonly<Record<CapsuleId, string>>;
const TAG_FRAMES = Object.fromEntries(
  CAPSULE_IDS.map((id) => [id, `tag-${id}`]),
) as Readonly<Record<CapsuleId, string>>;

/** Returns the name at a place in a table of names, which holds one for every brick a level can lay. */
function nameAt(names: readonly string[] | undefined, at: number): string {
  const name = names?.[at];
  if (name === undefined) throw new Error(`No frame at ${String(at)}.`);
  return name;
}

/** Returns how wide a line is, in whole device pixels: a CSS pixel at least. */
export function lineWidth(scale: ArtScale): number {
  return Math.max(Math.ceil(scale.pixelRatio), Math.round(scale.unit * LINE));
}

/** Returns a rectangle filled in a color. */
function rect(box: Box, color: number): DrawCommand {
  return { kind: "rect", ...box, color };
}

/** Returns a rectangle with rounded corners filled in a color. */
function roundRect(box: Box, radius: number, color: number): DrawCommand {
  return { kind: "roundRect", ...box, radius, color };
}

/** Returns a circle filled in a color. */
function circle(
  x: number,
  y: number,
  radius: number,
  color: number,
): DrawCommand {
  return { kind: "circle", x, y, radius, color };
}

/** Returns a circle's outline in a color. */
function ring(
  x: number,
  y: number,
  radius: number,
  width: number,
  color: number,
): DrawCommand {
  return { kind: "ring", x, y, radius, width, color };
}

/** Returns a polygon filled in a color. */
function polygon(points: readonly Point[], color: number): DrawCommand {
  return { kind: "polygon", points, color };
}

/** Returns lines through points in turn, in a color. */
function lines(
  points: readonly Point[],
  width: number,
  color: number,
): readonly DrawCommand[] {
  const commands: DrawCommand[] = [];
  let from: Point | null = null;
  for (const to of points) {
    if (from) commands.push({ kind: "line", from, to, width, color });
    from = to;
  }
  return commands;
}

/** Returns points given as shares of a box. */
function within(
  box: Box,
  shares: readonly (readonly [number, number])[],
): readonly Point[] {
  return shares.map(([across, down]) => ({
    x: box.x + across * box.width,
    y: box.y + down * box.height,
  }));
}

/** Returns a box shrunk by an inset on each side. */
function inset(box: Box, by: number): Box {
  return {
    x: box.x + by,
    y: box.y + by,
    width: box.width - 2 * by,
    height: box.height - 2 * by,
  };
}

/** Returns a square of a side in the middle of a box. */
function middleSquare(box: Box, side: number): Box {
  return {
    x: box.x + (box.width - side) / 2,
    y: box.y + (box.height - side) / 2,
    width: side,
    height: side,
  };
}

/** Returns the points of a star around a middle. */
function star(
  x: number,
  y: number,
  outer: number,
  inner: number,
  points: number,
): readonly Point[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
  });
}

/** Returns a brick's frame, drawn in its body, which lies a little in from its cell. */
function drawBrick(
  name: string,
  scale: ArtScale,
  draw: (body: Box) => readonly DrawCommand[],
): ArtFrame {
  const width = BRICK_WIDTH * scale.unit;
  const height = BRICK_HEIGHT * scale.unit;
  const body = inset(
    { x: 0, y: 0, width, height },
    Math.max(1, Math.round(scale.unit * BRICK_INSET)),
  );
  return { name, width, height, commands: draw(body) };
}

/** Returns a brick's body filled in a color, its corners rounded. */
function filled(body: Box, scale: ArtScale, color: number): DrawCommand {
  return roundRect(body, Math.round(scale.unit * BRICK_CORNER), color);
}

/** Returns a tough brick's pips, one for each hit it has left, across its middle. */
function pips(
  body: Box,
  hits: number,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const spacing = scale.unit * PIP_SPACING;
  const middle = body.x + body.width / 2;
  return Array.from({ length: hits }, (_, i) =>
    circle(
      middle + (i - (hits - 1) / 2) * spacing,
      body.y + body.height / 2,
      Math.max(1, scale.unit * DOT),
      color,
    ),
  );
}

/** Returns a tough brick's cracks, one for each hit it took. */
function cracks(
  body: Box,
  taken: number,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const inner = inset(body, width);
  return CRACKS.slice(0, taken).flatMap((crack) =>
    lines(within(inner, crack), width, color),
  );
}

/** Returns a ghost brick's dashed outline, along the edges of its body. */
function dashes(
  body: Box,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const dash = Math.max(2, Math.round(scale.unit * DASH));
  const right = body.x + body.width;
  const bottom = body.y + body.height;
  const commands: DrawCommand[] = [];
  for (let x = body.x; x < right; x += 2 * dash) {
    const length = Math.min(dash, right - x);
    commands.push(rect({ x, y: body.y, width: length, height: width }, color));
    commands.push(
      rect({ x, y: bottom - width, width: length, height: width }, color),
    );
  }
  for (let y = body.y; y < bottom; y += 2 * dash) {
    const length = Math.min(dash, bottom - y);
    commands.push(rect({ x: body.x, y, width, height: length }, color));
    commands.push(rect({ x: right - width, y, width, height: length }, color));
  }
  return commands;
}

/** Returns a sprout, a stem and two leaves, in the middle of a brick's body. */
function sprout(
  body: Box,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const square = middleSquare(body, body.height * 0.8);
  return [
    ...lines(
      within(square, [
        [0.5, 1],
        [0.5, 0.35],
      ]),
      lineWidth(scale),
      color,
    ),
    polygon(
      within(square, [
        [0.5, 0.55],
        [0.1, 0.3],
        [0.35, 0.15],
      ]),
      color,
    ),
    polygon(
      within(square, [
        [0.5, 0.45],
        [0.9, 0.15],
        [0.65, 0.05],
      ]),
      color,
    ),
  ];
}

/** Returns a steel brick's two rivets, one toward each end. */
function rivets(
  body: Box,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const radius = Math.max(1, scale.unit * DOT);
  const y = body.y + body.height / 2;
  const fromEnd = body.height / 2;
  return [
    circle(body.x + fromEnd, y, radius, color),
    circle(body.x + body.width - fromEnd, y, radius, color),
  ];
}

/** Returns a gift brick's mark: a capsule's outline in the middle of its body. */
function giftMark(
  body: Box,
  scale: ArtScale,
  color: number,
  bodyColor: number,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const height = body.height * 0.6;
  const outer = {
    x: body.x + (body.width - 2 * height) / 2,
    y: body.y + (body.height - height) / 2,
    width: 2 * height,
    height,
  };
  return [
    roundRect(outer, height / 2, color),
    roundRect(inset(outer, width), height / 2 - width, bodyColor),
  ];
}

/** Returns a blast brick's mark: a starburst in the middle of its body. */
function burst(body: Box, color: number): DrawCommand {
  return polygon(
    star(
      body.x + body.width / 2,
      body.y + body.height / 2,
      body.height * 0.42,
      body.height * 0.18,
      8,
    ),
    color,
  );
}

/** How each kind of brick is drawn: its frames, and which one a brick shows. */
export const BRICK_ART = {
  plain: {
    frameOf: (brick) => nameAt(PLAIN_FRAMES, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(PLAIN_FRAMES, i), scale, (body) => [
          filled(body, scale, tint),
        ]),
      ),
  },
  tough: {
    frameOf: (brick) =>
      nameAt(TOUGH_FRAMES[brick.whole]?.[brick.hits], brick.tint),
    frames: (palette, scale) =>
      TOUGH_FRAMES.slice(BRICK_KINDS.tough.hits).flatMap((byHits, i) => {
        const whole = BRICK_KINDS.tough.hits + i;
        return byHits.slice(1).flatMap((names, j) => {
          const hits = j + 1;
          return palette.toughTints.map((tint, k) =>
            drawBrick(nameAt(names, k), scale, (body) => [
              filled(body, scale, tint),
              ...pips(body, hits, scale, palette.mark),
              ...cracks(body, whole - hits, scale, palette.mark),
            ]),
          );
        });
      }),
  },
  steel: {
    frameOf: () => "steel",
    frames: (palette, scale) => [
      drawBrick("steel", scale, (body) => [
        filled(body, scale, palette.bricks.steel),
        ...rivets(body, scale, palette.mark),
      ]),
    ],
  },
  blast: {
    frameOf: () => "blast",
    frames: (palette, scale) => [
      drawBrick("blast", scale, (body) => [
        filled(body, scale, palette.bricks.blast),
        burst(body, palette.mark),
      ]),
    ],
  },
  gift: {
    frameOf: () => "gift",
    frames: (palette, scale) => [
      drawBrick("gift", scale, (body) => [
        filled(body, scale, palette.bricks.gift),
        ...giftMark(body, scale, palette.mark, palette.bricks.gift),
      ]),
    ],
  },
  ghost: {
    // Once it shows, a ghost brick is drawn as a plain one.
    frameOf: (brick) =>
      nameAt(brick.shown ? PLAIN_FRAMES : GHOST_FRAMES, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(GHOST_FRAMES, i), scale, (body) =>
          dashes(body, scale, tint),
        ),
      ),
  },
  regrow: {
    frameOf: (brick) => nameAt(REGROW_FRAMES, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(REGROW_FRAMES, i), scale, (body) => [
          filled(body, scale, tint),
          ...sprout(body, scale, palette.mark),
        ]),
      ),
  },
} satisfies Readonly<Record<BrickKindId, BrickArt>>;

/** How each kind of ball is drawn inside its outline: in its color, with its one mark. */
export const BALL_ART = {
  normal: (x, y, radius, palette) => [
    circle(x, y, radius, palette.balls.normal),
  ],
  // Its mark is its trail of embers, which the scene lets fall behind it.
  fire: (x, y, radius, palette) => [circle(x, y, radius, palette.balls.fire)],
  blast: (x, y, radius, palette, scale) => [
    circle(x, y, radius, palette.balls.blast),
    ring(x, y, radius / 2, lineWidth(scale), palette.mark),
  ],
} satisfies Readonly<Record<BallKindId, DrawBall>>;

/** How each tone of capsule is shaped: a good one with rounded ends, a bad one with notched ends. */
export const CAPSULE_ART = {
  good: (width, height, line, outline, body) => {
    const whole = { x: 0, y: 0, width, height };
    return [
      roundRect(whole, height / 2, outline),
      roundRect(inset(whole, line), height / 2 - line, body),
    ];
  },
  bad: (width, height, line, outline, body) => {
    const notch = height * NOTCH;
    const half = height / 2;
    // How far across a notch's slanted edges move to lie a line's width in.
    const across = (line * Math.hypot(notch, half)) / half;
    const corner = across + (notch * line) / half;
    const shape = (
      by: number,
      toCorner: number,
      toNotch: number,
    ): readonly Point[] => [
      { x: toCorner, y: by },
      { x: width - toCorner, y: by },
      { x: width - toNotch, y: half },
      { x: width - toCorner, y: height - by },
      { x: toCorner, y: height - by },
      { x: toNotch, y: half },
    ];
    return [
      polygon(shape(0, 0, notch), outline),
      polygon(shape(line, corner, notch + across), body),
    ];
  },
} satisfies Readonly<Record<CapsuleTone, DrawCapsule>>;

/** Returns the lines a symbol is drawn with, as wide as its square allows. */
function stroke(side: number): number {
  return Math.max(1, side * 0.14);
}

/** Each capsule's symbol, which its capsule, its tag and How to play show. */
export const SYMBOLS = {
  wide: (x, y, side, color) => {
    const box = { x, y, width: side, height: side };
    return [
      polygon(
        within(box, [
          [0, 0.5],
          [0.32, 0.2],
          [0.32, 0.8],
        ]),
        color,
      ),
      polygon(
        within(box, [
          [1, 0.5],
          [0.68, 0.2],
          [0.68, 0.8],
        ]),
        color,
      ),
      rect(
        {
          x: x + side * 0.3,
          y: y + side * 0.42,
          width: side * 0.4,
          height: side * 0.16,
        },
        color,
      ),
    ];
  },
  multi: (x, y, side, color) => [
    circle(x + side * 0.5, y + side * 0.27, side * 0.16, color),
    circle(x + side * 0.24, y + side * 0.73, side * 0.16, color),
    circle(x + side * 0.76, y + side * 0.73, side * 0.16, color),
  ],
  slow: (x, y, side, color) =>
    lines(
      within({ x, y, width: side, height: side }, [
        [0.15, 0.3],
        [0.5, 0.68],
        [0.85, 0.3],
      ]),
      stroke(side),
      color,
    ),
  life: (x, y, side, color) => [
    circle(x + side * 0.32, y + side * 0.36, side * 0.2, color),
    circle(x + side * 0.68, y + side * 0.36, side * 0.2, color),
    polygon(
      within({ x, y, width: side, height: side }, [
        [0.13, 0.44],
        [0.87, 0.44],
        [0.5, 0.88],
      ]),
      color,
    ),
  ],
  catch: (x, y, side, color) =>
    lines(
      within({ x, y, width: side, height: side }, [
        [0.2, 0.2],
        [0.2, 0.8],
        [0.8, 0.8],
        [0.8, 0.2],
      ]),
      stroke(side),
      color,
    ),
  net: (x, y, side, color) => [
    rect(
      {
        x: x + side * 0.1,
        y: y + side * 0.42,
        width: side * 0.8,
        height: side * 0.16,
      },
      color,
    ),
  ],
  laser: (x, y, side, color) => [
    rect(
      {
        x: x + side * 0.24,
        y: y + side * 0.15,
        width: side * 0.14,
        height: side * 0.7,
      },
      color,
    ),
    rect(
      {
        x: x + side * 0.62,
        y: y + side * 0.15,
        width: side * 0.14,
        height: side * 0.7,
      },
      color,
    ),
  ],
  narrow: (x, y, side, color) => {
    const box = { x, y, width: side, height: side };
    return [
      polygon(
        within(box, [
          [0.46, 0.5],
          [0.1, 0.2],
          [0.1, 0.8],
        ]),
        color,
      ),
      polygon(
        within(box, [
          [0.54, 0.5],
          [0.9, 0.2],
          [0.9, 0.8],
        ]),
        color,
      ),
    ];
  },
  fire: (x, y, side, color) => [
    polygon(
      within({ x, y, width: side, height: side }, [
        [0.5, 0.05],
        [0.8, 0.5],
        [0.75, 0.8],
        [0.5, 0.95],
        [0.25, 0.8],
        [0.2, 0.5],
        [0.38, 0.35],
      ]),
      color,
    ),
  ],
  fast: (x, y, side, color) => {
    const box = { x, y, width: side, height: side };
    return [
      ...lines(
        within(box, [
          [0.15, 0.5],
          [0.5, 0.15],
          [0.85, 0.5],
        ]),
        stroke(side),
        color,
      ),
      ...lines(
        within(box, [
          [0.15, 0.85],
          [0.5, 0.5],
          [0.85, 0.85],
        ]),
        stroke(side),
        color,
      ),
    ];
  },
  blast: (x, y, side, color) => [
    polygon(
      star(x + side / 2, y + side / 2, side * 0.48, side * 0.2, 8),
      color,
    ),
  ],
} satisfies Readonly<Record<CapsuleId, DrawSymbol>>;

/** Returns the name of the frame a brick shows, as it stands. */
export function brickFrame(brick: BrickLook): string {
  return BRICK_ART[brick.kind].frameOf(brick);
}

/** Returns the name of a kind of ball's frame. */
export function ballFrame(kind: BallKindId): string {
  return BALL_FRAMES[kind];
}

/** Returns the name of a capsule's frame, as it falls. */
export function capsuleFrame(id: CapsuleId): string {
  return CAPSULE_FRAMES[id];
}

/** Returns the name of a capsule's tag, under the paddle while its effect lasts. */
export function tagFrame(id: CapsuleId): string {
  return TAG_FRAMES[id];
}

/** Returns a kind of ball's frame, outlined in the palette's outline. */
function ballArt(
  kind: BallKindId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const side = Math.max(3, Math.round(2 * BALL_RADIUS * scale.unit));
  const middle = side / 2;
  return {
    name: BALL_FRAMES[kind],
    width: side,
    height: side,
    commands: [
      circle(middle, middle, middle, palette.outline),
      ...BALL_ART[kind](
        middle,
        middle,
        middle - lineWidth(scale),
        palette,
        scale,
      ),
    ],
  };
}

/** Returns a capsule's frame: its tone's shape and color, outlined, with its symbol. */
function capsuleArt(
  id: CapsuleId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const width = Math.round(CAPSULE_WIDTH * scale.unit);
  const height = Math.round(CAPSULE_HEIGHT * scale.unit);
  const line = lineWidth(scale);
  const { tone } = capsule(id);
  const side = (height - 2 * line) * SYMBOL_SHARE;
  const square = middleSquare({ x: 0, y: 0, width, height }, side);
  return {
    name: CAPSULE_FRAMES[id],
    width,
    height,
    commands: [
      ...CAPSULE_ART[tone](
        width,
        height,
        line,
        palette.outline,
        palette.capsules[tone],
      ),
      ...SYMBOLS[id](square.x, square.y, side, palette.mark),
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
    commands: SYMBOLS[id](0, 0, side, palette.capsules[capsule(id).tone]),
  };
}

/** Returns the frames of the paddle and what it carries, the bolts and the flourishes. */
function otherArt(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const line = lineWidth(scale);
  const paddleHeight = Math.round(PADDLE_HEIGHT * scale.unit);
  const ends = Math.ceil(paddleHeight / 2);
  const cannon = {
    x: 0,
    y: 0,
    width: Math.max(2 * line, Math.round(CANNON.width * scale.unit)),
    height: Math.max(2 * line, Math.round(CANNON.height * scale.unit)),
  };
  const bolt = {
    x: 0,
    y: 0,
    width: Math.max(2 * line, Math.round(BOLT_WIDTH * scale.unit)),
    height: Math.round(BOLT_LENGTH * scale.unit),
  };
  const shard = Math.max(2, Math.round(SHARD_SIZE * scale.unit));
  const ember = Math.max(2, Math.round(EMBER_SIZE * scale.unit));
  const blastRing = Math.round(RING_SIZE * scale.unit);
  return [
    {
      name: FRAMES.paddle,
      width: 2 * ends + 2,
      height: paddleHeight,
      commands: [
        roundRect(
          { x: 0, y: 0, width: 2 * ends + 2, height: paddleHeight },
          paddleHeight / 2,
          palette.paddle,
        ),
      ],
      ends,
    },
    {
      name: FRAMES.cannon,
      width: cannon.width,
      height: cannon.height,
      commands: [
        roundRect(cannon, line, palette.paddle),
        rect(
          {
            x: (cannon.width - line) / 2,
            y: line,
            width: line,
            height: cannon.height - 2 * line,
          },
          palette.mark,
        ),
      ],
    },
    {
      name: FRAMES.rim,
      width: 2,
      height: line,
      commands: [rect({ x: 0, y: 0, width: 2, height: line }, palette.mark)],
    },
    {
      name: FRAMES.bolt,
      width: bolt.width,
      height: bolt.height,
      commands: [roundRect(bolt, bolt.width / 2, palette.paddle)],
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
          0xffffff,
        ),
      ],
    },
    {
      name: FRAMES.ember,
      width: ember,
      height: ember,
      commands: [circle(ember / 2, ember / 2, ember / 2, palette.balls.fire)],
    },
    {
      name: FRAMES.ring,
      width: blastRing,
      height: blastRing,
      commands: [
        ring(
          blastRing / 2,
          blastRing / 2,
          blastRing / 2 - line,
          2 * line,
          palette.bricks.blast,
        ),
      ],
    },
  ];
}

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * brick kind in each tint and state, each ball, each capsule and its tag,
 * the paddle and what it carries, the bolt and the flourishes.
 */
export function atlasFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...BRICK_KIND_IDS.flatMap((kind) => BRICK_ART[kind].frames(palette, scale)),
    ...BALL_KIND_IDS.map((kind) => ballArt(kind, palette, scale)),
    ...CAPSULE_IDS.map((id) => capsuleArt(id, palette, scale)),
    ...CAPSULE_IDS.map((id) => tagArt(id, palette, scale)),
    ...otherArt(palette, scale),
  ];
}
