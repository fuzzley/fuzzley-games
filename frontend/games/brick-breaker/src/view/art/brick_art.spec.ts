import { BRICK_SLAB, slabCommands, slabFace } from "@fz/phaser/bricks";
import { mixColors } from "@fz/phaser/color";
import {
  type Area,
  type ArtFrame,
  type CircleCommand,
  type DrawCommand,
  type LineCommand,
  type Point,
  type PolygonCommand,
  extentOf,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKindId,
  hasTrait,
} from "../../rules/catalog/bricks";
import { TINTS } from "../../rules/levels/level";
import { stepsIn } from "../../rules/stepper";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  FIELD_SCALES,
  SMALL_SCALE,
} from "../../testing/art_frames";
import { atlasFrames } from "./art";
import {
  BRICK_ART,
  type BrickLook,
  REGROW_RING_STEPS,
  brickColor,
  brickFrame,
  cellFrame,
  regrowShare,
  regrowingFrame,
} from "./brick_art";

/** A CSS pixel in device pixels at the scale the specs draw at. */
const CSS_PIXEL = ART_SCALE.pixelRatio;

/** Where a triangle's missing corner stands in, so a spec with too few fails on its sizes rather than its types. */
const ORIGIN: Point = { x: 0, y: 0 };

/** The atlas's frames at a scale too small for a brick's finest detail. */
const SMALL_FRAMES = atlasFrames(ART_PALETTE, SMALL_SCALE);

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

/** Returns a look of a brick of a kind, whole, in a tint. */
function lookOf(kind: BrickKindId, tint = 0): BrickLook {
  const { hits } = BRICK_KINDS[kind];
  const whole = hits === "never" ? 0 : hits;
  return { kind, tint, whole, hits: whole, shown: true };
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
    const ghost: BrickLook = {
      kind: "ghost",
      tint: 3,
      whole: 2,
      hits: 1,
      shown: true,
    };

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
      const look: BrickLook = {
        kind: "tough",
        tint: 0,
        whole,
        hits,
        shown: true,
      };

      expect(() => brickFrame(look)).toThrow("No frame");
    },
  );
});

describe("every brick's frame", () => {
  // Every look but a ghost's, which stands on no slab, hidden or shown.
  const slabbed = BRICK_KIND_IDS.filter((kind) => kind !== "ghost").flatMap(
    (kind) => looksOf(kind).filter((look) => look.tint === 2),
  );

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
    return frameOf(
      { kind: "tough", tint: 0, whole: 4, hits, shown: true },
      frames,
    );
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
  const ghost: BrickLook = {
    kind: "ghost",
    tint: 4,
    whole: 2,
    hits: 2,
    shown: false,
  };
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
  };

  it("shows a brick that stands in its own frame", () => {
    expect(cellFrame(regrow, 100)).toBe(brickFrame(regrow));
  });

  it("shows a broken regrowing brick's ring, as far as it has come", () => {
    const broken = { ...regrow, ...brokenRegrow() };

    expect(cellFrame(broken, 100 + GROWING_BACK / 2)).toBe(regrowingFrame(0.5));
  });

  it("shows nothing of a brick broken for good", () => {
    expect(
      cellFrame({ ...regrow, kind: "plain", broken: true }, 100),
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

describe("brickColor", () => {
  it.each([
    ["plain", ART_PALETTE.tints[2]],
    ["tough", ART_PALETTE.toughTints[2]],
    ["steel", ART_PALETTE.bricks.steel],
    ["blast", ART_PALETTE.bricks.blast],
    ["gift", ART_PALETTE.bricks.gift],
    ["regrow", ART_PALETTE.bricks.regrow],
  ] as const)("draws a %s brick in its body's color", (kind, color) => {
    const look: BrickLook = { kind, tint: 2, whole: 2, hits: 1, shown: true };

    expect(brickColor(look, ART_PALETTE)).toBe(color);
  });

  it.each([
    [false, ART_PALETTE.ghostTints.hidden[2]],
    [true, ART_PALETTE.ghostTints.shown[2]],
  ] as const)(
    "draws a ghost brick, shown %s, in its tint as it stands",
    (shown, color) => {
      const look: BrickLook = {
        kind: "ghost",
        tint: 2,
        whole: 2,
        hits: 1,
        shown,
      };

      expect(brickColor(look, ART_PALETTE)).toBe(color);
    },
  );

  it.each([
    ["cage", ART_PALETTE.tints[4]],
    ["plated", ART_PALETTE.tints[5]],
    ["key", ART_PALETTE.tints[2]],
    ["gate", ART_PALETTE.tints[6]],
  ] as const)(
    "draws a %s brick, which has no art of its own yet, in one tint, whatever the level tints it",
    (kind, color) => {
      const look: BrickLook = { kind, tint: 0, whole: 2, hits: 1, shown: true };

      expect(brickColor(look, ART_PALETTE)).toBe(color);
    },
  );

  it("throws for a tint no level can name", () => {
    const look: BrickLook = {
      kind: "plain",
      tint: TINTS,
      whole: 1,
      hits: 1,
      shown: true,
    };

    expect(() => brickColor(look, ART_PALETTE)).toThrow("No tint");
  });
});
