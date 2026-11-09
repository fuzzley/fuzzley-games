import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  extentOf,
  lineWidth,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { BALL_KIND_IDS } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS } from "../../rules/catalog/bricks";
import { CAPSULE_IDS } from "../../rules/catalog/capsules";
import { BALL_RADIUS, PADDLE_HEIGHT } from "../../rules/tuning";
import { ART_FRAMES, ART_PALETTE, ART_SCALE } from "../../testing/art_frames";
import {
  FRAMES,
  PICTURE_FRAMES,
  atlasFrames,
  ballFrame,
  capsuleFrame,
  facedBallFrame,
  tagFrame,
} from "./art";

/** The scales a field is drawn at, from the smallest unit the layout allows to a large one at a pixel ratio of 3. */
const SCALES: readonly ArtScale[] = [
  { unit: 10, pixelRatio: 1 },
  { unit: 13, pixelRatio: 1.25 },
  { unit: 24, pixelRatio: 2 },
  { unit: 54, pixelRatio: 3 },
];

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

describe.each(SCALES)(
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

  it.each(SCALES)(
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

describe("a capsule's frame", () => {
  it.each(CAPSULE_IDS)(
    "outlines the %s capsule in the outline's color, then fills it in its tone's, its symbol in the marks'",
    (id) => {
      const frame = frameNamed(ART_FRAMES, capsuleFrame(id));

      expect({
        outline: frame.commands[0]?.color,
        symbol: new Set(
          frame.commands.slice(2).map((command) => command.color),
        ),
      }).toEqual({
        outline: ART_PALETTE.outline,
        symbol: new Set([ART_PALETTE.mark]),
      });
    },
  );

  it("draws a good capsule's body in the accent and a bad one's in the danger color", () => {
    const good = frameNamed(ART_FRAMES, capsuleFrame("wide"));
    const bad = frameNamed(ART_FRAMES, capsuleFrame("narrow"));

    expect([good.commands[1]?.color, bad.commands[1]?.color]).toEqual([
      ART_PALETTE.capsules.good,
      ART_PALETTE.capsules.bad,
    ]);
  });

  it("rounds a good capsule's ends and notches a bad one's", () => {
    const good = frameNamed(ART_FRAMES, capsuleFrame("wide"));
    const bad = frameNamed(ART_FRAMES, capsuleFrame("narrow"));

    expect([good.commands[0]?.kind, bad.commands[0]?.kind]).toEqual([
      "roundRect",
      "polygon",
    ]);
  });

  it("draws a symbol's lines as one path, so its corners join", () => {
    const frame = frameNamed(ART_FRAMES, capsuleFrame("catch"));

    expect(drawnIn(frame, "polyline", ART_PALETTE.mark)).toMatchObject([
      { points: { length: 4 } },
    ]);
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

  it.each(Object.values(FRAMES))("holds the %s's frame", (name) => {
    expect(names.has(name)).toBe(true);
  });

  it("draws the paddle's end as a disc in its color, as tall as the paddle", () => {
    const end = frameNamed(ART_FRAMES, FRAMES.paddle);
    const height = Math.round(PADDLE_HEIGHT * ART_SCALE.unit);

    expect(end).toMatchObject({
      width: height,
      height,
      commands: [
        {
          kind: "circle",
          x: height / 2,
          y: height / 2,
          radius: height / 2,
          color: ART_PALETTE.paddle,
        },
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
    expect(PICTURE_FRAMES.bricks.ghost).toMatch(/^ghost-/);
  });
});
