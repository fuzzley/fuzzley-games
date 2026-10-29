import { BALL_KIND_IDS } from "../rules/catalog/balls";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKindId,
  hasTrait,
} from "../rules/catalog/bricks";
import { CAPSULE_IDS } from "../rules/catalog/capsules";
import { TINTS } from "../rules/level";
import {
  type ArtFrame,
  type ArtScale,
  type BrickLook,
  type DrawCommand,
  FRAMES,
  atlasFrames,
  ballFrame,
  brickFrame,
  capsuleFrame,
  lineWidth,
  tagFrame,
} from "./art";
import { type PaletteRoles, bricksPalette } from "./palette";

const ROLES: PaletteRoles = {
  panel: "#f1f3f5",
  text: "#1b1f24",
  accent: "#2f7d4f",
  danger: "#c62828",
  warning: "#a84b06",
};

const PALETTE = bricksPalette(ROLES, "light");

/** The scales a field is drawn at, from the smallest unit the layout allows to a large one at a pixel ratio of 3. */
const SCALES: readonly ArtScale[] = [
  { unit: 10, pixelRatio: 1 },
  { unit: 13, pixelRatio: 1.25 },
  { unit: 24, pixelRatio: 2 },
  { unit: 54, pixelRatio: 3 },
];

const SCALE: ArtScale = { unit: 24, pixelRatio: 2 };

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
    case "line": {
      const half = command.width / 2;
      return [
        Math.min(command.from.x, command.to.x) - half,
        Math.min(command.from.y, command.to.y) - half,
        Math.max(command.from.x, command.to.x) + half,
        Math.max(command.from.y, command.to.y) + half,
      ];
    }
    case "polygon": {
      const xs = command.points.map((point) => point.x);
      const ys = command.points.map((point) => point.y);
      return [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys),
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

/** Returns a frame of the atlas at the spec's scale, by its name. */
function frameNamed(name: string): ArtFrame {
  const frame = atlasFrames(PALETTE, SCALE).find((each) => each.name === name);
  if (!frame) throw new Error(`No frame "${name}"`);
  return frame;
}

/** Returns the commands of a frame that draw in a color, of a kind. */
function drawnIn(
  frame: ArtFrame,
  kind: DrawCommand["kind"],
  color: number,
): readonly DrawCommand[] {
  return frame.commands.filter(
    (command) => command.kind === kind && command.color === color,
  );
}

/** Returns every look a brick of a kind can have: each whole, each count of hits left, shown or not, in each tint. */
function looksOf(kind: BrickKindId): readonly BrickLook[] {
  const { hits, mostHits } = BRICK_KINDS[kind];
  const wholes =
    hits === "never"
      ? [0]
      : Array.from({ length: mostHits - hits + 1 }, (_, i) => hits + i);
  const shown = hasTrait(kind, "hidden") ? [false, true] : [true];
  return wholes.flatMap((whole) =>
    Array.from({ length: Math.max(1, whole) }, (_, i) =>
      whole === 0 ? 0 : i + 1,
    ).flatMap((left) =>
      shown.flatMap((isShown) =>
        Array.from({ length: TINTS }, (_, tint) => ({
          kind,
          tint,
          whole,
          hits: left,
          shown: isShown,
        })),
      ),
    ),
  );
}

describe.each(SCALES)(
  "atlasFrames at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    const frames = atlasFrames(PALETTE, scale);

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

    it("draws lines a CSS pixel wide or more", () => {
      expect(lineWidth(scale)).toBeGreaterThanOrEqual(scale.pixelRatio);
    });
  },
);

describe("brickFrame", () => {
  const names = new Set(atlasFrames(PALETTE, SCALE).map((frame) => frame.name));

  it.each(BRICK_KIND_IDS)(
    "names a frame the atlas holds for a %s brick in every state",
    (kind) => {
      const missing = looksOf(kind).filter(
        (look) => !names.has(brickFrame(look)),
      );

      expect(missing).toEqual([]);
    },
  );

  it("shows a ghost brick, once it shows, as a plain one", () => {
    const ghost: BrickLook = {
      kind: "ghost",
      tint: 3,
      whole: 2,
      hits: 1,
      shown: true,
    };

    expect(brickFrame(ghost)).toBe(
      brickFrame({ ...ghost, kind: "plain", whole: 1 }),
    );
  });

  it("shows a hidden ghost brick as a frame of its own", () => {
    const ghost: BrickLook = {
      kind: "ghost",
      tint: 3,
      whole: 2,
      hits: 2,
      shown: false,
    };

    expect(brickFrame(ghost)).not.toBe(
      brickFrame({ ...ghost, kind: "plain", whole: 1, hits: 1, shown: true }),
    );
  });

  it("throws for a brick no level can lay", () => {
    const look: BrickLook = {
      kind: "tough",
      tint: 0,
      whole: 9,
      hits: 9,
      shown: true,
    };

    expect(() => brickFrame(look)).toThrow("No frame");
  });
});

describe("a tough brick's frame", () => {
  /** Returns the frame a tough brick of four hits shows with some left. */
  function toughWith(hits: number): ArtFrame {
    return frameNamed(
      brickFrame({ kind: "tough", tint: 0, whole: 4, hits, shown: true }),
    );
  }

  it.each([1, 2, 3, 4])("shows a pip for each of %i hits left", (hits) => {
    const frame = toughWith(hits);

    expect(drawnIn(frame, "circle", PALETTE.mark)).toHaveLength(hits);
  });

  it.each([1, 2, 3, 4])(
    "shows a crack, of two lines, for each hit taken, with %i left",
    (hits) => {
      const frame = toughWith(hits);

      expect(drawnIn(frame, "line", PALETTE.mark)).toHaveLength(2 * (4 - hits));
    },
  );

  it("is drawn in the deeper tint", () => {
    const frame = toughWith(4);

    expect(frame.commands[0]).toMatchObject({
      kind: "roundRect",
      color: PALETTE.toughTints[0],
    });
  });
});

describe("a ball's frame", () => {
  it.each(BALL_KIND_IDS)(
    "outlines a %s ball in the outline's color, a line's width wide",
    (kind) => {
      const frame = frameNamed(ballFrame(kind));
      const middle = frame.width / 2;

      expect(frame.commands.slice(0, 2)).toMatchObject([
        { kind: "circle", radius: middle, color: PALETTE.outline },
        {
          kind: "circle",
          radius: middle - lineWidth(SCALE),
          color: PALETTE.balls[kind],
        },
      ]);
    },
  );
});

describe("a capsule's frame", () => {
  it.each(CAPSULE_IDS)(
    "outlines the %s capsule in the outline's color, then fills it in its tone's",
    (id) => {
      const frame = frameNamed(capsuleFrame(id));

      expect(
        frame.commands.slice(0, 2).map((command) => command.color),
      ).toEqual([PALETTE.outline, expect.any(Number)]);
    },
  );

  it("draws a good capsule's body in the accent and a bad one's in the danger color", () => {
    const good = frameNamed(capsuleFrame("wide"));
    const bad = frameNamed(capsuleFrame("narrow"));

    expect([good.commands[1]?.color, bad.commands[1]?.color]).toEqual([
      PALETTE.capsules.good,
      PALETTE.capsules.bad,
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
});

describe("the atlas", () => {
  const names = new Set(atlasFrames(PALETTE, SCALE).map((frame) => frame.name));

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

  it("draws each tag in its capsule's tone", () => {
    const tones = [tagFrame("wide"), tagFrame("fast")].map(
      (name) => frameNamed(name).commands[0]?.color,
    );

    expect(tones).toEqual([PALETTE.capsules.good, PALETTE.capsules.bad]);
  });
});
