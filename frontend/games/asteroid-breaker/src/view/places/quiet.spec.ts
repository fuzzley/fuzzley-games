import { mixColors } from "@fz/phaser/color";
import type {
  PaintCommand,
  PolygonCommand,
  RectCommand,
  WashCommand,
} from "@fz/phaser/shapes";
import { contrast, rgbOf } from "@fz/style/testing";
import { THEMES } from "@fz/style/themes";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { PALETTES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { placeColors } from "./colors";
import { type PlaceFrame, type PlaceLayers, placeLayers } from "./paint";
import { PLACE_IDS, type PlaceId, backdropOf } from "./places";

// Nothing large in a place stands out from the field by more than 1.3 to 1,
// where a rock keeps 3 to 1 (plan.md, "Quiet by measure"). Each place is
// painted here as the kit's sheet measures it: its wash, its landmark at rest
// and its vignette, without the stars, the specks and the hair lines, over
// the field, a pixel at a time, as a canvas would paint it; and the most any
// pixel of it stands out from the field is its figure. Its landmark, painted
// alone, must stand out a little, so a landmark that painted nothing fails.

/** The most a place's largest shape may stand out from the field. */
const QUIET = 1.3;

/** The least a place's landmark stands out by, painted alone over the field, so one that painted nothing fails. */
const SHOWN = 1.1;

/** The fields measured: a laptop's, wide, and a phone's, upright, at 4 device pixels a unit. */
const FIELDS = [
  ["wide", { width: 72, height: 40 }],
  ["tall", { width: 40, height: 72 }],
] as const;

/** How many device pixels a unit takes as a place is measured, as the kit's sheet measures it. */
const UNIT = 4;

/** Describes a picture painted a pixel at a time: its size and its pixels' colors, row by row, each channel from 0 to 255. */
interface Picture {
  readonly width: number;
  readonly height: number;
  readonly pixels: Float64Array;
}

/** Returns a picture of a size, filled with a color. */
function filled(width: number, height: number, color: number): Picture {
  const pixels = new Float64Array(width * height * 3);
  const [red, green, blue] = rgbOf(color);
  for (let i = 0; i < pixels.length; i += 3) {
    pixels[i] = red;
    pixels[i + 1] = green;
    pixels[i + 2] = blue;
  }
  return { width, height, pixels };
}

/** Lays a color over a pixel at an opacity. */
function blend(
  picture: Picture,
  x: number,
  y: number,
  color: number,
  alpha: number,
): void {
  const at = (y * picture.width + x) * 3;
  rgbOf(color).forEach((channel, i) => {
    const under = picture.pixels[at + i] ?? 0;
    picture.pixels[at + i] = under + (channel - under) * alpha;
  });
}

/** Calls a function for each pixel of a picture whose middle lies in a box. */
function eachPixelIn(
  picture: Picture,
  box: { left: number; top: number; right: number; bottom: number },
  paint: (x: number, y: number, middleX: number, middleY: number) => void,
): void {
  const left = Math.max(0, Math.floor(box.left));
  const top = Math.max(0, Math.floor(box.top));
  const right = Math.min(picture.width, Math.ceil(box.right));
  const bottom = Math.min(picture.height, Math.ceil(box.bottom));
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) paint(x, y, x + 0.5, y + 0.5);
  }
}

/** Paints a rectangle. */
function paintRect(picture: Picture, rect: RectCommand): void {
  const box = {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  };
  eachPixelIn(picture, box, (x, y) => {
    blend(picture, x, y, rect.color, rect.alpha ?? 1);
  });
}

/** Returns whether a point lies inside a polygon, by how many of its edges a ray from it crosses. */
function inside(
  points: PolygonCommand["points"],
  px: number,
  py: number,
): boolean {
  let crossings = 0;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length] ?? a;
    if (a.y > py !== b.y > py) {
      const x = a.x + ((py - a.y) / (b.y - a.y)) * (b.x - a.x);
      if (px < x) crossings++;
    }
  });
  return crossings % 2 === 1;
}

/** Paints a polygon, each pixel whose middle it covers. */
function paintPolygon(picture: Picture, polygon: PolygonCommand): void {
  const xs = polygon.points.map(({ x }) => x);
  const ys = polygon.points.map(({ y }) => y);
  const box = {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
  eachPixelIn(picture, box, (x, y, middleX, middleY) => {
    if (inside(polygon.points, middleX, middleY)) {
      blend(picture, x, y, polygon.color, polygon.alpha ?? 1);
    }
  });
}

/** Paints a wash: its stops' colors and alphas, by how far out from its middle a pixel lies, at its alpha. */
function paintWash(picture: Picture, wash: WashCommand): void {
  if (wash.radiusX === 0 || wash.radiusY === 0) return;
  const cos = Math.cos(wash.turn);
  const sin = Math.sin(wash.turn);
  const reach = Math.max(wash.radiusX, wash.radiusY);
  const box = {
    left: wash.x - reach,
    top: wash.y - reach,
    right: wash.x + reach,
    bottom: wash.y + reach,
  };
  eachPixelIn(picture, box, (x, y, middleX, middleY) => {
    const dx = middleX - wash.x;
    const dy = middleY - wash.y;
    const out = Math.hypot(
      (dx * cos + dy * sin) / wash.radiusX,
      (dy * cos - dx * sin) / wash.radiusY,
    );
    if (out >= 1) return;
    const next = wash.stops.findIndex(({ at }) => at > out);
    const after = wash.stops[next] ?? wash.stops.at(-1);
    const before = wash.stops[next - 1] ?? after;
    if (!before || !after) return;
    const share =
      after.at > before.at ? (out - before.at) / (after.at - before.at) : 0;
    const alpha = before.alpha + (after.alpha - before.alpha) * share;
    const color = mixColors(after.color, before.color, share);
    blend(picture, x, y, color, alpha * (wash.alpha ?? 1));
  });
}

/**
 * Returns a picture of commands painted over a color, a pixel at a time,
 * each pixel whole, as a canvas paints the large shapes a place is measured
 * by: its rectangles, its polygons and its washes, and nothing else.
 */
function paintedOver(
  color: number,
  width: number,
  height: number,
  commands: readonly PaintCommand[],
): Picture {
  const picture = filled(width, height, color);
  for (const command of commands) {
    if (command.kind === "rect") paintRect(picture, command);
    if (command.kind === "polygon") paintPolygon(picture, command);
    if (command.kind === "wash") paintWash(picture, command);
  }
  return picture;
}

/** Returns the most any pixel of a picture stands out from a color, as a contrast ratio. */
function mostAgainst(picture: Picture, color: number): number {
  const against = rgbOf(color);
  const seen = new Map<number, number>();
  let most = 1;
  for (let i = 0; i < picture.pixels.length; i += 3) {
    const [red, green, blue] = [0, 1, 2].map((k) =>
      Math.round(picture.pixels[i + k] ?? 0),
    ) as [number, number, number];
    const key = (red << 16) | (green << 8) | blue;
    const ratio = seen.get(key) ?? contrast([red, green, blue], against);
    seen.set(key, ratio);
    most = Math.max(most, ratio);
  }
  return most;
}

describe("the measure", () => {
  it("paints a rectangle over the field at its alpha", () => {
    const picture = paintedOver(0x000000, 4, 4, [
      {
        kind: "rect",
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        color: 0xffffff,
        alpha: 0.5,
      },
    ]);

    expect([picture.pixels[0], picture.pixels[(4 + 1) * 3]]).toEqual([
      0, 127.5,
    ]);
  });

  it("paints a polygon on the pixels whose middles it covers", () => {
    const picture = paintedOver(0x000000, 4, 1, [
      {
        kind: "polygon",
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 0, y: 1 },
        ],
        color: 0xffffff,
      },
    ]);

    expect([...picture.pixels].filter((_, i) => i % 3 === 0)).toEqual([
      255, 255, 0, 0,
    ]);
  });

  it("paints a wash by its stops, strongest at its middle and nothing at its edge", () => {
    const picture = paintedOver(0x000000, 21, 1, [
      {
        kind: "wash",
        x: 10.5,
        y: 0.5,
        radiusX: 10,
        radiusY: 10,
        turn: 0,
        stops: [
          { at: 0, color: 0xffffff, alpha: 1 },
          { at: 1, color: 0xffffff, alpha: 0 },
        ],
      },
    ]);

    expect([
      picture.pixels[10 * 3],
      picture.pixels[15 * 3],
      picture.pixels[0],
    ]).toEqual([255, 127.5, 0]);
  });

  it("finds how far the brightest pixel stands out", () => {
    const picture = paintedOver(0x000000, 2, 1, [
      { kind: "rect", x: 1, y: 0, width: 1, height: 1, color: 0xffffff },
    ]);

    expect(mostAgainst(picture, 0x000000)).toBe(21);
  });
});

describe.each(THEMES)("the places in $name", ({ id, mode }) => {
  const colors = placeColors(
    beltPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode),
  );

  describe.each(FIELDS)("on a %s field", (_shape, torus) => {
    const frame: PlaceFrame = {
      unit: UNIT,
      pixelRatio: 1,
      width: torus.width * UNIT,
      height: torus.height * UNIT,
    };

    /** Returns how far the most any pixel of commands painted over the field stands out from it. */
    const figureOf = (commands: readonly PaintCommand[]): number =>
      mostAgainst(
        paintedOver(colors.field, frame.width, frame.height, commands),
        colors.field,
      );

    /** Returns a place's layers, laid out on the field from seed 7. */
    const layersOf = (place: PlaceId): PlaceLayers =>
      placeLayers(
        backdropOf({ place, torus, seed: 7, constellation: null }),
        colors,
        frame,
      );

    it.each(PLACE_IDS)(
      `keeps %s's largest shape within ${String(QUIET)} to 1 of the field`,
      (place) => {
        const { wash, landmark, vignette } = layersOf(place);

        const figure = figureOf([...wash, ...landmark, ...vignette]);

        expect(figure).toBeLessThanOrEqual(QUIET);
      },
    );

    it.each(PLACE_IDS)("shows %s's landmark on the field", (place) => {
      const { landmark } = layersOf(place);

      const figure = figureOf(landmark);

      expect(figure).toBeGreaterThan(SHOWN);
    });
  });
});
