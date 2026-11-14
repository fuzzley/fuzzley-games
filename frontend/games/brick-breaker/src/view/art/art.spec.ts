import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  atlasSize,
  extentOf,
  lineWidth,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { BALL_KIND_IDS } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS } from "../../rules/catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleTone,
  capsule,
} from "../../rules/catalog/capsules";
import { BALL_RADIUS, CAPSULE_HEIGHT } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  FIELD_SCALES,
  SMALL_SCALE,
} from "../../testing/art_frames";
import {
  CAPSULE_ART,
  type CapsuleLook,
  FRAMES,
  PICTURE_FRAMES,
  atlasFrames,
  ballFrame,
  capsuleFrame,
  capsuleShape,
  facedBallFrame,
  tagFrame,
} from "./art";
import { SYMBOLS } from "./symbols";

/** Returns whether a command draws within its frame, give or take a rounding. */
function drawsWithin(command: DrawCommand, frame: ArtFrame): boolean {
  const { x, y, width, height } = extentOf(command);
  const slack = 1e-9;
  return (
    x >= -slack &&
    y >= -slack &&
    x + width <= frame.width + slack &&
    y + height <= frame.height + slack
  );
}

/**
 * Returns how wide a command's line is, or null for one that fills or a
 * straight line, which a fuzzball's fur tapers to under a CSS pixel in;
 * `brick_art.spec.ts` holds a brick's straight lines.
 */
function widthOf(command: DrawCommand): number | null {
  return command.kind === "ring" || command.kind === "polyline"
    ? command.width
    : null;
}

/** Returns the sizes a command draws at: its width, height and radius, those it has. */
function sizesOf(command: DrawCommand): number[] {
  return [
    "width" in command ? command.width : 0,
    "height" in command ? command.height : 0,
    "radius" in command ? command.radius : 0,
  ];
}

describe("atlasFrames at every unit down to a device pixel", () => {
  it.each([1, 1.25, 1.5, 2, 3])(
    "draws nothing at a size below nothing, at %f device pixels to a CSS pixel",
    (pixelRatio) => {
      const units = Array.from({ length: 16 }, (_, i) => i + 1);

      const negative = units.flatMap((unit) =>
        atlasFrames(ART_PALETTE, { unit, pixelRatio })
          .filter((frame) =>
            frame.commands.some((command) =>
              sizesOf(command).some((size) => size < 0),
            ),
          )
          .map((frame) => `${frame.name} at ${String(unit)}`),
      );

      expect(negative).toEqual([]);
    },
  );
});

describe.each(FIELD_SCALES)(
  "atlasFrames at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    const frames = atlasFrames(ART_PALETTE, scale);

    it("draws every frame within its size", () => {
      const outside = frames.filter(
        (frame) =>
          !frame.commands.every((command) => drawsWithin(command, frame)),
      );

      expect(outside.map((frame) => frame.name)).toEqual([]);
    });

    it("sizes every frame in whole pixels, one or more", () => {
      const unsized = frames.filter(
        (frame) =>
          !Number.isInteger(frame.width) ||
          !Number.isInteger(frame.height) ||
          frame.width < 1 ||
          frame.height < 1,
      );

      expect(unsized.map((frame) => frame.name)).toEqual([]);
    });

    it("names every frame once", () => {
      const names = frames.map((frame) => frame.name);

      expect(new Set(names).size).toBe(names.length);
    });

    it("draws every line a CSS pixel wide or more", () => {
      const thin = frames.filter((frame) =>
        frame.commands.some((command) => {
          const width = widthOf(command);
          return width !== null && width < scale.pixelRatio;
        }),
      );

      expect(thin.map((frame) => frame.name)).toEqual([]);
    });
  },
);

describe("a ball's frames", () => {
  it.each(BALL_KIND_IDS)(
    "draws a %s ball as the fuzzball in its color over its outline, its eyes left to a frame of their own",
    (kind) => {
      const frame = frameNamed(ART_FRAMES, ballFrame(kind));

      expect({
        under: frame.commands[0]?.color,
        colors: new Set(frame.commands.map((command) => command.color)),
      }).toEqual({
        under: ART_PALETTE.outline,
        colors: new Set([ART_PALETTE.outline, ART_PALETTE.balls[kind]]),
      });
    },
  );

  it.each(BALL_KIND_IDS)(
    "draws a %s ball with its eyes in the marks' color, as large as it flies",
    (kind) => {
      const faced = frameNamed(ART_FRAMES, facedBallFrame(kind));
      const flying = frameNamed(ART_FRAMES, ballFrame(kind));

      expect({
        size: [faced.width, faced.height],
        eyes: drawnIn(faced, "polygon", ART_PALETTE.mark).length,
      }).toEqual({ size: [flying.width, flying.height], eyes: 2 });
    },
  );

  it.each(FIELD_SCALES)(
    "keeps a normal ball's fur within the ball's edge at a unit of $unit device pixels",
    (scale) => {
      const frame = frameNamed(
        atlasFrames(ART_PALETTE, scale),
        ballFrame("normal"),
      );

      expect(frame.width).toBeLessThanOrEqual(
        2 * Math.ceil(BALL_RADIUS * scale.unit + 1e-9),
      );
    },
  );

  it("tells the kinds apart by shape: a fire ball's flame stands taller, a blast ball's spikes reach wider", () => {
    const [normal, fire, blast] = BALL_KIND_IDS.map((kind) =>
      frameNamed(ART_FRAMES, ballFrame(kind)),
    );

    expect({
      taller: (fire?.height ?? 0) > (normal?.height ?? 0),
      wider: (blast?.width ?? 0) > (normal?.width ?? 0),
    }).toEqual({ taller: true, wider: true });
  });

  it("draws the balls' eyes, two of them, in the marks' color", () => {
    const eyes = frameNamed(ART_FRAMES, FRAMES.eyes);

    expect(drawnIn(eyes, "polygon", ART_PALETTE.mark)).toHaveLength(2);
  });
});

/** Returns a capsule's look in the specs' palette at a scale, as its frame draws it. */
function capsuleLook(tone: CapsuleTone, scale: ArtScale): CapsuleLook {
  return CAPSULE_ART[tone](capsuleShape(tone, ART_PALETTE, scale), scale);
}

/** Returns where what a command draws starts and ends down its frame. */
function rowsOf(command: DrawCommand | undefined): {
  top: number;
  bottom: number;
} {
  if (!command) return { top: NaN, bottom: NaN };
  const { y, height } = extentOf(command);
  return { top: y, bottom: y + height };
}

/** Returns how far a point lies from the line through two others. */
function distanceFrom(point: Point, [from, to]: readonly Point[]): number {
  if (!from || !to) return NaN;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (
    Math.abs(dy * (point.x - from.x) - dx * (point.y - from.y)) /
    Math.hypot(dx, dy)
  );
}

/**
 * Returns the edges of a bad capsule's hexagon at its left end, each from a
 * corner to the point between them: the upper, then the lower.
 */
function leftEdges(command: DrawCommand | undefined): {
  upper: readonly Point[];
  lower: readonly Point[];
} {
  const points = command?.kind === "polygon" ? command.points : [];
  const [upper, , , , lower, point] = points;
  return upper && lower && point
    ? { upper: [upper, point], lower: [lower, point] }
    : { upper: [], lower: [] };
}

describe("a capsule's frame", () => {
  it.each(CAPSULE_IDS)(
    "draws the %s capsule as its tone does, then its symbol in the square its tone gives, in the marks' color",
    (id) => {
      const frame = frameNamed(ART_FRAMES, capsuleFrame(id));
      const { commands, symbol } = capsuleLook(capsule(id).tone, ART_SCALE);

      expect(frame.commands).toEqual([
        ...commands,
        ...SYMBOLS[id](symbol, {
          color: ART_PALETTE.mark,
          width: lineWidth(ART_SCALE),
        }),
      ]);
    },
  );

  it("outlines a good capsule, then lays its accent over a darker lip, a shine along its top", () => {
    const { commands } = capsuleLook("good", ART_SCALE);

    expect(commands.map((command) => command.color)).toEqual([
      ART_PALETTE.outline,
      ART_PALETTE.capsuleLips.good,
      ART_PALETTE.capsules.good,
      ART_PALETTE.capsuleShine,
    ]);
  });

  it("outlines a bad capsule, then lays its danger color over a gold lip, as it pays double", () => {
    const { commands } = capsuleLook("bad", ART_SCALE);

    expect(commands.map((command) => command.color)).toEqual([
      ART_PALETTE.outline,
      ART_PALETTE.capsuleLips.bad,
      ART_PALETTE.capsules.bad,
    ]);
  });

  it("rounds a good capsule's ends and points a bad one's", () => {
    const kinds = (["good", "bad"] as const).map(
      (tone) => capsuleLook(tone, ART_SCALE).commands[0]?.kind,
    );

    expect(kinds).toEqual(["roundRect", "polygon"]);
  });

  it.each(
    (["good", "bad"] as const).flatMap((tone) =>
      [ART_SCALE, SMALL_SCALE].map((scale) => ({ tone, scale })),
    ),
  )(
    "shows a $tone capsule's lip below its body, a CSS pixel or more, at a unit of $scale.unit",
    ({ tone, scale }) => {
      const { commands } = capsuleLook(tone, scale);
      const outline = rowsOf(commands[0]);
      const lip = rowsOf(commands[1]);
      const body = rowsOf(commands[2]);
      const line = lineWidth(scale);
      const drop = lip.bottom - body.bottom;

      expect({
        tops: [lip.top - line, body.top - line],
        lipFoot: outline.bottom - lip.bottom,
        dropped: drop >= scale.pixelRatio && Number.isInteger(drop),
      }).toEqual({ tops: [drop, 0], lipFoot: line, dropped: true });
    },
  );

  it("keeps a bad capsule's outline a line wide along its pointed ends, its body's above and its lip's below", () => {
    const { commands } = capsuleLook("bad", ART_SCALE);
    const outline = leftEdges(commands[0]);
    const lip = leftEdges(commands[1]);
    const body = leftEdges(commands[2]);
    const distances = [
      ...body.upper.map((point) => distanceFrom(point, outline.upper)),
      ...lip.lower.map((point) => distanceFrom(point, outline.lower)),
    ].map((distance) => Number(distance.toFixed(6)));

    expect(distances).toEqual(
      Array.from({ length: 4 }, () => lineWidth(ART_SCALE)),
    );
  });

  it("leaves out a good capsule's shine where a brick is too small for its finest detail", () => {
    const { commands } = capsuleLook("good", SMALL_SCALE);

    expect(commands.map((command) => command.color)).not.toContain(
      ART_PALETTE.capsuleShine,
    );
  });

  it("draws a symbol half a capsule's height wide, about the middle of a bad one's body and of a good one below its shine", () => {
    const height = Math.round(CAPSULE_HEIGHT * ART_SCALE.unit);
    const [good, bad] = (["good", "bad"] as const).map((tone) => {
      const { commands, symbol } = capsuleLook(tone, ART_SCALE);
      const body = rowsOf(commands[2]);
      return {
        side: symbol.width,
        middle: symbol.y + symbol.height / 2,
        body: (body.top + body.bottom) / 2,
      };
    });

    expect({
      sides: [good?.side, bad?.side],
      middles: [good?.middle, bad?.middle],
    }).toEqual({
      sides: [height / 2, height / 2],
      middles: [height / 2, bad?.body],
    });
  });

  it("draws a symbol wider, about the middle of a capsule's body, where a brick is too small for its finest detail", () => {
    const height = Math.round(CAPSULE_HEIGHT * SMALL_SCALE.unit);
    const looks = (["good", "bad"] as const).map((tone) => {
      const { commands, symbol } = capsuleLook(tone, SMALL_SCALE);
      const body = rowsOf(commands[2]);
      return {
        wider: symbol.width > height / 2,
        middled: symbol.y + symbol.height / 2 === (body.top + body.bottom) / 2,
      };
    });

    expect(looks).toEqual([
      { wider: true, middled: true },
      { wider: true, middled: true },
    ]);
  });

  it("draws a symbol's lines as one path, so its corners join", () => {
    const frame = frameNamed(ART_FRAMES, capsuleFrame("catch"));

    expect(drawnIn(frame, "polyline", ART_PALETTE.mark)).toMatchObject([
      { points: { length: 4 } },
    ]);
  });

  it("draws the Seeker's sight: a ring, a dot in it, and a tick out from the ring to the edge each way", () => {
    const tag = frameNamed(ART_FRAMES, tagFrame("seeker"));
    const middle = { x: tag.width / 2, y: tag.height / 2 };
    const ticks = tag.commands.flatMap((command) =>
      command.kind === "line" ? [command] : [],
    );

    expect({
      ring: drawnIn(tag, "ring", ART_PALETTE.capsules.good),
      dot: drawnIn(tag, "circle", ART_PALETTE.capsules.good),
      from: ticks.map(({ from }) =>
        Number(Math.hypot(from.x - middle.x, from.y - middle.y).toFixed(6)),
      ),
      to: ticks.map(({ to }) => to),
    }).toMatchObject({
      ring: [{ ...middle, radius: 0.3 * tag.width }],
      dot: [{ ...middle, radius: 0.1 * tag.width }],
      from: Array.from({ length: 4 }, () =>
        Number((0.3 * tag.width).toFixed(6)),
      ),
      to: [
        { x: middle.x, y: 0 },
        { x: tag.width, y: middle.y },
        { x: middle.x, y: tag.height },
        { x: 0, y: middle.y },
      ],
    });
  });
});

describe("the atlas", () => {
  const names = new Set(
    atlasFrames(ART_PALETTE, ART_SCALE).map((frame) => frame.name),
  );

  it("holds a frame for every ball kind, every capsule and every tag", () => {
    const wanted = [
      ...BALL_KIND_IDS.map(ballFrame),
      ...CAPSULE_IDS.map(capsuleFrame),
      ...CAPSULE_IDS.map(tagFrame),
    ];

    expect(wanted.filter((name) => !names.has(name))).toEqual([]);
  });

  it("packs inside 4096 device pixels a side at a unit of 54, 3 to a CSS pixel, as WebGL takes on every device", () => {
    const { width, height } = atlasSize(
      atlasFrames(ART_PALETTE, { unit: 54, pixelRatio: 3 }),
    );

    expect(Math.max(width, height)).toBeLessThanOrEqual(4096);
  });

  it.each(Object.values(FRAMES))("holds the %s's frame", (name) => {
    expect(names.has(name)).toBe(true);
  });

  it("draws a bolt in the cannons' color", () => {
    const bolt = frameNamed(ART_FRAMES, FRAMES.bolt);

    expect(new Set(bolt.commands.map((command) => command.color))).toEqual(
      new Set([ART_PALETTE.paddleInks.cannon]),
    );
  });

  it("frames a brick's cell in the glow's color, a line past it on each side", () => {
    const glow = frameNamed(ART_FRAMES, FRAMES.glow);
    const line = lineWidth(ART_SCALE);

    expect({
      width: glow.width,
      height: glow.height,
      colors: new Set(glow.commands.map((command) => command.color)),
    }).toEqual({
      width: 2 * ART_SCALE.unit + 2 * line,
      height: ART_SCALE.unit + 2 * line,
      colors: new Set([ART_PALETTE.glow]),
    });
  });

  it("draws each tag in its capsule's tone", () => {
    const tones = [tagFrame("wide"), tagFrame("fast")].map(
      (name) => frameNamed(ART_FRAMES, name).commands[0]?.color,
    );

    expect(tones).toEqual([
      ART_PALETTE.capsules.good,
      ART_PALETTE.capsules.bad,
    ]);
  });
});

describe("PICTURE_FRAMES", () => {
  const names = new Set(
    atlasFrames(ART_PALETTE, ART_SCALE).map((frame) => frame.name),
  );

  it("pictures every brick kind, ball kind and capsule from a frame the atlas holds", () => {
    const pictured = [
      ...Object.values(PICTURE_FRAMES.bricks),
      ...Object.values(PICTURE_FRAMES.balls),
      ...Object.values(PICTURE_FRAMES.capsules),
    ];

    expect({
      count: pictured.length,
      missing: pictured.filter((name) => !names.has(name)),
    }).toEqual({
      count: BRICK_KIND_IDS.length + BALL_KIND_IDS.length + CAPSULE_IDS.length,
      missing: [],
    });
  });

  it("pictures each ball with its eyes", () => {
    expect(PICTURE_FRAMES.balls).toEqual({
      normal: facedBallFrame("normal"),
      fire: facedBallFrame("fire"),
      blast: facedBallFrame("blast"),
    });
  });

  it("pictures a ghost brick still hidden", () => {
    expect(PICTURE_FRAMES.bricks.ghost).toMatch(/^ghost-\d+$/);
  });
});
