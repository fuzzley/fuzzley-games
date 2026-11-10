import {
  FUZZBALL_LOOK,
  FUZZBALL_STRANDS,
  type Strand,
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
import { RADIUS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  distanceToSegment,
} from "../../testing/art_frames";
import { CHARGES, FRAMES, INKS } from "./frames";
import { furOf, fuzzballFrames, fuzzballGrid } from "./fuzzball_art";

/** How far apart two points worked out alike may lie, for a rounding, in device pixels. */
const SLACK = 1e-9;

/** The color every frame's commands are drawn in, in a frame recolored. */
const ANY = 0x000000;

/** Each charge but the first, with the one before it. */
const STEPS = CHARGES.slice(1).map((charge, i) => ({
  charge,
  before: CHARGES[i] ?? 0,
}));

/** Returns a strand's points to a billionth, so two worked out alike but for a rounding are equal. */
function strandInBillionths({ from, control, to }: Strand): Strand {
  const each = ({ x, y }: Point): Point => ({
    x: billionths(x),
    y: billionths(y),
  });
  return { from: each(from), control: each(control), to: each(to) };
}

/** Returns how far a strand's tip lies from the body's middle. */
function reachOf({ to }: Strand): number {
  return Math.hypot(to.x, to.y);
}

/** Returns how long a strand is, from its root straight to its tip. */
function lengthOf({ from, to }: Strand): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Returns how far a strand's control lies from the line through its root and its tip, as a share of its length. */
function bendOf(strand: Strand): number {
  return (
    distanceToSegment(strand.control, strand.from, strand.to) / lengthOf(strand)
  );
}

/** Returns the angle between a strand, root to tip, and straight out from the body's middle through its root, in radians. */
function leanOf({ from, to }: Strand): number {
  const across = to.x - from.x;
  const down = to.y - from.y;
  return Math.abs(
    Math.atan2(
      from.x * down - from.y * across,
      from.x * across + from.y * down,
    ),
  );
}

/** Returns a frame's commands, each drawn in one color, so two frames alike but in their colors are equal. */
function recolored(frame: ArtFrame): readonly DrawCommand[] {
  return frame.commands.map((command) => ({ ...command, color: ANY }));
}

/** Returns the body of a fuzzball's frame: its first circle in a color. */
function bodyIn(frame: ArtFrame, color: number): DrawCommand | undefined {
  return drawnIn(frame, "circle", color)[0];
}

/** Returns where the middle of each command of a frame lies from the frame's middle, to a billionth. */
function aboutMiddle(
  frame: ArtFrame,
  commands: readonly DrawCommand[],
): readonly Point[] {
  return commands.map((command) => {
    const { x, y, width, height } = extentOf(command);
    return {
      x: billionths(x + width / 2 - frame.width / 2),
      y: billionths(y + height / 2 - frame.height / 2),
    };
  });
}

/** Returns the lines a frame draws in a color, each with its ends. */
function linesIn(frame: ArtFrame, color: number): readonly LineCommand[] {
  return frame.commands.flatMap((command) =>
    command.kind === "line" && command.color === color ? [command] : [],
  );
}

/** The art's sparks: which way each lies from the body's middle, in degrees clockwise from its right, and how far out it starts, on the fuzzball's grid. */
const ART_SPARKS = [
  { turn: -58, from: 16.4 },
  { turn: 8, from: 17 },
  { turn: 62, from: 16.4 },
  { turn: 148, from: 17 },
  { turn: 212, from: 16.4 },
] as const;

/** The art's tongues of flame: which way each points, how far out its tip is, its width and its lean, on the fuzzball's grid. */
const ART_FLAMES = [
  { turn: -129, to: 20, width: 8.6, lean: 3 },
  { turn: -104, to: 24, width: 9.6, lean: 1.2 },
  { turn: -78, to: 21.6, width: 9, lean: -2.6 },
  { turn: -53, to: 19.2, width: 8.2, lean: -3 },
] as const;

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
  return {
    x: billionths(across * cos + down * sin),
    y: billionths(down * cos - across * sin),
  };
}

/** Returns a point to a billionth. */
function pointAt(x: number, y: number): Point {
  return { x: billionths(x), y: billionths(y) };
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

describe("furOf", () => {
  it.each(CHARGES)(
    "gives charge %i a strand for each of the fuzzball's, each from where it grew",
    (charge) => {
      expect(furOf(charge).map(({ from }) => from)).toEqual(
        FUZZBALL_STRANDS.map(({ from }) => from),
      );
    },
  );

  it("gives charge 0 the fuzzball's own fur", () => {
    expect(furOf(0).map(strandInBillionths)).toEqual(
      FUZZBALL_STRANDS.map(strandInBillionths),
    );
  });

  it.each(STEPS)(
    "reaches every strand further from the body's middle at charge $charge than at $before",
    ({ charge, before }) => {
      const shorter = furOf(charge).filter(
        (strand, i) => reachOf(strand) <= reachOf(furOf(before)[i] ?? strand),
      );

      expect(shorter).toEqual([]);
    },
  );

  it.each(CHARGES)(
    "grows every strand 6% of its length for each charge, at charge %i as for each, to 30% longer at a full one",
    (charge) => {
      expect(
        furOf(charge).map((strand, i) =>
          billionths(
            lengthOf(strand) / lengthOf(FUZZBALL_STRANDS[i] ?? strand),
          ),
        ),
      ).toEqual(FUZZBALL_STRANDS.map(() => billionths(1 + 0.06 * charge)));
    },
  );

  it.each(STEPS)(
    "turns every strand further out at charge $charge than at $before",
    ({ charge, before }) => {
      const back = furOf(charge).filter(
        (strand, i) => leanOf(strand) >= leanOf(furOf(before)[i] ?? strand),
      );

      expect(back).toEqual([]);
    },
  );

  it("stands every strand on end at a full charge, straight out from the body's middle through its root", () => {
    expect(furOf(5).map((strand) => billionths(leanOf(strand)))).toEqual(
      FUZZBALL_STRANDS.map(() => 0),
    );
  });

  it.each(STEPS.filter(({ charge }) => charge < 3))(
    "bends every strand less at charge $charge than at $before, but not yet straight",
    ({ charge, before }) => {
      const more = furOf(charge).filter(
        (strand, i) =>
          bendOf(strand) >= bendOf(furOf(before)[i] ?? strand) ||
          bendOf(strand) === 0,
      );

      expect(more).toEqual([]);
    },
  );

  it.each([3, 4, 5] as const)(
    "combs every strand straight at charge %i, as the art's half-charged look is",
    (charge) => {
      expect(furOf(charge).map((strand) => billionths(bendOf(strand)))).toEqual(
        FUZZBALL_STRANDS.map(() => 0),
      );
    },
  );
});

describe("fuzzballGrid", () => {
  it("draws the fuzzball's grid 0.8 units wide, as the art does", () => {
    expect(fuzzballGrid({ unit: 40, pixelRatio: 1 }) * 32).toBe(32);
  });

  it("draws a fuzzball's body within a twentieth of a fuzzball's radius", () => {
    const body = bodyIn(
      frameNamed(ART_FRAMES, FRAMES.fuzzball(0)),
      ART_PALETTE.fuzzball,
    );
    const radius = body?.kind === "circle" ? body.radius : NaN;

    expect(Math.abs(radius / ART_SCALE.unit - RADIUS)).toBeLessThan(
      RADIUS / 20,
    );
  });
});

describe("fuzzballFrames", () => {
  describe.each(CHARGES)("the player's fuzzball at charge %i", (charge) => {
    const frame = frameNamed(ART_FRAMES, FRAMES.fuzzball(charge));

    it("draws its body in the palette's fuzzball color, at its frame's middle", () => {
      const body = bodyIn(frame, ART_PALETTE.fuzzball);

      expect(body && aboutMiddle(frame, [body])).toEqual([{ x: 0, y: 0 }]);
    });

    it("outlines it in the mark first, two device pixels wider at 31 CSS pixels a unit", () => {
      expect(outlineOf(frame, ART_PALETTE.fuzzball)).toBe(2);
    });

    it("draws its fur as furOf() combs it at that charge, give or take a rounding", () => {
      const fur = fuzzballCommands(fuzzballGrid(ART_SCALE), {
        color: ART_PALETTE.fuzzball,
        fur: furOf(charge),
      }).flatMap((command) => (command.kind === "line" ? [command] : []));
      const drawn = linesIn(frame, ART_PALETTE.fuzzball);
      const middle = { x: frame.width / 2, y: frame.height / 2 };

      const astray = fur.filter((line, i) => {
        const at = drawn[i];
        return (
          !at ||
          Math.hypot(
            at.from.x - middle.x - line.from.x,
            at.from.y - middle.y - line.from.y,
          ) > SLACK ||
          Math.hypot(
            at.to.x - middle.x - line.to.x,
            at.to.y - middle.y - line.to.y,
          ) > SLACK
        );
      });

      expect({ lines: drawn.length, astray }).toEqual({
        lines: fur.length,
        astray: [],
      });
    });
  });

  it("outlines a fuzzball a CSS pixel wide at least: 3 device pixels at 24 CSS pixels a unit, 3 to one", () => {
    const frame = frameNamed(
      fuzzballFrames(ART_PALETTE, { unit: 72, pixelRatio: 3 }),
      FRAMES.fuzzball(0),
    );

    expect(outlineOf(frame, ART_PALETTE.fuzzball)).toBe(3);
  });

  it.each([0, 1, 2, 3, 4] as const)(
    "draws no sparks at charge %i, nor anything in the mark but its outline",
    (charge) => {
      const frame = frameNamed(ART_FRAMES, FRAMES.fuzzball(charge));
      const inColor = (color: number): number =>
        frame.commands.filter((command) => command.color === color).length;

      expect({
        sparks: inColor(ART_PALETTE.spark),
        // The outline is the body and fur drawn wider, a command for each.
        marks: inColor(ART_PALETTE.mark),
      }).toEqual({ sparks: 0, marks: inColor(ART_PALETTE.fuzzball) });
    },
  );

  it("sparks at a full charge: five zigzags in the palette's spark, each of three lines", () => {
    const frame = frameNamed(ART_FRAMES, FRAMES.fuzzball(5));

    expect({
      lines: linesIn(frame, ART_PALETTE.spark).length,
      corners: drawnIn(frame, "circle", ART_PALETTE.spark).length,
    }).toEqual({ lines: 15, corners: 20 });
  });

  it("draws each spark as the art's zigzag, in its place round the body", () => {
    const frame = frameNamed(ART_FRAMES, FRAMES.fuzzball(5));
    const lines = linesIn(frame, ART_PALETTE.spark);

    const sparks = ART_SPARKS.map(({ turn }, i) =>
      [
        lines[3 * i]?.from,
        ...lines.slice(3 * i, 3 * i + 3).map(({ to }) => to),
      ].map((point) => point && onGrid(frame, point, turn)),
    );

    expect(sparks).toEqual(
      ART_SPARKS.map(({ from }) => [
        pointAt(from, -0.4),
        pointAt(from + 1.7, -1.5),
        pointAt(from + 1.5, 1.1),
        pointAt(from + 3.6, 0),
      ]),
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
        FRAMES.fuzzball(5),
      );

      expect(
        new Set(linesIn(frame, ART_PALETTE.spark).map((line) => line.width)),
      ).toEqual(new Set([width]));
    },
  );

  it("outlines each spark in the mark beneath the fuzzball's body, a line along it two device pixels wider either side", () => {
    const frame = frameNamed(ART_FRAMES, FRAMES.fuzzball(5));
    const firstBody = frame.commands.findIndex(
      ({ color }) => color === ART_PALETTE.fuzzball,
    );

    const outlines = frame.commands
      .slice(0, firstBody)
      .flatMap((command) =>
        command.kind === "line" &&
        command.color === ART_PALETTE.mark &&
        command.width === 2 + 2 * 2
          ? [[command.from, command.to]]
          : [],
      );

    expect(outlines).toEqual(
      linesIn(frame, ART_PALETTE.spark).map(({ from, to }) => [from, to]),
    );
  });

  it("outlines a full charge as one, every outline under every spark", () => {
    const frame = frameNamed(ART_FRAMES, FRAMES.fuzzball(5));
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
        FRAMES.fuzzball(5),
      );

      it("keeps a full charge's sparks clear of its fur", () => {
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
    const frame = frameNamed(ART_FRAMES, FRAMES.hotShot);
    const full = frameNamed(ART_FRAMES, FRAMES.fuzzball(5));

    it("draws the fuzzball red-hot, its fur on end as a full charge's", () => {
      expect(aboutMiddle(frame, linesIn(frame, ART_PALETTE.hotShot))).toEqual(
        aboutMiddle(full, linesIn(full, ART_PALETTE.fuzzball)),
      );
    });

    it("draws no sparks, as the art's has none", () => {
      expect({
        lines: linesIn(frame, ART_PALETTE.spark),
        dots: drawnIn(frame, "circle", ART_PALETTE.spark),
      }).toEqual({ lines: [], dots: [] });
    });

    it("crowns it with four tongues of flame in the palette's spark, each rising past its body", () => {
      const body = bodyIn(frame, ART_PALETTE.hotShot);
      const top =
        body?.kind === "circle" ? frame.height / 2 - body.radius : NaN;
      const tongues = drawnIn(frame, "polygon", ART_PALETTE.spark);

      expect(tongues).toHaveLength(4);
      expect(tongues.filter((tongue) => extentOf(tongue).y >= top)).toEqual([]);
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
            pointAt(11.5, -0.35 * width),
            pointAt(middle, lean / 4 - swell),
            pointAt(to, lean),
            pointAt(middle, lean / 4 + swell),
            pointAt(11.5, 0.35 * width),
          ],
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
        under: lastOutline < Math.min(...tongues),
        over: firstBody > Math.max(...tongues),
      }).toEqual({ under: true, over: true });
    });
  });

  it.each(INKS)(
    "draws friend %i in its ink, as the player's fuzzball at no charge",
    (ink) => {
      const frame = frameNamed(ART_FRAMES, FRAMES.friend(ink));

      expect({
        body: bodyIn(frame, ART_PALETTE.friends[ink] ?? NaN)?.color,
        drawn: recolored(frame),
      }).toEqual({
        body: ART_PALETTE.friends[ink],
        drawn: recolored(frameNamed(ART_FRAMES, FRAMES.fuzzball(0))),
      });
    },
  );

  describe("the eyes", () => {
    const frame = frameNamed(ART_FRAMES, FRAMES.eyes);
    const eyes = drawnIn(frame, "polygon", ART_PALETTE.mark);

    it("draws two eyes in the mark and nothing else", () => {
      expect({ eyes: eyes.length, all: frame.commands.length }).toEqual({
        eyes: 2,
        all: 2,
      });
    });

    it("sets them about the body's middle, its frame's, as the fuzzball has them: a unit of its grid right and a fifth of one up", () => {
      const by = fuzzballGrid(ART_SCALE);
      const [left, right] = eyes.map((eye) => extentOf(eye));

      expect(
        left &&
          right && {
            x: billionths(
              (left.x + right.x + right.width) / 2 - frame.width / 2,
            ),
            y: billionths(left.y + left.height / 2 - frame.height / 2),
          },
      ).toEqual({ x: billionths(by), y: billionths(-0.2 * by) });
    });

    it("keeps them on the body whichever way it looks", () => {
      const by = fuzzballGrid(ART_SCALE);
      const body = bodyIn(
        frameNamed(ART_FRAMES, FRAMES.fuzzball(0)),
        ART_PALETTE.fuzzball,
      );
      const radius = body?.kind === "circle" ? body.radius : NaN;
      const points = eyes.flatMap((eye) =>
        eye.kind === "polygon" ? eye.points : [],
      );
      const headings = Array.from({ length: 24 }, (_, i) => (i * Math.PI) / 12);

      const off = headings.filter((heading) =>
        points.some(
          ({ x, y }) =>
            Math.hypot(
              x -
                frame.width / 2 +
                Math.cos(heading) * FUZZBALL_LOOK.across * by,
              y -
                frame.height / 2 +
                Math.sin(heading) * FUZZBALL_LOOK.down * by,
            ) > radius,
        ),
      );

      expect({ points: points.length > 0, off }).toEqual({
        points: true,
        off: [],
      });
    });
  });
});
