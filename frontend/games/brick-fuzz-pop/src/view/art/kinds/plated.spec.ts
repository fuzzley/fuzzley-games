import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  extentOf,
  polygon,
  roundRect,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { THEMES } from "@fz/style/themes";
import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "../../../rules/grid";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  distanceToSegment,
  everyScale,
  inBillionths,
  pastRoundRect,
  reachPastRoundRect,
} from "../../../testing/art_frames";
import { PALETTES } from "../../../testing/roles";
import { inkAt } from "../../colors/inks";
import { FIELD_ROLES, wallPalette } from "../../colors/palette";
import type { KindLook } from "../art";
import { FRAMES, PLATINGS, type PlatedHits, type Plating } from "../frames";
import { itemAt } from "../../items";
import { cellOf, diePips } from "../symbols";
import { tileBody, tileRadius } from "./brick";
import { PLATED_ART, PLATED_TINT } from "./plated";

/** A palette in which a plated brick has inks of its own, each unlike the others, the marks' and the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  mark: 0x000044,
  kinds: {
    ...ART_PALETTE.kinds,
    plated: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
  },
};

const { face, glyph } = OWN_INKS.kinds.plated;

/** Returns a plated brick's look as its art reads it: its plated faces, and its hits left of the 3 it had whole. */
function plated(plates: number, hits: number): KindLook {
  return { tint: 0, hits, full: 3, plates };
}

/** Returns a plated brick's frame for a plating and its hits left, in a palette at a scale. */
function platedIn(
  plating: Plating,
  hits: PlatedHits,
  scale: ArtScale = ART_SCALE,
  palette = OWN_INKS,
): ArtFrame {
  return frameNamed(
    PLATED_ART.frames(palette, scale),
    FRAMES.plated(plating, hits),
  );
}

/** The scale under the detail rule, 29 CSS pixels a unit at 2 device pixels to one. */
const SMALL: ArtScale = { unit: 58, pixelRatio: 2 };

/** Returns the commands of a kind drawn in a color among some. */
function shapesIn<K extends DrawCommand["kind"]>(
  commands: readonly DrawCommand[],
  kind: K,
  color: number,
): readonly Extract<DrawCommand, { readonly kind: K }>[] {
  return commands.filter(
    (command): command is Extract<DrawCommand, { readonly kind: K }> =>
      command.kind === kind && command.color === color,
  );
}

/** Returns a frame's plates, in the order drawn, each its commands from its gap, a polygon in the face's color, to the next plate's. */
function platesIn(frame: ArtFrame): readonly (readonly DrawCommand[])[] {
  const gaps = frame.commands.flatMap((command, i) =>
    command.kind === "polygon" && command.color === face ? [i] : [],
  );
  return gaps.map((gap, i) => frame.commands.slice(gap, gaps[i + 1]));
}

/** Returns a point to a billionth of a pixel, as {@link billionths} does a number. */
function pointInBillionths({ x, y }: Point): Point {
  return { x: billionths(x), y: billionths(y) };
}

/** Returns the area a polygon's outline encloses, which takes its points in order round it. */
function areaOf(points: readonly Point[]): number {
  return Math.abs(
    points.reduce((sum, point, i) => {
      const next = itemAt(points, (i + 1) % points.length);
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
}

/** Returns whether a point lies on a polygon's outline, give or take a rounding. */
function onOutline(point: Point, outline: readonly Point[]): boolean {
  return outline.some(
    (from, i) =>
      distanceToSegment(
        point,
        from,
        itemAt(outline, (i + 1) % outline.length),
      ) < 1e-9,
  );
}

/** Turns a point of a cell of 62 device pixels from the floorward plate's place to each side's: a quarter turn clockwise to the left's, three to the right's. */
const TO_SIDES: readonly ((point: Point) => Point)[] = [
  ({ x, y }) => ({ x: 62 - y, y: x }),
  ({ x, y }) => ({ x: y, y: 62 - x }),
];

/** Returns a point turned a half turn about the middle of a cell of 62 device pixels. */
function halfTurned({ x, y }: Point): Point {
  return { x: 62 - x, y: 62 - y };
}

/** Returns a plate's command turned a half turn about the middle of a cell of 62 device pixels: its points, its area or its middle. */
function halfTurnedCommand(command: DrawCommand): DrawCommand {
  switch (command.kind) {
    case "polygon":
      return { ...command, points: command.points.map(halfTurned) };
    case "roundRect":
      return {
        ...command,
        x: 62 - command.x - command.width,
        y: 62 - command.y - command.height,
      };
    case "circle":
      return { ...command, ...halfTurned(command) };
    default:
      return command;
  }
}

/** The teeth of the plate toward the floor at 31 CSS pixels a unit, 2 device pixels to one, each from its left foot, by its tip, to its right, its feet in its bar, 0.01 of the cell over the bar's foot. */
const FLOORWARD_TEETH: readonly (readonly Point[])[] = Array.from(
  { length: 6 },
  (_, i) => {
    const pitch = ((0.91 - 0.09) * 62) / 6;
    const left = 0 + 0.09 * 62 + pitch * i + 0.012 * 62;
    const right = 0 + 0.09 * 62 + pitch * (i + 1) - 0.012 * 62;
    const foot = 56 - (0.1 - 0.09) * 62;
    return [
      { x: left, y: foot },
      { x: (left + right) / 2, y: 62 - 0.006 * 62 },
      { x: right, y: foot },
    ];
  },
);

describe("PLATED_ART", () => {
  it.each([
    [FLOORWARD, 1, "plated-floorward-1"],
    [FLOORWARD, 2, "plated-floorward-2"],
    [FLOORWARD, 3, "plated-floorward-3"],
    [FLOORWARD | LEFT | RIGHT, 2, "plated-floorward-sides-2"],
    [CEILINGWARD, 2, "plated-ceilingward-2"],
    [CEILINGWARD, 1, "plated-ceilingward-1"],
  ])(
    "shows a brick plated on faces %i with %i hits left as the orange tile under its plates and pips, %s",
    (plates, hits, frame) => {
      expect(PLATED_ART.layersOf(plated(plates, hits))).toEqual([
        FRAMES.tile(1),
        frame,
      ]);
    },
  );

  it("makes nothing to find a plated brick's layers, handing back the list it made once", () => {
    expect(PLATED_ART.layersOf(plated(FLOORWARD | LEFT | RIGHT, 2))).toBe(
      PLATED_ART.layersOf(plated(FLOORWARD | LEFT | RIGHT, 2)),
    );
  });

  it.each([0, LEFT, LEFT | RIGHT, FLOORWARD | CEILINGWARD, CEILINGWARD | LEFT])(
    "refuses a brick plated on faces %i, which no level plates",
    (plates) => {
      expect(() => PLATED_ART.layersOf(plated(plates, 2))).toThrow(RangeError);
    },
  );

  it.each([0, 4])("refuses a plated brick with %i hits left", (hits) => {
    expect(() => PLATED_ART.layersOf(plated(FLOORWARD, hits))).toThrow(
      RangeError,
    );
  });

  it.each(THEMES)(
    "stands its plates on the tile whose ink is a plated brick's body in $name",
    ({ id, mode }) => {
      const palette = wallPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);

      expect(inkAt(palette.tints, PLATED_TINT)).toBe(palette.kinds.plated.body);
    },
  );

  it("brings a frame for each plating at each of its hits left to the atlas, by plating, then hits", () => {
    expect(
      PLATED_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(
      ["floorward", "floorward-sides", "ceilingward"].flatMap((plating) =>
        [1, 2, 3].map((hits) => `plated-${plating}-${String(hits)}`),
      ),
    );
  });

  it.each(["floorward", "floorward-sides", "ceilingward"] as const)(
    "shows a %s plated brick's plates alone with a hit left, no pips",
    (plating) => {
      expect(drawnIn(platedIn(plating, 1), "circle", OWN_INKS.mark)).toEqual(
        [],
      );
    },
  );

  it.each([
    ["floorward", 2, 0.415, 0.19, 0.066],
    ["floorward", 3, 0.415, 0.19, 0.066],
    ["floorward-sides", 2, 0.415, 0.145, 0.06],
    ["floorward-sides", 3, 0.415, 0.145, 0.06],
    ["ceilingward", 2, 0.57, 0.19, 0.066],
    ["ceilingward", 3, 0.57, 0.19, 0.066],
  ] as const)(
    "cuts a %s plated brick's %i pips out in the marks' color first, clear of its plates, about %f of the cell down, %f of it apart and %f of it round",
    (plating, hits, down, step, radius) => {
      const pips = diePips(
        hits,
        { x: 0 + 0.5 * 62, y: 0 + down * 62 },
        step * 62,
        radius * 62,
        { color: OWN_INKS.mark },
      );

      expect(platedIn(plating, hits).commands.slice(0, hits)).toEqual(pips);
    },
  );

  it("leaves its rivets out and draws half as many teeth, across the same span, at 29 CSS pixels a unit, where 31 shows them all", () => {
    const counts = (frame: ArtFrame) => {
      const teeth = shapesIn(frame.commands, "polygon", glyph);
      return {
        rivets: shapesIn(frame.commands, "circle", face).length,
        teeth: teeth.length,
        span: [teeth[0]?.points[0]?.x, teeth.at(-1)?.points[2]?.x].map((x) =>
          billionths((x ?? NaN) / frame.width),
        ),
      };
    };

    expect({
      29: counts(platedIn("floorward", 1, SMALL)),
      31: counts(platedIn("floorward", 1)),
    }).toEqual({
      29: { rivets: 0, teeth: 3, span: [0.102, 0.898] },
      31: { rivets: 2, teeth: 6, span: [0.102, 0.898] },
    });
  });
});

describe("a plated brick's plate toward the floor at 31 CSS pixels a unit, 2 to one", () => {
  const frame = platedIn("floorward", 1);
  const cell = cellOf(ART_SCALE);

  it("lays a gap of its own face's color over the tile's bottom, from 0.265 of the cell up, on a whole pixel, round the tile's corners in order, and no further", () => {
    const [gap] = shapesIn(frame.commands, "polygon", face);
    const body = tileBody(cell);
    const corner = tileRadius(cell);
    // The tile's rounded square past the gap's edge, but for its corners.
    const covered = body.width * (body.y + body.height - 46);
    const corners = 2 * (1 - Math.PI / 4) * corner ** 2;

    expect({
      extent: gap && inBillionths(extentOf(gap)),
      edge: [gap?.points[0], gap?.points.at(-1)].map(
        (point) => point && pointInBillionths(point),
      ),
      off: gap?.points
        .slice(1, -1)
        .filter(
          (point) => billionths(pastRoundRect(point, body, corner)) !== 0,
        ),
      // Within a square pixel of it, as the points round each corner cut
      // their chords across it.
      area: Math.abs(areaOf(gap?.points ?? []) - (covered - corners)) < 1,
    }).toEqual({
      extent: { x: 2, y: 46, width: 58, height: 14 },
      edge: [
        { x: 60, y: 46 },
        { x: 2, y: 46 },
      ],
      off: [],
      area: true,
    });
  });

  it("stands a bar in its glyph's color on the gap, on whole pixels, six teeth pointing down out of it and two rivets cut out of it in its face's color, after the gap", () => {
    expect(frame.commands.slice(1)).toEqual([
      roundRect({ x: 1, y: 48, width: 60, height: 8 }, 0.04 * 62, {
        color: glyph,
      }),
      ...FLOORWARD_TEETH.map((points) => polygon(points, { color: glyph })),
      circle({ x: 0.14 * 62, y: 62 - 0.16 * 62 }, 0.032 * 62, { color: face }),
      circle({ x: 0.86 * 62, y: 62 - 0.16 * 62 }, 0.032 * 62, { color: face }),
    ]);
  });

  it("plates a face toward the ceiling with it turned a half turn, its gap, bar, teeth and rivets", () => {
    expect(platedIn("ceilingward", 1).commands).toEqual(
      frame.commands.map(halfTurnedCommand),
    );
  });
});

describe.each(PIXEL_RATIOS)(
  "a plated brick's plate toward the floor at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    it("keeps a pixel of its gap over its bar, the two on whole pixels, and stands each tooth's feet in the bar", () => {
      const breaking = everyScale(pixelRatio)
        .filter((scale) => {
          const { commands } = platedIn("floorward", 1, scale);
          const edge = shapesIn(commands, "polygon", face)[0]?.points[0]?.y;
          const [bar] = shapesIn(commands, "roundRect", glyph);
          const top = bar?.y ?? NaN;
          const foot = top + (bar?.height ?? NaN);
          return !(
            edge !== undefined &&
            [edge, top, foot].every(Number.isInteger) &&
            top >= edge + 1 &&
            shapesIn(commands, "polygon", glyph).every(({ points }) =>
              [points[0], points[2]].every(
                (point) => point && point.y > top && point.y < foot,
              ),
            )
          );
        })
        .map(({ unit }) => unit);

      expect(breaking).toEqual([]);
    });
  },
);

describe("a brick plated on its sides and toward the floor", () => {
  it.each([50, 75, 100, 128])(
    "plates its sides before its floorward face, each gap's inner edge 0.265 of the cell in from its face's edge, on a whole pixel, from the tile's one side to its other, at %i device pixels a unit",
    (unit) => {
      const gap = Math.round(0.265 * unit);
      const tile = Math.round(0.04 * unit);

      expect(
        platesIn(platedIn("floorward-sides", 1, { unit, pixelRatio: 2 })).map(
          ([edge]) =>
            edge?.kind === "polygon"
              ? [edge.points[0], edge.points.at(-1)].map(
                  (point) => point && pointInBillionths(point),
                )
              : [],
        ),
      ).toEqual([
        [
          { x: gap, y: unit - tile },
          { x: gap, y: tile },
        ],
        [
          { x: unit - gap, y: tile },
          { x: unit - gap, y: unit - tile },
        ],
        [
          { x: unit - tile, y: unit - gap },
          { x: tile, y: unit - gap },
        ],
      ]);
    },
  );

  it.each([50, 75, 100, 128])(
    "lays each bar's edges on whole pixels, 0.09 to 0.23 of the cell in from its face's edge, its ends as far in from the cell's other edges as each other, but a side's end toward the floor, which runs on under the floorward gap by its corners' radius, at %i device pixels a unit",
    (unit) => {
      const ends = Math.round(0.02 * unit);
      const near = Math.round(0.09 * unit);
      const far = Math.round(0.23 * unit);
      const under = billionths(unit - Math.round(0.265 * unit) + 0.04 * unit);

      expect(
        platesIn(platedIn("floorward-sides", 1, { unit, pixelRatio: 2 })).map(
          (plate) =>
            shapesIn(plate, "roundRect", glyph).map((bar) =>
              [bar.x, bar.y, bar.x + bar.width, bar.y + bar.height].map(
                billionths,
              ),
            ),
        ),
      ).toEqual([
        [[near, ends, far, under]],
        [[unit - far, ends, unit - near, under]],
        [[ends, unit - far, unit - ends, unit - near]],
      ]);
    },
  );

  it.each([
    [31, ART_SCALE, 5, 46],
    [29, SMALL, 3, 43],
  ] as const)(
    "cuts its sides' teeth at the floorward gap's inner edge at %i CSS pixels a unit, so none shows past the tile under it, %i each, the last cut at %i",
    (_, scale, teeth, edge) => {
      const sides = platesIn(platedIn("floorward-sides", 1, scale)).slice(0, 2);

      expect(
        sides.map((plate) => {
          const steel = shapesIn(plate, "polygon", glyph);
          return {
            teeth: steel.length,
            lowest: Math.max(
              ...steel.flatMap(({ points }) => points.map(({ y }) => y)),
            ),
          };
        }),
      ).toEqual([
        { teeth, lowest: edge },
        { teeth, lowest: edge },
      ]);
    },
  );

  it("draws its sides' teeth as the floorward plate's turned to each side, the one the floorward gap's inner edge crosses cut along its own sides", () => {
    const floorward = shapesIn(
      platedIn("floorward", 1).commands,
      "polygon",
      glyph,
    );
    const sides = platesIn(platedIn("floorward-sides", 1)).slice(0, 2);

    expect(
      sides.flatMap((plate, side) => {
        const outlines = floorward.map(({ points }) =>
          points.map(itemAt(TO_SIDES, side)),
        );
        return shapesIn(plate, "polygon", glyph).flatMap(({ points }) =>
          points.filter(
            (point) => !outlines.some((outline) => onOutline(point, outline)),
          ),
        );
      }),
    ).toEqual([]);
  });

  it("keeps each side's rivet toward the ceiling, leaving out the one under the floorward gap", () => {
    expect(
      platesIn(platedIn("floorward-sides", 1)).map((plate) =>
        shapesIn(plate, "circle", face).map(({ x, y }) => ({
          x: billionths(x),
          y: billionths(y),
        })),
      ),
    ).toEqual([
      [{ x: billionths(0.16 * 62), y: billionths(0.14 * 62) }],
      [{ x: billionths(62 - 0.16 * 62), y: billionths(0.14 * 62) }],
      [
        { x: billionths(0.14 * 62), y: billionths(62 - 0.16 * 62) },
        { x: billionths(0.86 * 62), y: billionths(62 - 0.16 * 62) },
      ],
    ]);
  });
});

describe("a plated brick at every unit from 1 to 16 device pixels, too few to be detailed", () => {
  const scales = Array.from({ length: 16 }, (_, i) => ({
    unit: i + 1,
    pixelRatio: 1,
  }));

  it("keeps each plate's bar within its cell, the floorward bar's foot 0.09 of the cell up from its bottom, rounded, and its top no lower", () => {
    const breaking = scales
      .filter(({ unit, pixelRatio }) => {
        const [floorward] = shapesIn(
          platedIn("floorward", 1, { unit, pixelRatio }).commands,
          "roundRect",
          glyph,
        );
        return (
          floorward === undefined ||
          floorward.y + floorward.height !== unit - Math.round(0.09 * unit) ||
          PLATINGS.some((plating) =>
            shapesIn(
              platedIn(plating, 1, { unit, pixelRatio }).commands,
              "roundRect",
              glyph,
            ).some(
              ({ x, y, width, height }) =>
                x < 0 || y < 0 || x + width > unit || y + height > unit,
            ),
          )
        );
      })
      .map(({ unit }) => unit);

    expect(breaking).toEqual([]);
  });

  it("keeps its plates' gaps within the tile's rounded square", () => {
    const breaking = scales
      .filter((scale) => {
        const cell = cellOf(scale);
        const body = tileBody(cell);
        const corner = tileRadius(cell);
        return PLATED_ART.frames(OWN_INKS, scale).some(({ commands }) =>
          commands.some(
            (command) =>
              command.color === face &&
              reachPastRoundRect(command, body, corner) > 1e-9,
          ),
        );
      })
      .map(({ unit }) => unit);

    expect(breaking).toEqual([]);
  });
});
