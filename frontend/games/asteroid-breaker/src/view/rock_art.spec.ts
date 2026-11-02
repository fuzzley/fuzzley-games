import type { ArtFrame, ArtScale, DrawCommand, Point } from "@fz/phaser/shapes";
import {
  ROCK_KIND_IDS,
  type RockKindId,
  type RockSize,
  rockKind,
} from "../rules/catalog/rocks";
import { ROCK_OUTLINES } from "../rules/rocks";
import { ROCK_RADIUS } from "../rules/tuning";
import {
  ART_PALETTE,
  ART_SCALE,
  distanceToEdge,
  drawnIn,
  edgeOf,
  frameNamed,
  within,
} from "../testing/art_frames";
import { atlasFrames } from "./art";
import {
  MARK_REACH,
  largestOf,
  rockColor,
  rockFrame,
  rockFrames,
  sizesOf,
  takenFrame,
} from "./rock_art";
import { lineWidth, outlineWidth, placed } from "./shapes";

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** Every kind of rock in every size it comes in. */
const KINDS_AND_SIZES: readonly (readonly [RockKindId, RockSize])[] =
  ROCK_KIND_IDS.flatMap((kind) =>
    sizesOf(kind).map((size) => [kind, size] as const),
  );

/** Every kind and size of rock that can take a hit and hold, with each count of hits it can have left, and the hits it has taken. */
const TAKEN: readonly (readonly [RockKindId, RockSize, number, number])[] =
  KINDS_AND_SIZES.flatMap(([kind, size]) => {
    const whole = rockKind(kind).hits[size] ?? 0;
    return Array.from(
      { length: whole - 1 },
      (_, i) => [kind, size, whole - 1 - i, i + 1] as const,
    );
  });

/** The scales the marks are held at: the smallest unit the layout allows, a phone's, and the largest baked. */
const SCALES: readonly ArtScale[] = [
  { unit: 6, pixelRatio: 1 },
  { unit: 27, pixelRatio: 3 },
  { unit: 32, pixelRatio: 2 },
];

/** Returns the frames of each outline of a kind and size of rock, in the specs' palette at a scale. */
function outlinesOf(
  kind: RockKindId,
  size: RockSize,
  scale: ArtScale = ART_SCALE,
): readonly ArtFrame[] {
  const names = new Set(
    Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
      rockFrame({ kind, size, outline }),
    ),
  );
  return rockFrames(ART_PALETTE, scale).filter((frame) =>
    names.has(frame.name),
  );
}

/** Returns a rock frame's body, about the frame's middle. */
function bodyOf(frame: ArtFrame): readonly Point[] {
  const body = frame.commands[1];
  if (body?.kind !== "polygon") throw new Error(`${frame.name} has no body`);
  return placed(body.points, 1, -frame.width / 2, -frame.height / 2);
}

/** Returns the points round the edges of what some of a frame's commands draw, about the frame's middle. */
function aboutMiddle(
  frame: ArtFrame,
  commands: readonly DrawCommand[],
): readonly Point[] {
  return commands
    .flatMap(edgeOf)
    .map(({ x, y }) => ({ x: x - frame.width / 2, y: y - frame.height / 2 }));
}

/** Returns the points round the edges of a rock frame's marks, about the frame's middle: all it draws over its body. */
function marksOf(frame: ArtFrame): readonly Point[] {
  return aboutMiddle(frame, frame.commands.slice(2));
}

/** Returns the name of the frame over a rock with hits left, which has taken some. */
function takenName(kind: RockKindId, size: RockSize, hits: number): string {
  const name = takenFrame({ kind, size, hits });
  if (name === null)
    throw new Error(
      `A ${size} ${kind} rock with ${String(hits)} hits left has taken none.`,
    );
  return name;
}

/** Returns the marks' commands of a rock's frame: all it draws over its body. */
function markKinds(kind: RockKindId, outline = 0): readonly string[] {
  const size = largestOf(kind);
  return frameNamed(rockFrame({ kind, size, outline }))
    .commands.slice(2)
    .map((command) => command.kind);
}

describe("a rock's frame", () => {
  it.each(KINDS_AND_SIZES)(
    "outlines a %s %s rock in the outline's color, then fills it in its body's",
    (kind, size) => {
      const [first] = outlinesOf(kind, size);

      expect(first?.commands.slice(0, 2)).toMatchObject([
        { kind: "polygon", color: ART_PALETTE.outline },
        { kind: "polygon", color: rockColor(kind, ART_PALETTE) },
      ]);
    },
  );

  it.each(KINDS_AND_SIZES)(
    "draws a %s %s rock in six outlines, each its own",
    (kind, size) => {
      const bodies = outlinesOf(kind, size).map((frame) =>
        JSON.stringify(bodyOf(frame)),
      );

      expect(new Set(bodies).size).toBe(ROCK_OUTLINES);
    },
  );

  it.each(KINDS_AND_SIZES)(
    "outlines a %s %s rock an outline's width out from its body, twice that at most at a corner",
    (kind, size) => {
      const [frame] = outlinesOf(kind, size);
      const reach = (command: DrawCommand | undefined): number =>
        Math.max(
          ...(command?.kind === "polygon" ? command.points : []).map(
            ({ x, y }) =>
              Math.hypot(
                x - (frame?.width ?? 0) / 2,
                y - (frame?.height ?? 0) / 2,
              ),
          ),
        );

      const beyond = reach(frame?.commands[0]) - reach(frame?.commands[1]);

      expect(beyond).toBeGreaterThanOrEqual(outlineWidth(ART_SCALE) - SLACK);
      expect(beyond).toBeLessThanOrEqual(2 * outlineWidth(ART_SCALE) + SLACK);
    },
  );

  it.each(KINDS_AND_SIZES)(
    "reaches a %s %s rock's radius at its farthest",
    (kind, size) => {
      const farthest = outlinesOf(kind, size).map((frame) =>
        Math.max(...bodyOf(frame).map(({ x, y }) => Math.hypot(x, y))),
      );

      expect(
        farthest.map(
          (reach) =>
            Math.round((reach / (ROCK_RADIUS[size] * ART_SCALE.unit)) * 1e6) /
            1e6,
        ),
      ).toEqual(Array.from({ length: ROCK_OUTLINES }, () => 1));
    },
  );

  it("draws the same outlines each time", () => {
    expect(rockFrames(ART_PALETTE, ART_SCALE)).toEqual(
      rockFrames(ART_PALETTE, ART_SCALE),
    );
  });

  it.each(SCALES)(
    "lays every mark on its rock's body at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const off = KINDS_AND_SIZES.flatMap(([kind, size]) =>
        outlinesOf(kind, size, scale)
          .filter((frame) => {
            const body = bodyOf(frame);
            return !marksOf(frame).every((point) => within(point, body));
          })
          .map((frame) => frame.name),
      );

      expect(off).toEqual([]);
    },
  );
});

describe("each kind's marks", () => {
  it("draws two or three craters on a stone, as its outline's draws say", () => {
    const counts = Array.from(
      { length: ROCK_OUTLINES },
      (_, outline) => markKinds("stone", outline).length,
    );

    expect(new Set(counts)).toEqual(new Set([2, 3]));
  });

  it("draws five craters on a boulder", () => {
    expect(markKinds("boulder")).toEqual(Array(5).fill("circle"));
  });

  it("sets a crystal's gem in its stone body, outlined in the marks' color", () => {
    const frame = frameNamed(
      rockFrame({ kind: "crystal", size: "large", outline: 0 }),
    );

    expect(frame.commands.slice(1).map((command) => command.color)).toEqual([
      ART_PALETTE.rocks.stone,
      ART_PALETTE.mark,
      ART_PALETTE.rocks.crystal,
    ]);
  });

  it.each(Array.from({ length: ROCK_OUTLINES }, (_, outline) => outline))(
    "draws ice outline %i sharp-cornered, seven to nine corners, a facet in the marks' color toward every other one",
    (outline) => {
      const frame = frameNamed(
        rockFrame({ kind: "ice", size: "large", outline }),
      );
      const corners = bodyOf(frame).length;

      expect(corners).toBeGreaterThanOrEqual(7);
      expect(corners).toBeLessThanOrEqual(9);
      expect(drawnIn(frame, "line", ART_PALETTE.mark)).toHaveLength(
        Math.ceil(corners / 2),
      );
    },
  );

  it.each(ROCK_KIND_IDS.filter((kind) => kind !== "ice"))(
    "rounds a %s rock's outline through its sides' middles, a curve for each corner",
    (kind) => {
      const frame = frameNamed(
        rockFrame({ kind, size: largestOf(kind), outline: 0 }),
      );

      expect(bodyOf(frame).length).toBeGreaterThanOrEqual(9 * 8);
    },
  );

  it("draws four rivets on an iron rock", () => {
    expect(markKinds("iron")).toEqual(Array(4).fill("circle"));
  });

  it("sets an iron rock's rivets with their edges at the marks' reach", () => {
    const frame = frameNamed(
      rockFrame({ kind: "iron", size: "large", outline: 0 }),
    );

    const reaches = frame.commands
      .slice(2)
      .map((command) =>
        command.kind === "circle"
          ? Math.round(
              ((Math.hypot(
                command.x - frame.width / 2,
                command.y - frame.height / 2,
              ) +
                command.radius) /
                (ROCK_RADIUS.large * ART_SCALE.unit)) *
                1e6,
            ) / 1e6
          : null,
      );

    expect(reaches).toEqual(Array.from({ length: 4 }, () => MARK_REACH));
  });

  it("draws a volatile rock's core in its glow and three cracks out from it in the marks' color", () => {
    const frame = frameNamed(
      rockFrame({ kind: "volatile", size: "large", outline: 0 }),
    );

    // Each crack is two lines, round at its three points.
    const crack = [
      ...Array.from({ length: 2 }, () => ["line", ART_PALETTE.mark]),
      ...Array.from({ length: 3 }, () => ["circle", ART_PALETTE.mark]),
    ];

    expect(
      frame.commands.slice(2).map((command) => [command.kind, command.color]),
    ).toEqual([["circle", ART_PALETTE.core], ...crack, ...crack, ...crack]);
  });

  it("lays a volatile rock's cracks outside its core", () => {
    const frame = frameNamed(
      rockFrame({ kind: "volatile", size: "large", outline: 0 }),
    );
    const [core, ...cracks] = frame.commands.slice(2);

    const nearest = Math.min(
      ...aboutMiddle(frame, cracks).map(({ x, y }) => Math.hypot(x, y)),
    );

    expect(nearest).toBeGreaterThan(
      core?.kind === "circle" ? core.radius : Infinity,
    );
  });

  it("crosses a lodestone with two bands in the marks' color", () => {
    expect(markKinds("lodestone")).toEqual(["polygon", "polygon"]);
  });

  it.each(SCALES)(
    "ends a lodestone's bands half a CSS pixel or more short of its sides, so its ink closes them, at a unit of $unit",
    (scale) => {
      const nearest = sizesOf("lodestone").flatMap((size) =>
        outlinesOf("lodestone", size, scale).map((frame) =>
          Math.min(
            ...aboutMiddle(frame, frame.commands.slice(2)).map((corner) =>
              distanceToEdge(corner, bodyOf(frame)),
            ),
          ),
        ),
      );

      expect(Math.min(...nearest)).toBeGreaterThanOrEqual(scale.pixelRatio / 2);
    },
  );
});

describe("the hits a rock shows taken", () => {
  it("shows none on a whole rock", () => {
    expect(takenFrame({ kind: "iron", size: "large", hits: 3 })).toBeNull();
  });

  it.each(TAKEN)(
    "shows a %s %s rock with %i hits left a crack or dent for each of its %i taken, in the marks' color",
    (kind, size, hits, taken) => {
      const linesOf = (name: string): readonly DrawCommand[] =>
        drawnIn(frameNamed(name), "line", ART_PALETTE.mark);
      const one = linesOf(
        takenName(kind, size, (rockKind(kind).hits[size] ?? 0) - 1),
      );

      const lines = linesOf(takenName(kind, size, hits));

      expect({
        count: lines.length,
        widths: new Set(
          lines.map((command) => command.kind === "line" && command.width),
        ),
        colors: new Set(
          frameNamed(takenName(kind, size, hits)).commands.map(
            (command) => command.color,
          ),
        ),
      }).toEqual({
        count: taken * one.length,
        widths: new Set([lineWidth(ART_SCALE)]),
        colors: new Set([ART_PALETTE.mark]),
      });
    },
  );

  it.each(SCALES)(
    "lays every crack and dent within every outline of its kind and size at a unit of $unit",
    (scale) => {
      const frames = new Map(
        atlasFrames(ART_PALETTE, scale).map((frame) => [frame.name, frame]),
      );

      const off = TAKEN.filter(([kind, size, hits]) => {
        const frame = frames.get(takenName(kind, size, hits));
        const points = frame ? aboutMiddle(frame, frame.commands) : [];
        return !outlinesOf(kind, size, scale)
          .map(bodyOf)
          .every((body) => points.every((point) => within(point, body)));
      });

      expect(off).toEqual([]);
    },
  );

  it("starts an iron rock's dent at the marks' reach, in from its side", () => {
    const frame = frameNamed(takenName("iron", "large", 2));

    const reaches = frame.commands
      .flatMap((command) => (command.kind === "line" ? [command.from] : []))
      .map(
        ({ x, y }) =>
          Math.hypot(x - frame.width / 2, y - frame.height / 2) /
          (ROCK_RADIUS.large * ART_SCALE.unit),
      );

    expect(reaches[0]).toBeCloseTo(MARK_REACH);
  });

  it.each([
    [{ kind: "iron", size: "large", hits: -1 }],
    [{ kind: "crystal", size: "small", hits: 1 }],
  ] as const)("refuses a rock that can't be: %o", (rock) => {
    expect(() => takenFrame(rock)).toThrow(RangeError);
  });
});

describe("a rock's frame's name", () => {
  it("names each kind, size and outline apart", () => {
    const names = KINDS_AND_SIZES.flatMap(([kind, size]) =>
      Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
        rockFrame({ kind, size, outline }),
      ),
    );

    expect(new Set(names).size).toBe(KINDS_AND_SIZES.length * ROCK_OUTLINES);
  });

  it.each([
    [{ kind: "crystal", size: "small", outline: 0 }],
    [{ kind: "stone", size: "large", outline: ROCK_OUTLINES }],
  ] as const)("refuses a rock that can't be: %o", (rock) => {
    expect(() => rockFrame(rock)).toThrow(RangeError);
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

describe("largestOf", () => {
  it.each([
    ["boulder", "boulder"],
    ["crystal", "large"],
    ["stone", "large"],
  ] as const)("finds a %s rock's largest size, %s", (kind, size) => {
    expect(largestOf(kind)).toBe(size);
  });
});
