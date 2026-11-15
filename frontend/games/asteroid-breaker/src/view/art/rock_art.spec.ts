import { cssHex } from "@fz/phaser/color";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  atlasSize,
  svgOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ROCK_KIND_IDS,
  type RockKindId,
  type RockSize,
  rockKind,
} from "../../rules/catalog/rocks";
import { ROCK_OUTLINES, type Rock } from "../../rules/rocks/rocks";
import {
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  PIXEL_RATIOS,
  edgeOf,
  reachOf,
  within,
} from "../../testing/art_frames";
import { inLight } from "../colors/rock_light";
import {
  type LitFrame,
  ROCK_REACH,
  dashesAlong,
  isFine,
  largestOf,
  rockColor,
  rockFrame,
  rockFrames,
  rockPictures,
  rockShape,
  sizesOf,
} from "./rock_art";
import { cracksOf } from "./rocks/cracks";
import { FLAT } from "./rocks/cut";
import { litBy, normalColor } from "./rocks/light";
import { MOST_BAKED_UNIT, bakedScale } from "./shapes";

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** The largest atlas a side the rocks' may take before it is baked in pages (§4's lift 5). */
const ATLAS_SIDE = 4096;

/** A rock a frame is drawn for, with the hits it has taken. */
type DrawnRock = Pick<Rock, "kind" | "size" | "outline" | "hits"> & {
  readonly taken: number;
};

/** Every kind of rock in every size it comes in. */
const KINDS_AND_SIZES: readonly (readonly [RockKindId, RockSize])[] =
  ROCK_KIND_IDS.flatMap((kind) =>
    sizesOf(kind).map((size) => [kind, size] as const),
  );

/** Every rock a frame is drawn for: each kind, size and outline, whole and with each count of hits it can take and hold. */
const DRAWN: readonly DrawnRock[] = KINDS_AND_SIZES.flatMap(([kind, size]) => {
  const whole = rockKind(kind).hits[size] ?? 0;
  return Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
    Array.from({ length: whole }, (__, taken) => ({
      kind,
      size,
      outline,
      hits: whole - taken,
      taken,
    })),
  ).flat();
});

/** Every rock that has taken a hit and held. */
const TAKEN: readonly DrawnRock[] = DRAWN.filter(({ taken }) => taken > 0);

/** The size of rock each frame draws, by its name. */
const SIZES_DRAWN: ReadonlyMap<string, RockSize> = new Map(
  DRAWN.map((rock) => [rockFrame(rock), rock.size]),
);

/** The rocks' frames in the specs' palette, at their scale. */
const FRAMES: readonly LitFrame[] = rockFrames(ART_PALETTE, ART_SCALE, true);

/** The rocks' frames in the specs' palette and scale, without their fine marks. */
const COARSE_FRAMES: readonly LitFrame[] = rockFrames(
  ART_PALETTE,
  ART_SCALE,
  false,
);

/** The scales the cracks are held within their rims at: the least unit, the specs' and the most baked. */
const CRACK_SCALES: readonly ArtScale[] = [
  bakedScale({ unit: 6, pixelRatio: 1 }),
  ART_SCALE,
  bakedScale({ unit: MOST_BAKED_UNIT, pixelRatio: 3 }),
];

/** Returns the frames at a scale a field is drawn at, as baked, with their fine marks if it keeps them. */
function framesAt(scale: ArtScale): readonly LitFrame[] {
  return rockFrames(ART_PALETTE, scale, isFine(scale));
}

/** Returns the inks of the frames at a scale. */
function inksAt(scale: ArtScale): readonly ArtFrame[] {
  return framesAt(scale).map(({ ink }) => ink);
}

/** Returns a rock's frame in its inks, among some frames. */
function inkOf(
  rock: Pick<Rock, "kind" | "size" | "outline"> & Partial<Pick<Rock, "hits">>,
  frames: readonly LitFrame[] = FRAMES,
): ArtFrame {
  return frameNamed(
    frames.map(({ ink }) => ink),
    rockFrame(rock),
  );
}

/** Returns a rock's frame as its normal map, among the specs' frames. */
function normalOf(
  rock: Pick<Rock, "kind" | "size" | "outline"> & Partial<Pick<Rock, "hits">>,
): ArtFrame {
  return frameNamed(
    FRAMES.map(({ normal }) => normal),
    rockFrame(rock),
  );
}

/** Returns the frames' names that break a rule. */
function breaking(
  frames: readonly ArtFrame[],
  rule: (frame: ArtFrame) => boolean,
): readonly string[] {
  return frames.filter((frame) => !rule(frame)).map((frame) => frame.name);
}

/** Returns what a command draws, but its color, which an ink and a normal map's shapes differ by, as text. */
function shapeOf(command: DrawCommand): string {
  const { color: _color, ...shape } = command;
  return JSON.stringify(shape);
}

/**
 * Returns the commands of a frame's normal map that its inks don't draw,
 * each of the inks' shapes found in turn, in order, among the normal map's,
 * past its backdrop; or null where one of the inks' isn't there.
 */
function normalOnly(frame: LitFrame): readonly DrawCommand[] | null {
  const inks = frame.ink.commands.map(shapeOf);
  const only: DrawCommand[] = [];
  let next = 0;
  for (const command of frame.normal.commands.slice(1)) {
    if (shapeOf(command) === inks[next]) next += 1;
    else only.push(command);
  }
  return next === inks.length ? only : null;
}

/** Returns how many lines a rock's cracks are drawn in, for the hits it has taken. */
function crackSegments(rock: DrawnRock): number {
  return cracksOf(rockShape(rock), rock.taken).reduce(
    (count, crack) => count + crack.length - 1,
    0,
  );
}

/** Returns a color's red, green and blue channels. */
function channelsOf(color: number): readonly number[] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

/**
 * Returns where a frame of a kind of rock draws its facets, by their index
 * among its commands: its polygons in its tones' inks at full strength,
 * which nothing else is drawn in.
 */
function facetIndices(frame: ArtFrame, kind: RockKindId): readonly number[] {
  const inks = new Set([
    ART_PALETTE.rockTones[kind === "crystal" ? "stone" : kind].ink,
    ART_PALETTE.rockTones.crystal.ink,
  ]);
  return frame.commands.flatMap((command, index) =>
    command.kind === "polygon" &&
    command.alpha === undefined &&
    inks.has(command.color)
      ? [index]
      : [],
  );
}

/** Returns the polygons a frame draws in the outline's color: round the rock's rim first, then round each gem. */
function outlinesIn(frame: ArtFrame): readonly (readonly Point[])[] {
  return frame.commands.flatMap((command) =>
    command.kind === "polygon" && command.color === ART_PALETTE.outline
      ? [command.points]
      : [],
  );
}

/** Returns a frame's lines in the marks' color: its cracks'. */
function crackLines(frame: ArtFrame): readonly DrawCommand[] {
  return frame.commands.filter(
    (command) => command.kind === "line" && command.color === ART_PALETTE.mark,
  );
}

describe("rockFrames", () => {
  it("draws a frame for every kind, size and outline of rock, whole and with each count of hits it can take and hold, each named once", () => {
    const names = FRAMES.map(({ ink }) => ink.name);

    expect({ count: names.length, names: new Set(names) }).toEqual({
      count: DRAWN.length,
      names: new Set(DRAWN.map((rock) => rockFrame(rock))),
    });
  });

  it("draws each rock's normal map under its inks' name, at their size, over a flat backdrop, the inks' shapes and its cracks' lips", () => {
    const unlike = DRAWN.filter((rock) => {
      const frame = FRAMES.find(({ ink }) => ink.name === rockFrame(rock));
      if (frame === undefined) return true;
      const { ink, normal } = frame;
      return (
        normal.name !== ink.name ||
        normal.width !== ink.width ||
        normal.height !== ink.height ||
        JSON.stringify(normal.commands[0]) !==
          JSON.stringify({
            kind: "rect",
            x: 0,
            y: 0,
            width: ink.width,
            height: ink.height,
            color: normalColor(FLAT),
          }) ||
        normalOnly(frame)?.length !== 2 * crackSegments(rock)
      );
    }).map((rock) => rockFrame(rock));

    expect(unlike).toEqual([]);
  });

  it("draws the same frames each time", () => {
    expect(rockFrames(ART_PALETTE, ART_SCALE, true)).toEqual(FRAMES);
  });

  it.each(ART_SCALES)(
    "draws every frame within its size, in whole pixels, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      expect(
        breaking(
          inksAt(scale),
          (frame) =>
            Number.isInteger(frame.width) &&
            Number.isInteger(frame.height) &&
            frame.width >= 1 &&
            frame.height >= 1 &&
            frame.commands.every((command) =>
              edgeOf(command).every(
                ({ x, y }) =>
                  x >= -SLACK &&
                  y >= -SLACK &&
                  x <= frame.width + SLACK &&
                  y <= frame.height + SLACK,
              ),
            ),
        ),
      ).toEqual([]);
    },
  );

  it.each(ART_SCALES)(
    "draws every line a CSS pixel wide or more at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      expect(
        breaking(inksAt(scale), (frame) =>
          frame.commands.every(
            (command) =>
              command.kind !== "line" ||
              command.width >= scale.pixelRatio - SLACK,
          ),
        ),
      ).toEqual([]);
    },
  );

  it.each(PIXEL_RATIOS)(
    "draws nothing at a size below nothing at the least units, %f to a CSS pixel",
    (pixelRatio) => {
      const negative = [1, 2, 4].flatMap((unit) =>
        breaking(inksAt({ unit, pixelRatio }), (frame) =>
          frame.commands.every(
            (command) =>
              (!("width" in command) || command.width >= 0) &&
              (!("radius" in command) || command.radius >= 0),
          ),
        ),
      );

      expect(negative).toEqual([]);
    },
  );

  it.each([1, 3])(
    `fits the rocks' atlas in ${String(ATLAS_SIDE)} a side at the largest unit baked, %i to a CSS pixel`,
    (pixelRatio) => {
      const { width, height } = atlasSize(
        inksAt(bakedScale({ unit: MOST_BAKED_UNIT * 4, pixelRatio })),
      );

      expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
    },
  );
});

describe("ROCK_REACH", () => {
  it.each(ART_SCALES)(
    "holds every rock, its cracks and a lodestone's field, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const beyond = breaking(
        inksAt(scale),
        (frame) =>
          reachOf(frame) <=
          ROCK_REACH[SIZES_DRAWN.get(frame.name) ?? "small"] * scale.unit +
            SLACK,
      );

      expect(beyond).toEqual([]);
    },
  );
});

describe("a rock's frame", () => {
  it.each(KINDS_AND_SIZES)(
    "draws a %s %s rock's facets in its tones' inks, a facet of its cut each",
    (kind, size) => {
      const frame = inkOf({ kind, size, outline: 0 });

      expect(facetIndices(frame, kind)).toHaveLength(
        rockShape({ kind, size, outline: 0 }).facets.length,
      );
    },
  );

  it("draws a crystal's gems in the crystal's ink, set in a stone's body", () => {
    const frame = inkOf({ kind: "crystal", size: "large", outline: 0 });

    const inks = new Set(
      facetIndices(frame, "crystal").map(
        (index) => frame.commands[index]?.color,
      ),
    );

    expect(inks).toEqual(
      new Set([
        ART_PALETTE.rockTones.stone.ink,
        ART_PALETTE.rockTones.crystal.ink,
      ]),
    );
  });

  it.each(ROCK_KIND_IDS)(
    "draws each facet of a %s rock's normal map in the color of the way it faces, and all else flat",
    (kind) => {
      const rock = { kind, size: largestOf(kind), outline: 0 } as const;
      const facets = new Set(facetIndices(inkOf(rock), kind));
      // The normal map's backdrop comes first, so each of its shapes is one on.
      const colors = normalOf(rock)
        .commands.slice(1)
        .map((command) => command.color);

      expect({
        facets: colors.filter((_, index) => facets.has(index)),
        rest: new Set(colors.filter((_, index) => !facets.has(index))),
      }).toEqual({
        facets: rockShape(rock).facets.map(({ facing }) => normalColor(facing)),
        rest: new Set([normalColor(FLAT)]),
      });
    },
  );

  it.each(KINDS_AND_SIZES)(
    "lays every facet of a %s %s rock within its outline",
    (kind, size) => {
      const off = Array.from({ length: ROCK_OUTLINES }, (_, outline) => {
        const frame = inkOf({ kind, size, outline });
        const outlines = outlinesIn(frame);
        return facetIndices(frame, kind).filter((index) => {
          const facet = frame.commands[index];
          return !(facet?.kind === "polygon" ? facet.points : []).every(
            (point) => outlines.some((around) => within(point, around)),
          );
        });
      }).flat();

      expect(off).toEqual([]);
    },
  );

  it.each(KINDS_AND_SIZES)(
    "draws a %s %s rock in six outlines, each its own",
    (kind, size) => {
      const outlines = Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
        JSON.stringify(outlinesIn(inkOf({ kind, size, outline }))[0]),
      );

      expect(new Set(outlines).size).toBe(ROCK_OUTLINES);
    },
  );
});

describe("the hits a rock shows taken", () => {
  it("draws no crack on a whole rock", () => {
    const cracked = FRAMES.filter(
      ({ ink }) =>
        DRAWN.some(
          (rock) => rock.taken === 0 && rockFrame(rock) === ink.name,
        ) && crackLines(ink).length > 0,
    ).map(({ ink }) => ink.name);

    expect(cracked).toEqual([]);
  });

  it.each(TAKEN.filter(({ outline }) => outline === 0))(
    "slopes each line of a $kind $size rock's cracks for $taken hits into it from both sides, in its normal map alone",
    (rock) => {
      const frame = FRAMES.find(({ ink }) => ink.name === rockFrame(rock));
      const lips = (frame && normalOnly(frame)) ?? [];
      // Each lip is a band from the crack's edge out: its first two corners
      // along the crack, its last two out from it. It slopes into the crack
      // if the way it faces leans from the outer two toward the first two.
      const sloped = lips.map((lip) => {
        const [a, b, c, d] = lip.kind === "polygon" ? lip.points : [];
        const inward = {
          x: (a?.x ?? 0) + (b?.x ?? 0) - (c?.x ?? 0) - (d?.x ?? 0),
          y: (a?.y ?? 0) + (b?.y ?? 0) - (c?.y ?? 0) - (d?.y ?? 0),
        };
        const [red = 0, green = 0, blue = 0] = channelsOf(lip.color);
        // A normal map's red is right, and its green up, the field's y down.
        const way = { x: (red / 255) * 2 - 1, y: 1 - (green / 255) * 2 };
        return {
          into: way.x * inward.x + way.y * inward.y > 0,
          tilted: blue < 255,
        };
      });

      expect(sloped).toEqual(
        Array.from({ length: 2 * crackSegments(rock) }, () => ({
          into: true,
          tilted: true,
        })),
      );
    },
  );

  it.each(TAKEN.filter(({ outline }) => outline === 0))(
    "cracks a $kind $size rock for the $taken hits it has taken, in the marks' color",
    (rock) => {
      const lines = cracksOf(rockShape(rock), rock.taken).reduce(
        (count, crack) => count + crack.length - 1,
        0,
      );

      expect(crackLines(inkOf(rock))).toHaveLength(lines);
    },
  );

  it.each(CRACK_SCALES)(
    "lays every crack within its rock's rim's outline at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const frames = framesAt(scale);

      const off = TAKEN.filter((rock) => {
        const frame = inkOf(rock, frames);
        const [rim = []] = outlinesIn(frame);
        return !frame.commands
          .filter((command) => command.color === ART_PALETTE.mark)
          .flatMap(edgeOf)
          .every((point) => within(point, rim));
      }).map((rock) => rockFrame(rock));

      expect(off).toEqual([]);
    },
  );
});

describe("a rock's fine marks", () => {
  it.each([
    [{ unit: 20, pixelRatio: 2 }, true],
    [{ unit: 19, pixelRatio: 2 }, false],
    [{ unit: 10, pixelRatio: 1 }, true],
    [{ unit: 9, pixelRatio: 1 }, false],
  ] as const)("shows at %o: %s", (scale, fine) => {
    expect(isFine(scale)).toBe(fine);
  });

  it.each(
    ROCK_KIND_IDS.map(
      (kind) => [kind, kind !== "stone" && kind !== "volatile"] as const,
    ),
  )(
    "leaves out only a %s rock's fine marks for a field that keeps none, if it has any: %s",
    (kind, hasFine) => {
      const rock = { kind, size: largestOf(kind), outline: 0 } as const;
      // A lodestone's frame is smaller without its field, so its shapes move.
      const kinds = (frame: ArtFrame): readonly string[] =>
        frame.commands.map(
          (command) =>
            `${command.kind} ${String(command.color)} ${String(command.alpha)}`,
        );
      const fine = kinds(inkOf(rock));
      const coarse = kinds(inkOf(rock, COARSE_FRAMES));

      // What the coarse frame draws, in order, each in the fine one after the last.
      let at = 0;
      const kept = coarse.every((drawn) => {
        at = fine.indexOf(drawn, at) + 1;
        return at > 0;
      });

      expect({ kept, fewer: coarse.length < fine.length }).toEqual({
        kept: true,
        fewer: hasFine,
      });
    },
  );

  it.each(ROCK_KIND_IDS)(
    "keeps a %s rock's seams and bands a 0.06 of its radius wide or more, and a volatile rock's glowing seams, for a field that keeps no fine marks",
    (kind) => {
      const rock = { kind, size: largestOf(kind), outline: 0 } as const;
      const body = ART_PALETTE.rockTones[kind === "crystal" ? "stone" : kind];
      const marks = new Set([body.deep, body.lit, ART_PALETTE.core]);
      const kept = rockShape(rock)
        .lines.filter(
          ({ tone, width }) =>
            tone === "core" ||
            ((tone === "deep" || tone === "lit") && width >= 0.06),
        )
        .reduce((count, { points }) => count + points.length - 1, 0);

      const lines = inkOf(rock, COARSE_FRAMES).commands.filter(
        (command) => command.kind === "line" && marks.has(command.color),
      );

      expect(lines).toHaveLength(kept);
    },
  );
});

describe("rockPictures", () => {
  const pictures = rockPictures(ART_PALETTE, ART_SCALE, true);

  /** Returns the SVG a picture's `data:` URL holds, or throws for any other URL. */
  function svgIn(picture: string): string {
    const prefix = "data:image/svg+xml,";
    if (!picture.startsWith(prefix)) throw new Error(`not an SVG: ${picture}`);
    return decodeURIComponent(picture.slice(prefix.length));
  }

  /** Returns an SVG without its fills' colors, so two drawings of the same shapes in other colors read alike. */
  function unfilled(svg: string): string {
    return svg.replace(/ fill="#[0-9a-f]{6}"/g, "");
  }

  /** Returns the colors an SVG fills its shapes in. */
  function fillsIn(svg: string): ReadonlySet<string> {
    return new Set(
      [...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].flatMap(([, fill]) =>
        fill === undefined ? [] : [fill],
      ),
    );
  }

  it.each(ROCK_KIND_IDS)(
    "pictures a %s rock as its frame draws it whole, at its largest size, in its first outline, each shape at its own alpha",
    (kind) => {
      const frame = inkOf({ kind, size: largestOf(kind), outline: 0 });

      expect(unfilled(svgIn(pictures[kind]))).toBe(unfilled(svgOf(frame)));
    },
  );

  it("lights each facet of a rock unturned, its ink times the light on the way it faces, and keeps its outline's ink", () => {
    const rock = { kind: "stone", size: "large", outline: 0 } as const;
    const lit = rockShape(rock).facets.map(({ facing }) =>
      cssHex(
        inLight(
          ART_PALETTE.rockTones.stone.ink,
          litBy(facing, 0, ART_PALETTE.rockLight),
        ),
      ),
    );

    const fills = fillsIn(svgIn(pictures.stone));

    expect({
      facets: lit.every((color) => fills.has(color)),
      shaded: new Set(lit).size > 1,
      outline: fills.has(cssHex(ART_PALETTE.outline)),
    }).toEqual({ facets: true, shaded: true, outline: true });
  });
});

describe("rockFrame", () => {
  it("names every rock a frame is drawn for apart", () => {
    const names = DRAWN.map((rock) => rockFrame(rock));

    expect(new Set(names).size).toBe(DRAWN.length);
  });

  it("names a rock with every hit left its whole frame", () => {
    expect(
      rockFrame({ kind: "iron", size: "large", outline: 2, hits: 3 }),
    ).toBe(rockFrame({ kind: "iron", size: "large", outline: 2 }));
  });

  it.each([
    [{ kind: "crystal", size: "small", outline: 0 }],
    [{ kind: "stone", size: "large", outline: ROCK_OUTLINES }],
    [{ kind: "iron", size: "large", outline: 0, hits: 4 }],
    [{ kind: "iron", size: "large", outline: 0, hits: 0 }],
  ] as const)("refuses a rock that can't be: %o", (rock) => {
    expect(() => rockFrame(rock)).toThrow(RangeError);
  });
});

describe("rockShape", () => {
  it("cuts each outline once, the same each time it is asked", () => {
    const rock = { kind: "ice", size: "medium", outline: 3 } as const;

    expect(rockShape(rock)).toBe(rockShape(rock));
  });

  it.each([
    [{ kind: "crystal", size: "small", outline: 0 }],
    [{ kind: "stone", size: "large", outline: -1 }],
  ] as const)("refuses a rock that can't be: %o", (rock) => {
    expect(() => rockShape(rock)).toThrow(RangeError);
  });
});

describe("rockColor", () => {
  it("draws a crystal's body in a stone's ink, and every other kind's in its own", () => {
    expect([
      rockColor("crystal", ART_PALETTE),
      rockColor("iron", ART_PALETTE),
    ]).toEqual([ART_PALETTE.rocks.stone, ART_PALETTE.rocks.iron]);
  });
});

describe("dashesAlong", () => {
  it("cuts a line into dashes from its start, the last cut short where the line ends", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
    ];

    expect(dashesAlong(line, 3, 2)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
      ],
      [
        { x: 5, y: 0 },
        { x: 8, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 12, y: 0 },
      ],
    ]);
  });

  it("leaves out a dash that would start where the line ends", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 0, y: 4 },
      { x: 0, y: 10 },
    ];

    expect(dashesAlong(line, 3, 2)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 0, y: 3 },
      ],
      [
        { x: 0, y: 5 },
        { x: 0, y: 8 },
      ],
    ]);
  });
});

describe("largestOf", () => {
  it.each([
    ["boulder", "boulder"],
    ["crystal", "large"],
    ["stone", "large"],
  ] as const)("finds a %s rock's largest size, %s", (kind, size) => {
    expect(largestOf(kind)).toBe(size);
  });
});
