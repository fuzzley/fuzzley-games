import { BALL_KIND_IDS } from "../rules/catalog/balls";
import { BRICK_KIND_IDS } from "../rules/catalog/bricks";
import { CAPSULE_IDS } from "../rules/catalog/capsules";
import {
  ART_PALETTE,
  ART_SCALE,
  drawnIn,
  frameNamed,
} from "../testing/art_frames";
import {
  FRAMES,
  PICTURE_FRAMES,
  type Pictures,
  atlasFrames,
  ballFrame,
  capsuleFrame,
  mapPictures,
  tagFrame,
} from "./art";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  lineWidth,
} from "./shapes";

/** The scales a field is drawn at, from the smallest unit the layout allows to a large one at a pixel ratio of 3. */
const SCALES: readonly ArtScale[] = [
  { unit: 10, pixelRatio: 1 },
  { unit: 13, pixelRatio: 1.25 },
  { unit: 24, pixelRatio: 2 },
  { unit: 54, pixelRatio: 3 },
];

/** Returns the left, top, right and bottom of what a command draws. */
function extentOf(
  command: DrawCommand,
): readonly [number, number, number, number] {
  switch (command.kind) {
    case "rect":
    case "roundRect":
      return [
        command.x,
        command.y,
        command.x + command.width,
        command.y + command.height,
      ];
    case "circle":
    case "ring": {
      const reach =
        command.radius + (command.kind === "ring" ? command.width / 2 : 0);
      return [
        command.x - reach,
        command.y - reach,
        command.x + reach,
        command.y + reach,
      ];
    }
    case "polyline":
    case "polygon": {
      const half = command.kind === "polyline" ? command.width / 2 : 0;
      const xs = command.points.map((point) => point.x);
      const ys = command.points.map((point) => point.y);
      return [
        Math.min(...xs) - half,
        Math.min(...ys) - half,
        Math.max(...xs) + half,
        Math.max(...ys) + half,
      ];
    }
  }
}

/** Returns whether a command draws within its frame, give or take a rounding. */
function drawsWithin(command: DrawCommand, frame: ArtFrame): boolean {
  const [left, top, right, bottom] = extentOf(command);
  const slack = 1e-9;
  return (
    left >= -slack &&
    top >= -slack &&
    right <= frame.width + slack &&
    bottom <= frame.height + slack
  );
}

/** Returns how wide a command's line is, or null for one that fills. */
function widthOf(command: DrawCommand): number | null {
  return command.kind === "ring" || command.kind === "polyline"
    ? command.width
    : null;
}

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

describe("a ball's frame", () => {
  it.each(BALL_KIND_IDS)(
    "outlines a %s ball in the outline's color, a line's width wide",
    (kind) => {
      const frame = frameNamed(ballFrame(kind));
      const middle = frame.width / 2;

      expect(frame.commands.slice(0, 2)).toMatchObject([
        { kind: "circle", radius: middle, color: ART_PALETTE.outline },
        {
          kind: "circle",
          radius: middle - lineWidth(ART_SCALE),
          color: ART_PALETTE.balls[kind],
        },
      ]);
    },
  );

  it.each([
    ["normal", []],
    ["fire", ["polygon"]],
    ["blast", ["ring"]],
  ] as const)(
    "marks a %s ball in the marks' color with its own shape, which holds still",
    (kind, marks) => {
      const frame = frameNamed(ballFrame(kind));

      expect(
        frame.commands
          .slice(2)
          .filter((command) => command.color === ART_PALETTE.mark)
          .map((command) => command.kind),
      ).toEqual(marks);
    },
  );
});

describe("a capsule's frame", () => {
  it.each(CAPSULE_IDS)(
    "outlines the %s capsule in the outline's color, then fills it in its tone's, its symbol in the marks'",
    (id) => {
      const frame = frameNamed(capsuleFrame(id));

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
    const good = frameNamed(capsuleFrame("wide"));
    const bad = frameNamed(capsuleFrame("narrow"));

    expect([good.commands[1]?.color, bad.commands[1]?.color]).toEqual([
      ART_PALETTE.capsules.good,
      ART_PALETTE.capsules.bad,
    ]);
  });

  it("rounds a good capsule's ends and notches a bad one's", () => {
    const good = frameNamed(capsuleFrame("wide"));
    const bad = frameNamed(capsuleFrame("narrow"));

    expect([good.commands[0]?.kind, bad.commands[0]?.kind]).toEqual([
      "roundRect",
      "polygon",
    ]);
  });

  it("draws a symbol's lines as one path, so its corners join", () => {
    const frame = frameNamed(capsuleFrame("catch"));

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

  it("keeps the paddle's ends whole for its nine-slice, with a middle to stretch", () => {
    const paddle = frameNamed(FRAMES.paddle);

    expect({
      endsRound: (paddle.ends ?? 0) >= paddle.height / 2,
      middle: paddle.width - 2 * (paddle.ends ?? 0),
    }).toEqual({ endsRound: true, middle: 2 });
  });

  it("frames a brick's cell in the glow's color, a line past it on each side", () => {
    const glow = frameNamed(FRAMES.glow);
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
      (name) => frameNamed(name).commands[0]?.color,
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

  it("pictures a ghost brick still hidden", () => {
    expect(PICTURE_FRAMES.bricks.ghost).toMatch(/^ghost-/);
  });
});

describe("mapPictures", () => {
  it("turns every picture into another, keeping what it pictures", () => {
    const pictures: Pictures = {
      bricks: { ...PICTURE_FRAMES.bricks, plain: "a" },
      balls: { ...PICTURE_FRAMES.balls, fire: "b" },
      capsules: { ...PICTURE_FRAMES.capsules, net: "c" },
    };

    const mapped = mapPictures(pictures, (name) => `${name}!`);

    expect([
      mapped.bricks.plain,
      mapped.balls.fire,
      mapped.capsules.net,
      Object.keys(mapped.capsules),
    ]).toEqual(["a!", "b!", "c!", Object.keys(pictures.capsules)]);
  });
});
