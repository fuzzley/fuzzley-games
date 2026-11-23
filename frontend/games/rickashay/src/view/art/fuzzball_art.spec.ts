import { RADIUS } from "@fz/brick-wall/rules/field";
import {
  FUZZBALL_STRANDS,
  type Strand,
  combedStrands,
  fuzzballCommands,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type LineCommand,
  type Point,
  extentOf,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  distanceToSegment,
  pointInBillionths,
} from "../../testing/art_frames";
import { FRAMES, FURS, type Fur } from "./frames";
import { furAt, fuzzballFrames, fuzzballGrid } from "./fuzzball_art";

/** How far apart two points worked out alike may lie, for a rounding, in device pixels. */
const SLACK = 1e-9;

/** The fuzzball's frames in the specs' palette, at their scale. */
const FUZZBALLS = fuzzballFrames(ART_PALETTE, ART_SCALE);

/** The fur the art combs at each lift, as `fuzzballAt()` does: as it grew, half way to standing on end, and on end. */
const ART_FUR: readonly (readonly [Fur, readonly Strand[]])[] = [
  [0, FUZZBALL_STRANDS],
  [1, combedStrands(0.5)],
  [2, combedStrands(1)],
  [3, combedStrands(1)],
];

/** The art's sparks: which way each lies from the body's middle, in degrees clockwise from its right, and how far out it starts, on the fuzzball's grid. */
const ART_SPARKS = [
  { turn: -58, from: 16.4 },
  { turn: 8, from: 17 },
  { turn: 62, from: 16.4 },
  { turn: 148, from: 17 },
  { turn: 212, from: 16.4 },
] as const;

/** Returns the lines a frame draws in a color, each with its ends. */
function linesIn(frame: ArtFrame, color: number): readonly LineCommand[] {
  return frame.commands.flatMap((command) =>
    command.kind === "line" && command.color === color ? [command] : [],
  );
}

/** Returns the body of a fuzzball's frame: its first circle in a color. */
function bodyIn(frame: ArtFrame, color: number): DrawCommand | undefined {
  return drawnIn(frame, "circle", color)[0];
}

/** Returns where the middle of a command lies from its frame's middle, to a billionth. */
function aboutMiddle(frame: ArtFrame, command: DrawCommand): Point {
  const { x, y, width, height } = extentOf(command);
  return pointInBillionths({
    x: x + width / 2 - frame.width / 2,
    y: y + height / 2 - frame.height / 2,
  });
}

/** Returns the outline's width round a fuzzball's frame: how much wider its first circle, in the mark, is than its body. */
function outlineOf(frame: ArtFrame, color: number): number {
  const [outline] = frame.commands;
  const body = bodyIn(frame, color);
  return outline?.kind === "circle" &&
    outline.color === ART_PALETTE.mark &&
    body?.kind === "circle"
    ? outline.radius - body.radius
    : NaN;
}

/**
 * Returns a point of a frame on the fuzzball's grid about the body's
 * middle, its frame's, turned back by degrees, to a billionth.
 */
function onGrid(frame: ArtFrame, { x, y }: Point, degrees: number): Point {
  const by = fuzzballGrid(ART_SCALE);
  const across = (x - frame.width / 2) / by;
  const down = (y - frame.height / 2) / by;
  const cos = Math.cos((degrees * Math.PI) / 180);
  const sin = Math.sin((degrees * Math.PI) / 180);
  return pointInBillionths({
    x: across * cos + down * sin,
    y: down * cos - across * sin,
  });
}

/**
 * Returns how far a line drawn in a frame lies from one drawn about the
 * body's middle, at the further of its ends, in device pixels.
 */
function offBy(drawn: LineCommand, about: LineCommand, middle: Point): number {
  return Math.max(
    Math.hypot(
      drawn.from.x - middle.x - about.from.x,
      drawn.from.y - middle.y - about.from.y,
    ),
    Math.hypot(
      drawn.to.x - middle.x - about.to.x,
      drawn.to.y - middle.y - about.to.y,
    ),
  );
}

describe("furAt", () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [24, 1],
    [25, 2],
    [44, 2],
    [45, 3],
    [162, 3],
  ])("lifts the fur at a rally of %i to %i", (rally, fur) => {
    expect(furAt(rally)).toBe(fur);
  });
});

describe("fuzzballGrid", () => {
  it("draws the fuzzball's grid 0.8 units wide, as the art does", () => {
    expect(fuzzballGrid({ unit: 40, pixelRatio: 1 }) * 32).toBe(32);
  });

  it("draws the fuzzball's body within a twentieth of its radius", () => {
    const body = bodyIn(
      frameNamed(FUZZBALLS, FRAMES.fuzzball(0)),
      ART_PALETTE.fuzzball,
    );
    const radius = body?.kind === "circle" ? body.radius : NaN;

    expect(Math.abs(radius / ART_SCALE.unit - RADIUS)).toBeLessThan(
      RADIUS / 20,
    );
  });
});

describe("fuzzballFrames", () => {
  it("draws a frame for each lift of the fur, in order", () => {
    expect(FUZZBALLS.map(({ name }) => name)).toEqual(
      FURS.map((fur) => FRAMES.fuzzball(fur)),
    );
  });

  describe.each(ART_FUR)(
    "the fuzzball with its fur at lift %i",
    (fur, strands) => {
      const frame = frameNamed(FUZZBALLS, FRAMES.fuzzball(fur));

      it("draws its body in the palette's fuzzball color, at its frame's middle", () => {
        const body = bodyIn(frame, ART_PALETTE.fuzzball);

        expect(body && aboutMiddle(frame, body)).toEqual({ x: 0, y: 0 });
      });

      it("outlines it in the mark first, two device pixels wider at 31 CSS pixels a unit", () => {
        expect(outlineOf(frame, ART_PALETTE.fuzzball)).toBe(2);
      });

      it("draws its fur as the art combs it at that lift, give or take a rounding", () => {
        const fur = fuzzballCommands(fuzzballGrid(ART_SCALE), {
          color: ART_PALETTE.fuzzball,
          fur: strands,
        }).flatMap((command) => (command.kind === "line" ? [command] : []));
        const drawn = linesIn(frame, ART_PALETTE.fuzzball);
        const middle = { x: frame.width / 2, y: frame.height / 2 };

        const astray = fur.filter((line, i) => {
          const at = drawn[i];
          return at === undefined || offBy(at, line, middle) > SLACK;
        });

        expect({ lines: drawn.length, astray }).toEqual({
          lines: fur.length,
          astray: [],
        });
      });
    },
  );

  it("outlines the fuzzball a CSS pixel wide at least: 3 device pixels at 24 CSS pixels a unit, 3 to one", () => {
    const frame = frameNamed(
      fuzzballFrames(ART_PALETTE, { unit: 72, pixelRatio: 3 }),
      FRAMES.fuzzball(0),
    );

    expect(outlineOf(frame, ART_PALETTE.fuzzball)).toBe(3);
  });

  it.each([0, 1, 2] as const)(
    "draws no sparks at lift %i, nor anything in the mark but its outline",
    (fur) => {
      const frame = frameNamed(FUZZBALLS, FRAMES.fuzzball(fur));
      const inColor = (color: number): number =>
        frame.commands.filter((command) => command.color === color).length;

      expect({
        sparks: inColor(ART_PALETTE.spark),
        // The outline is the body and fur drawn wider, a command for each.
        marks: inColor(ART_PALETTE.mark),
      }).toEqual({ sparks: 0, marks: inColor(ART_PALETTE.fuzzball) });
    },
  );

  it("sparks at the last lift: five zigzags in the palette's spark, each of three lines", () => {
    const frame = frameNamed(FUZZBALLS, FRAMES.fuzzball(3));

    expect({
      lines: linesIn(frame, ART_PALETTE.spark).length,
      corners: drawnIn(frame, "circle", ART_PALETTE.spark).length,
    }).toEqual({ lines: 15, corners: 20 });
  });

  it("draws each spark as the art's zigzag, in its place round the body", () => {
    const frame = frameNamed(FUZZBALLS, FRAMES.fuzzball(3));
    const lines = linesIn(frame, ART_PALETTE.spark);

    const sparks = ART_SPARKS.map(({ turn }, i) =>
      [
        lines[3 * i]?.from,
        ...lines.slice(3 * i, 3 * i + 3).map(({ to }) => to),
      ].map((point) => point && onGrid(frame, point, turn)),
    );

    expect(sparks).toEqual(
      ART_SPARKS.map(({ from }) =>
        [
          { x: from, y: -0.4 },
          { x: from + 1.7, y: -1.5 },
          { x: from + 1.5, y: 1.1 },
          { x: from + 3.6, y: 0 },
        ].map(pointInBillionths),
      ),
    );
  });

  it.each([
    { scale: ART_SCALE, width: 2 },
    { scale: { unit: 128, pixelRatio: 1 }, width: 3 },
  ])(
    "draws its sparks a unit of its grid wide, a CSS pixel at least: $width device pixels at $scale.unit a unit, $scale.pixelRatio to a CSS pixel",
    ({ scale, width }) => {
      const frame = frameNamed(
        fuzzballFrames(ART_PALETTE, scale),
        FRAMES.fuzzball(3),
      );

      expect(
        new Set(linesIn(frame, ART_PALETTE.spark).map((line) => line.width)),
      ).toEqual(new Set([width]));
    },
  );

  it("outlines the sparks as one with the fuzzball, every outline under every spark", () => {
    const frame = frameNamed(FUZZBALLS, FRAMES.fuzzball(3));
    const at = (color: number): readonly number[] =>
      frame.commands.flatMap((command, i) =>
        command.color === color ? [i] : [],
      );

    expect(Math.max(...at(ART_PALETTE.mark))).toBeLessThan(
      Math.min(...at(ART_PALETTE.spark)),
    );
  });

  describe.each<ArtScale>([
    ...PIXEL_RATIOS.map((pixelRatio) => ({
      unit: 24 * pixelRatio,
      pixelRatio,
    })),
    ART_SCALE,
    { unit: 128, pixelRatio: 1 },
  ])(
    "at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
    (scale) => {
      const frame = frameNamed(
        fuzzballFrames(ART_PALETTE, scale),
        FRAMES.fuzzball(3),
      );

      it("keeps the last lift's sparks clear of its fur", () => {
        const fur = linesIn(frame, ART_PALETTE.fuzzball);
        const touching = linesIn(frame, ART_PALETTE.spark).filter((spark) =>
          Array.from({ length: 21 }, (_, i) => ({
            x: spark.from.x + ((spark.to.x - spark.from.x) * i) / 20,
            y: spark.from.y + ((spark.to.y - spark.from.y) * i) / 20,
          })).some((point) =>
            fur.some(
              (strand) =>
                distanceToSegment(point, strand.from, strand.to) <=
                (strand.width + spark.width) / 2,
            ),
          ),
        );

        expect(touching).toEqual([]);
      });
    },
  );
});
