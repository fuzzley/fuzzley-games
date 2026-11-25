// The frames the scene adds to the atlas beside the art's: the dots the
// field is drawn with and the warning frame; the meter's pips, the guide
// and the gauge over an aiming finger, which the art's frame names list but
// no art draws; and what bursts from the wall as a round plays. Each is
// baked so it is round and sharp, where a live Graphics would draw it
// unsmoothed and anew every frame.

import { cellArea, dotFrame, shardFrame } from "@fz/brick-wall/view/art";
import {
  type ArtFrame,
  type ArtScale,
  type Point,
  centered,
  circle,
  inset,
  outlineRoundRect,
  polygon,
  ring,
  stroke,
  turned,
  widthOf,
} from "@fz/phaser/shapes";
import { FRAMES } from "../view/art/frames";
import type { WallPalette } from "../view/colors/palette";
import {
  GAUGE_PIP_CSS_PX,
  GAUGE_PLATE_MIDDLE,
  GAUGE_REACH_CSS_PX,
  GAUGE_SPREAD_DEGREES,
} from "../view/gauge/gauge";

/**
 * The names of the scene's own frames: a dot at each corner the field's
 * cells share, a dot of the jump line's count, one for each brick left
 * under it, and the warning frame round a brick one step from losing the
 * level.
 */
export const FIELD_FRAMES = {
  gridDot: "grid-dot",
  countDot: "count-dot",
  warning: "warning-frame",
} as const;

/** How wide a dot of the grid is, in field units, as the art draws it: 2.2 of a cell of 40. */
export const GRID_DOT = 0.055;

/** How wide a dot of the jump line's count is, in field units. */
export const COUNT_DOT = 0.14;

/**
 * Says how the warning frame is drawn, in field units: how round its outer
 * corners are, as a tile's would be at its cell's edge; its band in the
 * danger color, in from the cell's edge; and the seam in the field's color
 * inside the band, which keeps it apart from a tile of a color near the
 * danger color.
 */
const WARNING_FRAME = { corner: 0.18, band: 0.08, seam: 0.03 } as const;

/**
 * The names of the frames the scene draws for a round in play beside the
 * meter's and the guide's, which the art's `FRAMES` names: a broken brick's
 * shard, which takes its brick's color as a tint, a punch's streak, a
 * zap's bolt across a cell, which a bolt is a chain of, and a blast's ring.
 */
export const FLIGHT_FRAMES = {
  shard: "shard",
  streak: "streak",
  bolt: "bolt",
  ring: "blast-ring",
} as const;

/** How wide a pip of the meter is, in field units, as the art draws it: 6.2 of a cell of 40, its rim an unlit one's outside edge. */
const METER_PIP = 0.155;

/** How wide an unlit pip's rim is, in field units: 1.2 of a cell of 40. */
const METER_RIM = 0.03;

/** How wide a dot of the guide is, in field units, as the art draws it: 4.6 of a cell of 40. */
const GUIDE_DOT = 0.115;

/**
 * Says how the gauge over an aiming finger is drawn, in CSS pixels, as a
 * finger's measures are: its plate's width, a pip of 13 on it with 5.5 to
 * spare either side; the rim outside it either side; and an unlit pip's
 * ring.
 */
const GAUGE_CSS_PX = { plate: 24, rim: 1.5, ring: 2 } as const;

/** The most degrees a straight piece of the gauge's plate turns through along its curves, so its edges show no corner. */
const GAUGE_ARC_STEP = 4;

/**
 * Says how the guide outlines a brick the shot would punch through, in
 * field units, as the art draws it: the outline's middle 0.9 in from the
 * cell's edge, of a cell of 40, rounded 6.4 and 2.2 wide.
 */
const GUIDE_PUNCH = { inset: 0.0225, corner: 0.16, width: 0.055 } as const;

/** Says how a punch's streak is drawn, in field units: a cell long, and its head's width. */
const STREAK = { length: 1, width: 0.14 } as const;

/**
 * Says how a piece of a zap's bolt is drawn, in field units: a cell long,
 * from its middle on one side to its middle on the other, so pieces end to
 * end make one bolt; how far its zigzag swings either side; and its width.
 */
const BOLT = { length: 1, swing: 0.12, width: 0.07 } as const;

/** Says how a blast's ring is drawn at its widest, in field units: round the eight cells about the bomb's, and its width. */
const RING = { radius: 1.5, width: 0.1 } as const;

/** The shares along a piece of bolt its zigzag turns at, and the way each swings: from one end to the other. */
const ZIGZAG: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.2, -1],
  [0.4, 1],
  [0.6, -1],
  [0.8, 1],
  [1, 0],
];

/**
 * Returns the scene's own frames, drawn in a palette at a scale: the grid's
 * dot in the field's line, the count's in the jump line's color, each a CSS
 * pixel wide at least, and the warning frame, a cell's.
 */
export function fieldFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    dotFrame(FIELD_FRAMES.gridDot, widthOf(GRID_DOT, scale), palette.line),
    dotFrame(
      FIELD_FRAMES.countDot,
      widthOf(COUNT_DOT, scale),
      palette.jumpLine,
    ),
    warningFrame(palette, scale),
  ];
}

/**
 * Returns the frames the scene draws for a round in play, in a palette at
 * a scale: the meter's pips, lit in the meter's on and unlit, ringed in its
 * off, the guide's dot and its outline round a cell, the gauge's plate and
 * its pips, lit and unlit as the meter's, sized by the pixel ratio alone, a
 * shard in white for a tint to color, a streak in the fuzzball's color, a
 * piece of bolt in the sparks' and the ring in the danger line's, every
 * line a CSS pixel wide at least.
 */
export function flightFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    dotFrame(FRAMES.meterOn, widthOf(METER_PIP, scale), palette.meter.on),
    unlitPipFrame(
      FRAMES.meterOff,
      widthOf(METER_PIP, scale),
      widthOf(METER_RIM, scale),
      palette,
    ),
    dotFrame(FRAMES.guideDot, widthOf(GUIDE_DOT, scale), palette.guide),
    punchFrame(palette, scale),
    gaugePlateFrame(palette, scale),
    dotFrame(
      FRAMES.gaugeOn,
      cssWidthOf(GAUGE_PIP_CSS_PX, scale),
      palette.meter.on,
    ),
    unlitPipFrame(
      FRAMES.gaugeOff,
      cssWidthOf(GAUGE_PIP_CSS_PX, scale),
      cssWidthOf(GAUGE_CSS_PX.ring, scale),
      palette,
    ),
    shardFrame(FLIGHT_FRAMES.shard, scale),
    streakFrame(palette, scale),
    boltFrame(palette, scale),
    ringFrame(palette, scale),
  ];
}

/**
 * Returns the warning frame: a cell, a band of the danger line's color in
 * along its edge, over a tile's gap and its rim, and a seam of the field's
 * color inside the band, each a CSS pixel wide at least.
 */
function warningFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const cell = cellArea(scale);
  const band = widthOf(WARNING_FRAME.band, scale);
  const seam = widthOf(WARNING_FRAME.seam, scale);
  const corner = WARNING_FRAME.corner * cell.width;
  return {
    name: FIELD_FRAMES.warning,
    width: cell.width,
    height: cell.height,
    commands: [
      outlineRoundRect(inset(cell, band / 2), corner - band / 2, {
        color: palette.dangerLine,
        width: band,
      }),
      outlineRoundRect(inset(cell, band + seam / 2), corner - band - seam / 2, {
        color: palette.field,
        width: seam,
      }),
    ],
  };
}

/**
 * Returns an unlit pip, the meter's or the gauge's: a dot of the field's
 * color some device pixels wide, as a lit one is, in a rim of the meter's
 * off.
 */
function unlitPipFrame(
  name: string,
  side: number,
  rim: number,
  palette: WallPalette,
): ArtFrame {
  const half = side / 2;
  const middle = { x: half, y: half };
  return {
    name,
    width: side,
    height: side,
    commands: [
      circle(middle, half, { color: palette.field }),
      ring(middle, half - rim / 2, { color: palette.meter.off, width: rim }),
    ],
  };
}

/**
 * Returns the guide's outline round a brick the shot would punch through:
 * a cell, its outline in the guide's color, held inside it.
 */
function punchFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const cell = cellArea(scale);
  const width = widthOf(GUIDE_PUNCH.width, scale);
  const edge = Math.max(GUIDE_PUNCH.inset * cell.width, width / 2);
  return {
    name: FRAMES.guidePunch,
    width: cell.width,
    height: cell.height,
    commands: [
      outlineRoundRect(inset(cell, edge), GUIDE_PUNCH.corner * cell.width, {
        color: palette.guide,
        width,
      }),
    ],
  };
}

/**
 * Returns the gauge's plate, unturned, about its middle: a band in the
 * gauge's plate color along the arc the pips lie on about the touch, round
 * at both ends past the first pip and the last, over a band of its rim's
 * color a rim wider either side.
 */
function gaugePlateFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const reach = GAUGE_REACH_CSS_PX * scale.pixelRatio;
  const half = cssWidthOf(GAUGE_CSS_PX.plate, scale) / 2;
  const rim = cssWidthOf(GAUGE_CSS_PX.rim, scale);
  // The touch the plate curves about lies straight under its middle.
  const touch = { x: 0, y: GAUGE_PLATE_MIDDLE * reach };
  return centered(FRAMES.gaugePlate, [
    polygon(arcBand(touch, reach, half + rim), { color: palette.gauge.rim }),
    polygon(arcBand(touch, reach, half), { color: palette.gauge.plate }),
  ]);
}

/**
 * Returns the outline of a band some width either side of the arc the
 * gauge's pips lie on about a touch, round at both ends, as a polygon's
 * points: its outer edge, its last end, its inner edge back and its first
 * end.
 */
function arcBand(touch: Point, reach: number, half: number): readonly Point[] {
  const spread = GAUGE_SPREAD_DEGREES;
  const first = pointAbout(touch, reach, -spread);
  const last = pointAbout(touch, reach, spread);
  return [
    ...arcAbout(touch, reach + half, -spread, spread),
    ...arcAbout(last, half, spread, spread + 180).slice(1, -1),
    ...arcAbout(touch, reach - half, spread, -spread),
    ...arcAbout(first, half, 180 - spread, 360 - spread).slice(1, -1),
  ];
}

/**
 * Returns the points along an arc about a middle, from an angle to another,
 * in degrees clockwise from straight up the screen, both ends among them,
 * a piece every {@link GAUGE_ARC_STEP} degrees at most.
 */
function arcAbout(
  middle: Point,
  radius: number,
  from: number,
  to: number,
): readonly Point[] {
  const pieces = Math.ceil(Math.abs(to - from) / GAUGE_ARC_STEP);
  return Array.from({ length: pieces + 1 }, (_, i) =>
    pointAbout(middle, radius, from + ((to - from) * i) / pieces),
  );
}

/** Returns the point some way from a middle at an angle, in degrees clockwise from straight up the screen. */
function pointAbout(middle: Point, radius: number, degrees: number): Point {
  const way = turned({ x: 0, y: -radius }, degrees);
  return { x: middle.x + way.x, y: middle.y + way.y };
}

/**
 * Returns a width given in CSS pixels in whole device pixels, a CSS pixel
 * at least, for the gauge, which is measured as a finger is rather than as
 * the field.
 */
function cssWidthOf(css: number, scale: ArtScale): number {
  return Math.max(
    Math.ceil(scale.pixelRatio),
    Math.round(css * scale.pixelRatio),
  );
}

/**
 * Returns a punch's streak about its middle, along the frame's width:
 * from a point at its tail to its head, the way the fuzzball flew, in the
 * fuzzball's color.
 */
function streakFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const half = (STREAK.length * scale.unit) / 2;
  const head = widthOf(STREAK.width, scale) / 2;
  return centered(FLIGHT_FRAMES.streak, [
    polygon(
      [
        { x: -half, y: 0 },
        { x: half - head, y: -head },
        { x: half, y: 0 },
        { x: half - head, y: head },
      ],
      { color: palette.fuzzball },
    ),
  ]);
}

/**
 * Returns a piece of a zap's bolt about its middle, along the frame's
 * width: a zigzag from the middle of one side of a cell to the middle of
 * the other, in the sparks' color.
 */
function boltFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const length = BOLT.length * scale.unit;
  const swing = BOLT.swing * scale.unit;
  const points: readonly Point[] = ZIGZAG.map(([along, way]) => ({
    x: along * length - length / 2,
    y: way * swing,
  }));
  return centered(
    FLIGHT_FRAMES.bolt,
    stroke(points, {
      color: palette.spark,
      width: widthOf(BOLT.width, scale),
    }),
  );
}

/** Returns a blast's ring at its widest, about its middle, in the danger line's color. */
function ringFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const width = widthOf(RING.width, scale);
  return centered(FLIGHT_FRAMES.ring, [
    ring({ x: 0, y: 0 }, RING.radius * scale.unit - width / 2, {
      color: palette.dangerLine,
      width,
    }),
  ]);
}
