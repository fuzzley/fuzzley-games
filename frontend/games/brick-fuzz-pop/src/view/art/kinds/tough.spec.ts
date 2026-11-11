import type {
  ArtFrame,
  ArtScale,
  CircleCommand,
  DrawCommand,
  Point,
  PolygonCommand,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_FRAMES,
  ART_PALETTE,
  PIXEL_RATIOS,
  billionths,
  distanceToSegment,
  pastRoundRect,
} from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { atlasFrames } from "../atlas_frames";
import { cellOf } from "../symbols";
import { tileBody, tileRadius } from "./brick";
import { TOUGH_ART, cracksFrame, pipsFrame } from "./tough";

/** How far a point may stray past a line and still pass, for a rounding. */
const SLACK = 1e-9;

/** Returns every scale that draws the cracks at a pixel ratio: each whole unit from 30 CSS pixels to 128 device pixels, the most the atlas is baked at. */
function detailedScales(pixelRatio: number): readonly ArtScale[] {
  const least = Math.ceil(30 * pixelRatio);
  return Array.from({ length: 128 - least + 1 }, (_, i) => ({
    unit: least + i,
    pixelRatio,
  }));
}

/** Returns a tough brick's look as its art reads it: its tint, and its hits left of those it had whole. */
function tough(tint: number, hits: number, full: number): KindLook {
  return { tint, hits, full, plates: 0 };
}

/** Returns the circles a frame draws in the marks' color. */
function pipsIn(frame: ArtFrame): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === ART_PALETTE.mark,
  );
}

/** Returns the shapes a frame fills in the marks' color. */
function cracksIn(frame: ArtFrame): readonly PolygonCommand[] {
  return frame.commands.filter(
    (command: DrawCommand): command is PolygonCommand =>
      command.kind === "polygon" && command.color === ART_PALETTE.mark,
  );
}

/** Describes an end of a band: the two corners its cut runs between. */
type End = readonly [Point, Point];

/** Returns a band's two ends, the one it starts at first, from its outline: its left side, then its right side back. */
function endsOf(crack: PolygonCommand): readonly [End, End] {
  const { points } = crack;
  const half = points.length / 2;
  const at = (i: number): Point => points[i] ?? { x: NaN, y: NaN };
  return [
    [at(0), at(points.length - 1)],
    [at(half - 1), at(half)],
  ];
}

/** Returns the middle of a band's end, the point of its line it cuts across. */
function middleOf([a, b]: End): Point {
  return { x: billionths((a.x + b.x) / 2), y: billionths((a.y + b.y) / 2) };
}

/** Returns how long a band's end is, across it from corner to corner. */
function lengthOf([a, b]: End): number {
  return billionths(Math.hypot(a.x - b.x, a.y - b.y));
}

/** Returns which way a band's end is cut: across, as a tile's top and bottom run, down, as its sides do, or aslant. */
function cutOf([a, b]: End): "across" | "down" | "aslant" {
  if (billionths(a.y) === billionths(b.y)) return "across";
  return billionths(a.x) === billionths(b.x) ? "down" : "aslant";
}

/**
 * Returns how far a pip's edge lies from a crack's outline, where they come
 * nearest, which is below nothing where they overlap, since a crack is too
 * thin to hold a pip whole.
 */
function gapBetween(pip: CircleCommand, crack: PolygonCommand): number {
  const { points } = crack;
  const nearest = Math.min(
    ...points.map((from, i) =>
      distanceToSegment(pip, from, points[(i + 1) % points.length] ?? from),
    ),
  );
  return nearest - pip.radius;
}

describe("TOUGH_ART's layers", () => {
  it.each([
    [4, 4, ["tile-2", "pips-4"]],
    [6, 6, ["tile-2", "pips-6"]],
    [2, 2, ["tile-2", "pips-2"]],
    [2, 4, ["tile-2", "pips-2", "cracks-2"]],
    [1, 2, ["tile-2", "cracks-1"]],
    [1, 6, ["tile-2", "cracks-5"]],
  ])(
    "shows a brick with %i hits left of %i its tile, its pips while it has two or more, and a crack for each it took",
    (hits, full, layers) => {
      expect(TOUGH_ART.layersOf(tough(2, hits, full))).toEqual(layers);
    },
  );

  it.each([
    [3, 2],
    [1, 7],
    [0, 2],
  ])(
    "refuses a brick with %i hits left of %i, a look no tough brick takes",
    (hits, full) => {
      expect(() => TOUGH_ART.layersOf(tough(2, hits, full))).toThrow(
        RangeError,
      );
    },
  );

  it("gives a tough brick's shards its tint's ink", () => {
    expect(TOUGH_ART.colorOf(tough(6, 2, 3), ART_PALETTE)).toBe(
      ART_PALETTE.tints[6],
    );
  });
});

describe("pipsFrame", () => {
  it("names the frames of 2 to 6 pips", () => {
    expect([2, 6].map((hits) => pipsFrame(hits))).toEqual(["pips-2", "pips-6"]);
  });

  it.each([1, 7])("refuses %i pips, which no frame shows", (hits) => {
    expect(() => pipsFrame(hits)).toThrow(RangeError);
  });
});

describe("cracksFrame", () => {
  it("names the frames of 1 to 5 cracks", () => {
    expect([1, 5].map((taken) => cracksFrame(taken))).toEqual([
      "cracks-1",
      "cracks-5",
    ]);
  });

  it.each([0, 6])("refuses %i cracks, which no frame shows", (taken) => {
    expect(() => cracksFrame(taken)).toThrow(RangeError);
  });
});

describe("TOUGH_ART's frames", () => {
  it("lays a die's face a little above its cell's middle, its pips a fifth of the cell apart", () => {
    const pips = pipsIn(frameNamed(ART_FRAMES, pipsFrame(5)));

    expect(
      pips.map(({ x, y, radius }) => ({
        x: billionths(x),
        y: billionths(y),
        radius: billionths(radius),
      })),
    ).toEqual(
      [
        [18.6, 17.36],
        [43.4, 17.36],
        [31, 29.76],
        [18.6, 42.16],
        [43.4, 42.16],
      ].map(([x, y]) => ({ x, y, radius: 4.092 })),
    );
  });

  it.each([2, 3, 4, 5, 6])(
    "draws %i pips cut out in the marks' color, with nothing else",
    (pips) => {
      const frame = frameNamed(ART_FRAMES, pipsFrame(pips));

      expect([pipsIn(frame).length, frame.commands.length]).toEqual([
        pips,
        pips,
      ]);
    },
  );

  it.each([1, 2, 3, 4, 5])(
    "draws %i cracks cut out in the marks' color at 31 CSS pixels a unit, with nothing else",
    (cracks) => {
      const frame = frameNamed(ART_FRAMES, cracksFrame(cracks));

      expect([cracksIn(frame).length, frame.commands.length]).toEqual([
        cracks,
        cracks,
      ]);
    },
  );

  it("cuts each crack's inner end square, a line wide: two device pixels at 31 CSS pixels a unit", () => {
    const cracks = cracksIn(frameNamed(ART_FRAMES, cracksFrame(5)));

    expect(cracks.map((crack) => lengthOf(endsOf(crack)[1]))).toEqual([
      2, 2, 2, 2, 2,
    ]);
  });

  it("cuts each crack's outer end along its tile's edge, two pixels in from its cell's at 31 CSS pixels a unit, about where it starts", () => {
    const cracks = cracksIn(frameNamed(ART_FRAMES, cracksFrame(5)));

    const starts = cracks.map((crack) => {
      const [outer] = endsOf(crack);
      return { cut: cutOf(outer), middle: middleOf(outer) };
    });

    expect(starts).toEqual(
      [
        { cut: "across", x: 2 + 0.41 * 58, y: 2 },
        { cut: "down", x: 60, y: 2 + 0.59 * 58 },
        { cut: "down", x: 2, y: 2 + 0.39 * 58 },
        { cut: "across", x: 2 + 0.59 * 58, y: 60 },
        { cut: "across", x: 2 + 0.8 * 58, y: 2 },
      ].map(({ cut, x, y }) => ({
        cut,
        middle: { x: billionths(x), y: billionths(y) },
      })),
    );
  });

  it("draws a crack two device pixels wide at 45 device pixels a unit, 1.5 to a CSS pixel, where its share of a unit is less", () => {
    const frames = atlasFrames(ART_PALETTE, { unit: 45, pixelRatio: 1.5 });

    const [crack] = cracksIn(frameNamed(frames, cracksFrame(1)));

    expect(crack && lengthOf(endsOf(crack)[1])).toBe(2);
  });

  it.each([1, 5])(
    "draws none of %i cracks at 29 CSS pixels a unit, too small for them",
    (cracks) => {
      const frames = atlasFrames(ART_PALETTE, { unit: 58, pixelRatio: 2 });

      expect(frameNamed(frames, cracksFrame(cracks)).commands).toEqual([]);
    },
  );
});

describe.each(PIXEL_RATIOS)(
  "TOUGH_ART's cracks at every unit from 30 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const drawn = detailedScales(pixelRatio).map((scale) => {
      const frames = atlasFrames(ART_PALETTE, scale);
      return {
        scale,
        pips: [2, 3, 4, 5, 6].flatMap((count) =>
          pipsIn(frameNamed(frames, pipsFrame(count))),
        ),
        cracks: cracksIn(frameNamed(frames, cracksFrame(5))),
      };
    });

    it("keeps every crack a device pixel clear of every pip a die shows, at least", () => {
      const touching = drawn.flatMap(({ scale, pips, cracks }) =>
        pips.flatMap((pip) =>
          cracks
            .map((crack, i) => ({
              unit: scale.unit,
              crack: i + 1,
              gap: gapBetween(pip, crack),
            }))
            .filter(({ gap }) => gap < 1),
        ),
      );

      expect(touching).toEqual([]);
    });

    it("keeps every crack within its tile, round its corners", () => {
      const outside = drawn.flatMap(({ scale, cracks }) => {
        const cell = cellOf(scale);
        return cracks.flatMap((crack, i) =>
          crack.points
            .filter(
              (point) =>
                pastRoundRect(point, tileBody(cell), tileRadius(cell)) > SLACK,
            )
            .map(() => `crack ${String(i + 1)} at ${String(scale.unit)}`),
        );
      });

      expect(outside).toEqual([]);
    });

    it("draws every crack a CSS pixel wide at least", () => {
      const narrow = drawn.flatMap(({ scale, cracks }) =>
        cracks
          .filter((crack) => lengthOf(endsOf(crack)[1]) < pixelRatio)
          .map(() => scale.unit),
      );

      expect(narrow).toEqual([]);
    });
  },
);
