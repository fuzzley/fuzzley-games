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
import {
  bodyFrameOf,
  furAt,
  fuzzballFrames,
  fuzzballGrid,
} from "./fuzzball_art";

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

/** Returns the radius of a fuzzball's body, its first circle in a color, failing the spec where it has none. */
function bodyRadius(frame: ArtFrame, color: number): number {
  const body = bodyIn(frame, color);
  if (body?.kind !== "circle") {
    throw new Error(`${frame.name} has no body in ${color.toString(16)}`);
  }
  return body.radius;
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

/** The art's tongues of flame: which way each points, how far out its tip is, its width and its lean, on the fuzzball's grid. */
const ART_FLAMES = [
  { turn: -129, to: 20, width: 8.6, lean: 3 },
  { turn: -104, to: 24, width: 9.6, lean: 1.2 },
  { turn: -78, to: 21.6, width: 9, lean: -2.6 },
  { turn: -53, to: 19.2, width: 8.2, lean: -3 },
] as const;

describe("bodyFrameOf", () => {
  it.each(FURS)(
    "draws a fuzzball with its fur at lift %i in its frame",
    (fur) => {
      expect(bodyFrameOf({ hot: false, fur })).toBe(FRAMES.fuzzball(fur));
    },
  );

  it.each(FURS)(
    "draws a hot shot red-hot under its crown of flame, whatever its fur, as at lift %i",
    (fur) => {
      expect(bodyFrameOf({ hot: true, fur })).toBe(FRAMES.hotShot);
    },
  );
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
  it("draws a frame for each lift of the fur, in order, then the hot shot and the yawn", () => {
    expect(FUZZBALLS.map(({ name }) => name)).toEqual([
      ...FURS.map((fur) => FRAMES.fuzzball(fur)),
      FRAMES.hotShot,
      FRAMES.yawn,
    ]);
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
  describe("the hot shot", () => {
    const frame = frameNamed(FUZZBALLS, FRAMES.hotShot);
    const onEnd = frameNamed(FUZZBALLS, FRAMES.fuzzball(2));

    it("draws the fuzzball red-hot, its fur on end as from a rally of 25", () => {
      expect(
        linesIn(frame, ART_PALETTE.hotShot).map((line) =>
          aboutMiddle(frame, line),
        ),
      ).toEqual(
        linesIn(onEnd, ART_PALETTE.fuzzball).map((line) =>
          aboutMiddle(onEnd, line),
        ),
      );
    });

    it("draws no sparks, as the art's has none", () => {
      expect({
        lines: linesIn(frame, ART_PALETTE.spark),
        dots: drawnIn(frame, "circle", ART_PALETTE.spark),
      }).toEqual({ lines: [], dots: [] });
    });

    it("crowns it with four tongues of flame in the palette's spark, each rising past its body", () => {
      const top = frame.height / 2 - bodyRadius(frame, ART_PALETTE.hotShot);
      const tongues = drawnIn(frame, "polygon", ART_PALETTE.spark);

      expect({
        tongues: tongues.length,
        under: tongues.filter((tongue) => extentOf(tongue).y >= top),
      }).toEqual({ tongues: 4, under: [] });
    });

    it.each(ART_FLAMES.map((flame, i) => ({ ...flame, i })))(
      "draws the tongue pointing $turn° as the art's: rising from behind the body, swelling, then leaning as it narrows to its tip",
      ({ turn, to, width, lean, i }) => {
        const tongue = drawnIn(frame, "polygon", ART_PALETTE.spark)[i];
        const points = tongue?.kind === "polygon" ? tongue.points : [];
        const swell = (width / 2) * 0.5 ** 1.2 * 1.35;
        const middle = 11.5 + (to - 11.5) / 2;

        expect({
          points: points.length,
          shape: [0, 4, 8, 12, 16].map((at) => {
            const point = points[at];
            return point && onGrid(frame, point, turn);
          }),
        }).toEqual({
          points: 17,
          shape: [
            { x: 11.5, y: -0.35 * width },
            { x: middle, y: lean / 4 - swell },
            { x: to, y: lean },
            { x: middle, y: lean / 4 + swell },
            { x: 11.5, y: 0.35 * width },
          ].map(pointInBillionths),
        });
      },
    );

    it("outlines the fuzzball first, under its flames, two device pixels wider than its body", () => {
      expect(outlineOf(frame, ART_PALETTE.hotShot)).toBe(2);
    });

    it("outlines each tongue with a closed line round it in the mark, twice the outline's width", () => {
      const tongues = drawnIn(frame, "polygon", ART_PALETTE.spark).flatMap(
        (tongue) => (tongue.kind === "polygon" ? [tongue.points] : []),
      );

      const outlines = linesIn(frame, ART_PALETTE.mark)
        .filter((line) => line.width === 4)
        .map(({ from, to }) => [from, to]);

      expect(outlines).toEqual(
        tongues.flatMap((points) =>
          points.map((point, j) => [point, points[(j + 1) % points.length]]),
        ),
      );
    });

    it("outlines it as one, every outline under every tongue and the body over them", () => {
      const at = (command: DrawCommand): number =>
        frame.commands.indexOf(command);
      const lastOutline = Math.max(
        ...frame.commands
          .filter(({ color }) => color === ART_PALETTE.mark)
          .map(at),
      );
      const tongues = drawnIn(frame, "polygon", ART_PALETTE.spark).map(at);
      const firstBody = Math.min(
        ...frame.commands
          .filter(({ color }) => color === ART_PALETTE.hotShot)
          .map(at),
      );

      expect({
        tongues: tongues.length,
        under: lastOutline < Math.min(...tongues),
        over: firstBody > Math.max(...tongues),
      }).toEqual({ tongues: 4, under: true, over: true });
    });
  });

  describe("the yawn", () => {
    const frame = frameNamed(FUZZBALLS, FRAMES.yawn);
    const eyes = drawnIn(frame, "polygon", ART_PALETTE.mark);
    const lids = linesIn(frame, ART_PALETTE.mark);

    it("draws two eyes and a lid over each, in the mark and nothing else", () => {
      expect({
        eyes: eyes.length,
        lids: lids.length,
        notMark: frame.commands.filter(
          ({ color }) => color !== ART_PALETTE.mark,
        ),
      }).toEqual({ eyes: 2, lids: 2, notMark: [] });
    });

    it("half shuts each eye, less than half as tall as the mark's open eye, 6 units of its grid", () => {
      const by = fuzzballGrid(ART_SCALE);

      expect(eyes.filter((eye) => extentOf(eye).height >= 3 * by)).toEqual([]);
    });

    it("shuts each eye from the top down to its lid, none reaching above it", () => {
      const lidTops = lids.map(({ from, to }) => Math.min(from.y, to.y));

      expect(
        eyes.map((eye, i) => extentOf(eye).y >= (lidTops[i] ?? Infinity)),
      ).toEqual([true, true]);
    });

    it("droops each lid toward the outside, its outer end lower than its inner", () => {
      const [left, right] = lids;

      expect({
        left: left && left.from.y > left.to.y,
        right: right && right.to.y > right.from.y,
      }).toEqual({ left: true, right: true });
    });
  });
});
