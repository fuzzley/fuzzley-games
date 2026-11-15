import {
  type ArtFrame,
  type DrawCommand,
  atlasSize,
  lineWidth,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { FUZZBALL_FACES, MOST_LIFT } from "@fz/style/fuzzball";
import { PICKUP_IDS } from "../../rules/catalog/pickups";
import { COMET_MARGIN, STRAY_RADIUS } from "../../rules/tuning";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  ART_SCALES,
  PIXEL_RATIOS,
  distanceToEdge,
  edgeOf,
  reachOf,
} from "../../testing/art_frames";
import { TAG_RADIUS, isTagged } from "../field/tags";
import {
  DECK_FRAMES,
  FRAMES,
  PICKUP_REACH,
  PICTURE_FRAMES,
  SHOT_REACH,
  STRAY_DROP,
  atlasFrames,
  deckFrames,
  litFrames,
  pickupFrame,
  tagFrame,
} from "./art";
import {
  ADRIFT_FRAMES,
  LEANS,
  SEATS,
  eyesFrame,
  furFrame,
  sparksFrames,
} from "./pilot_art";
import {
  FLICKER_FRAMES,
  GAUGE_STEPS,
  POD_FRAMES,
  flameFrame,
  gaugeFrame,
} from "./pod_art";
import { isFine, rockFrames } from "./rock_art";
import { MOST_BAKED_UNIT, bakedScale, outlineWidth } from "./shapes";

/** The largest atlas every device takes, a side. */
const ATLAS_SIDE = 2048;

/** How far a size may stray from what it should be and still pass, for a rounding. */
const SLACK = 1e-9;

/**
 * Returns whether a command draws within its frame, its edge's every point,
 * give or take a rounding.
 */
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

/** Every lift the pod's pilot's fur is baked at. */
const LIFTS = Array.from({ length: MOST_LIFT + 1 }, (_, lift) => lift);

/** The names of the pilots' frames: the pod's pilot's fur at each lift and push, static's sparks, a pilot adrift's fur, and each seat's eyes at each face. */
const PILOT_FRAMES: readonly string[] = [
  ...LIFTS.flatMap((lift) => LEANS.map((lean) => furFrame(lift, lean))),
  ...LEANS.flatMap((lean) => Object.values(sparksFrames(lean))),
  ...Object.values(ADRIFT_FRAMES),
  ...SEATS.flatMap((seat) =>
    FUZZBALL_FACES.map((face) => eyesFrame(seat, face)),
  ),
];

/**
 * The frames drawn with the fuzzball, its fur, its faces and static's
 * sparks, whose lines keep the mark's own proportions at any size, as the
 * shell's fuzzball does, so they are under a CSS pixel wide on a small
 * pilot.
 */
const FURRED: ReadonlySet<string> = new Set([
  ...PILOT_FRAMES,
  FRAMES.strayPicture,
]);

/** The pod's frames the field's atlas holds: all but its hull, which the rocks' atlas lights. */
const POD_ATLAS_FRAMES: readonly string[] = [
  ...Object.values(POD_FRAMES).filter((name) => name !== POD_FRAMES.hull),
  ...Array.from({ length: GAUGE_STEPS + 1 }, (_, step) =>
    gaugeFrame(step / GAUGE_STEPS),
  ),
  ...Array.from({ length: FLICKER_FRAMES }, (_, flicker) =>
    flameFrame(flicker),
  ),
];

/**
 * Holds a set of frames to what every frame keeps: within its size, in whole
 * pixels, named once, its lines a CSS pixel wide or more but the fur's.
 */
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
            // A width drawn in shares of a size comes back a rounding off.
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
        breaking(
          atlasFrames(
            ART_PALETTE,
            { unit, pixelRatio },
            isFine({ unit, pixelRatio }),
          ),
          (frame) =>
            frame.commands.every((command) =>
              sizesIn(command).every((size) => size >= 0),
            ),
        ).map((name) => `${name} at ${String(unit)}`),
      );

      expect(negative).toEqual([]);
    },
  );
});

describe.each(ART_SCALES)(
  "atlasFrames at a unit of $unit device pixels, $pixelRatio to a CSS pixel",
  (scale) => {
    holdsFrames(
      () => atlasFrames(ART_PALETTE, scale, isFine(scale)),
      scale.pixelRatio,
    );

    it("fits the atlas in 2048 × 2048", () => {
      const { width, height } = atlasSize(
        atlasFrames(ART_PALETTE, scale, isFine(scale)),
      );

      expect(Math.max(width, height)).toBeLessThanOrEqual(ATLAS_SIDE);
    });
  },
);

describe("SHOT_REACH", () => {
  it.each(ART_SCALES)(
    "holds a shot, from its middle, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const beyond = atlasFrames(ART_PALETTE, scale, isFine(scale))
        .filter(
          (frame) =>
            frame.name === FRAMES.shot &&
            reachOf(frame) > SHOT_REACH * scale.unit + SLACK,
        )
        .map((frame) => frame.name);

      expect(beyond).toEqual([]);
    },
  );
});

describe("PICKUP_REACH", () => {
  it.each(ART_SCALES)(
    "holds every pickup, from its middle, at a unit of $unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const pickups: readonly string[] = PICKUP_IDS.map(pickupFrame);

      const beyond = atlasFrames(ART_PALETTE, scale, isFine(scale))
        .filter(
          (frame) =>
            pickups.includes(frame.name) &&
            reachOf(frame) > PICKUP_REACH * scale.unit + SLACK,
        )
        .map((frame) => frame.name);

      expect(beyond).toEqual([]);
    },
  );
});

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

/** The longest side the rocks' atlas may take, which every device the game is played on holds. */
const LIT_ATLAS_SIDE = 4096;

describe("litFrames", () => {
  it("holds every rock's frame, then the pod's hull", () => {
    const fine = isFine(ART_SCALE);

    const names = litFrames(ART_PALETTE, ART_SCALE, fine).map(
      ({ ink }) => ink.name,
    );

    expect(names).toEqual([
      ...rockFrames(ART_PALETTE, ART_SCALE, fine).map(({ ink }) => ink.name),
      POD_FRAMES.hull,
    ]);
  });

  it.each([1, 3])(
    `fits the rocks' atlas, the pod's hull among it, in ${String(LIT_ATLAS_SIDE)} a side at the largest unit baked, %i to a CSS pixel`,
    (pixelRatio) => {
      const scale = bakedScale({ unit: MOST_BAKED_UNIT * 4, pixelRatio });

      const { width, height } = atlasSize(
        litFrames(ART_PALETTE, scale, true).map(({ ink }) => ink),
      );

      expect(Math.max(width, height)).toBeLessThanOrEqual(LIT_ATLAS_SIDE);
    },
  );
});

describe("the atlas", () => {
  const names = new Set(
    atlasFrames(ART_PALETTE, ART_SCALE, isFine(ART_SCALE)).map(
      (frame) => frame.name,
    ),
  );

  it("holds no rock, which the rocks' own atlas holds", () => {
    const rocks = rockFrames(ART_PALETTE, ART_SCALE, true).map(
      ({ ink }) => ink.name,
    );

    expect(rocks.filter((name) => names.has(name))).toEqual([]);
  });

  it("holds not the pod's hull, which the rocks' atlas lights", () => {
    expect(names.has(POD_FRAMES.hull)).toBe(false);
  });

  it("holds a frame for each of the pilots' furs, sparks and faces", () => {
    expect(PILOT_FRAMES.filter((name) => !names.has(name))).toEqual([]);
  });

  it.each([
    ...Object.values(FRAMES),
    ...POD_ATLAS_FRAMES,
    ...PICKUP_IDS.map(pickupFrame),
    ...PICKUP_IDS.filter(isTagged).map(tagFrame),
  ])("holds the %s frame", (name) => {
    expect(names.has(name)).toBe(true);
  });
});

describe("a tag's frame", () => {
  it.each(PICKUP_IDS.filter(isTagged))(
    "draws %s's symbol alone, in the accent",
    (id) => {
      const frame = frameNamed(ART_FRAMES, tagFrame(id));

      expect(new Set(frame.commands.map((command) => command.color))).toEqual(
        new Set([ART_PALETTE.accent]),
      );
    },
  );

  it.each(PICKUP_IDS.filter(isTagged))(
    "keeps %s's symbol within its ring, clear of the ring's line",
    (id) => {
      const frame = frameNamed(ART_FRAMES, tagFrame(id));
      const middle = { x: frame.width / 2, y: frame.height / 2 };

      const reach = Math.max(
        ...frame.commands
          .flatMap(edgeOf)
          .map((point) => Math.hypot(point.x - middle.x, point.y - middle.y)),
      );

      expect(reach).toBeLessThan(
        TAG_RADIUS * ART_SCALE.unit - lineWidth(ART_SCALE),
      );
    },
  );

  it("names no tag for the Nova, which is over as it starts", () => {
    expect(() => tagFrame("nova")).toThrow(RangeError);
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
  it.each(PICKUP_IDS)(
    "outlines the %s pickup, fills it in the accent, and draws its symbol in the color on the accent",
    (id) => {
      const frame = frameNamed(ART_FRAMES, pickupFrame(id));

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
});

describe("a pickup's outline", () => {
  const frame = frameNamed(ART_FRAMES, pickupFrame("spread"));
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
    const drawn = frameNamed(ART_FRAMES, FRAMES.shot).commands.map(
      (command) => [
        command.kind,
        ...sizesIn(command).map((size) => Math.round(size * 100) / 100),
        command.color,
      ],
    );

    expect(drawn).toEqual([
      ["roundRect", 21.28, 11.2, 5.6, ART_PALETTE.outline],
      ["roundRect", 17.28, 7.2, 3.6, ART_PALETTE.shot],
    ]);
  });

  it("draws a stray's bubble in its wash, its rim and its glint", () => {
    const bubble = frameNamed(ART_FRAMES, FRAMES.bubble);

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
    expect(frameNamed(ART_FRAMES, FRAMES.comet).width / 2).toBeLessThanOrEqual(
      COMET_MARGIN * ART_SCALE.unit,
    );
  });

  it("frames the comet's picture about its head and tail together", () => {
    const frame = frameNamed(ART_FRAMES, PICTURE_FRAMES.comet);
    const edge = frame.commands.flatMap(edgeOf);

    const left = Math.min(...edge.map(({ x }) => x));
    const right = frame.width - Math.max(...edge.map(({ x }) => x));

    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });

  it("sets the stray's pilot within its bubble's rim", () => {
    const bubble = frameNamed(ART_FRAMES, FRAMES.bubble).commands;
    const picture = frameNamed(ART_FRAMES, FRAMES.strayPicture);
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
      frameNamed(ART_FRAMES, FRAMES.comet).commands.map(
        (command) => command.color,
      ),
    ).toEqual([ART_PALETTE.comet, ART_PALETTE.outline, ART_PALETTE.comet]);
  });

  it("draws the warning as two chevrons in the comet's color, round at their ends and corners", () => {
    const warning = frameNamed(ART_FRAMES, FRAMES.warning);

    expect([
      drawnIn(warning, "line", ART_PALETTE.comet).length,
      drawnIn(warning, "circle", ART_PALETTE.comet).length,
    ]).toEqual([4, 6]);
  });

  it.each([FRAMES.shard, FRAMES.spark, FRAMES.puff])(
    "draws the %s white, for the scene to tint",
    (name) => {
      expect(
        new Set(
          frameNamed(ART_FRAMES, name).commands.map((command) => command.color),
        ),
      ).toEqual(new Set([0xffffff]));
    },
  );

  it("seats the stray's pilot in its picture a little below its bubble's middle", () => {
    const frame = frameNamed(ART_FRAMES, FRAMES.strayPicture);
    const [body] = drawnIn(frame, "circle", ART_PALETTE.accent);

    expect(
      body?.kind === "circle" ? body.y - frame.height / 2 : null,
    ).toBeCloseTo(STRAY_DROP * STRAY_RADIUS * ART_SCALE.unit);
  });

  it("pictures a stray as a fuzzball in the accent in its bubble, with its eyes", () => {
    const colors = new Set(
      frameNamed(ART_FRAMES, FRAMES.strayPicture).commands.map(
        (command) => command.color,
      ),
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
    atlasFrames(ART_PALETTE, ART_SCALE, isFine(ART_SCALE)).map(
      (frame) => frame.name,
    ),
  );

  it("pictures every pickup, a stray and the comet from frames the atlas holds", () => {
    const pictured = [
      ...Object.values(PICTURE_FRAMES.pickups),
      PICTURE_FRAMES.stray,
      PICTURE_FRAMES.comet,
    ];

    expect({
      count: pictured.length,
      missing: pictured.filter((name) => !names.has(name)),
    }).toEqual({
      count: PICKUP_IDS.length + 2,
      missing: [],
    });
  });
});
