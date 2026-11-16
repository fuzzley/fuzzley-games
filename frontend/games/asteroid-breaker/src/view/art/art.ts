import { recordOf } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  arcPoints,
  centered,
  circle,
  lineWidth,
  placed,
  polygon,
  ring,
  shifted,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { PICKUP_IDS, type PickupId } from "../../rules/catalog/pickups";
import type { RockKindId } from "../../rules/catalog/rocks";
import { STRAY_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import {
  DASH_RADIUS_CSS_PX,
  type DeckButton,
  FIRE_RADIUS_CSS_PX,
} from "../steering/deck";
import {
  KNOB_RADIUS_CSS_PX,
  STICK_RADIUS_CSS_PX,
  THRUST_RING,
} from "../steering/stick";
import { arcFrames } from "./arcs";
import { energyFrames } from "./energy";
import {
  PILOT_SIZES,
  eyesCommands,
  fuzzballCommands,
  pilotFrames,
} from "./pilot_art";
import { podFrames, podHullFrame } from "./pod_art";
import { type LitFrame, rockFrames } from "./rock_art";
import { dashedRing } from "./shapes";
import { sparkFrames } from "./sparks";
import { SYMBOLS } from "./symbols";
import {
  BURR_FRAMES,
  COMET_FRAMES,
  PICKUP_FRAMES,
  cometHeadFrame,
  thingsFrames,
} from "./things";

/** The names of the frames that aren't a rock's, a pilot's, the pod's, a pickup's, the comet's or the field's energy's. */
export const FRAMES = {
  /** A stray's bubble, its pilot drawn in it. */
  bubble: "bubble",
  /** A shard of a lost pod's burst, white, so the scene tints it in the accent. */
  shard: "shard",
  /** A puff, white, which the pod's exhaust is drawn in. */
  puff: "puff",
  /**
   * How to play's picture of a stray, a fuzzball in the accent in its bubble,
   * as the fuzzball is everywhere but in a pilot's ink.
   */
  strayPicture: "stray-picture",
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

/** How wide a tag's symbol's square is, in field units, within its ring. */
const TAG_SYMBOL_SIDE = 1.2;

/** How wide a stray's bubble's rim is, and its glint, in field units. */
const BUBBLE = { rim: 0.11, glint: 0.1 } as const;

/**
 * Where a stray's bubble's glint runs, along a circle a share of its radius,
 * from an angle to another.
 */
const GLINT = { reach: 0.78, from: -2.5, to: -1.75 } as const;

/** How far below its bubble's middle a stray's pilot sits, as a share of its radius. */
export const STRAY_DROP = 0.05;

/** How big each flourish's frame is drawn, in field units: a shard across and down, and a puff's radius. */
export const FLOURISH = {
  shard: 0.5,
  puff: 0.4,
} as const;

/** How wide the deck's lines are, in CSS pixels. */
const DECK_LINE_CSS_PX = 2;

/** How long the deck's dashes are, and their gaps, in CSS pixels. */
const DECK_DASH_CSS_PX = { dash: 5, gap: 5 } as const;

/** How wide a button's symbol is, as a share of the button's radius. */
const BUTTON_SYMBOL = 0.9;

/** What the frames the scene tints are filled in. */
const WHITE = { color: 0xffffff } as const;

/** The names of the tags' frames, for each pickup. */
const TAG_FRAMES: Readonly<Record<PickupId, string>> = recordOf(
  PICKUP_IDS,
  (id) => `tag-${id}`,
);

/** Returns the name of a pickup's tag, at the field's bottom left while its effect lasts. */
export function tagFrame(id: PickupId): string {
  return TAG_FRAMES[id];
}

/** Returns a pickup's tag: its symbol alone, in the accent, which the scene draws a ring round. */
function tagArt(id: PickupId, palette: BeltPalette, scale: ArtScale): ArtFrame {
  const side = TAG_SYMBOL_SIDE * scale.unit;
  return centered(
    tagFrame(id),
    SYMBOLS[id](
      { x: -side / 2, y: -side / 2, width: side, height: side },
      { color: palette.accent, width: lineWidth(scale) },
    ),
  );
}

/** Returns a stray's bubble about its middle: its wash, its rim and its glint. */
function bubbleCommands(
  palette: BeltPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const radius = STRAY_RADIUS * scale.unit;
  const rim = widthOf(BUBBLE.rim, scale);
  return [
    circle(ORIGIN, radius, { color: palette.bubble }),
    ring(ORIGIN, radius - rim / 2, { color: palette.rim, width: rim }),
    ...stroke(arcPoints(ORIGIN, radius * GLINT.reach, GLINT.from, GLINT.to), {
      color: palette.glint,
      width: widthOf(BUBBLE.glint, scale),
    }),
  ];
}

/**
 * Returns the frames of what isn't a rock, a pilot, the pod, a pickup or
 * the field's energy: a stray's bubble, the flourishes, and the stray's
 * picture.
 */
function otherArt(palette: BeltPalette, scale: ArtScale): readonly ArtFrame[] {
  const shard = FLOURISH.shard * scale.unit;
  const adrift = PILOT_SIZES.adrift * scale.unit;
  const drop = STRAY_DROP * STRAY_RADIUS * scale.unit;
  return [
    centered(FRAMES.bubble, bubbleCommands(palette, scale)),
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
        WHITE,
      ),
    ]),
    centered(FRAMES.puff, [circle(ORIGIN, FLOURISH.puff * scale.unit, WHITE)]),
    centered(FRAMES.strayPicture, [
      ...bubbleCommands(palette, scale),
      ...[
        ...fuzzballCommands(adrift, palette.accent),
        ...eyesCommands(adrift, palette),
      ].map((command) => shifted(command, { x: 0, y: drop })),
    ]),
  ];
}

/**
 * Returns every frame the field's atlas holds, drawn in a palette at a
 * scale, the fine marks only where the field keeps them: the pod's but its
 * hull, and the comet's but its head, which the rocks' atlas lights, the
 * pilots and their eyes, the pickups and their tags, the comet's warning
 * and lane, the burr adrift and clinging, barbed and bare, and its glints,
 * each weapon's shot and the muzzle's flash, the sparks broken rocks shed
 * and their tail, the spark where a zap's arc lands, a stray's bubble, the
 * flourishes, and the stray's, the comet's and the burr's pictures.
 *
 * Draw it at {@link bakedScale}'s scale, as the largest window's unit
 * would make it too large for some devices, with the fine marks as
 * `isFine()` of the field's own scale says; the scene chooses a burr's
 * barbs and glint by the field's own scale as it draws.
 */
export function atlasFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  return [
    ...podFrames(palette, scale, fine),
    ...pilotFrames(palette, scale, fine),
    ...thingsFrames(palette, scale, fine),
    ...PICKUP_IDS.map((id) => tagArt(id, palette, scale)),
    ...energyFrames(palette, scale, fine),
    ...sparkFrames(palette, scale),
    ...arcFrames(palette, scale),
    ...otherArt(palette, scale),
  ];
}

/**
 * Returns every frame of the rocks' atlas and its normal map, each in its
 * inks and as its normal map: the rocks' (`rockFrames()`), then the pod's
 * hull and the comet's head, which the scene lights as it lights them.
 */
export function litFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly LitFrame[] {
  return [
    ...rockFrames(palette, scale, fine),
    podHullFrame(palette, scale),
    cometHeadFrame(palette, scale),
  ];
}

/** Returns a button's frames: its disc, its ring and its symbol, white. */
function buttonArt(
  button: DeckButton,
  radiusCss: number,
  pixelRatio: number,
): readonly ArtFrame[] {
  const radius = radiusCss * pixelRatio;
  const line = Math.round(DECK_LINE_CSS_PX * pixelRatio);
  const pen = { ...WHITE, width: line };
  const side = BUTTON_SYMBOL * radius;
  const names = {
    fire: [DECK_FRAMES.fireDisc, DECK_FRAMES.fireRing, DECK_FRAMES.fireSymbol],
    dash: [DECK_FRAMES.dashDisc, DECK_FRAMES.dashRing, DECK_FRAMES.dashSymbol],
  } as const;
  const [disc, edge, symbol] = names[button];
  return [
    centered(disc, [circle(ORIGIN, radius, WHITE)]),
    centered(edge, [ring(ORIGIN, radius - line / 2, pen)]),
    centered(
      symbol,
      SYMBOLS[button](
        { x: -side / 2, y: -side / 2, width: side, height: side },
        pen,
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
  const pen = { ...WHITE, width: line };
  const dash = {
    dash: DECK_DASH_CSS_PX.dash * pixelRatio,
    gap: DECK_DASH_CSS_PX.gap * pixelRatio,
  };
  return [
    centered(DECK_FRAMES.stickBase, [circle(ORIGIN, reach, WHITE)]),
    centered(DECK_FRAMES.stickRing, [ring(ORIGIN, reach - line / 2, pen)]),
    centered(DECK_FRAMES.stickRest, dashedRing(reach - line / 2, dash, pen)),
    centered(
      DECK_FRAMES.stickThrust,
      dashedRing(THRUST_RING * reach, dash, pen),
    ),
    centered(DECK_FRAMES.knob, [
      circle(ORIGIN, KNOB_RADIUS_CSS_PX * pixelRatio, WHITE),
    ]),
    ...buttonArt("fire", FIRE_RADIUS_CSS_PX, pixelRatio),
    ...buttonArt("dash", DASH_RADIUS_CSS_PX, pixelRatio),
  ];
}

/** Names a picture of each rock kind and pickup, a stray, the comet and a burr, for How to play. */
export interface Pictures {
  readonly rocks: Readonly<Record<RockKindId, string>>;
  readonly pickups: Readonly<Record<PickupId, string>>;
  readonly stray: string;
  readonly comet: string;
  readonly burr: string;
}

/**
 * The frames of the field's atlas How to play's pictures are taken from;
 * the rocks' are drawn lit by the view (`rockPictures()`), as their atlas
 * holds them unlit.
 */
export const PICTURE_FRAMES: Omit<Pictures, "rocks"> = {
  pickups: PICKUP_FRAMES,
  stray: FRAMES.strayPicture,
  comet: COMET_FRAMES.picture,
  burr: BURR_FRAMES.picture,
};
