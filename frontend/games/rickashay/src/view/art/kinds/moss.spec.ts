import { cellArea } from "@fz/brick-wall/view/art";
import { TINT, inkAt } from "@fz/brick-wall/view/inks";
import { bodyOutline, sproutMark } from "@fz/phaser/bricks";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type CircleCommand,
  type DrawCommand,
  extentOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  pastOutline,
  scalesAt,
} from "../../../testing/art_frames";
import { brickColor } from "../../colors/brick_colors";
import type { KindLook } from "../art";
import { FRAMES, MOSS_HITS } from "../frames";
import { CUT_TILE, PLAIN_ART, tileBody, tileCommands } from "./brick";
import { MOSS_ART } from "./moss";

/** The cap's moss, in the specs' palette. */
const CAP = ART_PALETTE.mossCap;

/** The marks' color, which the sprout and the pips are cut out in. */
const MARK = ART_PALETTE.mark;

/** The scallops' shadow: the green tile's ink, darkened. */
const SHADOW = mixColors(0x000000, inkAt(ART_PALETTE.tints, TINT.green), 0.38);

/** A cell at the specs' scale, 62 device pixels a side. */
const SIDE = 62;

/** Returns a moss brick's look as its art reads it: its hits left of those it had whole, in a row of the fourth ink. */
function moss(hits: number, full = 3): KindLook {
  return { tint: 3, hits, full, plates: 0 };
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

/** Returns a circle with its middle and radius to a billionth of a pixel. */
function inBillionths(circle: CircleCommand): CircleCommand {
  return {
    ...circle,
    x: billionths(circle.x),
    y: billionths(circle.y),
    radius: billionths(circle.radius),
  };
}

/** Returns an area to a billionth of a pixel. */
function areaInBillionths({ x, y, width, height }: Area): Area {
  return {
    x: billionths(x),
    y: billionths(y),
    width: billionths(width),
    height: billionths(height),
  };
}

/** Returns how far apart two circles' edges lie: below nothing where they overlap. */
function between(one: CircleCommand, other: CircleCommand): number {
  return (
    Math.hypot(one.x - other.x, one.y - other.y) - one.radius - other.radius
  );
}

describe("MOSS_ART's layers", () => {
  const tile = FRAMES.tile(TINT.amber);

  it.each([
    [3, 3, [tile, FRAMES.mossCap, FRAMES.moss(3)]],
    [2, 3, [tile, FRAMES.mossCap, FRAMES.moss(2)]],
    [1, 3, [tile, FRAMES.mossCap]],
    [2, 2, [tile, FRAMES.mossCap, FRAMES.moss(2)]],
    [1, 2, [tile, FRAMES.mossCap]],
  ])(
    "shows a moss brick with %i hits left of %i as the amber tile, its cap and a die of pips for its hits left from 2",
    (hits, full, layers) => {
      expect(MOSS_ART.layersOf(moss(hits, full))).toEqual(layers);
    },
  );

  it("finds a brick's layers without making them", () => {
    expect(MOSS_ART.layersOf(moss(2))).toBe(MOSS_ART.layersOf(moss(2)));
  });

  it.each([0, 4])(
    "throws for a moss brick with %i hits left, which no frame shows",
    (hits) => {
      expect(() => MOSS_ART.layersOf(moss(hits, 4))).toThrow(RangeError);
    },
  );

  it("stands it on a tile in the moss brick's own color, which its shards take", () => {
    const [layer] = MOSS_ART.layersOf(moss(3));

    const [, body] = frameNamed(
      PLAIN_ART.frames(ART_PALETTE, ART_SCALE),
      layer ?? "",
    ).commands;

    expect(body?.color).toBe(
      brickColor({ kind: "moss", tint: 3 }, ART_PALETTE),
    );
  });
});

describe("MOSS_ART's frames", () => {
  it("brings its cap, and its pips for 2 hits left and for 3, to the atlas", () => {
    expect(
      MOSS_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual([FRAMES.mossCap, ...MOSS_HITS.map(FRAMES.moss)]);
  });
});

describe("a moss brick at 31 CSS pixels a unit, 2 to one", () => {
  const frame = framesAt(ART_SCALE);
  const cap = frame(FRAMES.mossCap);
  const cell = cellArea(ART_SCALE);
  const body = tileBody(cell);
  const foot = 0.27 * SIDE;
  const radius = 0.092 * SIDE;
  const scallops = shapesIn(cap, "circle", CAP);

  it("covers its tile's top in the cap's moss, from side to side, down to the cap's foot", () => {
    const [moss] = shapesIn(cap, "polygon", CAP);

    expect(moss && areaInBillionths(extentOf(moss))).toEqual(
      areaInBillionths({
        x: body.x,
        y: body.y,
        width: body.width,
        height: foot - body.y,
      }),
    );
  });

  it("lays its cap's edge along its tile's, cut across its corners", () => {
    const [moss] = shapesIn(cap, "polygon", CAP);
    const outline = bodyOutline(cell, CUT_TILE);

    expect(
      moss?.points.filter(
        (point) => billionths(pastOutline(point, outline)) !== 0,
      ),
    ).toEqual([]);
  });

  it("scallops its cap's foot with six bumps, the first and last flush with the tile's sides", () => {
    const step = (body.width - 2 * radius) / 5;

    expect(scallops.map(inBillionths)).toEqual(
      [0, 1, 2, 3, 4, 5].map((at) =>
        inBillionths({
          kind: "circle",
          x: body.x + radius + at * step,
          y: foot,
          radius,
          color: CAP,
        }),
      ),
    );
  });

  it("shades each scallop with a shadow just under it, in the green darkened, drawn first so the cap lies over it", () => {
    expect([
      cap.commands.slice(0, 6).map(({ color }) => color),
      shapesIn(cap, "circle", SHADOW).map(inBillionths),
    ]).toEqual([
      Array<number>(6).fill(SHADOW),
      scallops.map((scallop) =>
        inBillionths({ ...scallop, y: foot + 0.034 * SIDE, color: SHADOW }),
      ),
    ]);
  });

  it("cuts a sprout out of its cap in the marks' color, last, over the moss", () => {
    const sprout = sproutMark(cell, MARK, ART_SCALE.pixelRatio);

    expect(cap.commands.slice(-sprout.length)).toEqual(sprout);
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
    "cuts a die's face of %i pips, and nothing else, out of its tile under its cap, in the marks' color",
    (hits, places) => {
      const pips = frame(FRAMES.moss(hits));

      expect([
        pips.commands.length,
        shapesIn(pips, "circle", MARK).map(inBillionths),
      ]).toEqual([
        hits,
        places.map(([x, y]) =>
          inBillionths({
            kind: "circle",
            x: x * SIDE,
            y: y * SIDE,
            radius: 0.056 * SIDE,
            color: MARK,
          }),
        ),
      ]);
    },
  );
});

describe.each(PIXEL_RATIOS)(
  "a moss brick at every unit from 24 CSS pixels to 128 device pixels, %f to one",
  (pixelRatio) => {
    const looks = scalesAt(pixelRatio).map((scale) => {
      const frame = framesAt(scale);
      const cap = frame(FRAMES.mossCap);
      // The tile's face, its body over its lip, which shows under it.
      const [, face] = tileCommands(cellArea(scale), 0);
      return {
        unit: scale.unit,
        foot: 0.27 * cellArea(scale).height,
        shadows: shapesIn(cap, "circle", SHADOW),
        face: face && extentOf(face),
        leaves: shapesIn(cap, "polygon", MARK).map(extentOf),
        pips: MOSS_HITS.flatMap((hits) =>
          shapesIn(frame(FRAMES.moss(hits)), "circle", MARK),
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

    it("keeps each leaf on its cap, a device pixel under the tile's top at least and over the cap's foot", () => {
      expect(
        looks
          .filter(
            ({ face, leaves, foot }) =>
              !face ||
              leaves.some(
                ({ y, height }) => y - face.y < 1 || y + height > foot,
              ),
          )
          .map(({ unit }) => unit),
      ).toEqual([]);
    });
  },
);
