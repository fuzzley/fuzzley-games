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
import { OWN_INK } from "../../rules/paddle/balls";
import { BALL_RADIUS, CAPSULE_HEIGHT, FRIEND_INKS } from "../../rules/tuning";
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
  ballColor,
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

/** Returns how wide a command's line is, or null for one that fills. */
function widthOf(command: DrawCommand): number | null {
  return command.kind === "ring" ||
    command.kind === "polyline" ||
    command.kind === "line"
    ? command.width
    : null;
}

/** A streak at each of the streak's multipliers, ×1 to ×4. */
const STREAKS = [0, 5, 10, 20] as const;

/** Each friend's ink, by its place among the friends' inks. */
const FRIENDS = Array.from({ length: FRIEND_INKS }, (_, ink) => ink);

/**
 * Each frame a ball flies or is pictured in, a friend's too, with the color
 * of its fur, whose strands taper under a CSS pixel on a small field and
 * show by the outline beneath them.
 */
const FUR_COLORS: ReadonlyMap<string, number> = new Map(
  BALL_KIND_IDS.flatMap((kind) =>
    [OWN_INK, ...FRIENDS].flatMap((ink) =>
      [
        ...STREAKS.map((streak) => ballFrame(kind, streak, ink)),
        facedBallFrame(kind, ink),
      ].map((name) => [name, ballColor(kind, ink, ART_PALETTE)] as const),
    ),
  ),
);

/** Returns whether a command is a strand of a ball's fur, or a part of one, in a frame. */
function isFur(command: DrawCommand, frame: ArtFrame): boolean {
  return (
    command.kind === "line" && command.color === FUR_COLORS.get(frame.name)
  );
}

/** Returns whether two points are one. */
function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Returns how far what a frame draws reaches from its middle, round its middle. */
function reachIn(frame: ArtFrame): number {
  const middle = { x: frame.width / 2, y: frame.height / 2 };
  const from = ({ x, y }: Point): number =>
    Math.hypot(x - middle.x, y - middle.y);
  return Math.max(
    ...frame.commands.map((command) => {
      switch (command.kind) {
        case "circle":
          return from(command) + command.radius;
        case "ring":
          return from(command) + command.radius + command.width / 2;
        case "line":
          return (
            Math.max(from(command.from), from(command.to)) + command.width / 2
          );
        case "polyline":
          return Math.max(...command.points.map(from)) + command.width / 2;
        case "polygon":
          return Math.max(...command.points.map(from));
        case "rect":
        case "roundRect":
          return Math.max(
            ...[
              { x: command.x, y: command.y },
              { x: command.x + command.width, y: command.y + command.height },
              { x: command.x + command.width, y: command.y },
              { x: command.x, y: command.y + command.height },
            ].map(from),
          );
      }
    }),
  );
}

/** Returns how far a ball's fur reaches from its frame's middle, half a strand's width included. */
function furReachIn(frame: ArtFrame): number {
  const middle = { x: frame.width / 2, y: frame.height / 2 };
  return Math.max(
    ...frame.commands.flatMap((command) =>
      isFur(command, frame) && command.kind === "line"
        ? [command.from, command.to].map(
            ({ x, y }) =>
              Math.hypot(x - middle.x, y - middle.y) + command.width / 2,
          )
        : [],
    ),
  );
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

    it("draws every line a CSS pixel wide or more, but a ball's fur", () => {
      const thin = frames.filter((frame) =>
        frame.commands.some((command) => {
          const width = widthOf(command);
          return (
            width !== null && width < scale.pixelRatio && !isFur(command, frame)
          );
        }),
      );

      expect(thin.map((frame) => frame.name)).toEqual([]);
    });

    it("outlines each strand of a ball's fur a CSS pixel or more either side, so the thinnest still shows", () => {
      const thin = frames.filter((frame) =>
        frame.commands.some((command) => {
          if (!isFur(command, frame) || command.kind !== "line") return false;
          const outline = frame.commands.find(
            (under) =>
              under.kind === "line" &&
              under.color === ART_PALETTE.outline &&
              samePoint(under.from, command.from) &&
              samePoint(under.to, command.to),
          );
          return (
            outline?.kind !== "line" ||
            // Give or take a rounding of the widths' sum.
            (outline.width - command.width) / 2 < scale.pixelRatio - 1e-9
          );
        }),
      );

      expect(thin.map((frame) => frame.name)).toEqual([]);
    });

    it("keeps everything a ball at ×4 draws inside a seeking ball's sight", () => {
      const ball = frameNamed(frames, ballFrame("normal", 20));
      const sight = frameNamed(frames, FRAMES.sight);
      const [ring] = drawnIn(sight, "ring", ART_PALETTE.capsules.good);
      const inside = ring?.kind === "ring" ? ring.radius - ring.width / 2 : NaN;

      expect(reachIn(ball)).toBeLessThan(inside);
    });
  },
);

describe("a ball's frames", () => {
  it.each(BALL_KIND_IDS)(
    "draws a %s ball as the fuzzball in its color over its outline, its eyes left to a frame of their own",
    (kind) => {
      const frame = frameNamed(ART_FRAMES, ballFrame(kind, 0));

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
      const flying = frameNamed(ART_FRAMES, ballFrame(kind, 0));

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
        ballFrame("normal", 0),
      );

      expect(frame.width).toBeLessThanOrEqual(
        2 * Math.ceil(BALL_RADIUS * scale.unit + 1e-9),
      );
    },
  );

  it("tells the kinds apart by shape: a fire ball's flame stands taller, a blast ball's spikes reach wider", () => {
    const [normal, fire, blast] = BALL_KIND_IDS.map((kind) =>
      frameNamed(ART_FRAMES, ballFrame(kind, 0)),
    );

    expect({
      taller: (fire?.height ?? 0) > (normal?.height ?? 0),
      wider: (blast?.width ?? 0) > (normal?.width ?? 0),
    }).toEqual({ taller: true, wider: true });
  });

  it("lifts a normal ball's fur at each of the streak's multipliers: further out at ×2, and on end at ×3 and ×4", () => {
    const reaches = STREAKS.map((streak) =>
      furReachIn(frameNamed(ART_FRAMES, ballFrame("normal", streak))),
    );
    const [flat = NaN, lifted = NaN, standing = NaN, sparking = NaN] = reaches;

    expect({
      names: new Set(STREAKS.map((streak) => ballFrame("normal", streak))).size,
      rising: flat < lifted && lifted < standing,
      onEnd: sparking === standing,
    }).toEqual({ names: 4, rising: true, onEnd: true });
  });

  it("keeps a normal ball's fur as it is between one multiplier and the next, and on end past the last", () => {
    expect([
      ballFrame("normal", 4),
      ballFrame("normal", 9),
      ballFrame("normal", 19),
      ballFrame("normal", 200),
    ]).toEqual([
      ballFrame("normal", 0),
      ballFrame("normal", 5),
      ballFrame("normal", 10),
      ballFrame("normal", 20),
    ]);
  });

  it.each(["fire", "blast"] as const)(
    "keeps a %s ball's fur as it is, whatever the streak",
    (kind) => {
      expect(ballFrame(kind, 20)).toBe(ballFrame(kind, 0));
    },
  );

  it("sparks about a normal ball only at ×4, in the sparks' ink over its body, each outlined beneath it", () => {
    const frames = STREAKS.map((streak) =>
      frameNamed(ART_FRAMES, ballFrame("normal", streak)),
    );
    const bodyAt = (frame: ArtFrame | undefined): number =>
      frame?.commands.findIndex(
        (command) =>
          command.kind === "circle" &&
          command.color === ART_PALETTE.balls.normal,
      ) ?? NaN;
    const sparksIn = (frame: ArtFrame): number[] =>
      frame.commands.flatMap((command, i) =>
        command.color === ART_PALETTE.streakSparks ? [i] : [],
      );
    const sparks = frames[3] ? sparksIn(frames[3]) : [];

    expect({
      only: frames.map((frame) => sparksIn(frame).length > 0),
      over: Math.min(...sparks) > bodyAt(frames[3]),
      // On end at ×3 too, so what more lies beneath its body at ×4 is the
      // sparks' outline.
      outlined: bodyAt(frames[3]) - bodyAt(frames[2]),
    }).toEqual({
      only: [false, false, false, true],
      over: true,
      outlined: sparks.length,
    });
  });

  it.each(FRIENDS)(
    "draws friend %i as a normal ball in its ink, at each of the streak's multipliers, over its outline",
    (ink) => {
      const frames = STREAKS.map((streak) =>
        frameNamed(ART_FRAMES, ballFrame("normal", streak, ink)),
      );
      const own = STREAKS.map((streak) =>
        frameNamed(ART_FRAMES, ballFrame("normal", streak)),
      );
      const ofBall = (frame: ArtFrame): ReadonlySet<number> =>
        new Set(
          frame.commands
            .map((command) => command.color)
            .filter((color) => color !== ART_PALETTE.streakSparks),
        );

      expect({
        colors: frames.map(ofBall),
        reaches: frames.map(furReachIn),
      }).toEqual({
        colors: frames.map(
          () => new Set([ART_PALETTE.outline, ART_PALETTE.friendInks[ink]]),
        ),
        reaches: own.map(furReachIn),
      });
    },
  );

  it("names a frame for each friend at each of the streak's multipliers, apart from the player's own ball and each other", () => {
    const names = [OWN_INK, ...FRIENDS].flatMap((ink) =>
      STREAKS.map((streak) => ballFrame("normal", streak, ink)),
    );

    expect(new Set(names).size).toBe((FRIEND_INKS + 1) * STREAKS.length);
  });

  it.each(["fire", "blast"] as const)(
    "draws a friend as a %s ball while the balls are, in that kind's look",
    (kind) => {
      expect([
        ballFrame(kind, 20, 2),
        facedBallFrame(kind, 2),
        ballColor(kind, 2, ART_PALETTE),
      ]).toEqual([
        ballFrame(kind, 20),
        facedBallFrame(kind),
        ART_PALETTE.balls[kind],
      ]);
    },
  );

  it("draws a friend with its eyes in the marks' color, in its ink, as large as it flies", () => {
    const faced = frameNamed(ART_FRAMES, facedBallFrame("normal", 2));
    const flying = frameNamed(ART_FRAMES, ballFrame("normal", 0, 2));

    expect({
      size: [faced.width, faced.height],
      eyes: drawnIn(faced, "polygon", ART_PALETTE.mark).length,
      colors: new Set(faced.commands.map((command) => command.color)),
    }).toEqual({
      size: [flying.width, flying.height],
      eyes: 2,
      colors: new Set([
        ART_PALETTE.outline,
        ART_PALETTE.friendInks[2],
        ART_PALETTE.mark,
      ]),
    });
  });

  it("colors a normal ball by its ink, a friend's own or the balls' where it is the player's", () => {
    expect([
      ballColor("normal", OWN_INK, ART_PALETTE),
      ballColor("normal", 3, ART_PALETTE),
    ]).toEqual([ART_PALETTE.balls.normal, ART_PALETTE.friendInks[3]]);
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

  it("holds a frame for every ball kind at every step of the streak, every friend's too, every capsule and every tag", () => {
    const wanted = [
      ...BALL_KIND_IDS.flatMap((kind) =>
        STREAKS.map((streak) => ballFrame(kind, streak)),
      ),
      ...FRIENDS.flatMap((ink) => [
        ...STREAKS.map((streak) => ballFrame("normal", streak, ink)),
        facedBallFrame("normal", ink),
      ]),
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

  it("draws a seeking ball's sight in a good capsule's color, over its outline, a ring round the ball and a tick out from it each way", () => {
    const sight = frameNamed(ART_FRAMES, FRAMES.sight);
    const middle = { x: sight.width / 2, y: sight.height / 2 };
    const radius = 1.7 * BALL_RADIUS * ART_SCALE.unit;
    const [outline] = drawnIn(sight, "ring", ART_PALETTE.outline);
    const [ring] = drawnIn(sight, "ring", ART_PALETTE.capsules.good);
    const ticks = sight.commands.flatMap((command) =>
      command.kind === "line" && command.color === ART_PALETTE.capsules.good
        ? [command]
        : [],
    );
    const distance = ({ x, y }: Point): number =>
      Number(Math.hypot(x - middle.x, y - middle.y).toFixed(6));

    expect({
      outlineFirst: sight.commands[0] === outline,
      ring,
      ticks: ticks.map(({ from, to }) => [distance(from), distance(to)]),
      ways: ticks.map(({ from, to }) => [
        Math.sign(Math.round(to.x - from.x)),
        Math.sign(Math.round(to.y - from.y)),
      ]),
    }).toMatchObject({
      outlineFirst: true,
      ring: { ...middle, radius },
      ticks: Array.from({ length: 4 }, () => [
        Number(radius.toFixed(6)),
        Number((2.4 * BALL_RADIUS * ART_SCALE.unit).toFixed(6)),
      ]),
      ways: [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ],
    });
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
