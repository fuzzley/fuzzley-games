import { lerp } from "@fz/core/math";
import {
  type Area,
  type PaintCommand,
  type Point,
  type WashStop,
  circle,
  polygon,
  polyline,
  rect,
  wash,
} from "@fz/phaser/shapes";
import { KICK_CSS_PX, SHAKE_CSS_PX } from "../effects/timing";
import type { FieldMetrics } from "../field/field_metrics";
import { type Depth, type Star, starCount } from "../field/specks";
import {
  LIMITS,
  type LimitKind,
  type PlaceColors,
  type Tint,
  hardOther,
  hardTones,
  mix,
  shareOf,
  smallTone,
  starColor,
  tintOf,
  toneUnder,
} from "./colors";
import type { Bank, Billow, Flicker, Line, Mark, Soft } from "./marks";
import { FLICKER_LIFT } from "./motion";
import type { Backdrop } from "./places";

// A place painted for a palette at a scale, as paint commands in device
// pixels from each picture's top left corner, the field's or its bleed's,
// which `PlacePainter` paints on a canvas, where a wash is a radial
// gradient.

/** Says what a place is painted at: a field unit and a CSS pixel, and the field's size, in device pixels. */
export type PlaceFrame = Pick<
  FieldMetrics,
  "unit" | "pixelRatio" | "width" | "height"
>;

/** Describes the commands that paint each layer of a place, back to front. */
export interface PlaceLayers {
  /** The far wash, over the field's own color. */
  readonly wash: readonly PaintCommand[];
  /** The far stars, which never move. */
  readonly far: readonly PaintCommand[];
  /** The nearer stars, painted again past each edge they cross, so they tile as the field wraps. */
  readonly near: readonly PaintCommand[];
  /** The landmark, at rest. */
  readonly landmark: readonly PaintCommand[];
  /** The air. */
  readonly air: readonly PaintCommand[];
  /** The strip along each edge. */
  readonly vignette: readonly PaintCommand[];
}

/**
 * Describes what a flicker adds to a place at its height: its marks, as much
 * stronger again as they then show, which the painter shows between the
 * front and what stands before the flickers, as strongly as the flicker is,
 * so a billow before a fork hides its light as it hides the fork.
 */
export interface Flash {
  readonly flicker: Flicker;
  /** Where it lies on the field, in whole device pixels. */
  readonly area: Area;
  /** Its marks, lifted, from the area's top left corner. */
  readonly commands: readonly PaintCommand[];
}

/**
 * Describes a place painted in three pictures, or four where it flickers,
 * and its flashes: what stays, under all; the nearer stars, which slide;
 * what stands before them; and, apart, what stands before the flashes.
 *
 * Every picture but the nearer stars reaches a bleed past each edge of the
 * field, painted from that far up and left of its top left corner, so a
 * field's camera kicked or shaken never shows past them.
 */
export interface PlaceArt {
  /** How far past each edge of the field `back`, `front` and `over` reach, in whole device pixels. */
  readonly bleed: number;
  /** The field's color, the far wash and the far stars, opaque, over the field and its bleed. */
  readonly back: readonly PaintCommand[];
  /** The nearer stars, a tile as wide and tall as the field, from its top left corner. */
  readonly near: readonly PaintCommand[];
  /**
   * The landmark, the air and the vignette, over the field and its bleed;
   * where the place flashes, only the landmark behind what stands before
   * its flickers.
   */
  readonly front: readonly PaintCommand[];
  /**
   * Where the place flashes, what stands before its flickers, over the
   * field and its bleed: the landmark's billows and faces from the first
   * after its first flicker on, the air and the vignette; else nothing.
   */
  readonly over: readonly PaintCommand[];
  /** What each flicker of the landmark adds at its height, one for each. */
  readonly flashes: readonly Flash[];
}

/** The fewest CSS pixels a field unit takes for a landmark's fine marks to be painted. */
export const FINE_FROM = 9;

/** The most flashes any place's art has, on any field: the Storm's, one for each fork. */
export const MOST_FLASHES = 2;

/**
 * How far past each edge of the field a place's pictures but the nearer
 * stars are painted, in CSS pixels: as far as a kick and a shake together
 * scroll the field's camera.
 */
export const BLEED_CSS_PX = KICK_CSS_PX + SHAKE_CSS_PX;

/** A stop of a gradient: how far out, and how much of its color shows there. */
type Fade = readonly [number, number];

/** How a soft shape fades from its middle out. */
const BELL: readonly Fade[] = [
  [0, 1],
  [0.15, 0.94],
  [0.3, 0.78],
  [0.45, 0.57],
  [0.6, 0.35],
  [0.75, 0.16],
  [0.88, 0.05],
  [1, 0],
];

/** How a billow of cloud holds flat out to most of its radius, then fades at its edge. */
const BILLOW: readonly Fade[] = [
  [0, 1],
  [0.7, 1],
  [0.82, 0.74],
  [0.91, 0.34],
  [0.97, 0.08],
  [1, 0],
];

/** How the vignette fades in from an edge. */
const EDGE: readonly Fade[] = [
  [0, 1],
  [0.25, 0.62],
  [0.5, 0.3],
  [0.75, 0.1],
  [1, 0],
];

/** How a streak of wind fades from its middle to its ends. */
const STREAK: readonly Fade[] = [
  [0, 1],
  [0.4, 0.7],
  [1, 0],
];

/** The least each mark is painted at, in CSS pixels, so none falls under a pixel to nothing. */
const LEAST = {
  /** A far star's radius, and a landmark's speck's. */
  far: 0.55,
  /** A nearer star's radius. */
  near: 0.8,
  /** A bright star's halo's radius. */
  halo: 2.4,
  /** A line's width. */
  line: 0.6,
  /** A streak's thickness. */
  streak: 0.7,
  /** The line round a landmark's face, in its own color, which closes the seams between faces. */
  seam: 0.5,
} as const;

/** The most of its color a line mixes in, lit or not. */
const LINE_MOST = 0.5;

/** How strongly a star shows by how bright it is among its depth's: the faintest third, the middle and the brightest. */
const SHINES = { faint: 0.62, middle: 0.82, brightest: 1 } as const;

/** How strongly a bright star's halo shows. */
const HALO = 0.3;

/** A bright star's halo's radius, in its own, from its dullest to its brightest. */
const HALO_REACH = [3, 3.8] as const;

/**
 * How far a billow's rim lies past its body, in rims: toward the light in a
 * dark palette, and away from it in a light one, where a fainter shade lies
 * farther still.
 */
const RIMS = { dark: -1, light: 1.5, shade: 3.4 } as const;

/** How much of a billow's rim its shade under the bank takes, in a light palette. */
const SHADE = 0.45;

/** How far along an edge each of the vignette's washes reaches, in the field's longest sides, so it fades in from the edge alike along all of it. */
const VIGNETTE_REACH = 8;

/** How far a flash's area reaches past its marks, in device pixels, for their edges' pixels. */
const FLASH_MARGIN = 2;

/** Says how a place's marks are painted. */
interface Brush {
  readonly colors: PlaceColors;
  readonly unit: number;
  /** Device pixels to a CSS pixel. */
  readonly css: number;
  /** Whether the unit is large enough for a landmark's fine marks. */
  readonly fine: boolean;
  readonly starTint: Tint;
  /** Where the picture's top left corner lies on the field, in device pixels. */
  readonly origin: Point;
  /** How much of their limit soft shapes and lines take, times their strength: 1 at rest. */
  readonly lift: number;
}

/** Returns a gradient's stops, each a share of a color. */
function stopsOf(color: number, fades: readonly Fade[]): WashStop[] {
  return fades.map(([at, alpha]) => ({ at, color, alpha }));
}

/** Returns a place on the field, in field units, as the brush's device pixels. */
function placed({ x, y }: Point, brush: Brush): Point {
  return {
    x: x * brush.unit - brush.origin.x,
    y: y * brush.unit - brush.origin.y,
  };
}

/** Returns a billow of cloud as a wash of a color, its middle moved a number of rims. */
function billowWash(
  { at, rx, ry, turn }: Billow,
  rims: number,
  bank: Bank,
  color: number,
  brush: Brush,
): PaintCommand {
  const middle = placed(
    { x: at.x + rims * bank.rim, y: at.y + rims * bank.rim },
    brush,
  );
  return wash(
    {
      ...middle,
      radiusX: rx * brush.unit,
      radiusY: ry * brush.unit,
      turn,
    },
    { stops: stopsOf(color, BILLOW) },
  );
}

/**
 * Returns a bank of cloud's billows, back to front, each hiding what lies
 * behind it: in a dark palette a dark mass with a rim of its tint toward
 * the light, in a light one paper left dry, with a rim of its tint in its
 * shade, and a wider, fainter shade under the whole bank. A rim is one flat
 * color, the field with the landmark's limit of the tint, so rims that cross
 * never add up past it.
 */
function bankCommands(bank: Bank, brush: Brush): PaintCommand[] {
  const { colors } = brush;
  const dark = colors.mode === "dark";
  const body = tintOf("cloud", colors);
  const rim = mix(
    colors.field,
    tintOf(bank.tint, colors),
    LIMITS[colors.mode].landmark,
  );
  // One flat color, the shade's share of the rim over the field, so the
  // shades of billows that cross never add up past it.
  const shade = dark
    ? []
    : bank.billows.map((billow) =>
        billowWash(
          billow,
          RIMS.shade,
          bank,
          mix(colors.field, rim, SHADE),
          brush,
        ),
      );
  return [
    ...shade,
    ...bank.billows.flatMap((billow) => [
      billowWash(billow, dark ? RIMS.dark : RIMS.light, bank, rim, brush),
      billowWash(billow, 0, bank, body, brush),
    ]),
  ];
}

/** Returns a mark painted with a brush, as soft shapes of a layer's limit; none where the brush leaves it out. */
function markCommands(
  mark: Mark,
  layer: Extract<LimitKind, "wash" | "landmark">,
  brush: Brush,
): PaintCommand[] {
  const { colors, unit, css } = brush;
  if ("fine" in mark && mark.fine && !brush.fine) return [];
  if ("shows" in mark && mark.shows !== colors.mode) return [];
  switch (mark.kind) {
    case "soft": {
      const kind = mark.small === true ? "small" : layer;
      const share =
        shareOf(mark.tint, mark.strength, kind, colors) * brush.lift;
      return [
        wash(
          {
            ...placed(mark.at, brush),
            radiusX: mark.rx * unit,
            radiusY: mark.ry * unit,
            turn: mark.turn,
          },
          { stops: stopsOf(tintOf(mark.tint, colors), BELL), alpha: share },
        ),
      ];
    }
    case "flat": {
      const color =
        mark.small === true
          ? smallTone(mark.light, mark.tint, colors)
          : toneUnder(mark.light, hardTones(mark.tint, colors));
      const points = mark.points.map((point) => placed(point, brush));
      const face = polygon(points, { color });
      if (mark.small === true) return [face];
      return [
        face,
        polyline([...points, ...points.slice(0, 1)], {
          color,
          width: LEAST.seam * css,
        }),
      ];
    }
    case "line": {
      const share = Math.min(
        LINE_MOST,
        shareOf(mark.tint, mark.strength, "line", colors) * brush.lift,
      );
      return [
        polyline(
          mark.points.map((point) => placed(point, brush)),
          {
            color: hardOther(mark.tint, colors),
            width: Math.max(LEAST.line * css, mark.width * unit),
            alpha: share,
          },
        ),
      ];
    }
    case "speck":
      return [
        circle(
          placed(mark.at, brush),
          Math.max(LEAST.far * css, mark.r * unit),
          {
            color: starColor(mark.depth, brush.starTint, colors),
          },
        ),
      ];
    case "streak": {
      const thick = Math.max(LEAST.streak * css, mark.width * unit);
      return [
        wash(
          {
            ...placed(mark.at, brush),
            radiusX: (mark.length * unit) / 2,
            radiusY: thick,
            turn: mark.turn,
          },
          {
            stops: stopsOf(tintOf(mark.tint, colors), STREAK),
            alpha: shareOf(mark.tint, mark.strength, "line", colors),
          },
        ),
      ];
    }
    case "bank":
      return bankCommands(mark, brush);
  }
}

/** Returns how strongly a star of a depth shows, by how bright it is among its depth's; a bright star always as the brightest. */
function shineOf(depth: Depth, shine: number): number {
  if (depth === "bright" || shine >= 2 / 3) return SHINES.brightest;
  return shine < 1 / 3 ? SHINES.faint : SHINES.middle;
}

/** Returns a star's place on a picture whose top left corner lies at an origin on the field, in device pixels. */
function starAt(star: Star, frame: PlaceFrame, origin: Point): Point {
  return {
    x: star.x * frame.width - origin.x,
    y: star.y * frame.height - origin.y,
  };
}

/**
 * Returns the stars of a depth the field shows, painted: each a disc as
 * strong as it is bright among its depth's, a bright one in a round halo
 * that fades to nothing, fainter than it and never as wide as a small rock.
 * A star has no points: a shape with points is a spark, which plays.
 *
 * Each nearer star is painted again past each edge it crosses, so the
 * picture tiles as the field wraps.
 */
function starCommands(
  backdrop: Backdrop,
  depth: Depth,
  brush: Brush,
  frame: PlaceFrame,
): PaintCommand[] {
  const { colors, unit, css } = brush;
  const color = starColor(depth, backdrop.starTint, colors);
  const near = depth !== "far";
  const glow = tintOf(colors.mode === "dark" ? "text" : "muted", colors);
  const shown = backdrop.stars[depth].slice(0, starCount(depth, backdrop));
  return shown.flatMap((star) => {
    const at = starAt(star, frame, brush.origin);
    const r = Math.max((near ? LEAST.near : LEAST.far) * css, star.r * unit);
    const bright = depth === "bright";
    const halo = Math.max(
      LEAST.halo * css,
      r * lerp(HALO_REACH[0], HALO_REACH[1], star.shine),
    );
    const reach = bright ? halo : r;
    const painted = (middle: Point): PaintCommand[] => [
      ...(bright
        ? [
            wash(
              { ...middle, radiusX: halo, radiusY: halo, turn: 0 },
              { stops: stopsOf(glow, BELL), alpha: HALO },
            ),
          ]
        : []),
      circle(middle, r, {
        color,
        alpha: shineOf(depth, star.shine),
      }),
    ];
    if (!near) return painted(at);
    return wrapOffsets(at, reach, frame).flatMap(({ x, y }) =>
      painted({ x: at.x + x, y: at.y + y }),
    );
  });
}

/** Returns the offsets a thing of a reach is painted at so it tiles as the field wraps: none, then past each edge it crosses. */
function wrapOffsets(at: Point, reach: number, frame: PlaceFrame): Point[] {
  const across = (place: number, span: number): number[] => [
    0,
    ...(place - reach < 0 ? [span] : []),
    ...(place + reach > span ? [-span] : []),
  ];
  return across(at.x, frame.width).flatMap((x) =>
    across(at.y, frame.height).map((y) => ({ x, y })),
  );
}

/**
 * Returns the vignette painted: a wash along each edge, strongest at it,
 * darker than the field in a dark palette and a faint tint of the place in
 * a light one, each so long that it fades in from its edge alike along all
 * of it.
 */
function vignetteCommands(
  backdrop: Backdrop,
  brush: Brush,
  frame: PlaceFrame,
): PaintCommand[] {
  const { colors } = brush;
  const { vignette } = backdrop;
  const tint = colors.mode === "dark" ? "deep" : vignette.tint;
  const style = {
    stops: stopsOf(tintOf(tint, colors), EDGE),
    alpha: shareOf(tint, vignette.strength, "wash", colors),
  };
  const deep = vignette.depth * brush.unit;
  const long = VIGNETTE_REACH * Math.max(frame.width, frame.height);
  const { width, height } = frame;
  const { x, y } = brush.origin;
  return [
    { x: width / 2, y: 0, radiusX: long, radiusY: deep },
    { x: width / 2, y: height, radiusX: long, radiusY: deep },
    { x: 0, y: height / 2, radiusX: deep, radiusY: long },
    { x: width, y: height / 2, radiusX: deep, radiusY: long },
  ].map((edge) =>
    wash({ ...edge, x: edge.x - x, y: edge.y - y, turn: 0 }, style),
  );
}

/** Returns the marks of a layer painted, back to front. */
function marksCommands(
  marks: readonly Mark[],
  layer: Extract<LimitKind, "wash" | "landmark">,
  brush: Brush,
): PaintCommand[] {
  return marks.flatMap((mark) => markCommands(mark, layer, brush));
}

/** Returns a brush for a place in a palette at a frame, from the field's top left corner, at rest. */
function brushOf(
  backdrop: Backdrop,
  colors: PlaceColors,
  frame: PlaceFrame,
): Brush {
  return {
    colors,
    unit: frame.unit,
    css: frame.pixelRatio,
    fine: frame.unit / frame.pixelRatio >= FINE_FROM,
    starTint: backdrop.starTint,
    origin: { x: 0, y: 0 },
    lift: 1,
  };
}

/** Returns the nearer stars painted, the mid then the bright, each again past each edge it crosses. */
function nearCommands(
  backdrop: Backdrop,
  brush: Brush,
  frame: PlaceFrame,
): PaintCommand[] {
  return [
    ...starCommands(backdrop, "mid", brush, frame),
    ...starCommands(backdrop, "bright", brush, frame),
  ];
}

/**
 * Returns each layer of a place painted in a palette at a frame, at rest,
 * from the field's top left corner, in device pixels. Its marks reach past
 * the field's edges, so whatever shows it cuts it off there.
 */
export function placeLayers(
  backdrop: Backdrop,
  colors: PlaceColors,
  frame: PlaceFrame,
): PlaceLayers {
  const brush = brushOf(backdrop, colors, frame);
  return {
    wash: marksCommands(backdrop.wash, "wash", brush),
    far: starCommands(backdrop, "far", brush, frame),
    near: nearCommands(backdrop, brush, frame),
    landmark: marksCommands(backdrop.landmark, "landmark", brush),
    air: marksCommands(backdrop.air, "landmark", brush),
    vignette: vignetteCommands(backdrop, brush, frame),
  };
}

/**
 * Returns the corners of what a mark that may flicker reaches over, in
 * field units: a soft shape's bounds as it is turned, and each of a line's
 * points grown by its width.
 */
function flickerCorners(mark: Soft | Line): Point[] {
  if (mark.kind === "soft") {
    const { at, rx, ry, turn } = mark;
    const across = Math.hypot(rx * Math.cos(turn), ry * Math.sin(turn));
    const down = Math.hypot(rx * Math.sin(turn), ry * Math.cos(turn));
    return [
      { x: at.x - across, y: at.y - down },
      { x: at.x + across, y: at.y + down },
    ];
  }
  const { width } = mark;
  return mark.points.flatMap(({ x, y }) => [
    { x: x - width, y: y - width },
    { x: x + width, y: y + width },
  ]);
}

/**
 * Returns the area a flicker's marks reach over, in whole device pixels on
 * the field, no further than a bleed past its edges, or null where none of
 * them shows there.
 */
function flashArea(
  backdrop: Backdrop,
  flicker: Flicker,
  frame: PlaceFrame,
  bleed: number,
): Area | null {
  const corners = backdrop.landmark
    .filter(
      (mark): mark is Soft | Line =>
        "flicker" in mark && mark.flicker === flicker,
    )
    .flatMap(flickerCorners);
  const xs = corners.map(({ x }) => x * frame.unit);
  const ys = corners.map(({ y }) => y * frame.unit);
  const left = Math.max(-bleed, Math.floor(Math.min(...xs)) - FLASH_MARGIN);
  const top = Math.max(-bleed, Math.floor(Math.min(...ys)) - FLASH_MARGIN);
  const right = Math.min(
    frame.width + bleed,
    Math.ceil(Math.max(...xs)) + FLASH_MARGIN,
  );
  const bottom = Math.min(
    frame.height + bleed,
    Math.ceil(Math.max(...ys)) + FLASH_MARGIN,
  );
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Returns each flicker of a place's landmark once, in the order its marks first take them. */
function flickersOf(backdrop: Backdrop): Flicker[] {
  const flickers: Flicker[] = [];
  for (const mark of backdrop.landmark) {
    if ("flicker" in mark && !flickers.includes(mark.flicker)) {
      flickers.push(mark.flicker);
    }
  }
  return flickers;
}

/** Returns what a flicker adds to a place's landmark at its height: its marks, lifted. */
function flashCommands(
  backdrop: Backdrop,
  flicker: Flicker,
  brush: Brush,
): PaintCommand[] {
  const flickering = backdrop.landmark.filter(
    (mark) => "flicker" in mark && mark.flicker === flicker,
  );
  return marksCommands(flickering, "landmark", {
    ...brush,
    lift: FLICKER_LIFT,
  });
}

/**
 * Returns where what stands before a landmark's flickers starts: its first
 * billow or face after its first mark that flickers, or its end where none
 * follows one, or none flickers.
 */
function beforeFlickers(landmark: readonly Mark[]): number {
  const first = landmark.findIndex((mark) => "flicker" in mark);
  const solid = landmark.findIndex(
    (mark, i) =>
      first >= 0 && i > first && (mark.kind === "bank" || mark.kind === "flat"),
  );
  return solid < 0 ? landmark.length : solid;
}

/**
 * Returns a place painted in a palette at a frame: the pictures the field
 * shows it in, and what each flicker of its landmark adds at its height,
 * over the area its marks reach.
 */
export function placeArt(
  backdrop: Backdrop,
  colors: PlaceColors,
  frame: PlaceFrame,
): PlaceArt {
  const brush = brushOf(backdrop, colors, frame);
  const bleed = Math.ceil(BLEED_CSS_PX * frame.pixelRatio);
  const bled = { ...brush, origin: { x: -bleed, y: -bleed } };
  const flashes = flickersOf(backdrop).flatMap((flicker): Flash[] => {
    const area = flashArea(backdrop, flicker, frame, bleed);
    if (!area) return [];
    const origin = { x: area.x, y: area.y };
    return [
      {
        flicker,
        area,
        commands: flashCommands(backdrop, flicker, { ...brush, origin }),
      },
    ];
  });
  const split = beforeFlickers(backdrop.landmark);
  const front = marksCommands(
    backdrop.landmark.slice(0, split),
    "landmark",
    bled,
  );
  const over = [
    ...marksCommands(backdrop.landmark.slice(split), "landmark", bled),
    ...marksCommands(backdrop.air, "landmark", bled),
    ...vignetteCommands(backdrop, bled, frame),
  ];
  const flashing = flashes.length > 0;
  return {
    bleed,
    back: [
      rect(
        {
          x: 0,
          y: 0,
          width: frame.width + 2 * bleed,
          height: frame.height + 2 * bleed,
        },
        { color: colors.field },
      ),
      ...marksCommands(backdrop.wash, "wash", bled),
      ...starCommands(backdrop, "far", bled, frame),
    ],
    near: nearCommands(backdrop, brush, frame),
    // A place with no flash needs no picture apart for what stands before
    // one, so its front holds it.
    front: flashing ? front : [...front, ...over],
    over: flashing ? over : [],
    flashes,
  };
}
