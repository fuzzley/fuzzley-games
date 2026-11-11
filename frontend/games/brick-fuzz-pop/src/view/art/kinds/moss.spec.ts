import { mixColors } from "@fz/phaser/color";
import {
  type ArtFrame,
  type ArtScale,
  type CircleCommand,
  type DrawCommand,
  type Point,
  type PolygonCommand,
  extentOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { THEMES } from "@fz/style/themes";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  everyScale,
  inBillionths,
  pastRoundRect,
} from "../../../testing/art_frames";
import { PALETTES } from "../../../testing/roles";
import { TINT, inkAt } from "../../colors/inks";
import { FIELD_ROLES, wallPalette } from "../../colors/palette";
import { FRAMES, THICK_HITS } from "../frames";
import { cellOf } from "../symbols";
import { tileBody, tileCommands, tileRadius } from "./brick";
import { MOSS_ART, MOSS_TINT } from "./moss";

const INKS = ART_PALETTE.kinds.moss;

/** The scallops' shadow: the moss's green, darkened. */
const SHADOW = mixColors(0x000000, inkAt(ART_PALETTE.tints, TINT.green), 0.38);

/**
 * Returns a moss brick with hits left of those it had whole, as its art
 * reads it. Its kind is one the catalog has, as moss isn't cataloged yet;
 * the art reads its hits alone.
 */
function moss(hits: number, full = 3) {
  return { kind: "tough", tint: 0, hits, full, plates: 0 } as const;
}

/** Returns the moss's frames at a scale, by name. */
function framesAt(scale: ArtScale): (name: string) => ArtFrame {
  const frames = MOSS_ART.frames(ART_PALETTE, scale);
  return (name) => frameNamed(frames, name);
}

/** Returns the commands of a kind a frame draws in a color. */
function shapesIn<K extends DrawCommand["kind"]>(
  frame: ArtFrame,
  kind: K,
  color: number,
): readonly Extract<DrawCommand, { readonly kind: K }>[] {
  return frame.commands.filter(
    (command): command is Extract<DrawCommand, { readonly kind: K }> =>
      command.kind === kind && command.color === color,
  );
}

/** Returns a circle with its middle to a billionth of a pixel, as {@link billionths} rounds a number. */
function placedToBillionths(circle: CircleCommand): CircleCommand {
  return { ...circle, x: billionths(circle.x), y: billionths(circle.y) };
}

/** Returns a moss brick's leaf in its cap's frame, by its place from the left. */
function leafOf(cap: ArtFrame, at: number): PolygonCommand {
  const leaf = shapesIn(cap, "polygon", INKS.glyph)[at];
  if (!leaf) throw new Error("No leaf.");
  return leaf;
}

/**
 * Returns where each point lies against an ellipse about a middle, its
 * reach along and across it, turned by an angle in degrees, clockwise down
 * the screen: 1 on it, less inside, to a billionth.
 */
function againstEllipse(
  points: readonly Point[],
  middle: Point,
  reach: { readonly along: number; readonly across: number },
  degrees: number,
): readonly number[] {
  const cos = Math.cos((degrees * Math.PI) / 180);
  const sin = Math.sin((degrees * Math.PI) / 180);
  return points.map(({ x, y }) => {
    const along = (x - middle.x) * cos + (y - middle.y) * sin;
    const across = (y - middle.y) * cos - (x - middle.x) * sin;
    return billionths(
      (along / reach.along) ** 2 + (across / reach.across) ** 2,
    );
  });
}

/** Returns how far apart two circles' edges lie: negative where they overlap. */
function between(one: CircleCommand, other: CircleCommand): number {
  return (
    Math.hypot(one.x - other.x, one.y - other.y) - one.radius - other.radius
  );
}

describe("MOSS_ART", () => {
  const tile = `tile-${String(TINT.amber)}`;

  it.each([
    [3, 3, [tile, "moss-cap", "moss-3"]],
    [2, 3, [tile, "moss-cap", "moss-2"]],
    [1, 3, [tile, "moss-cap"]],
    [2, 2, [tile, "moss-cap", "moss-2"]],
    [1, 2, [tile, "moss-cap"]],
  ])(
    "shows a moss brick with %i hits left of %i as the amber tile, its cap and a pip for each hit left from 2",
    (hits, full, layers) => {
      expect(MOSS_ART.layersOf(moss(hits, full))).toEqual(layers);
    },
  );

  it("finds a look's layers in a list made once", () => {
    expect(MOSS_ART.layersOf(moss(2))).toBe(MOSS_ART.layersOf(moss(2)));
  });

  it.each([0, 4])("throws for a moss brick with %i hits left", (hits) => {
    expect(() => MOSS_ART.layersOf(moss(hits, 4))).toThrow(RangeError);
  });

  it("gives a moss brick's shards its body's color", () => {
    expect(MOSS_ART.colorOf(moss(3), ART_PALETTE)).toBe(INKS.body);
  });

  it.each(THEMES)(
    "lays its cap over the tile whose ink is the moss's body in $name",
    ({ id, mode }) => {
      const palette = wallPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);

      expect(inkAt(palette.tints, MOSS_TINT)).toBe(palette.kinds.moss.body);
    },
  );

  it("brings its cap, and its pips for 2 hits and for 3, to the atlas", () => {
    expect(
      MOSS_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual([FRAMES.mossCap, FRAMES.moss(2), FRAMES.moss(3)]);
  });
});

describe("a moss brick at 31 CSS pixels a unit, 2 to one", () => {
  const frame = framesAt(ART_SCALE);
  const cap = frame(FRAMES.mossCap);
  const body = tileBody(cellOf(ART_SCALE));
  const foot = 0.27 * 62;
  const radius = 0.092 * 62;
  const scallops = shapesIn(cap, "circle", INKS.face);

  it("covers its tile's top in its cap's green, from edge to edge, down to the cap's foot", () => {
    const [moss] = shapesIn(cap, "polygon", INKS.face);

    expect(moss && inBillionths(extentOf(moss))).toEqual(
      inBillionths({
        x: body.x,
        y: body.y,
        width: body.width,
        height: foot - body.y,
      }),
    );
  });

  it("lays its cap's edge along its tile's, round its corners", () => {
    const [moss] = shapesIn(cap, "polygon", INKS.face);
    const corner = tileRadius(cellOf(ART_SCALE));

    expect(
      moss?.points.filter(
        (point) => billionths(pastRoundRect(point, body, corner)) !== 0,
      ),
    ).toEqual([]);
  });

  it("scallops its cap's foot with six bumps, the first and last flush with the tile's edges", () => {
    const step = (body.width - 2 * radius) / 5;

    expect(scallops.map(placedToBillionths)).toEqual(
      [0, 1, 2, 3, 4, 5].map((at) => ({
        kind: "circle",
        x: billionths(body.x + radius + at * step),
        y: billionths(foot),
        radius,
        color: INKS.face,
      })),
    );
  });

  it("shades each scallop with a shadow just under it, in the green darkened", () => {
    expect(shapesIn(cap, "circle", SHADOW).map(placedToBillionths)).toEqual(
      scallops.map(({ x }) => ({
        kind: "circle",
        x: billionths(x),
        y: billionths(foot + 0.034 * 62),
        radius,
        color: SHADOW,
      })),
    );
  });

  it("draws the shadows first, so the cap lies over them", () => {
    expect(
      cap.commands.slice(0, 6).every(({ color }) => color === SHADOW),
    ).toBe(true);
  });

  it("cuts a sprout's stem out of its cap in its glyph's color, two pixels wide, round at its ends", () => {
    expect(shapesIn(cap, "line", INKS.glyph)).toEqual([
      {
        kind: "line",
        from: { x: 31, y: 0.3 * 62 },
        to: { x: 31, y: 0.179 * 62 },
        width: 2,
        color: INKS.glyph,
      },
    ]);
    expect(shapesIn(cap, "circle", INKS.glyph)).toHaveLength(2);
  });

  it("stands its sprout's stem on a scallop", () => {
    const stemFoot = { x: 31, y: 0.3 * 62 + 1 };

    expect(
      scallops.some(
        ({ x, y }) => Math.hypot(stemFoot.x - x, stemFoot.y - y) <= radius,
      ),
    ).toBe(true);
  });

  it("cuts two leaves out of its cap in its glyph's color, one the other's mirror about its middle", () => {
    const [left, right] = shapesIn(cap, "polygon", INKS.glyph).map(extentOf);

    expect(
      left &&
        right &&
        inBillionths({ ...right, x: 62 - right.x - right.width }),
    ).toEqual(left && inBillionths(left));
  });

  it.each([
    ["left", 0, 0.405, 32],
    ["right", 1, 0.595, -32],
  ])(
    "cuts its %s leaf as an ellipse about its middle, turned to rise away from its stem",
    (_, at, across, degrees) => {
      const { points } = leafOf(cap, at);

      expect(
        againstEllipse(
          points,
          { x: across * 62, y: 0.141 * 62 },
          { along: 0.082 * 62, across: 0.044 * 62 },
          degrees,
        ),
      ).toEqual(points.map(() => 1));
    },
  );

  it("keeps its leaves on its cap, over its foot and inside its tile", () => {
    const leaves = shapesIn(cap, "polygon", INKS.glyph).map(extentOf);

    expect(
      leaves.every(
        ({ x, y, width, height }) =>
          x >= body.x &&
          y >= body.y &&
          x + width <= 62 - body.x &&
          y + height <= foot,
      ),
    ).toBe(true);
  });

  it.each([
    [
      2,
      [
        [0.64, 0.497],
        [0.36, 0.777],
      ],
    ],
    [
      3,
      [
        [0.64, 0.497],
        [0.5, 0.637],
        [0.36, 0.777],
      ],
    ],
  ] as const)(
    "cuts a die's face of %i pips out of its tile under its cap",
    (hits, places) => {
      expect(
        shapesIn(frame(FRAMES.moss(hits)), "circle", INKS.glyph).map(
          placedToBillionths,
        ),
      ).toEqual(
        places.map(([x = 0, y = 0]) => ({
          kind: "circle",
          x: billionths(x * 62),
          y: billionths(y * 62),
          radius: 0.056 * 62,
          color: INKS.glyph,
        })),
      );
    },
  );
});

describe.each(PIXEL_RATIOS)(
  "a moss brick at every unit from 24 CSS pixels to 128 device pixels, %f to one",
  (pixelRatio) => {
    const looks = everyScale(pixelRatio).map((scale) => {
      const frame = framesAt(scale);
      // The tile's face, over its lip, which shows under it.
      const [face] = tileCommands(cellOf(scale), INKS.body).filter(
        (command) =>
          command.kind === "roundRect" && command.color === INKS.body,
      );
      return {
        unit: scale.unit,
        shadows: shapesIn(frame(FRAMES.mossCap), "circle", SHADOW),
        face: face && extentOf(face),
        leaves: shapesIn(frame(FRAMES.mossCap), "polygon", INKS.glyph).map(
          extentOf,
        ),
        pips: THICK_HITS.flatMap((hits) =>
          shapesIn(frame(FRAMES.moss(hits)), "circle", INKS.glyph),
        ),
      };
    });

    it("keeps each pip a device pixel clear of the scallops' shadows at least", () => {
      expect(
        looks
          .filter(({ shadows, pips }) =>
            pips.some((pip) =>
              shadows.some((shadow) => between(pip, shadow) < 1),
            ),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });

    it("keeps each leaf a device pixel under the tile's top at least", () => {
      expect(
        looks
          .filter(
            ({ face, leaves }) =>
              !face || leaves.some(({ y }) => y - face.y < 1),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });

    it("keeps each pip a device pixel above the tile's lip at least", () => {
      expect(
        looks
          .filter(
            ({ face, pips }) =>
              !face ||
              pips.some(
                (pip) => face.y + face.height - (pip.y + pip.radius) < 1,
              ),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });
  },
);
