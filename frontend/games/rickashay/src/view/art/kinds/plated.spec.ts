import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "@fz/brick-wall/rules/grid";
import { cellArea } from "@fz/brick-wall/view/art";
import { bodyOutline, plateTeeth } from "@fz/phaser/bricks";
import {
  type ArtFrame,
  type ArtScale,
  type CircleCommand,
  type DrawCommand,
  type Point,
  diePips,
  extentOf,
  polygon,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  pastOutline,
  scalesAt,
} from "../../../testing/art_frames";
import { LEGEND } from "../../../rules/levels/legend";
import type { WallPalette } from "../../colors/palette";
import type { KindLook } from "../art";
import {
  FRAMES,
  PLATED_HITS,
  PLATINGS,
  type PlatedHits,
  type Plating,
} from "../frames";
import { CUT_TILE } from "./brick";
import { PLATED_ART } from "./plated";

/** A palette whose field, marks and steel are colors no other takes, so a spec sees which a shape is drawn in. */
const OWN: WallPalette = {
  ...ART_PALETTE,
  field: 0x110000,
  mark: 0x220000,
  steel: 0x330000,
};

/** How far a drawing may stray past the tile's body and still pass, for a rounding. */
const SLACK = 1e-9;

/** A cell at 31 CSS pixels a unit, 2 device pixels to one. */
const SIDE = 62;

/** Where the plates' gaps start, 0.265 of the cell up from its bottom, on a whole pixel, at 31 CSS pixels a unit. */
const INNER = SIDE - Math.round(0.265 * SIDE);

/** How far along each side from a corner of the tile's body the cut across it reaches, at 31 CSS pixels a unit. */
const CUT = 0.11 * SIDE;

/** Returns a plated brick's look as its art reads it, whole unless given its hits left. */
function plated(plates: number, full: number, hits = full): KindLook {
  return { tint: 0, hits, full, plates };
}

/** Returns a plating's frame for its hits left in a palette at a scale. */
function platedIn(
  plating: Plating,
  hits: PlatedHits,
  scale: ArtScale = ART_SCALE,
  palette: WallPalette = OWN,
): ArtFrame {
  return frameNamed(
    PLATED_ART.frames(palette, scale),
    FRAMES.plated(plating, hits),
  );
}

/** Returns the pips a frame for some hits left draws first. */
function pipsIn(frame: ArtFrame, hits: number): readonly CircleCommand[] {
  return frame.commands
    .slice(0, hits)
    .filter((command): command is CircleCommand => command.kind === "circle");
}

/** Returns the circles a frame draws in a color. */
function circlesIn(frame: ArtFrame, color: number): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === color,
  );
}

/** Returns the points a command reaches out to: a polygon's own, a circle's middle a radius round, and else the corners of what it covers. */
function reachOf(command: DrawCommand): {
  readonly points: readonly Point[];
  readonly by: number;
} {
  if (command.kind === "polygon") return { points: command.points, by: 0 };
  if (command.kind === "circle")
    return { points: [command], by: command.radius };
  const { x, y, width, height } = extentOf(command);
  return {
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    by: 0,
  };
}

describe("PLATED_ART's layers", () => {
  it.each([
    ["v", plated(FLOORWARD, 2), ["tile-1", "plated-floorward-2"]],
    ["V", plated(FLOORWARD, 3), ["tile-1", "plated-floorward-3"]],
    [
      "U",
      plated(FLOORWARD | LEFT | RIGHT, 2),
      ["tile-1", "plated-floorward-sides-2"],
    ],
    [
      "V with a hit left",
      plated(FLOORWARD, 3, 1),
      ["tile-1", "plated-floorward-1"],
    ],
  ])(
    "shows a %s as the orange tile under its plates and pips",
    (_, look, layers) => {
      expect(PLATED_ART.layersOf(look)).toEqual(layers);
    },
  );

  it("finds a brick's layers without making them", () => {
    const look = plated(FLOORWARD | LEFT | RIGHT, 2, 1);

    expect(PLATED_ART.layersOf(look)).toBe(PLATED_ART.layersOf(look));
  });

  it.each([
    ["no plates", plated(0, 2)],
    ["a plate on its top", plated(CEILINGWARD, 2)],
    ["4 hits left", plated(FLOORWARD, 4)],
    ["no hits left", plated(FLOORWARD, 2, 0)],
  ])("refuses a plated brick with %s, a look no level gives", (_, look) => {
    expect(() => PLATED_ART.layersOf(look)).toThrow(RangeError);
  });
});

describe("PLATED_ART's frames", () => {
  it("brings a frame for each plating and each count of hits left, each a cell", () => {
    expect(
      PLATED_ART.frames(OWN, ART_SCALE).map(({ name, width, height }) => [
        name,
        width,
        height,
      ]),
    ).toEqual(
      PLATINGS.flatMap((plating) =>
        PLATED_HITS.map((hits) => [FRAMES.plated(plating, hits), SIDE, SIDE]),
      ),
    );
  });

  it.each([
    ["floorward", 3, 0.19, 0.066],
    ["floorward-sides", 2, 0.145, 0.06],
  ] as const)(
    "cuts a die's pips for the hits left out in the marks' color, above the %s plates, first",
    (plating, hits, step, radius) => {
      expect(platedIn(plating, hits).commands.slice(0, hits)).toEqual(
        diePips(
          hits,
          { x: 0.5 * SIDE, y: 0.415 * SIDE },
          step * SIDE,
          radius * SIDE,
          { color: OWN.mark },
        ),
      );
    },
  );

  it("shows no pips with a hit left, only its plates", () => {
    expect(platedIn("floorward", 1).commands[0]).toMatchObject({
      kind: "polygon",
      color: OWN.field,
    });
  });

  it.each([
    ["floorward", 1],
    ["floorward-sides", 3],
  ] as const)(
    "lays each of the %s plates on a gap of the field's color, %i in all",
    (plating, gaps) => {
      expect(drawnIn(platedIn(plating, 1), "polygon", OWN.field)).toHaveLength(
        gaps,
      );
    },
  );

  // At 64 CSS pixels a unit, the body lies 5 pixels in from the cell, its
  // corners cut 14.08 along each side.
  it.each([
    [31, ART_SCALE, { y: INNER, height: SIDE - 2 - INNER }],
    [64, { unit: 128, pixelRatio: 2 }, { y: 94, height: 29 }],
  ] as const)(
    "cuts its plate's gap from the tile's body 0.265 of the cell up from its bottom, on a whole pixel, at %i CSS pixels a unit",
    (_, scale, extent) => {
      const [gap] = drawnIn(
        platedIn("floorward", 1, scale),
        "polygon",
        OWN.field,
      );

      expect(extentOf(gap!)).toMatchObject(extent);
    },
  );

  // At 31 CSS pixels a unit, the body lies 2 pixels in from the cell, its
  // corners cut 6.82 along each side, so a bar standing 6 over its foot
  // keeps a pixel in from its sides.
  it.each([
    [31, ART_SCALE, { x: 3, y: 48, width: 56, height: 6 }],
    [64, { unit: 128, pixelRatio: 2 }, { x: 8, y: 98, width: 112, height: 13 }],
  ] as const)(
    "stands its plate's bar in steel on the gap, from 0.195 to 0.095 of the cell over the body's foot, its ends as near the body's sides as its cut corners let them, at %i CSS pixels a unit",
    (_, scale, extent) => {
      const [bar] = drawnIn(
        platedIn("floorward", 1, scale),
        "roundRect",
        OWN.steel,
      );

      expect(bar).toMatchObject(extent);
    },
  );

  it("points 6 teeth in steel out of its plate's bar toward the floor, across the flat between the body's cut corners, their feet 0.01 of the cell over the bar's foot and their tips as far over the body's", () => {
    expect(drawnIn(platedIn("floorward", 1), "polygon", OWN.steel)).toEqual(
      plateTeeth({
        from: 2 + CUT,
        span: SIDE - 4 - 2 * CUT,
        count: 6,
        gap: 0.012 * SIDE,
        foot: 54 - 0.01 * SIDE,
        tip: SIDE - 2 - 0.01 * SIDE,
      }).map((tooth) => polygon(tooth, { color: OWN.steel })),
    );
  });

  it("cuts two rivets out of its plate's bar in the marks' color, in its middle", () => {
    expect(circlesIn(platedIn("floorward", 1), OWN.mark)).toMatchObject([
      { x: 0.16 * SIDE, y: 51, radius: 0.03 * SIDE },
      { x: 0.84 * SIDE, y: 51, radius: 0.03 * SIDE },
    ]);
  });

  it("shows half as many teeth and no rivets at 29 CSS pixels a unit", () => {
    const small = platedIn("floorward", 1, { unit: 58, pixelRatio: 2 });

    expect([
      drawnIn(small, "polygon", OWN.steel).length,
      circlesIn(small, OWN.mark),
    ]).toEqual([3, []]);
  });

  // The sides' plates reach down only to the floorward plate's gap, which
  // is drawn over their ends.
  it("plates the sides before the floor, each side's bar reaching only to the floorward plate's gap", () => {
    const bars = drawnIn(
      platedIn("floorward-sides", 1),
      "roundRect",
      OWN.steel,
    );

    expect(
      bars.map((bar) => {
        const { x, y, width, height } = extentOf(bar);
        return [x, width > height ? "across" : "up", y + height];
      }),
    ).toEqual([
      [8, "up", INNER + 0.03 * SIDE],
      [48, "up", INNER + 0.03 * SIDE],
      [3, "across", 54],
    ]);
  });

  it("draws the sides' teeth and rivets no further down than the floorward plate's gap, which lies over their ends", () => {
    const frame = platedIn("floorward-sides", 1);
    const { commands } = frame;
    const floorwardGap = commands.indexOf(
      drawnIn(frame, "polygon", OWN.field).at(-1)!,
    );

    expect(
      Math.max(
        ...commands
          .slice(0, floorwardGap)
          .filter((command) => command.color !== OWN.field)
          .filter((command) => command.kind !== "roundRect")
          .flatMap((command) => {
            const { points, by } = reachOf(command);
            return points.map(({ y }) => y + by);
          }),
      ),
    ).toBeLessThanOrEqual(INNER);
  });
});

describe.each(PIXEL_RATIOS)(
  "PLATED_ART's frames at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const scales = scalesAt(pixelRatio);

    it("keep every gap, bar, tooth, rivet and pip within the tile's body", () => {
      const past = scales.flatMap((scale) => {
        const outline = bodyOutline(cellArea(scale), CUT_TILE);
        return PLATED_ART.frames(OWN, scale)
          .filter(({ commands }) =>
            commands.some((command) => {
              const { points, by } = reachOf(command);
              return points.some(
                (point) => pastOutline(point, outline) + by > SLACK,
              );
            }),
          )
          .map(({ name }) => `${name} at ${String(scale.unit)}`);
      });

      expect(past).toEqual([]);
    });

    it("keep the pips over the floorward plate's gap", () => {
      const touching = scales.flatMap((scale) => {
        const { width } = cellArea(scale);
        const inner = width - Math.round(0.265 * width);
        return PLATINGS.flatMap((plating) =>
          ([2, 3] as const)
            .filter((hits) =>
              pipsIn(platedIn(plating, hits, scale), hits).some(
                (pip) => pip.y + pip.radius > inner,
              ),
            )
            .map(
              (hits) => `${plating} ${String(hits)} at ${String(scale.unit)}`,
            ),
        );
      });

      expect(touching).toEqual([]);
    });

    it("keep the pips between the sides' plates' gaps", () => {
      const touching = scales.flatMap((scale) => {
        const { width } = cellArea(scale);
        const inner = width - Math.round(0.265 * width);
        return ([2, 3] as const)
          .filter((hits) =>
            pipsIn(platedIn("floorward-sides", hits, scale), hits).some(
              (pip) =>
                pip.x - pip.radius < width - inner ||
                pip.x + pip.radius > inner,
            ),
          )
          .map((hits) => `${String(hits)} at ${String(scale.unit)}`);
      });

      expect(touching).toEqual([]);
    });

    it("keep a pixel of the gap between the tile and each plate's bar", () => {
      const touching = scales.filter((scale) => {
        const { width } = cellArea(scale);
        const inner = width - Math.round(0.265 * width);
        const [left, right, floorward] = drawnIn(
          platedIn("floorward-sides", 1, scale),
          "roundRect",
          OWN.steel,
        ).map(extentOf);
        return (
          left!.x + left!.width > width - inner - 1 ||
          right!.x < inner + 1 ||
          floorward!.y < inner + 1
        );
      });

      expect(touching.map(({ unit }) => unit)).toEqual([]);
    });

    it("draw every polygon with 3 points or more", () => {
      const thin = scales.flatMap((scale) =>
        PLATED_ART.frames(OWN, scale)
          .filter(({ commands }) =>
            commands.some(
              (command) =>
                command.kind === "polygon" && command.points.length < 3,
            ),
          )
          .map(({ name }) => `${name} at ${String(scale.unit)}`),
      );

      expect(thin).toEqual([]);
    });
  },
);

describe("PLATED_ART's plates", () => {
  it.each([
    ["v", ["tile-1", "plated-floorward-2"]],
    ["V", ["tile-1", "plated-floorward-3"]],
    ["U", ["tile-1", "plated-floorward-sides-2"]],
  ] as const)("cover the faces the legend plates its %s on", (char, layers) => {
    const { hits, plates } = LEGEND[char];

    expect(PLATED_ART.layersOf({ tint: 0, hits, full: hits, plates })).toEqual(
      layers,
    );
  });
});
