import {
  BRICK_SLAB,
  slabBody,
  slabCommands,
  slabFace,
} from "@fz/phaser/bricks";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtFrame,
  type CircleCommand,
  type DrawCommand,
  type LineCommand,
  type Point,
  type PolygonCommand,
  type RectCommand,
  type RingCommand,
  type RoundRectCommand,
  extentOf,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { luminance, rgbOf } from "@fz/style/testing";
import { hitBrick } from "../../rules/bricks/bricks";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKindId,
  hasTrait,
} from "../../rules/catalog/bricks";
import { LEGEND } from "../../rules/levels/legend";
import { TINTS } from "../../rules/levels/level";
import { stepsIn } from "../../rules/stepper";
import { FRIEND_INKS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  FIELD_SCALES,
  SMALL_SCALE,
} from "../../testing/art_frames";
import {
  KEEPER,
  ballOf,
  brickAt,
  fieldFrom,
  throwBall,
} from "../../testing/field_picture";
import { atlasFrames } from "./art";
import {
  BRICK_ART,
  type BrickLook,
  type CellField,
  PICTURED_FIELD,
  REGROW_RING_STEPS,
  brickColor,
  brickFrame,
  cellFrame,
  nextFriend,
  regrowShare,
  regrowingFrame,
} from "./brick_art";

/** A CSS pixel in device pixels at the scale the specs draw at. */
const CSS_PIXEL = ART_SCALE.pixelRatio;

/** Where a triangle's missing corner stands in, so a spec with too few fails on its sizes rather than its types. */
const ORIGIN: Point = { x: 0, y: 0 };

/** The atlas's frames at a scale too small for a brick's finest detail. */
const SMALL_FRAMES = atlasFrames(ART_PALETTE, SMALL_SCALE);

/** Describes where the shared legend lays a brick apart from its hits: its pair and its heading. */
type Placing = Pick<BrickLook, "pair" | "heading">;

/** Where a brick lies that is of no pair and heads nowhere, as every kind but a portal and a slider is. */
const NOWHERE: Placing = { pair: 0, heading: 0 };

/** Returns each pair and heading the shared legend lays a brick of a kind with, or {@link NOWHERE} for a kind it doesn't name. */
function placingsOf(kind: BrickKindId): readonly Placing[] {
  const specs = Object.values(LEGEND).filter((spec) => spec.kind === kind);
  if (specs.length === 0) return [NOWHERE];
  const pairs = new Set(specs.map((spec) => spec.pair ?? 0));
  const headings = new Set(specs.map((spec) => spec.heading ?? 0));
  return [...pairs].flatMap((pair) =>
    [...headings].map((heading) => ({ pair, heading })),
  );
}

/** Returns every look a brick of a kind can have: each whole, each count of hits left, shown or not, in each tint, of each pair and heading. */
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
        placingsOf(kind).flatMap((placing) =>
          Array.from({ length: TINTS }, (_, tint) => ({
            kind,
            tint,
            whole,
            hits: left,
            shown: isShown,
            ...placing,
          })),
        ),
      ),
    ),
  );
}

/** Returns a look of a brick of a kind, whole, in a tint, as the shared legend first lays it. */
function lookOf(kind: BrickKindId, tint = 0): BrickLook {
  const { hits } = BRICK_KINDS[kind];
  const whole = hits === "never" ? 0 : hits;
  const [placing = NOWHERE] = placingsOf(kind);
  return { kind, tint, whole, hits: whole, shown: true, ...placing };
}

/** Returns a field, as a brick is pictured on its own, that has freed so many friends. */
function freedSoMany(friendsFreed: number): CellField {
  return { ...PICTURED_FIELD, friendsFreed };
}

/** Returns the frame a brick shows, among frames. */
function frameOf(look: BrickLook, frames = ART_FRAMES): ArtFrame {
  return frameNamed(frames, brickFrame(look));
}

/** Returns the circles a frame draws in a color. */
function circlesIn(frame: ArtFrame, color: number): readonly CircleCommand[] {
  return drawnIn(frame, "circle", color).flatMap((command) =>
    command.kind === "circle" ? [command] : [],
  );
}

/** Returns the polygons a frame draws in a color. */
function polygonsIn(frame: ArtFrame, color: number): readonly PolygonCommand[] {
  return drawnIn(frame, "polygon", color).flatMap((command) =>
    command.kind === "polygon" ? [command] : [],
  );
}

/** Returns the rectangles of a kind, plain or rounded, a frame draws in a color. */
function rectsIn(
  frame: ArtFrame,
  kind: "rect" | "roundRect",
  color: number,
): readonly (RectCommand | RoundRectCommand)[] {
  return drawnIn(frame, kind, color).flatMap((command) =>
    command.kind === "rect" || command.kind === "roundRect" ? [command] : [],
  );
}

/** Returns the rings a frame draws in a color. */
function ringsIn(frame: ArtFrame, color: number): readonly RingCommand[] {
  return drawnIn(frame, "ring", color).flatMap((command) =>
    command.kind === "ring" ? [command] : [],
  );
}

/** Returns where in a frame's drawing each of some of its commands comes, so a spec can say what is drawn over what. */
function placesOf(
  frame: ArtFrame,
  commands: readonly (DrawCommand | undefined)[],
): readonly number[] {
  return commands.map((command) =>
    command ? frame.commands.indexOf(command) : NaN,
  );
}

/** Returns how wide a command's line is, straight lines too, or null for one that fills. */
function lineOf(command: DrawCommand): number | null {
  return command.kind === "line" ||
    command.kind === "polyline" ||
    command.kind === "ring"
    ? command.width
    : null;
}

/** Returns a frame's whole cell. */
function cellOf(frame: ArtFrame): Area {
  return { x: 0, y: 0, width: frame.width, height: frame.height };
}

/** Returns a number to a billionth, so two worked out alike but for a rounding are equal. */
function billionths(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

/** Returns the middle and the radius of the circle inside a triangle, each to a billionth. */
function circleInside(points: readonly Point[]): Point & { radius: number } {
  const [a = ORIGIN, b = ORIGIN, c = ORIGIN] = points;
  const across = [
    Math.hypot(b.x - c.x, b.y - c.y),
    Math.hypot(c.x - a.x, c.y - a.y),
    Math.hypot(a.x - b.x, a.y - b.y),
  ] as const;
  const around = across[0] + across[1] + across[2];
  const area =
    Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  return {
    x: billionths(
      (a.x * across[0] + b.x * across[1] + c.x * across[2]) / around,
    ),
    y: billionths(
      (a.y * across[0] + b.y * across[1] + c.y * across[2]) / around,
    ),
    radius: billionths((2 * area) / around),
  };
}

/** Returns the largest of some circles. */
function largest(circles: readonly CircleCommand[]): CircleCommand | undefined {
  return [...circles].sort((a, b) => b.radius - a.radius)[0];
}

/** Returns the friends' inks a frame draws in, by their place among them. */
function friendInkIn(frame: ArtFrame): readonly number[] {
  const colors = new Set(frame.commands.map(({ color }) => color));
  return ART_PALETTE.friendInks.flatMap((ink, i) =>
    colors.has(ink) ? [i] : [],
  );
}

/** Returns where a command's middle lies, across and down. */
function middleOf(command: DrawCommand): Point {
  const { x, y, width, height } = extentOf(command);
  return { x: x + width / 2, y: y + height / 2 };
}

describe("brickFrame", () => {
  const names = new Set(
    atlasFrames(ART_PALETTE, ART_SCALE).map((frame) => frame.name),
  );

  it.each(BRICK_KIND_IDS)(
    "names a frame the atlas holds for a %s brick in every state",
    (kind) => {
      const missing = looksOf(kind).filter(
        (look) => !names.has(brickFrame(look)),
      );

      expect(missing).toEqual([]);
    },
  );

  it("shows a ghost brick, once it shows, as a frame of its own, not a plain brick's nor a hidden ghost's", () => {
    const ghost: BrickLook = { ...lookOf("ghost", 3), hits: 1 };

    expect(
      new Set([
        brickFrame(ghost),
        brickFrame({ ...ghost, shown: false }),
        brickFrame({ ...ghost, kind: "plain", whole: 1 }),
      ]).size,
    ).toBe(3);
  });

  it("shows a regrowing brick as one frame, whatever the level tints it", () => {
    expect(brickFrame(lookOf("regrow", 0))).toBe(
      brickFrame(lookOf("regrow", 5)),
    );
  });

  it.each([
    [9, 9],
    [1, 1],
    [3, 0],
    [2, 3],
  ])(
    "throws for a tough brick taking %i hits whole with %i left, as no level lays one",
    (whole, hits) => {
      const look: BrickLook = { ...lookOf("tough"), whole, hits };

      expect(() => brickFrame(look)).toThrow("No frame");
    },
  );
});

describe("every brick's frame", () => {
  // Every look but a ghost's, which stands on no slab, hidden or shown, and
  // a bumper's and a portal's, which are round.
  const slabbed = BRICK_KIND_IDS.filter(
    (kind) =>
      kind !== "ghost" && !hasTrait(kind, "bumps") && !hasTrait(kind, "jumps"),
  ).flatMap((kind) => looksOf(kind).filter((look) => look.tint === 2));

  it.each(slabbed)(
    "stands a $kind brick, $hits of $whole hits left, on the slab in the color its shards take",
    (look) => {
      const frame = frameOf(look);

      expect(frame.commands.slice(0, 3)).toEqual(
        slabCommands(cellOf(frame), brickColor(look, ART_PALETTE), BRICK_SLAB),
      );
    },
  );

  it.each(FIELD_SCALES)(
    "draws every line of every brick a CSS pixel wide or more, at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
    (scale) => {
      const thin = BRICK_KIND_IDS.flatMap((kind) =>
        BRICK_ART[kind].frames(ART_PALETTE, scale),
      ).filter((frame) =>
        frame.commands.some((command) => {
          const width = lineOf(command);
          return width !== null && width < scale.pixelRatio;
        }),
      );

      expect(thin.map((frame) => frame.name)).toEqual([]);
    },
  );
});

describe("a tough brick's frame", () => {
  /** Returns the frame a tough brick of four hits shows with some left. */
  function toughWith(hits: number, frames = ART_FRAMES): ArtFrame {
    return frameOf({ ...lookOf("tough"), whole: 4, hits }, frames);
  }

  it.each([1, 2, 3, 4])(
    "shows a pip cut out for each of %i hits left",
    (hits) => {
      const frame = toughWith(hits);

      expect(circlesIn(frame, ART_PALETTE.mark)).toHaveLength(hits);
    },
  );

  it("lays its pips in a row across the brick's middle, a step apart", () => {
    const frame = toughWith(3);
    const pips = circlesIn(frame, ART_PALETTE.mark);
    const step = 0.3 * frame.height;

    expect({
      downs: new Set(pips.map(({ y }) => billionths(y))),
      acrosses: pips.map(({ x }) => billionths(x)),
    }).toEqual({
      downs: new Set([billionths(0.485 * frame.height)]),
      acrosses: [-step, 0, step].map((by) => billionths(frame.width / 2 + by)),
    });
  });

  it.each([1, 2, 3, 4])(
    "shows a crack for each hit taken, with %i left",
    (hits) => {
      const frame = toughWith(hits);

      expect(polygonsIn(frame, ART_PALETTE.mark)).toHaveLength(4 - hits);
    },
  );

  it("leaves out its cracks, but not its pips, where a brick is under 30 CSS pixels wide", () => {
    const frame = toughWith(2, SMALL_FRAMES);

    expect({
      pips: circlesIn(frame, ART_PALETTE.mark).length,
      cracks: polygonsIn(frame, ART_PALETTE.mark).length,
    }).toEqual({ pips: 2, cracks: 0 });
  });
});

describe("a steel brick's frame", () => {
  const { steelLine } = ART_PALETTE.kindInks;
  const sheen = mixColors(0xffffff, ART_PALETTE.bricks.steel, 0.5);

  it("frames it in the steel's line, a rivet in each corner of the frame, and two strokes of sheen", () => {
    const frame = frameOf(lookOf("steel"));
    const rivets = circlesIn(frame, steelLine);

    expect({
      frame: polygonsIn(frame, steelLine).length,
      rivets: new Set(rivets.map(({ x, y }) => `${String(x)} ${String(y)}`))
        .size,
      sheen: drawnIn(frame, "line", sheen).length,
    }).toEqual({ frame: 1, rivets: 4, sheen: 2 });
  });

  it("keeps its frame, but leaves out its rivets and sheen, where a brick is under 30 CSS pixels wide", () => {
    const frame = frameOf(lookOf("steel"), SMALL_FRAMES);

    expect(frame.commands.slice(3).map(({ color }) => color)).toEqual([
      steelLine,
    ]);
  });
});

describe("a blast brick's frame", () => {
  const frame = frameOf(lookOf("blast"));

  it("puts a dot toward each brick around it that it reaches, three down each end", () => {
    const dots = circlesIn(frame, ART_PALETTE.mark).filter(
      ({ radius }) => billionths(radius) === billionths(0.04 * frame.height),
    );

    expect({
      count: dots.length,
      acrosses: new Set(dots.map(({ x }) => billionths(x / frame.width))),
      downs: new Set(dots.map(({ y }) => billionths(y / frame.height))),
    }).toEqual({
      count: 6,
      acrosses: new Set([0.11, 0.89]),
      downs: new Set([0.22, 0.46, 0.7]),
    });
  });

  it("cuts out its bomb, round, toward its middle, and lights its spark", () => {
    const body = circlesIn(frame, ART_PALETTE.mark).find(
      ({ radius }) => radius > 0.2 * frame.height,
    );

    expect({
      across: Math.round(((body?.x ?? 0) / frame.width) * 100),
      sparks: polygonsIn(frame, ART_PALETTE.kindInks.spark).length,
    }).toEqual({ across: 48, sparks: 1 });
  });
});

describe("a gift brick's frame", () => {
  const frame = frameOf(lookOf("gift"));
  const { ribbon } = ART_PALETTE.kindInks;

  it("runs a ribbon down its middle, from the body's top to its lip, its sides on whole pixels", () => {
    const [band] = drawnIn(frame, "rect", ribbon);
    const face = slabFace(cellOf(frame), BRICK_SLAB);

    expect(band).toEqual({
      kind: "rect",
      x: 36,
      y: face.y,
      width: 8,
      height: face.height,
      color: ribbon,
    });
  });

  it("ties a bow of two loops and a knot, each outlined in the marks' color a CSS pixel inside its edge", () => {
    const outlines = polygonsIn(frame, ART_PALETTE.mark).map(({ points }) =>
      circleInside(points),
    );
    const loops = polygonsIn(frame, ribbon).map(({ points }) =>
      circleInside(points),
    );
    const knots = [
      ...circlesIn(frame, ART_PALETTE.mark),
      ...circlesIn(frame, ribbon),
    ].map(({ x, y, radius }) => ({ x, y, radius }));

    expect({ loops, knot: knots[1] }).toEqual({
      loops: outlines.map((outline) => ({
        ...outline,
        radius: billionths(outline.radius - CSS_PIXEL),
      })),
      knot: { ...knots[0], radius: (knots[0]?.radius ?? 0) - CSS_PIXEL },
    });
  });

  it("mirrors its loops about the brick's middle", () => {
    const [right, left] = polygonsIn(frame, ART_PALETTE.mark).map(middleOf);

    expect(billionths((right?.x ?? 0) + (left?.x ?? 0))).toBe(frame.width);
  });
});

describe("a ghost brick's frames", () => {
  const ghost: BrickLook = { ...lookOf("ghost", 4), shown: false };
  const hidden = ART_PALETTE.ghostTints.hidden[4] ?? NaN;
  const shown = ART_PALETTE.ghostTints.shown[4] ?? NaN;

  it("draws a hidden ghost on no slab, in its faded tint alone: round dashes, and two faint eyes", () => {
    const frame = frameOf(ghost);

    expect({
      colors: new Set(frame.commands.map(({ color }) => color)),
      kinds: new Set(frame.commands.map(({ kind }) => kind)),
      eyes: polygonsIn(frame, hidden).length,
    }).toEqual({
      colors: new Set([hidden]),
      kinds: new Set(["line", "circle", "polygon"]),
      eyes: 2,
    });
  });

  it("draws a shown ghost as a body under a hem of six scallops in its paler tint, its two eyes cut out", () => {
    const frame = frameOf({ ...ghost, hits: 1, shown: true });

    expect({
      body: polygonsIn(frame, shown).length,
      scallops: circlesIn(frame, shown).length,
      eyes: polygonsIn(frame, ART_PALETTE.mark).length,
    }).toEqual({ body: 1, scallops: 6, eyes: 2 });
  });
});

describe("a regrowing brick's frame", () => {
  const frame = frameOf(lookOf("regrow"));
  const { moss, mossShadow } = ART_PALETTE.kindInks;

  it("caps its earth with moss down to nine scallops, each over a shadow", () => {
    expect({
      cap: polygonsIn(frame, moss).length,
      scallops: circlesIn(frame, moss).length,
      shadows: circlesIn(frame, mossShadow).length,
    }).toEqual({ cap: 1, scallops: 9, shadows: 9 });
  });

  it("cuts a sprout out of its cap, a stem and two leaves, about the brick's middle", () => {
    const leaves = polygonsIn(frame, ART_PALETTE.mark).map(middleOf);

    expect({
      stem: drawnIn(frame, "line", ART_PALETTE.mark).length,
      leaves: leaves.length,
      middle: billionths(((leaves[0]?.x ?? 0) + (leaves[1]?.x ?? 0)) / 2),
    }).toEqual({ stem: 1, leaves: 2, middle: frame.width / 2 });
  });
});

describe("a plated brick's frame", () => {
  const { plate, plateShine, steelLine } = ART_PALETTE.kindInks;

  /** Returns the frame a plated brick shows, taking so many hits whole with some left. */
  function platedWith(
    whole: number,
    hits: number,
    frames = ART_FRAMES,
  ): ArtFrame {
    return frameOf({ ...lookOf("plated"), whole, hits }, frames);
  }

  /** Returns a frame's plate, the one rounded rectangle in the steel. */
  function plateOf(
    frame: ArtFrame,
  ): RoundRectCommand | RectCommand | undefined {
    return rectsIn(frame, "roundRect", plate)[0];
  }

  it.each([
    [1, 1],
    [2, 2],
    [2, 1],
  ])(
    "shows a pip cut out for each hit left, taking %i whole with %i left, and a crack for each taken",
    (whole, hits) => {
      const frame = platedWith(whole, hits);

      expect({
        pips: circlesIn(frame, ART_PALETTE.mark).length,
        cracks: polygonsIn(frame, ART_PALETTE.mark).length,
      }).toEqual({ pips: hits, cracks: whole - hits });
    },
  );

  it("lays its pips in a row higher than a tough brick's, clear above its plate", () => {
    const frame = platedWith(2, 2);
    const pips = circlesIn(frame, ART_PALETTE.mark);
    const top = plateOf(frame)?.y ?? 0;

    expect({
      downs: new Set(pips.map(({ y }) => billionths(y))),
      clear: pips.every(({ y, radius }) => y + radius < top),
    }).toEqual({
      downs: new Set([billionths(0.38 * frame.height)]),
      clear: true,
    });
  });

  it("lays a plate of steel along its foot, a little wider than the brick, its top and foot on whole pixels, with a shine along its top and a rivet near each end", () => {
    const frame = platedWith(1, 1);

    expect({
      plate: plateOf(frame),
      shine: rectsIn(frame, "roundRect", plateShine).length,
      rivets: circlesIn(frame, steelLine).map(({ x, y }) => ({
        x: billionths(x / frame.width),
        y: billionths(y / frame.height),
      })),
    }).toEqual({
      plate: {
        kind: "roundRect",
        x: (2 * frame.height) / 100,
        y: Math.round((66 * frame.height) / 100),
        width: (196 * frame.height) / 100,
        height:
          Math.round((88 * frame.height) / 100) -
          Math.round((66 * frame.height) / 100),
        radius: (6 * frame.height) / 100,
        color: plate,
      },
      shine: 1,
      rivets: [
        { x: 0.11, y: 0.79 },
        { x: 0.89, y: 0.79 },
      ],
    });
  });

  it("cuts the brick away in the marks' color from a CSS pixel above its plate to its foot, so the steel stands apart from any tint", () => {
    const frame = platedWith(1, 1);
    const body = slabBody(cellOf(frame), BRICK_SLAB);
    const [square] = rectsIn(frame, "rect", ART_PALETTE.mark);
    const [round] = rectsIn(frame, "roundRect", ART_PALETTE.mark);

    expect({
      top: square?.y,
      across: [square?.x, square?.width, round?.x, round?.width],
      foot: round && round.y + round.height,
    }).toEqual({
      top: (plateOf(frame)?.y ?? 0) - CSS_PIXEL,
      across: [body.x, body.width, body.x, body.width],
      foot: body.y + body.height,
    });
  });

  it("points nine teeth of steel down from under its plate, past the brick's foot", () => {
    const frame = platedWith(1, 1);
    const teeth = polygonsIn(frame, plate);

    expect({
      count: teeth.length,
      tips: new Set(
        teeth.map(({ points }) =>
          billionths(Math.max(...points.map(({ y }) => y))),
        ),
      ),
      feet: new Set(
        teeth.map(({ points }) =>
          billionths(Math.min(...points.map(({ y }) => y))),
        ),
      ),
    }).toEqual({
      count: 9,
      tips: new Set([billionths(0.97 * frame.height)]),
      feet: new Set([billionths(0.86 * frame.height)]),
    });
  });

  it("draws its teeth over the cut, its plate over their feet, and its shine and rivets over its plate", () => {
    const frame = platedWith(1, 1);
    const cut = placesOf(frame, [
      ...rectsIn(frame, "rect", ART_PALETTE.mark),
      ...rectsIn(frame, "roundRect", ART_PALETTE.mark),
    ]);
    const teeth = placesOf(frame, polygonsIn(frame, plate));
    const [steel = NaN] = placesOf(frame, [plateOf(frame)]);
    const over = placesOf(frame, [
      ...rectsIn(frame, "roundRect", plateShine),
      ...circlesIn(frame, steelLine),
    ]);

    expect({
      teeth: Math.min(...teeth) > Math.max(...cut),
      plate: steel > Math.max(...teeth),
      over: Math.min(...over) > steel,
    }).toEqual({ teeth: true, plate: true, over: true });
  });

  it("keeps its pips, plate, cut and teeth, but leaves out its crack, shine and rivets, where a brick is under 30 CSS pixels wide", () => {
    const frame = platedWith(2, 1, SMALL_FRAMES);

    expect({
      pips: circlesIn(frame, ART_PALETTE.mark).length,
      plate: plateOf(frame) !== undefined,
      cut: rectsIn(frame, "rect", ART_PALETTE.mark).length,
      teeth: polygonsIn(frame, plate).length,
      cracks: polygonsIn(frame, ART_PALETTE.mark).length,
      shine: rectsIn(frame, "roundRect", plateShine).length,
      rivets: circlesIn(frame, steelLine).length,
    }).toEqual({
      pips: 1,
      plate: true,
      cut: 1,
      teeth: 9,
      cracks: 0,
      shine: 0,
      rivets: 0,
    });
  });
});

describe("a cage's frames", () => {
  const cage = lookOf("cage");
  const hit: BrickLook = { ...cage, hits: 1 };
  const steel = ART_PALETTE.bricks.cage;

  it("holds the friend a field frees next, in that friend's ink, the first again after the last", () => {
    const frames = [0, 3, FRIEND_INKS].map((freed) =>
      frameNamed(ART_FRAMES, brickFrame(cage, freedSoMany(freed))),
    );

    expect(frames.map(friendInkIn)).toEqual([[0], [3], [0]]);
  });

  it("names the friend the rules free next, the ink they dress it in", () => {
    const field = fieldFrom(["c", ...KEEPER]);
    throwBall(field, 20, 25, 0);
    field.friendsFreed = FRIEND_INKS + 2;
    const shown = nextFriend(field.friendsFreed);

    hitBrick(field, brickAt(field, 0, 0), 0, 0, "breaks");

    expect(ballOf(field, 1).ink).toBe(shown);
  });

  it("cuts out its inside in the marks' color, and stands six bars of steel over its friend, its body about its middle and fur, and its eyes", () => {
    const frame = frameNamed(ART_FRAMES, brickFrame(cage, freedSoMany(2)));
    const ink = ART_PALETTE.friendInks[2] ?? NaN;
    const body = largest(circlesIn(frame, ink));

    expect({
      inside: rectsIn(frame, "roundRect", ART_PALETTE.mark).length,
      bars: rectsIn(frame, "rect", steel).length,
      body: body && {
        x: billionths(body.x / frame.width),
        y: billionths(body.y / frame.height),
      },
      fur: drawnIn(frame, "line", ink).length > 0,
      eyes: polygonsIn(frame, ART_PALETTE.mark).length,
    }).toEqual({
      inside: 1,
      bars: 6,
      body: { x: 0.5, y: 0.47 },
      fur: true,
      eyes: 2,
    });
  });

  it("draws its friend over its inside, and its bars over its friend, mirrored about its middle", () => {
    const frame = frameNamed(ART_FRAMES, brickFrame(cage));
    const bars = rectsIn(frame, "rect", steel);
    const middles = bars.map(({ x, width }) => x + width / 2);
    const [inside = NaN] = placesOf(
      frame,
      rectsIn(frame, "roundRect", ART_PALETTE.mark),
    );
    const ink = ART_PALETTE.friendInks[0];
    const friend = placesOf(
      frame,
      frame.commands.filter(({ color }) => color === ink),
    );

    expect({
      friend: Math.min(...friend) > inside,
      bars: Math.min(...placesOf(frame, bars)) > Math.max(...friend),
      mirrored: middles.map((middle, i) =>
        billionths(middle + (middles[middles.length - 1 - i] ?? 0)),
      ),
    }).toEqual({
      friend: true,
      bars: true,
      mirrored: middles.map(() => frame.width),
    });
  });

  it("breaks the first bar right of its middle into two bent ends once hit, and cracks its frame", () => {
    const whole = frameNamed(ART_FRAMES, brickFrame(cage));
    const broken = frameNamed(ART_FRAMES, brickFrame(hit));

    expect({
      bars: rectsIn(broken, "rect", steel).map(({ x }) => x),
      ends: polygonsIn(broken, steel).length,
      cracks:
        polygonsIn(broken, ART_PALETTE.mark).length -
        polygonsIn(whole, ART_PALETTE.mark).length,
    }).toEqual({
      bars: rectsIn(whole, "rect", steel)
        .map(({ x }) => x)
        .filter((_, i) => i !== 3),
      ends: 2,
      cracks: 1,
    });
  });

  it("keeps its bent bar, but leaves out its crack and its friend's fur, where a brick is under 30 CSS pixels wide", () => {
    const frame = frameNamed(SMALL_FRAMES, brickFrame(hit));
    const ink = ART_PALETTE.friendInks[0] ?? NaN;

    expect({
      ends: polygonsIn(frame, steel).length,
      eyes: polygonsIn(frame, ART_PALETTE.mark).length,
      body: circlesIn(frame, ink).length,
      fur: drawnIn(frame, "line", ink).length,
    }).toEqual({ ends: 2, eyes: 2, body: 1, fur: 0 });
  });
});

describe("a key brick's frame", () => {
  const frame = frameOf(lookOf("key"));

  it("cuts a key out of its gold, in the marks' color: a ring for its bow, its shaft and two teeth hanging from it", () => {
    const [bow] = ringsIn(frame, ART_PALETTE.mark);
    const parts = rectsIn(frame, "rect", ART_PALETTE.mark);

    expect({
      bow: bow && {
        x: billionths(bow.x / frame.width),
        y: billionths(bow.y / frame.height),
      },
      shaft: parts[0] && billionths(parts[0].y + parts[0].height / 2),
      teeth: parts.slice(1).map(({ y }) => billionths(y)),
    }).toEqual({
      bow: { x: 0.32, y: 0.46 },
      shaft: billionths(0.46 * frame.height),
      teeth: [0.46, 0.46].map((y) => billionths(y * frame.height)),
    });
  });
});

describe("a gate's frame", () => {
  const frame = frameOf(lookOf("gate"));
  const gold = ART_PALETTE.bricks.key;

  it("ends its steel in the key's gold each side, square inside, and cuts a keyhole between them in the steel's dark line", () => {
    const ends = rectsIn(frame, "roundRect", gold);
    const covers = rectsIn(frame, "rect", ART_PALETTE.bricks.gate);
    const { steelLine } = ART_PALETTE.kindInks;

    expect({
      ends: ends.length,
      covers: covers.length,
      keyhole: [
        circlesIn(frame, steelLine).length,
        polygonsIn(frame, steelLine).length,
      ],
    }).toEqual({ ends: 2, covers: 2, keyhole: [1, 1] });
  });

  it("mirrors its gold ends about its middle, each to the slab's face", () => {
    const [left, right] = rectsIn(frame, "roundRect", gold);
    const face = slabFace(cellOf(frame), BRICK_SLAB);

    expect({
      mirrored: left && right && billionths(left.x + right.x + right.width),
      down: [left?.y, left?.height],
    }).toEqual({ mirrored: frame.width, down: [face.y, face.height] });
  });

  it("draws its steel over the inner side of each gold end, and its keyhole over its steel", () => {
    const ends = placesOf(frame, rectsIn(frame, "roundRect", gold));
    const covers = placesOf(
      frame,
      rectsIn(frame, "rect", ART_PALETTE.bricks.gate),
    );
    const keyhole = placesOf(
      frame,
      frame.commands.filter(
        ({ color }) => color === ART_PALETTE.kindInks.steelLine,
      ),
    );

    expect({
      covers: Math.min(...covers) > Math.max(...ends),
      keyhole: Math.min(...keyhole) > Math.max(...covers),
    }).toEqual({ covers: true, keyhole: true });
  });
});

/** How many of the field's steps a regrowing brick takes to grow back. */
const GROWING_BACK = stepsIn(10_000);

/** Returns a regrowing brick, broken at step 100, as the field holds it. */
function brokenRegrow(): Parameters<typeof regrowShare>[0] {
  return {
    kind: "regrow",
    broken: true,
    regrowsAt: 100 + GROWING_BACK,
  };
}

/** Returns the lines of a regrowing brick's ring that fill it, those whose ends lie on it, about its frame's middle, the sprout's stem aside. */
function arcOf(frame: ArtFrame): readonly LineCommand[] {
  const middle = { x: frame.width / 2, y: frame.height / 2 };
  const radius = billionths((30 * frame.height) / 100);
  const onRing = ({ x, y }: Point): boolean =>
    billionths(Math.hypot(x - middle.x, y - middle.y)) === radius;
  return drawnIn(frame, "line", ART_PALETTE.kindInks.regrowRing).flatMap(
    (command) =>
      command.kind === "line" && onRing(command.from) && onRing(command.to)
        ? [command]
        : [],
  );
}

/** Returns how far round, clockwise, a regrowing brick's ring is filled, in turns, and where from. */
function filledOf(frame: ArtFrame): { turns: number; from: Point | null } {
  const middle = { x: frame.width / 2, y: frame.height / 2 };
  const angle = ({ x, y }: Point): number =>
    Math.atan2(y - middle.y, x - middle.x);
  const arc = arcOf(frame);
  const turned = arc.reduce((sum, { from, to }) => {
    const step = angle(to) - angle(from);
    return sum + (step < 0 ? step + 2 * Math.PI : step);
  }, 0);
  const from = arc[0]?.from ?? null;
  return {
    turns: billionths(turned / (2 * Math.PI)),
    from: from && { x: billionths(from.x), y: billionths(from.y) },
  };
}

describe("regrowShare", () => {
  it.each([
    [100, 0],
    [100 + GROWING_BACK / 2, 0.5],
    [100 + GROWING_BACK, 1],
    [200 + GROWING_BACK, 1],
  ])(
    "says a regrowing brick broken at step 100 has come, at step %i, %f of the way",
    (steps, share) => {
      expect(regrowShare(brokenRegrow(), steps)).toBe(share);
    },
  );

  it("says nothing of a regrowing brick that stands whole, or a broken brick that never regrows", () => {
    expect([
      regrowShare({ ...brokenRegrow(), broken: false }, 100),
      regrowShare({ ...brokenRegrow(), kind: "plain" }, 100),
    ]).toEqual([null, null]);
  });
});

describe("cellFrame", () => {
  const regrow = {
    ...lookOf("regrow"),
    cell: 0,
    capsule: null,
    broken: false,
    goesOffAt: 0,
    regrowsAt: 0,
    pair: 0,
    home: 0,
    heading: 0,
  };

  it("shows a brick that stands in its own frame", () => {
    expect(cellFrame(regrow, { steps: 100, friendsFreed: 0 })).toBe(
      brickFrame(regrow),
    );
  });

  it("shows a standing cage holding the friend the field beside it frees next", () => {
    const cage = { ...regrow, ...lookOf("cage") };

    const name = cellFrame(cage, freedSoMany(3));

    expect(name && friendInkIn(frameNamed(ART_FRAMES, name))).toEqual([3]);
  });

  it("shows a broken regrowing brick's ring, as far as it has come", () => {
    const broken = { ...regrow, ...brokenRegrow() };

    expect(
      cellFrame(broken, { steps: 100 + GROWING_BACK / 2, friendsFreed: 0 }),
    ).toBe(regrowingFrame(0.5));
  });

  it("shows nothing of a brick broken for good", () => {
    expect(
      cellFrame(
        { ...regrow, kind: "plain", broken: true },
        { steps: 100, friendsFreed: 0 },
      ),
    ).toBeNull();
  });
});

describe("regrowingFrame", () => {
  it("names a frame for each step of the ring, empty as it breaks and full once it may grow back", () => {
    const names = Array.from({ length: REGROW_RING_STEPS + 1 }, (_, step) =>
      regrowingFrame(step / REGROW_RING_STEPS),
    );

    expect({
      names: new Set(names).size,
      between: regrowingFrame(0.5 / REGROW_RING_STEPS),
      past: regrowingFrame(2),
    }).toEqual({
      names: REGROW_RING_STEPS + 1,
      between: regrowingFrame(0),
      past: regrowingFrame(1),
    });
  });
});

describe("a regrowing brick's ring as it grows back", () => {
  const { regrowRing, regrowTrack } = ART_PALETTE.kindInks;

  it.each([0, 0.25, 0.5, 1])(
    "draws its track whole and fills %f of it round from its top, clockwise",
    (share) => {
      const frame = frameNamed(ART_FRAMES, regrowingFrame(share));
      const top = {
        x: billionths(frame.width / 2),
        y: billionths(frame.height / 2 - (30 * frame.height) / 100),
      };

      expect({
        track: drawnIn(frame, "ring", regrowTrack).length,
        filled: filledOf(frame),
      }).toEqual({
        track: 1,
        filled: { turns: share, from: share === 0 ? null : top },
      });
    },
  );

  it("draws the track about the cell's middle, and the arc that fills it along it", () => {
    const frame = frameNamed(ART_FRAMES, regrowingFrame(0.5));

    expect({
      track: drawnIn(frame, "ring", regrowTrack),
      arc: arcOf(frame).length > 0,
    }).toMatchObject({
      track: [
        {
          x: frame.width / 2,
          y: frame.height / 2,
          radius: (30 * frame.height) / 100,
        },
      ],
      arc: true,
    });
  });

  it("stands a sprout in the ring, and leaves it out where a brick is too small for its finest detail", () => {
    const sprouts = [ART_FRAMES, SMALL_FRAMES].map(
      (frames) =>
        polygonsIn(frameNamed(frames, regrowingFrame(0.5)), regrowRing).length,
    );

    expect(sprouts).toEqual([2, 0]);
  });

  it("holds every frame of the ring among a regrowing brick's", () => {
    const names = new Set(
      BRICK_ART.regrow
        .frames(ART_PALETTE, ART_SCALE)
        .map((frame) => frame.name),
    );
    const wanted = Array.from({ length: REGROW_RING_STEPS + 1 }, (_, step) =>
      regrowingFrame(step / REGROW_RING_STEPS),
    );

    expect(wanted.filter((name) => !names.has(name))).toEqual([]);
  });
});

describe("a bumper's frame", () => {
  const frame = frameOf(lookOf("bumper"));
  const { bumper } = ART_PALETTE.bricks;
  const disc = largest(circlesIn(frame, bumper));

  it("stands its disc on no slab, in the bumper's color, 40 of the kit's units round about the brick's middle, a ring 26 round cut out of it in the marks' color", () => {
    const [ring] = ringsIn(frame, ART_PALETTE.mark);

    expect({
      slab: [
        ...rectsIn(frame, "rect", bumper),
        ...rectsIn(frame, "roundRect", bumper),
      ],
      across: disc && billionths(disc.x / frame.width),
      radius: disc && Math.round((disc.radius / frame.height) * 100),
      ring: ring && {
        x: ring.x,
        y: ring.y,
        radius: Math.round((ring.radius / frame.height) * 100),
      },
    }).toEqual({
      slab: [],
      across: 0.5,
      radius: 40,
      ring: { x: disc?.x, y: disc?.y, radius: 26 },
    });
  });

  it("draws a shadow as large and lower under its disc, then the disc, the ring cut out of it, and a lighter cap in its middle, inside the ring", () => {
    const [ring] = ringsIn(frame, ART_PALETTE.mark);
    const circles = frame.commands.flatMap((command) =>
      command.kind === "circle" && command !== disc ? [command] : [],
    );
    const shadow = circles.find(({ radius }) => radius === disc?.radius);
    const cap = circles.find(({ x, y }) => x === disc?.x && y === disc.y);
    const places = placesOf(frame, [shadow, disc, ring, cap]);

    expect({
      lower: (shadow?.y ?? 0) > (disc?.y ?? Infinity),
      order: places.map((place) => place - (places[0] ?? NaN)),
      lighter: luminance(rgbOf(cap?.color ?? NaN)) > luminance(rgbOf(bumper)),
      inside:
        (cap?.radius ?? Infinity) <
        (ring?.radius ?? 0) - (ring?.width ?? 0) / 2,
    }).toEqual({
      lower: true,
      order: [0, 1, 2, 3],
      lighter: true,
      inside: true,
    });
  });

  it("kicks a tick out of it toward each corner, 35° from across, past its disc", () => {
    const middle = { x: frame.width / 2, y: frame.height / 2 };
    const ticks = drawnIn(frame, "line", bumper).flatMap((command) =>
      command.kind === "line" ? [command] : [],
    );

    expect({
      angles: ticks.map(({ from, to }) =>
        Math.round((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI),
      ),
      past: ticks.every(
        ({ from }) =>
          Math.hypot(from.x - middle.x, from.y - middle.y) >
          (disc?.radius ?? Infinity),
      ),
    }).toEqual({ angles: [35, 145, -145, -35], past: true });
  });
});

describe("a portal's frames", () => {
  /** Returns the frame a portal of a pair shows, among frames. */
  function portalOf(pair: number, frames = ART_FRAMES): ArtFrame {
    return frameOf({ ...lookOf("portal"), pair }, frames);
  }

  /** Returns a portal's badge's disc, the circle in the marks' color drawn after its middle. */
  function badgeDiscOf(frame: ArtFrame): CircleCommand | undefined {
    return circlesIn(frame, ART_PALETTE.mark)[1];
  }

  /** Returns what a portal's badge is drawn with: its disc, and what lies about the disc's middle after it, to a hundredth of a pixel. */
  function badgeOf(frame: ArtFrame): readonly DrawCommand[] {
    const disc = badgeDiscOf(frame);
    const near = (a: number, b = NaN): boolean => Math.abs(a - b) < 0.01;
    return frame.commands.filter((command) => {
      const middle = middleOf(command);
      return near(middle.x, disc?.x) && near(middle.y, disc?.y);
    });
  }

  it.each([0, 1])(
    "rings pair %i in its ring's ink, 40 of the kit's units round, on no slab, round a middle in the marks' color about the brick's",
    (pair) => {
      const frame = portalOf(pair);
      const [ring] = ringsIn(frame, ART_PALETTE.portals[pair]?.ring ?? NaN);
      const [middle] = circlesIn(frame, ART_PALETTE.mark);

      expect({
        ring: ring && {
          x: ring.x,
          y: ring.y,
          radius: Math.round((ring.radius / frame.height) * 100),
        },
        middle: middle && {
          x: middle.x,
          y: middle.y,
          radius: Math.round((middle.radius / frame.height) * 100),
        },
        first: frame.commands[0],
      }).toEqual({
        ring: { x: frame.width / 2, y: frame.height / 2, radius: 40 },
        middle: { x: frame.width / 2, y: frame.height / 2, radius: 37 },
        first: middle,
      });
    },
  );

  it.each([0, 1])(
    "spirals three arms out of pair %i's middle in its glyph's ink, under its ring",
    (pair) => {
      const frame = portalOf(pair);
      const inks = ART_PALETTE.portals[pair];
      const arms = drawnIn(frame, "line", inks?.glyph ?? NaN);
      const [ring] = ringsIn(frame, inks?.ring ?? NaN);

      expect({
        lines: arms.length,
        under:
          Math.max(...placesOf(frame, arms)) <
          (placesOf(frame, [ring])[0] ?? NaN),
        inside: arms.every(
          (arm) =>
            arm.kind === "line" &&
            Math.hypot(
              arm.to.x - frame.width / 2,
              arm.to.y - frame.height / 2,
            ) <
              0.31 * frame.height,
        ),
      }).toEqual({ lines: 3 * 14, under: true, inside: true });
    },
  );

  it.each([0, 1])(
    "sets pair %i's badge on its ring, 40 of the kit's units up and to the right of its middle",
    (pair) => {
      const frame = portalOf(pair);
      const disc = badgeDiscOf(frame);
      const across = (disc?.x ?? NaN) - frame.width / 2;
      const down = (disc?.y ?? NaN) - frame.height / 2;

      expect({
        angle: Math.round((Math.atan2(down, across) * 180) / Math.PI),
        reach: Math.round((Math.hypot(across, down) / frame.height) * 100),
      }).toEqual({ angle: -45, reach: 40 });
    },
  );

  it("badges the first pair (`@`) with a dot and the second (`%`) with a hollow diamond, each in its glyph's ink on a disc in the marks' color on its ring", () => {
    const badges = [0, 1].map((pair) =>
      badgeOf(portalOf(pair)).map(({ kind, color }) => ({ kind, color })),
    );
    const { mark, portals } = ART_PALETTE;

    expect(badges).toEqual([
      [
        { kind: "circle", color: mark },
        { kind: "circle", color: portals[0]?.glyph },
      ],
      [
        { kind: "circle", color: mark },
        { kind: "polygon", color: portals[1]?.glyph },
        { kind: "polygon", color: mark },
      ],
    ]);
  });

  it("keeps its badges apart in shape where a brick is too small for its finest detail, a diamond reaching past a dot", () => {
    const [dot, diamond] = [0, 1].map((pair) => {
      const glyph = ART_PALETTE.portals[pair]?.glyph ?? NaN;
      return badgeOf(portalOf(pair, SMALL_FRAMES)).find(
        (command) => command.color === glyph,
      );
    });

    expect({
      dot: dot?.kind,
      diamond: diamond?.kind,
      reaches:
        diamond !== undefined &&
        dot !== undefined &&
        extentOf(diamond).height > extentOf(dot).height,
    }).toEqual({ dot: "circle", diamond: "polygon", reaches: true });
  });
});

describe("a slider's frames", () => {
  /** Returns the frame a slider heading a way shows, in the third tint. */
  function sliderOf(heading: number, frames = ART_FRAMES): ArtFrame {
    return frameOf({ ...lookOf("slider", 2), heading }, frames);
  }

  /** Returns each chevron a frame draws in a color, as its top end, its point and its foot end, as shares of the frame across and down. */
  function chevronsIn(frame: ArtFrame, color: number): readonly Point[][] {
    const lines = drawnIn(frame, "line", color).flatMap((command) =>
      command.kind === "line" ? [command] : [],
    );
    const share = ({ x, y }: Point): Point => ({
      x: billionths(x / frame.width),
      y: billionths(y / frame.height),
    });
    return Array.from({ length: lines.length / 2 }, (_, i) => {
      const [top, foot] = [lines[2 * i], lines[2 * i + 1]];
      return [top?.from, top?.to, foot?.to].map((point) =>
        share(point ?? { x: NaN, y: NaN }),
      );
    });
  }

  it.each([
    [1, [0.625, 0.715]],
    [-1, [0.375, 0.285]],
  ] as const)(
    "lights the chevron toward the end it heads for, heading %i, in the marks' color, pointing that way",
    (heading, [ends, point]) => {
      expect(chevronsIn(sliderOf(heading), ART_PALETTE.mark)).toEqual([
        [
          { x: ends, y: 0.3 },
          { x: point, y: 0.46 },
          { x: ends, y: 0.62 },
        ],
      ]);
    },
  );

  it.each([
    [1, [0.33, 0.5]],
    [-1, [0.67, 0.5]],
  ] as const)(
    "trails two chevrons behind it, heading %i, in its tint's trail, each its middle 34 of the kit's units on from the last",
    (heading, middles) => {
      const chevrons = chevronsIn(
        sliderOf(heading),
        ART_PALETTE.sliderTrails[2] ?? NaN,
      );

      expect(
        chevrons.map(([top, tip]) =>
          billionths(((top?.x ?? NaN) + (tip?.x ?? NaN)) / 2),
        ),
      ).toEqual(middles);
    },
  );

  it("keeps all three chevrons where a brick is too small for its finest detail", () => {
    const frame = sliderOf(1, SMALL_FRAMES);

    expect(frame.commands.filter(({ kind }) => kind === "line")).toHaveLength(
      6,
    );
  });

  it("names a frame of its own for each heading in each tint", () => {
    const names = [1, -1].flatMap((heading) =>
      Array.from({ length: TINTS }, (_, tint) =>
        brickFrame({ ...lookOf("slider", tint), heading }),
      ),
    );

    expect(new Set(names).size).toBe(2 * TINTS);
  });

  it("throws for a slider heading nowhere, as no level lays one", () => {
    const look: BrickLook = { ...lookOf("slider"), heading: 0 };

    expect(() => brickFrame(look)).toThrow("No slider heads 0");
  });
});

describe("brickColor", () => {
  it.each([
    ["plain", ART_PALETTE.tints[2]],
    ["tough", ART_PALETTE.toughTints[2]],
    ["steel", ART_PALETTE.bricks.steel],
    ["blast", ART_PALETTE.bricks.blast],
    ["gift", ART_PALETTE.bricks.gift],
    ["regrow", ART_PALETTE.bricks.regrow],
    ["cage", ART_PALETTE.bricks.cage],
    ["plated", ART_PALETTE.toughTints[2]],
    ["key", ART_PALETTE.bricks.key],
    ["gate", ART_PALETTE.bricks.gate],
    ["bumper", ART_PALETTE.bricks.bumper],
  ] as const)("draws a %s brick in its body's color", (kind, color) => {
    const look: BrickLook = { ...lookOf(kind, 2), whole: 2, hits: 1 };

    expect(brickColor(look, ART_PALETTE)).toBe(color);
  });

  it.each([
    [false, ART_PALETTE.ghostTints.hidden[2]],
    [true, ART_PALETTE.ghostTints.shown[2]],
  ] as const)(
    "draws a ghost brick, shown %s, in its tint as it stands",
    (shown, color) => {
      const look: BrickLook = { ...lookOf("ghost", 2), hits: 1, shown };

      expect(brickColor(look, ART_PALETTE)).toBe(color);
    },
  );

  it.each([0, 1])("draws a portal of pair %i in its ring's ink", (pair) => {
    const look: BrickLook = { ...lookOf("portal", 2), pair };

    expect(brickColor(look, ART_PALETTE)).toBe(ART_PALETTE.portals[pair]?.ring);
  });

  it("throws for a portal of a pair no level can lay", () => {
    const look: BrickLook = { ...lookOf("portal"), pair: 2 };

    expect(() => brickColor(look, ART_PALETTE)).toThrow("No portal pair 2");
  });

  it.each([1, -1])("draws a slider heading %i in its tint", (heading) => {
    const look: BrickLook = { ...lookOf("slider", 2), heading };

    expect(brickColor(look, ART_PALETTE)).toBe(ART_PALETTE.tints[2]);
  });

  it("throws for a tint no level can name", () => {
    const look: BrickLook = lookOf("plain", TINTS);

    expect(() => brickColor(look, ART_PALETTE)).toThrow("No tint");
  });
});
