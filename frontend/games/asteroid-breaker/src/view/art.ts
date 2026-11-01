import { recordOf } from "@fz/core/records";
import { PICKUP_IDS, type PickupId } from "../rules/catalog/pickups";
import { ROCK_KIND_IDS, type RockKindId } from "../rules/catalog/rocks";
import { STRAY_RADIUS } from "../rules/tuning";
import {
  DASH_RADIUS_CSS_PX,
  type DeckButton,
  FIRE_RADIUS_CSS_PX,
} from "./deck";
import type { BeltPalette } from "./palette";
import {
  PILOT_SIZES,
  eyesCommands,
  fuzzballCommands,
  pilotFrames,
} from "./pilot_art";
import { largestOf, rockFrame, rockFrames } from "./rock_art";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  arcPoints,
  bounded,
  centered,
  circle,
  dashedRing,
  lineWidth,
  outlineWidth,
  placed,
  polygon,
  quadraticPoints,
  ring,
  roundRect,
  shifted,
  stroke,
  widthOf,
} from "./shapes";
import { shipFrames } from "./ship_art";
import { KNOB_RADIUS_CSS_PX, STICK_RADIUS_CSS_PX, THRUST_RING } from "./stick";
import { SYMBOLS } from "./symbols";

/** The names of the frames that aren't a rock's, a pilot's, the ship's or a pickup's. */
export const FRAMES = {
  shot: "shot",
  /** A stray's bubble, its pilot drawn in it. */
  bubble: "bubble",
  /** The comet's head and tail, the head's middle the frame's. */
  comet: "comet",
  /** The chevron at the edge a comet will come in by. */
  warning: "warning",
  /** A speck of the field, white, so the scene tints it, as it does the constellation's. */
  speck: "speck",
  /** A broken rock's shard, white, so the scene tints it as the rock was. */
  shard: "shard",
  /** The spark off a rock that holds, white. */
  spark: "spark",
  /** A puff, white, which a break's dust and the ship's exhaust are drawn in. */
  puff: "puff",
  /** How to play's picture of a stray, a fuzzball in the accent in its bubble, as the fuzzball is everywhere but in a pilot's ink. */
  strayPicture: "stray-picture",
  /** How to play's picture of the comet, framed by its head and tail together, as a picture is taken whole. */
  cometPicture: "comet-picture",
} as const;

/** The names of the deck's frames, each white, so the scene tints it as it is held or at rest. */
export const DECK_FRAMES = {
  /** The stick's base, a disc as wide as the knob reaches. */
  stickBase: "stick-base",
  /** The stick's edge, a ring where the knob reaches. */
  stickRing: "stick-ring",
  /** The stick at rest, a dashed ring where it waits. */
  stickRest: "stick-rest",
  /** The ring the knob thrusts past, dashed. */
  stickThrust: "stick-thrust",
  knob: "knob",
  fireDisc: "fire-disc",
  fireRing: "fire-ring",
  fireSymbol: "fire-symbol",
  dashDisc: "dash-disc",
  dashRing: "dash-ring",
  dashSymbol: "dash-symbol",
} as const;

/** How wide a shot is, along its travel and across it, in field units. */
const SHOT = { length: 0.72, width: 0.3 } as const;

/** How far a pickup's hexagon reaches to its corners, and how round they are, in field units. */
const PICKUP = { reach: 0.95, corner: 0.27 } as const;

/** How wide a pickup's symbol's square is, in field units. */
const SYMBOL_SIDE = 1;

/** How wide a stray's bubble's rim is, and its glint, in field units. */
const BUBBLE = { rim: 0.11, glint: 0.1 } as const;

/** Where a stray's bubble's glint runs, along a circle a share of its radius, from an angle to another. */
const GLINT = { reach: 0.78, from: -2.5, to: -1.75 } as const;

/** How far below its bubble's middle a stray's pilot sits, as a share of its radius. */
export const STRAY_DROP = 0.05;

/**
 * The comet's head's radius, a little past the reach it meets things
 * within, and its tail's length from the head's middle, within the margin
 * the comet leaves the field by, so all of it has gone from sight as it
 * goes, in field units; and how far along the tail its sides bend in.
 */
const COMET = { head: 1.1, tail: 2.8, bend: 0.55 } as const;

/** How wide the warning's chevrons are drawn, in field units. */
const WARNING_LINE = 0.32;

/** How big a speck is at its largest, a shard and a spark, and a puff, in field units. */
const FLOURISH = { speck: 0.18, shard: 0.5, spark: 0.3, puff: 0.4 } as const;

/** How wide the deck's lines are, in CSS pixels. */
const DECK_LINE_CSS_PX = 2;

/** How long the deck's dashes are, and their gaps, in CSS pixels. */
const DECK_DASH_CSS_PX = { dash: 5, gap: 5 } as const;

/** How wide a button's symbol is, as a share of the button's radius. */
const BUTTON_SYMBOL = 0.9;

// Made once, so finding a frame's name makes nothing.
const PICKUP_FRAMES: Readonly<Record<PickupId, string>> = recordOf(
  PICKUP_IDS,
  (id) => `pickup-${id}`,
);

/** Returns the name of a pickup's frame, as it drifts. */
export function pickupFrame(id: PickupId): string {
  return PICKUP_FRAMES[id];
}

/** Returns a regular polygon's outline with rounded corners: each corner an arc about a point that far from its middle, the first corner at an angle. */
function roundedRegular(
  sides: number,
  reach: number,
  corner: number,
  first: number,
): readonly Point[] {
  const half = Math.PI / sides;
  return Array.from({ length: sides }, (_, i) => {
    const angle = first + 2 * half * i;
    return arcPoints(
      Math.cos(angle) * reach,
      Math.sin(angle) * reach,
      corner,
      angle - half,
      angle + half,
    );
  }).flat();
}

/** Returns a pickup's frame: a rounded hexagon in the accent, outlined, with its symbol in the color on the accent. */
function pickupArt(
  id: PickupId,
  palette: BeltPalette,
  scale: ArtScale,
): ArtFrame {
  const corner = PICKUP.corner * scale.unit;
  // How far a corner's arc's middle lies from the hexagon's, its arc touching the sharp hexagon's sides.
  const reach = PICKUP.reach * scale.unit - corner / Math.cos(Math.PI / 6);
  const side = SYMBOL_SIDE * scale.unit;
  const hexagon = (round: number): readonly Point[] =>
    roundedRegular(6, reach, round, Math.PI / 6);
  return centered(PICKUP_FRAMES[id], [
    polygon(hexagon(corner + outlineWidth(scale)), palette.outline),
    polygon(hexagon(corner), palette.accent),
    ...SYMBOLS[id](
      { x: -side / 2, y: -side / 2, width: side, height: side },
      palette.onAccent,
      lineWidth(scale),
      palette.accent,
    ),
  ]);
}

/** Returns a stray's bubble about its middle: its wash, its rim and its glint. */
function bubbleCommands(
  palette: BeltPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const radius = STRAY_RADIUS * scale.unit;
  const rim = widthOf(BUBBLE.rim, scale);
  return [
    circle(0, 0, radius, palette.bubble),
    ring(0, 0, radius - rim / 2, rim, palette.rim),
    ...stroke(
      arcPoints(0, 0, radius * GLINT.reach, GLINT.from, GLINT.to),
      widthOf(BUBBLE.glint, scale),
      palette.glint,
    ),
  ];
}

/** Returns the comet's head and tail about its head's middle, its tail behind it along x. */
function cometCommands(
  palette: BeltPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const head = COMET.head * scale.unit;
  const top = { x: 0, y: -1 };
  const tip = { x: -COMET.tail, y: 0 };
  const bend = -COMET.bend * COMET.tail;
  const tail = [
    top,
    ...quadraticPoints(top, { x: bend, y: -0.55 }, tip),
    ...quadraticPoints(tip, { x: bend, y: 0.55 }, { x: 0, y: 1 }),
  ];
  return [
    polygon(placed(tail, scale.unit), palette.comet),
    circle(0, 0, head + outlineWidth(scale), palette.outline),
    circle(0, 0, head, palette.comet),
  ];
}

/** Returns the warning's two chevrons, pointing along x, in the comet's color. */
function warningCommands(
  palette: BeltPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const width = widthOf(WARNING_LINE, scale);
  const chevron = (points: readonly Point[]): readonly DrawCommand[] =>
    stroke(placed(points, scale.unit), width, palette.comet);
  return [
    ...chevron([
      { x: -0.45, y: -0.8 },
      { x: 0.35, y: 0 },
      { x: -0.45, y: 0.8 },
    ]),
    ...chevron([
      { x: -1.15, y: -0.55 },
      { x: -0.6, y: 0 },
      { x: -1.15, y: 0.55 },
    ]),
  ];
}

/** Returns the frames of what isn't a rock, a pilot, the ship or a pickup: the shot, a stray's bubble, the comet and its warning, the flourishes, and the stray's and the comet's pictures. */
function otherArt(palette: BeltPalette, scale: ArtScale): readonly ArtFrame[] {
  const shot = {
    width: SHOT.length * scale.unit,
    height: SHOT.width * scale.unit,
  };
  const shotLine = lineWidth(scale);
  const outlined = {
    x: -shot.width / 2 - shotLine,
    y: -shot.height / 2 - shotLine,
    width: shot.width + 2 * shotLine,
    height: shot.height + 2 * shotLine,
  };
  const shard = FLOURISH.shard * scale.unit;
  const spark = FLOURISH.spark * scale.unit;
  const adrift = PILOT_SIZES.adrift * scale.unit;
  const drop = STRAY_DROP * STRAY_RADIUS * scale.unit;
  return [
    centered(FRAMES.shot, [
      roundRect(outlined, outlined.height / 2, palette.outline),
      roundRect(
        { x: -shot.width / 2, y: -shot.height / 2, ...shot },
        shot.height / 2,
        palette.shot,
      ),
    ]),
    centered(FRAMES.bubble, bubbleCommands(palette, scale)),
    centered(FRAMES.comet, cometCommands(palette, scale)),
    centered(FRAMES.warning, warningCommands(palette, scale)),
    centered(FRAMES.speck, [
      circle(0, 0, FLOURISH.speck * scale.unit, 0xffffff),
    ]),
    centered(FRAMES.shard, [
      polygon(
        placed(
          [
            { x: -0.5, y: 0.5 },
            { x: 0.5, y: 0.1 },
            { x: -0.15, y: -0.5 },
          ],
          shard,
        ),
        0xffffff,
      ),
    ]),
    centered(FRAMES.spark, [
      polygon(
        placed(
          [
            { x: 0, y: -1 },
            { x: 0.25, y: -0.25 },
            { x: 1, y: 0 },
            { x: 0.25, y: 0.25 },
            { x: 0, y: 1 },
            { x: -0.25, y: 0.25 },
            { x: -1, y: 0 },
            { x: -0.25, y: -0.25 },
          ],
          spark,
        ),
        0xffffff,
      ),
    ]),
    centered(FRAMES.puff, [circle(0, 0, FLOURISH.puff * scale.unit, 0xffffff)]),
    centered(FRAMES.strayPicture, [
      ...bubbleCommands(palette, scale),
      ...[
        ...fuzzballCommands(adrift, palette.accent),
        ...eyesCommands(adrift, palette),
      ].map((command) => shifted(command, 0, drop)),
    ]),
    bounded(FRAMES.cometPicture, cometCommands(palette, scale)),
  ];
}

/**
 * Returns every frame the field's atlas holds, drawn in a palette at a
 * scale, tallest first, so the rows the atlas packs them in waste little:
 * each rock in each kind, size, outline and hits taken, the ship and what
 * it carries, the pilots and their eyes, the pickups, the shot, a stray's
 * bubble, the comet and its warning, the flourishes and the stray's
 * picture.
 *
 * Draw it at {@link bakedScale}'s scale, as the largest window's unit
 * would make it too large for some devices.
 */
export function atlasFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...rockFrames(palette, scale),
    ...shipFrames(palette, scale),
    ...pilotFrames(palette, scale),
    ...PICKUP_IDS.map((id) => pickupArt(id, palette, scale)),
    ...otherArt(palette, scale),
  ].sort((a, b) => b.height - a.height);
}

/** Returns a button's frames: its disc, its ring and its symbol, white. */
function buttonArt(
  button: DeckButton,
  radiusCss: number,
  pixelRatio: number,
): readonly ArtFrame[] {
  const radius = radiusCss * pixelRatio;
  const line = Math.round(DECK_LINE_CSS_PX * pixelRatio);
  const side = BUTTON_SYMBOL * radius;
  const names = {
    fire: [DECK_FRAMES.fireDisc, DECK_FRAMES.fireRing, DECK_FRAMES.fireSymbol],
    dash: [DECK_FRAMES.dashDisc, DECK_FRAMES.dashRing, DECK_FRAMES.dashSymbol],
  } as const;
  const [disc, edge, symbol] = names[button];
  return [
    centered(disc, [circle(0, 0, radius, 0xffffff)]),
    centered(edge, [ring(0, 0, radius - line / 2, line, 0xffffff)]),
    centered(
      symbol,
      SYMBOLS[button](
        { x: -side / 2, y: -side / 2, width: side, height: side },
        0xffffff,
        line,
      ),
    ),
  ];
}

/**
 * Returns the deck's frames at a pixel ratio, each white, so the scene
 * tints them as they are held or at rest: the stick's base, edge and rings,
 * its knob, and each button's disc, ring and symbol.
 *
 * They are sized in CSS pixels, as the deck is, so they take no palette and
 * no unit, and are baked apart from the field's.
 */
export function deckFrames(pixelRatio: number): readonly ArtFrame[] {
  const reach = STICK_RADIUS_CSS_PX * pixelRatio;
  const line = Math.round(DECK_LINE_CSS_PX * pixelRatio);
  const dash = {
    dash: DECK_DASH_CSS_PX.dash * pixelRatio,
    gap: DECK_DASH_CSS_PX.gap * pixelRatio,
  };
  return [
    centered(DECK_FRAMES.stickBase, [circle(0, 0, reach, 0xffffff)]),
    centered(DECK_FRAMES.stickRing, [
      ring(0, 0, reach - line / 2, line, 0xffffff),
    ]),
    centered(
      DECK_FRAMES.stickRest,
      dashedRing(reach - line / 2, line, dash, 0xffffff),
    ),
    centered(
      DECK_FRAMES.stickThrust,
      dashedRing(THRUST_RING * reach, line, dash, 0xffffff),
    ),
    centered(DECK_FRAMES.knob, [
      circle(0, 0, KNOB_RADIUS_CSS_PX * pixelRatio, 0xffffff),
    ]),
    ...buttonArt("fire", FIRE_RADIUS_CSS_PX, pixelRatio),
    ...buttonArt("dash", DASH_RADIUS_CSS_PX, pixelRatio),
  ].sort((a, b) => b.height - a.height);
}

/** Names a picture of each rock kind and pickup, a stray and the comet, for How to play. */
export interface Pictures {
  readonly rocks: Readonly<Record<RockKindId, string>>;
  readonly pickups: Readonly<Record<PickupId, string>>;
  readonly stray: string;
  readonly comet: string;
}

/** The frames How to play's pictures are taken from, each rock whole, at its largest size. */
export const PICTURE_FRAMES: Pictures = {
  rocks: recordOf(ROCK_KIND_IDS, (kind) =>
    rockFrame({ kind, size: largestOf(kind), outline: 0 }),
  ),
  pickups: PICKUP_FRAMES,
  stray: FRAMES.strayPicture,
  comet: FRAMES.cometPicture,
};

/** Returns a set of pictures with each turned into another, such as a frame's name into the image baked of it. */
export function mapPictures(
  pictures: Pictures,
  map: (picture: string) => string,
): Pictures {
  return {
    rocks: recordOf(ROCK_KIND_IDS, (kind) => map(pictures.rocks[kind])),
    pickups: recordOf(PICKUP_IDS, (id) => map(pictures.pickups[id])),
    stray: map(pictures.stray),
    comet: map(pictures.comet),
  };
}
