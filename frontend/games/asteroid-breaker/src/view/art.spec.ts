import { atlasSize } from "@fz/phaser/scene";
import { PICKUP_IDS } from "../rules/catalog/pickups";
import { ROCK_KIND_IDS, rockKind } from "../rules/catalog/rocks";
import { PILOT_COLORS } from "../rules/pilots";
import { ROCK_OUTLINES } from "../rules/rocks";
import { COMET_MARGIN, STRAY_RADIUS } from "../rules/tuning";
import {
  ART_PALETTE,
  ART_SCALE,
  distanceToEdge,
  drawnIn,
  edgeOf,
  frameNamed,
} from "../testing/art_frames";
import {
  DECK_FRAMES,
  FRAMES,
  STRAY_DROP,
  PICTURE_FRAMES,
  type Pictures,
  atlasFrames,
  deckFrames,
  mapPictures,
  pickupFrame,
} from "./art";
import { SEATS, eyesFrame, pilotFrame } from "./pilot_art";
import { rockFrame, sizesOf, takenFrame } from "./rock_art";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  bakedScale,
  outlineWidth,
} from "./shapes";
import { SHIP_FRAMES } from "./ship_art";

/** The largest atlas every device takes, a side. */
const ATLAS_SIDE = 2048;

/** The scales a field is drawn at, from the smallest unit the layout allows to the largest baked at a pixel ratio of 3. */
const SCALES: readonly ArtScale[] = [
  { unit: 6, pixelRatio: 1 },
  { unit: 13, pixelRatio: 1.25 },
  { unit: 24, pixelRatio: 2 },
  bakedScale({ unit: 120, pixelRatio: 1 }),
  bakedScale({ unit: 120, pixelRatio: 3 }),
];

/** The pixel ratios a canvas renders at, up to the most. */
const PIXEL_RATIOS = [1, 1.25, 1.5, 2, 3];

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/** Returns whether a command draws within its frame, its edge's every point, give or take a rounding. */
function drawsWithin(command: DrawCommand, frame: ArtFrame): boolean {
  return edgeOf(command).every(
    ({ x, y }) =>
      x >= -SLACK &&
      y >= -SLACK &&
      x <= frame.width + SLACK &&
      y <= frame.height + SLACK,
  );
}

/** Returns how wide a command's line is, or null for one that fills. */
function widthOf(command: DrawCommand): number | null {
  return command.kind === "ring" || command.kind === "line"
    ? command.width
    : null;
}

/** Returns the sizes a command draws at: its width, height and radius, those it has. */
function sizesIn(command: DrawCommand): number[] {
  return [
    "width" in command ? command.width : 0,
    "height" in command ? command.height : 0,
    "radius" in command ? command.radius : 0,
  ];
}

/** Returns the frames' names that break a rule. */
function breaking(
  frames: readonly ArtFrame[],
  rule: (frame: ArtFrame) => boolean,
): readonly string[] {
  return frames.filter((frame) => !rule(frame)).map((frame) => frame.name);
}

/**
 * The frames drawn with the fuzzball's fur, whose strands keep the mark's
 * own proportions at any size, as the shell's fuzzball does, so they are
 * under a CSS pixel wide on a small pilot.
 */
const FURRED: ReadonlySet<string> = new Set([
  ...SEATS.flatMap((seat) =>
    Array.from({ length: PILOT_COLORS }, (_, pilot) => pilotFrame(pilot, seat)),
  ),
  FRAMES.strayPicture,
  pickupFrame("ship"),
]);

/** Holds a set of frames to what every frame keeps: within its size, in whole pixels, named once, its lines a CSS pixel wide or more but the fur's. */
function holdsFrames(
  frames: () => readonly ArtFrame[],
  pixelRatio: number,
): void {
  it("draws every frame within its size", () => {
    expect(
      breaking(frames(), (frame) =>
        frame.commands.every((command) => drawsWithin(command, frame)),
      ),
    ).toEqual([]);
  });

  it("sizes every frame in whole pixels, one or more", () => {
    expect(
      breaking(
        frames(),
        (frame) =>
          Number.isInteger(frame.width) &&
          Number.isInteger(frame.height) &&
          frame.width >= 1 &&
          frame.height >= 1,
      ),
    ).toEqual([]);
  });

  it("names every frame once", () => {
    const names = frames().map((frame) => frame.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("draws every line a CSS pixel wide or more, but the fur's", () => {
    expect(
      breaking(
        frames().filter((frame) => !FURRED.has(frame.name)),
        (frame) =>
          frame.commands.every((command) => {
            const width = widthOf(command);
            // A rock's marks are drawn in shares of its radius, so a width comes back a rounding off.
            return width === null || width >= pixelRatio - SLACK;
          }),
      ),
    ).toEqual([]);
  });
}

describe("atlasFrames at every unit down to a device pixel", () => {
  it.each(PIXEL_RATIOS)(
    "draws nothing at a size below nothing, at %f device pixels to a CSS pixel",
    (pixelRatio) => {
      const units = Array.from({ length: 16 }, (_, i) => i + 1);

      const negative = units.flatMap((unit) =>
        breaking(atlasFrames(ART_PALETTE, { unit, pixelRatio }), (frame) =>
          frame.commands.every((command) =>
            sizesIn(command).every((size) => size >= 0),
          ),
        ).map((name) => `${name} at ${String(unit)}`),
      );

      expect(negative).toEqual([]);
    },
  );
});

describe.each(SCALES)(
  "atlasFrames at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    holdsFrames(() => atlasFrames(ART_PALETTE, scale), scale.pixelRatio);

    it("fits the atlas in 2048 × 2048", () => {
      const { width, height } = atlasSize(atlasFrames(ART_PALETTE, scale));

      expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
    });

    it("lays the frames tallest first, so the atlas's rows waste little", () => {
      const heights = atlasFrames(ART_PALETTE, scale).map(
        (frame) => frame.height,
      );

      expect(heights).toEqual([...heights].sort((a, b) => b - a));
    });
  },
);

describe.each(PIXEL_RATIOS)("deckFrames at %f to a CSS pixel", (pixelRatio) => {
  holdsFrames(() => deckFrames(pixelRatio), pixelRatio);

  it("draws every part white, for the scene to tint", () => {
    const colors = new Set(
      deckFrames(pixelRatio).flatMap((frame) =>
        frame.commands.map((command) => command.color),
      ),
    );

    expect(colors).toEqual(new Set([0xffffff]));
  });

  it("fits the deck's atlas in 2048 × 2048", () => {
    const { width, height } = atlasSize(deckFrames(pixelRatio));

    expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
  });
});

describe("the atlas", () => {
  const names = new Set(
    atlasFrames(ART_PALETTE, ART_SCALE).map((frame) => frame.name),
  );

  it("holds a frame for every rock in every kind, size and outline", () => {
    const wanted = ROCK_KIND_IDS.flatMap((kind) =>
      sizesOf(kind).flatMap((size) =>
        Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
          rockFrame({ kind, size, outline }),
        ),
      ),
    );

    expect(wanted.filter((name) => !names.has(name))).toEqual([]);
  });

  it("holds a frame for every rock that has taken a hit and held", () => {
    const wanted = ROCK_KIND_IDS.flatMap((kind) =>
      sizesOf(kind).flatMap((size) => {
        const whole = rockKind(kind).hits[size] ?? 0;
        return Array.from({ length: whole - 1 }, (_, hits) =>
          takenFrame({ kind, size, hits: hits + 1 }),
        );
      }),
    );

    expect(wanted.filter((name) => name === null || !names.has(name))).toEqual(
      [],
    );
  });

  it("holds a frame for every pilot in each seat, and its eyes", () => {
    const wanted = SEATS.flatMap((seat) => [
      ...Array.from({ length: PILOT_COLORS }, (_, pilot) =>
        pilotFrame(pilot, seat),
      ),
      eyesFrame(seat),
    ]);

    expect(wanted.filter((name) => !names.has(name))).toEqual([]);
  });

  it.each([
    ...Object.values(FRAMES),
    ...Object.values(SHIP_FRAMES),
    ...PICKUP_IDS.map(pickupFrame),
  ])("holds the %s frame", (name) => {
    expect(names.has(name)).toBe(true);
  });
});

describe("the deck's frames", () => {
  it.each(Object.values(DECK_FRAMES))("holds the %s frame", (name) => {
    expect(deckFrames(2).map((frame) => frame.name)).toContain(name);
  });

  it("sizes each button's disc by its radius in CSS pixels", () => {
    const discs = new Set<string>([
      DECK_FRAMES.fireDisc,
      DECK_FRAMES.dashDisc,
      DECK_FRAMES.knob,
    ]);

    const sizes = deckFrames(2)
      .filter(({ name }) => discs.has(name))
      .map(({ name, width }) => [name, width]);

    expect(Object.fromEntries(sizes)).toEqual({
      [DECK_FRAMES.fireDisc]: 128,
      [DECK_FRAMES.dashDisc]: 96,
      [DECK_FRAMES.knob]: 80,
    });
  });
});

describe("a pickup's frame", () => {
  it.each(PICKUP_IDS.filter((id) => id !== "ship"))(
    "outlines the %s pickup, fills it in the accent, and draws its symbol in the color on the accent",
    (id) => {
      const frame = frameNamed(pickupFrame(id));

      expect({
        hexagon: frame.commands.slice(0, 2).map((command) => command.color),
        symbol: new Set(
          frame.commands.slice(2).map((command) => command.color),
        ),
      }).toEqual({
        hexagon: [ART_PALETTE.outline, ART_PALETTE.accent],
        symbol: new Set([ART_PALETTE.onAccent]),
      });
    },
  );

  it("draws the Extra ship's symbol as a pilot in its window: the window in the color on the accent, the pilot in the accent", () => {
    const frame = frameNamed(pickupFrame("ship"));
    const [window, ...pilot] = frame.commands.slice(2);

    expect({
      window: window?.color,
      pilot: new Set(pilot.map((command) => command.color)),
    }).toEqual({
      window: ART_PALETTE.onAccent,
      pilot: new Set([ART_PALETTE.accent]),
    });
  });

  it("sets the Extra ship's pilot a little low in its window, as it sits in the ship", () => {
    const [window, body] = frameNamed(pickupFrame("ship")).commands.slice(2);
    const middleOf = (command: DrawCommand | undefined): Point =>
      command?.kind === "circle"
        ? { x: command.x, y: command.y }
        : { x: NaN, y: NaN };

    const drop = middleOf(body).y - middleOf(window).y;

    expect(middleOf(body).x).toBeCloseTo(middleOf(window).x, 9);
    expect(drop).toBeGreaterThan(0);
  });
});

describe("a pickup's outline", () => {
  const frame = frameNamed(pickupFrame("spread"));
  const [outline, hexagon] = frame.commands.map((command) =>
    command.kind === "polygon" ? command.points : [],
  );
  const apart = (outline ?? []).map((point) =>
    distanceToEdge(point, hexagon ?? []),
  );

  it("lies no nearer its hexagon than an outline's width anywhere", () => {
    expect(Math.min(...apart)).toBeCloseTo(outlineWidth(ART_SCALE), 6);
  });

  it("lies no farther from its hexagon than an outline's width anywhere", () => {
    expect(Math.max(...apart)).toBeCloseTo(outlineWidth(ART_SCALE), 6);
  });
});

describe("the other frames", () => {
  it("outlines a shot, a line wide, and fills it in the shots' color, along its travel", () => {
    // At a unit of 24, a shot is 17.28 by 7.2 device pixels, its line 2.
    const drawn = frameNamed(FRAMES.shot).commands.map((command) => [
      command.kind,
      ...sizesIn(command).map((size) => Math.round(size * 100) / 100),
      command.color,
    ]);

    expect(drawn).toEqual([
      ["roundRect", 21.28, 11.2, 5.6, ART_PALETTE.outline],
      ["roundRect", 17.28, 7.2, 3.6, ART_PALETTE.shot],
    ]);
  });

  it("draws a stray's bubble in its wash, its rim and its glint", () => {
    const bubble = frameNamed(FRAMES.bubble);

    expect({
      wash: bubble.commands.slice(0, 2),
      glint: new Set(bubble.commands.slice(2).map((command) => command.color)),
    }).toMatchObject({
      wash: [
        {
          kind: "circle",
          radius: STRAY_RADIUS * ART_SCALE.unit,
          color: ART_PALETTE.bubble,
        },
        { kind: "ring", color: ART_PALETTE.rim },
      ],
      glint: new Set([ART_PALETTE.glint]),
    });
  });

  it("keeps the comet's tail within the margin it leaves the field by, so it is out of sight as the comet goes", () => {
    expect(frameNamed(FRAMES.comet).width / 2).toBeLessThanOrEqual(
      COMET_MARGIN * ART_SCALE.unit,
    );
  });

  it("frames the comet's picture about its head and tail together", () => {
    const frame = frameNamed(PICTURE_FRAMES.comet);
    const edge = frame.commands.flatMap(edgeOf);

    const left = Math.min(...edge.map(({ x }) => x));
    const right = frame.width - Math.max(...edge.map(({ x }) => x));

    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });

  it("sets the stray's pilot within its bubble's rim", () => {
    const bubble = frameNamed(FRAMES.bubble).commands;
    const picture = frameNamed(FRAMES.strayPicture);
    const rim = bubble.find((command) => command.kind === "ring");

    const reach = Math.max(
      ...picture.commands
        .slice(bubble.length)
        .flatMap(edgeOf)
        .map(({ x, y }) =>
          Math.hypot(x - picture.width / 2, y - picture.height / 2),
        ),
    );

    expect(reach).toBeLessThan(
      rim?.kind === "ring" ? rim.radius - rim.width / 2 : 0,
    );
  });

  it("draws the comet's tail and its head, outlined, in the comet's color", () => {
    expect(
      frameNamed(FRAMES.comet).commands.map((command) => command.color),
    ).toEqual([ART_PALETTE.comet, ART_PALETTE.outline, ART_PALETTE.comet]);
  });

  it("draws the warning as two chevrons in the comet's color, round at their ends and corners", () => {
    const warning = frameNamed(FRAMES.warning);

    expect([
      drawnIn(warning, "line", ART_PALETTE.comet).length,
      drawnIn(warning, "circle", ART_PALETTE.comet).length,
    ]).toEqual([4, 6]);
  });

  it.each([FRAMES.speck, FRAMES.shard, FRAMES.spark, FRAMES.puff])(
    "draws the %s white, for the scene to tint",
    (name) => {
      expect(
        new Set(frameNamed(name).commands.map((command) => command.color)),
      ).toEqual(new Set([0xffffff]));
    },
  );

  it("seats the stray's pilot in its picture a little below its bubble's middle", () => {
    const frame = frameNamed(FRAMES.strayPicture);
    const [body] = drawnIn(frame, "circle", ART_PALETTE.accent);

    expect(
      body?.kind === "circle" ? body.y - frame.height / 2 : null,
    ).toBeCloseTo(STRAY_DROP * STRAY_RADIUS * ART_SCALE.unit);
  });

  it("pictures a stray as a fuzzball in the accent in its bubble, with its eyes", () => {
    const colors = new Set(
      frameNamed(FRAMES.strayPicture).commands.map((command) => command.color),
    );

    expect(colors).toEqual(
      new Set([
        ART_PALETTE.bubble,
        ART_PALETTE.rim,
        ART_PALETTE.glint,
        ART_PALETTE.accent,
        ART_PALETTE.eyes,
      ]),
    );
  });
});

describe("PICTURE_FRAMES", () => {
  const names = new Set(
    atlasFrames(ART_PALETTE, ART_SCALE).map((frame) => frame.name),
  );

  it("pictures every rock kind and pickup, a stray and the comet, from frames the atlas holds", () => {
    const pictured = [
      ...Object.values(PICTURE_FRAMES.rocks),
      ...Object.values(PICTURE_FRAMES.pickups),
      PICTURE_FRAMES.stray,
      PICTURE_FRAMES.comet,
    ];

    expect({
      count: pictured.length,
      missing: pictured.filter((name) => !names.has(name)),
    }).toEqual({
      count: ROCK_KIND_IDS.length + PICKUP_IDS.length + 2,
      missing: [],
    });
  });

  it("pictures each rock whole, at its largest size", () => {
    expect([
      PICTURE_FRAMES.rocks.boulder,
      PICTURE_FRAMES.rocks.volatile,
    ]).toEqual([
      rockFrame({ kind: "boulder", size: "boulder", outline: 0 }),
      rockFrame({ kind: "volatile", size: "large", outline: 0 }),
    ]);
  });
});

describe("mapPictures", () => {
  it("turns every picture into another, keeping what it pictures", () => {
    const pictures: Pictures = {
      ...PICTURE_FRAMES,
      rocks: { ...PICTURE_FRAMES.rocks, iron: "a" },
      pickups: { ...PICTURE_FRAMES.pickups, nova: "b" },
      stray: "c",
      comet: "d",
    };

    const mapped = mapPictures(pictures, (name) => `${name}!`);

    expect([
      mapped.rocks.iron,
      mapped.pickups.nova,
      mapped.stray,
      mapped.comet,
      Object.keys(mapped.pickups),
    ]).toEqual(["a!", "b!", "c!", "d!", Object.keys(pictures.pickups)]);
  });
});
