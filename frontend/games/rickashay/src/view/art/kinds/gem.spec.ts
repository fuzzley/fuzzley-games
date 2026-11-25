import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellArea } from "@fz/brick-wall/view/art";
import { inkAt } from "@fz/brick-wall/view/inks";
import { mixColors } from "@fz/phaser/color";
import type {
  Area,
  ArtFrame,
  ArtScale,
  CircleCommand,
  LineCommand,
  Point,
  PolygonCommand,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { STAND_OFF } from "../../../rules/tuning";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  pastOutline,
  pointInBillionths,
  scalesAt,
} from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { FRAMES, INKS, type Ink } from "../frames";
import { tileBody } from "./brick";
import { GEM_ART, gemFacets } from "./gem";

/** How far a point may stray past a line and still pass, for a rounding. */
const SLACK = 1e-9;

/** How far either way of the middle of a side of a gem's tile's body the flat cutting a point square runs, at the specs' scale: as far as the flat a flight turns off there. */
const TIP = (STAND_OFF - RADIUS) * cellArea(ART_SCALE).width;

/** The specs' palette's third ink, which a gem in a wall's third row up takes. */
const INK = inkAt(ART_PALETTE.tints, 2);

/** A gem of a tint, whole. */
function gemOf(tint: number): KindLook {
  return { tint, hits: 1, full: 1, plates: 0 };
}

/** Returns a gem's frame in an ink at a scale. */
function gemAt(ink: Ink, scale: ArtScale): ArtFrame {
  return frameNamed(GEM_ART.frames(ART_PALETTE, scale), FRAMES.gem(ink));
}

/** Returns the polygons a frame fills in a color, in order. */
function polygonsIn(frame: ArtFrame, color: number): readonly PolygonCommand[] {
  return frame.commands.filter(
    (command): command is PolygonCommand =>
      command.kind === "polygon" && command.color === color,
  );
}

/** Returns points given as shares of an area, each to a billionth. */
function sharesOf(
  area: Area,
  shares: readonly (readonly [number, number])[],
): readonly Point[] {
  return shares.map(([across, down]) =>
    pointInBillionths({
      x: area.x + across * area.width,
      y: area.y + down * area.height,
    }),
  );
}

/** Returns points given as lengths across and down from the middle of an area, each to a billionth. */
function fromMiddleOf(
  area: Area,
  lengths: readonly (readonly [number, number])[],
): readonly Point[] {
  return lengths.map(([across, down]) =>
    pointInBillionths({
      x: area.x + area.width / 2 + across,
      y: area.y + area.height / 2 + down,
    }),
  );
}

/** Returns a polygon's points, each to a billionth. */
function pointsOf(polygon: PolygonCommand | undefined): readonly Point[] {
  return (polygon?.points ?? []).map(pointInBillionths);
}

/** Returns the glint's color in an ink: 0.6 white. */
function glintOf(ink: number): number {
  return mixColors(0xffffff, ink, 0.6);
}

/** Returns the dots that round a frame's glint's ends, in the specs' palette's third ink. */
function glintEndsIn(frame: ArtFrame): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === glintOf(INK),
  );
}

describe("GEM_ART's layers", () => {
  it.each(INKS)("shows a gem of tint %i as the gem in that ink", (tint) => {
    expect(GEM_ART.layersOf(gemOf(tint))).toEqual([FRAMES.gem(tint)]);
  });

  it("finds a gem's layers without making them", () => {
    expect(GEM_ART.layersOf(gemOf(4))).toBe(GEM_ART.layersOf(gemOf(4)));
  });

  it.each([-1, 8])("refuses a gem of tint %i, which no ink has", (tint) => {
    expect(() => GEM_ART.layersOf(gemOf(tint))).toThrow(RangeError);
  });
});

describe("GEM_ART's frames", () => {
  const body = tileBody(cellArea(ART_SCALE));
  const half = body.width / 2;
  const frame = gemAt(2, ART_SCALE);
  const { light, dark } = gemFacets(INK);

  it("brings a gem in each of the 8 inks, each a cell", () => {
    expect(
      GEM_ART.frames(ART_PALETTE, ART_SCALE).map(({ name, width, height }) => [
        name,
        width,
        height,
      ]),
    ).toEqual(INKS.map((ink) => [FRAMES.gem(ink), 62, 62]));
  });

  it.each(INKS)("draws the gem in ink %i in that ink", (ink) => {
    expect(gemAt(ink, ART_SCALE).commands[0]?.color).toBe(
      inkAt(ART_PALETTE.tints, ink),
    );
  });

  it("draws a diamond filling its tile's body, each of its points cut square by a flat as wide as the one a flight turns off there", () => {
    expect(pointsOf(polygonsIn(frame, INK)[0])).toEqual(
      fromMiddleOf(body, [
        [-TIP, -half],
        [TIP, -half],
        [half, -TIP],
        [half, TIP],
        [TIP, half],
        [-TIP, half],
        [-half, TIP],
        [-half, -TIP],
      ]),
    );
  });

  it("lightens its upper half down to its middle, 0.24 white", () => {
    expect(pointsOf(polygonsIn(frame, light)[0])).toEqual(
      fromMiddleOf(body, [
        [-TIP, -half],
        [TIP, -half],
        [half, -TIP],
        [half, 0],
        [-half, 0],
        [-half, -TIP],
      ]),
    );
  });

  it("darkens its lower edges, 0.18 black, as far in as 0.36 of its body from its middle", () => {
    const facet = 0.36 * body.width;

    expect(pointsOf(polygonsIn(frame, dark)[0])).toEqual(
      fromMiddleOf(body, [
        [-half, TIP],
        [-TIP, half],
        [TIP, half],
        [half, TIP],
        [half, 0],
        [facet, 0],
        [0, facet],
        [-facet, 0],
        [-half, 0],
      ]),
    );
  });

  it("sets a table in its ink at its middle, its corners 0.28 of its body from it", () => {
    expect(pointsOf(polygonsIn(frame, INK)[1])).toEqual(
      sharesOf(body, [
        [0.5, 0.22],
        [0.78, 0.5],
        [0.5, 0.78],
        [0.22, 0.5],
      ]),
    );
  });

  it("draws a glint across its table, 0.6 white, 3 pixels wide and round at its ends", () => {
    const glints = drawnIn(frame, "line", glintOf(INK)).filter(
      (command): command is LineCommand => command.kind === "line",
    );

    expect([
      glints.map(({ from, to, width }) => [
        pointInBillionths(from),
        pointInBillionths(to),
        width,
      ]),
      glintEndsIn(frame).length,
    ]).toEqual([
      [
        [
          ...sharesOf(body, [
            [0.34, 0.46],
            [0.46, 0.34],
          ]),
          3,
        ],
      ],
      2,
    ]);
  });
});

describe("gemFacets", () => {
  it("lightens an ink 0.24 white for a gem's upper half and darkens it 0.18 black for its lower edges", () => {
    expect(gemFacets(INK)).toEqual({
      light: mixColors(0xffffff, INK, 0.24),
      dark: mixColors(0x000000, INK, 0.18),
    });
  });
});

describe.each(PIXEL_RATIOS)(
  "GEM_ART's frame at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const frames = scalesAt(pixelRatio).map((scale) => ({
      scale,
      frame: gemAt(2, scale),
    }));

    // The table is convex, so a glint whose round ends lie on it does too.
    it("keeps its glint on its table", () => {
      const off = frames.flatMap(({ scale, frame }) => {
        const table = polygonsIn(frame, INK)[1]?.points ?? [];
        return glintEndsIn(frame).some(
          (end) => pastOutline(end, table) + end.radius > SLACK,
        )
          ? [scale.unit]
          : [];
      });

      expect(off).toEqual([]);
    });
  },
);
