import { cellArea } from "@fz/brick-wall/view/art";
import { mixColors } from "@fz/phaser/color";
import type {
  Area,
  ArtFrame,
  ArtScale,
  CircleCommand,
  Point,
  PolygonCommand,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { RADIUS } from "@fz/brick-wall/rules/field";
import { LEGEND } from "../../../rules/levels/legend";
import { STAND_OFF } from "../../../rules/tuning";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  pastOutline,
  pointInBillionths,
  scalesAt,
} from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { FRAMES, RAMP_CORNERS, type RampCorner } from "../frames";
import { tileBody } from "./brick";
import { RAMP_ART } from "./ramp";

const { steel, mark } = ART_PALETTE;

/** The bright edge's color: the steel, 0.42 white. */
const BRIGHT = mixColors(0xffffff, steel, 0.42);

/** How long the flat that cuts a ramp's point square is, as a share of its cell: as long as the flat a flight turns off there. */
const TIP = STAND_OFF - RADIUS;

/** How far a point may stray past a line and still pass, for a rounding. */
const SLACK = 1e-9;

/** A ramp, which takes no hits, its right angle in the corner its plates name. */
function rampOf(plates: number): KindLook {
  return { tint: 0, hits: 0, full: 0, plates };
}

/** Returns a ramp's frame for a corner at a scale. */
function rampAt(corner: RampCorner, scale: ArtScale): ArtFrame {
  return frameNamed(RAMP_ART.frames(ART_PALETTE, scale), FRAMES.ramp(corner));
}

/** Returns the one polygon a frame fills in a color, failing the spec where there is none. */
function polygonIn(frame: ArtFrame, color: number): PolygonCommand {
  const [shape] = drawnIn(frame, "polygon", color);
  if (shape?.kind !== "polygon") throw new Error(`No polygon in ${frame.name}`);
  return shape;
}

/** Returns the bright edges a frame fills: one, or none where none fits. */
function edgesIn(frame: ArtFrame): readonly PolygonCommand[] {
  return frame.commands.filter(
    (command): command is PolygonCommand =>
      command.kind === "polygon" && command.color === BRIGHT,
  );
}

/** Returns the rivets a frame cuts out in the marks' color. */
function rivetsIn(frame: ArtFrame): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === mark,
  );
}

/** Returns a cell's floorward left ramp's outline, clockwise from its upper point, as the art lays it in its tile's body: the points cut square, the right angle cut 0.11 along each side. */
function wedgeIn(cell: Area): readonly Point[] {
  const { x, y, width, height } = tileBody(cell);
  const tip = TIP * cell.width;
  const cut = 0.11 * cell.width;
  return [
    { x, y },
    { x: x + tip, y },
    { x: x + width, y: y + height - tip },
    { x: x + width, y: y + height },
    { x: x + cut, y: y + height },
    { x, y: y + height - cut },
  ];
}

/** Returns how far in from a floorward left ramp's outline in a cell its bright edge lies, at the least: no way in where it has none. */
function rimOf(frame: ArtFrame, cell: Area): number {
  return Math.min(
    Infinity,
    ...edgesIn(frame).flatMap(({ points }) =>
      points.map((point) => -pastOutline(point, wedgeIn(cell))),
    ),
  );
}

/** Returns how far a point lies in from a floorward left ramp's long face in a cell, toward its right angle. */
function inFromFace(point: Point, cell: Area): number {
  const { x, y } = tileBody(cell);
  return (TIP * cell.width - (point.x - x) + (point.y - y)) / Math.SQRT2;
}

/** Returns how far in from a floorward left ramp's long face in a cell its bright edge reaches, at most: no way in where it has none. */
function edgeDepth(frame: ArtFrame, cell: Area): number {
  return Math.max(
    -Infinity,
    ...edgesIn(frame).flatMap(({ points }) =>
      points.map((point) => inFromFace(point, cell)),
    ),
  );
}

/** Returns the corners of an area, clockwise from its top left. */
function cornersOf({ x, y, width, height }: Area): readonly Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/** Returns the points each of a frame's shapes is laid out by, in order: a polygon's own, and a circle's middle, each to a billionth. */
function placesIn(frame: ArtFrame): readonly (readonly Point[])[] {
  return frame.commands.map((command) => {
    switch (command.kind) {
      case "polygon":
        return command.points.map(pointInBillionths);
      case "circle":
        return [pointInBillionths(command)];
      default:
        throw new Error(`A ramp draws no ${command.kind}`);
    }
  });
}

describe("RAMP_ART's layers", () => {
  it.each([
    ["L", "floorward-left"],
    ["J", "floorward-right"],
    ["F", "ceilingward-left"],
    ["7", "ceilingward-right"],
  ] as const)(
    "shows a ramp written %s as the frame for its corner, %s",
    (character, corner) => {
      expect(RAMP_ART.layersOf(rampOf(LEGEND[character].plates))).toEqual([
        FRAMES.ramp(corner),
      ]);
    },
  );

  it("finds a ramp's layers without making them", () => {
    const ramp = rampOf(LEGEND.F.plates);

    expect(RAMP_ART.layersOf(ramp)).toBe(RAMP_ART.layersOf(ramp));
  });
});

describe("RAMP_ART's frames", () => {
  const cell = cellArea(ART_SCALE);
  const lowLeft = rampAt("floorward-left", ART_SCALE);

  it("brings a frame for each corner, each a cell", () => {
    expect(
      RAMP_ART.frames(ART_PALETTE, ART_SCALE).map(({ name, width, height }) => [
        name,
        width,
        height,
      ]),
    ).toEqual(RAMP_CORNERS.map((corner) => [FRAMES.ramp(corner), 62, 62]));
  });

  it("draws a wedge of steel over half its tile's body, its points cut square and its right angle cut as a tile's corner", () => {
    expect(polygonIn(lowLeft, steel).points.map(pointInBillionths)).toEqual(
      [
        { x: 2, y: 2 },
        { x: 2 + TIP * 62, y: 2 },
        { x: 60, y: 60 - TIP * 62 },
        { x: 60, y: 60 },
        { x: 8.82, y: 60 },
        { x: 2, y: 53.18 },
      ].map(pointInBillionths),
    );
  });

  it.each([
    ["floorward-right", true, false],
    ["ceilingward-left", false, true],
    ["ceilingward-right", true, true],
  ] as const)(
    "draws the %s ramp as the floorward left one mirrored",
    (corner, across, down) => {
      const mirrored = ({ x, y }: Point): Point =>
        pointInBillionths({ x: across ? 62 - x : x, y: down ? 62 - y : y });

      expect(placesIn(rampAt(corner, ART_SCALE))).toEqual(
        placesIn(lowLeft).map((points) => points.map(mirrored)),
      );
    },
  );

  it("lays its bright edge along its long face, 0.42 white over the steel, 0.1 of its cell deep inside a rim of steel 2 pixels wide", () => {
    expect([
      billionths(rimOf(lowLeft, cell)),
      billionths(edgeDepth(lowLeft, cell)),
    ]).toEqual([2, 8.2]);
  });

  it("lays its bright edge out as its wedge drawn in 2 pixels all round, cut 8.2 pixels in from its long face", () => {
    // Where the edge's two long sides lie, as x less y: the long face lies
    // at TIP of the cell, and they lie 2 pixels and 8.2 in from it, square
    // to it.
    const rimLine = TIP * 62 - 2 * Math.SQRT2;
    const edgeLine = TIP * 62 - 8.2 * Math.SQRT2;

    expect(
      edgesIn(lowLeft).map(({ points }) => points.map(pointInBillionths)),
    ).toEqual([
      [
        { x: 4, y: 4 },
        { x: 4 + rimLine, y: 4 },
        { x: 58, y: 58 - rimLine },
        { x: 58, y: 58 },
        { x: 58 + edgeLine, y: 58 },
        { x: 4, y: 4 - edgeLine },
      ].map(pointInBillionths),
    ]);
  });

  it("widens the rim to 0.03 of a unit, in whole pixels, where that is more than a CSS pixel: 4 at 128 pixels a unit", () => {
    const scale = { unit: 128, pixelRatio: 2 };

    expect(
      billionths(rimOf(rampAt("floorward-left", scale), cellArea(scale))),
    ).toBe(4);
  });

  it("cuts three rivets out in the marks' color along its short sides", () => {
    expect(rivetsIn(lowLeft)).toMatchObject([
      { x: 0.18 * 62, y: 0.6 * 62, radius: 0.04 * 62 },
      { x: 0.18 * 62, y: 0.82 * 62, radius: 0.04 * 62 },
      { x: 0.4 * 62, y: 0.82 * 62, radius: 0.04 * 62 },
    ]);
  });

  it("leaves out its rivets at 29 CSS pixels a unit, too small for them", () => {
    expect(
      rivetsIn(rampAt("floorward-left", { unit: 58, pixelRatio: 2 })),
    ).toEqual([]);
  });

  it("leaves out its bright edge at a scale too small for any of it inside the rim", () => {
    expect(
      edgesIn(rampAt("floorward-left", { unit: 4, pixelRatio: 1 })),
    ).toEqual([]);
  });
});

describe.each(PIXEL_RATIOS)(
  "RAMP_ART's floorward left frame at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const frames = scalesAt(pixelRatio).map((scale) => ({
      scale,
      cell: cellArea(scale),
      frame: rampAt("floorward-left", scale),
    }));

    // A ramp stands on no tile, so its points reach the square corners of
    // the body a tile's corners are cut from.
    it("draws its wedge within its tile's body", () => {
      const past = frames.flatMap(({ scale, cell, frame }) =>
        polygonIn(frame, steel).points.some(
          (point) => pastOutline(point, cornersOf(tileBody(cell))) > SLACK,
        )
          ? [scale.unit]
          : [],
      );

      expect(past).toEqual([]);
    });

    it("keeps its bright edge inside a rim of steel a CSS pixel wide at least", () => {
      const touching = frames.flatMap(({ scale, cell, frame }) =>
        edgesIn(frame).some(({ points }) =>
          points.some(
            (point) => pastOutline(point, wedgeIn(cell)) > SLACK - pixelRatio,
          ),
        )
          ? [scale.unit]
          : [],
      );

      expect(touching).toEqual([]);
    });

    it("keeps its rivets a CSS pixel inside its wedge at least, and off its bright edge", () => {
      const off = frames.flatMap(({ scale, cell, frame }) =>
        rivetsIn(frame).some(
          (rivet) =>
            pastOutline(rivet, wedgeIn(cell)) + rivet.radius >
              SLACK - pixelRatio ||
            inFromFace(rivet, cell) - rivet.radius <
              edgeDepth(frame, cell) - SLACK,
        )
          ? [scale.unit]
          : [],
      );

      expect(off).toEqual([]);
    });
  },
);
