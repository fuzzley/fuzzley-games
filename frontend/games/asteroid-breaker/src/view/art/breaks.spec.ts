import type { ArtScale } from "@fz/phaser/shapes";
import {
  ROCK_KIND_IDS,
  type RockKindId,
  type RockSize,
} from "../../rules/catalog/rocks";
import { ROCK_OUTLINES } from "../../rules/rocks/rocks";
import { ROCK_RADIUS } from "../../rules/tuning";
import { ART_PALETTE, ART_SCALE } from "../../testing/art_frames";
import { ROLES } from "../../testing/roles";
import { beltPalette } from "../colors/palette";
import { inLight } from "../colors/rock_light";
import { mixTone } from "../colors/tones";
import {
  BREAK_MS,
  type Break,
  type Broken,
  GLINT_POINTS,
  HELD_MS,
  HELD_REACH,
  IMPACT_POINTS,
  type Placed,
  type Round,
  type Streak,
  type Tick,
  breakOf,
  dustAt,
  glintAt,
  impactFlashAt,
  impactOf,
  impactTickAt,
  makeBreak,
  makeImpact,
  puffAt,
  shardPushOf,
  rimToward,
  roundOf,
  shardAt,
  sparkAt,
  sparkPoints,
  tickAt,
  towardShip,
  wholeAt,
} from "./breaks";
import { energyOf } from "./energy";
import { FIRST_SEED, rockShape, sizesOf } from "./rock_art";
import { litBy } from "./rocks/light";
import { type RockShape, makeRock } from "./rocks/rock_shape";
import { reachAt, turnedBy } from "./rocks/space";

/** A dark palette, the spec's roles in a dark palette's inks. */
const DARK = beltPalette(ROLES, "dark");

/** Every kind of rock in every size it comes in. */
const KINDS_AND_SIZES: readonly (readonly [RockKindId, RockSize])[] =
  ROCK_KIND_IDS.flatMap((kind) =>
    sizesOf(kind).map((size) => [kind, size] as const),
  );

/** Returns a sum over a list. */
function sum<T>(items: readonly T[], of: (item: T) => number): number {
  return items.reduce((total, item) => total + of(item), 0);
}

/** Returns a number rounded to four places, as the kit's numbers are copied. */
function fourPlaces(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

/** Describes a break of the kit's by its counts and the sums of its pieces' numbers. */
interface KitBreak {
  readonly kind: RockKindId;
  readonly size: RockSize;
  readonly shards: number;
  readonly heroes: number;
  readonly heading: number;
  readonly reach: number;
  readonly spin: number;
  readonly life: number;
  readonly sparks: number;
  readonly sparkAngle: number;
  readonly sparkReach: number;
  readonly sparkLength: number;
  readonly sparkLife: number;
  readonly puffs: number;
  readonly puffAngle: number;
  readonly puffR: number;
  readonly glints: number;
  readonly glintR: number;
  readonly glintDelay: number;
  readonly facing: number;
}

/**
 * The kit's `makeBreak()` of each kind's largest rock, cut from the seed 3
 * and broken from it, at no turn, by a blow from the left: its counts and
 * the sums of its pieces' numbers, as the kit makes them, copied from the
 * kit to four places. The kit gives each shard its heading, the way out
 * and the blow's push together, and its sparks in the rock's radii.
 */
const KIT_BREAKS = [
  {
    kind: "stone",
    size: "large",
    shards: 23,
    heroes: 6,
    heading: -2.2105,
    reach: 13.2775,
    spin: 1.362,
    life: 4896.8906,
    sparks: 4,
    sparkAngle: -0.3147,
    sparkReach: 4.3228,
    sparkLength: 1.1434,
    sparkLife: 784.008,
    puffs: 8,
    puffAngle: 21.8838,
    puffR: 9.1492,
    glints: 0,
    glintR: 0,
    glintDelay: 0,
    facing: 15.8316,
  },
  {
    kind: "ice",
    size: "large",
    shards: 42,
    heroes: 12,
    heading: -0.449,
    reach: 29.8579,
    spin: -8.0832,
    life: 9351.7219,
    sparks: 0,
    sparkAngle: 0,
    sparkReach: 0,
    sparkLength: 0,
    sparkLife: 0,
    puffs: 8,
    puffAngle: 21.9641,
    puffR: 9.4318,
    glints: 5,
    glintR: 3.5489,
    glintDelay: 794.9751,
    facing: 23.5444,
  },
  {
    kind: "crystal",
    size: "large",
    shards: 28,
    heroes: 12,
    heading: 7.9719,
    reach: 19.9721,
    spin: -10.0851,
    life: 6595.0189,
    sparks: 3,
    sparkAngle: 0.2152,
    sparkReach: 3.329,
    sparkLength: 0.972,
    sparkLife: 692.2374,
    puffs: 8,
    puffAngle: 22.3113,
    puffR: 9.0263,
    glints: 3,
    glintR: -0.3773,
    glintDelay: 599.2939,
    facing: 21.0494,
  },
  {
    kind: "iron",
    size: "large",
    shards: 7,
    heroes: 7,
    heading: 1.6686,
    reach: 7.4192,
    spin: -0.2047,
    life: 2621.1236,
    sparks: 9,
    sparkAngle: 0.1517,
    sparkReach: 8.8565,
    sparkLength: 2.8239,
    sparkLife: 1948.3224,
    puffs: 8,
    puffAngle: 21.9145,
    puffR: 9.0286,
    glints: 0,
    glintR: 0,
    glintDelay: 0,
    facing: 4.0567,
  },
  {
    kind: "volatile",
    size: "large",
    shards: 33,
    heroes: 7,
    heading: -1.0546,
    reach: 19.1004,
    spin: 7.2417,
    life: 6328.9094,
    sparks: 0,
    sparkAngle: 0,
    sparkReach: 0,
    sparkLength: 0,
    sparkLife: 0,
    puffs: 0,
    puffAngle: 0,
    puffR: 0,
    glints: 0,
    glintR: 0,
    glintDelay: 0,
    facing: 23.9495,
  },
  {
    kind: "lodestone",
    size: "large",
    shards: 22,
    heroes: 6,
    heading: 2.4339,
    reach: 12.8744,
    spin: -4.0361,
    life: 4593.3488,
    sparks: 4,
    sparkAngle: -0.4587,
    sparkReach: 4.025,
    sparkLength: 1.2873,
    sparkLife: 817.4072,
    puffs: 8,
    puffAngle: 21.9399,
    puffR: 9.3001,
    glints: 0,
    glintR: 0,
    glintDelay: 0,
    facing: 13.6711,
  },
  {
    kind: "boulder",
    size: "boulder",
    shards: 51,
    heroes: 11,
    heading: 1.6717,
    reach: 27.0032,
    spin: -9.0489,
    life: 10358.8188,
    sparks: 10,
    sparkAngle: -0.2536,
    sparkReach: 10.3667,
    sparkLength: 2.8492,
    sparkLife: 2157.0101,
    puffs: 8,
    puffAngle: 22.0897,
    puffR: 9.3512,
    glints: 0,
    glintR: 0,
    glintDelay: 0,
    facing: 32.7175,
  },
] as const satisfies readonly KitBreak[];

/** How far the kit's blow from the left pushes a shard, as `shardPushOf()` writes it at no turn. */
const KIT_PUSH = { x: 0.38, y: 0 };

/** Returns a break as the kit's sums of it read, its sparks back in the rock's radii. */
function kitSumsOf(made: Break, kind: RockKindId, size: RockSize): KitBreak {
  const radius = ROCK_RADIUS[size];
  const { shards, sparks, puffs, glints } = made;
  return {
    kind,
    size,
    shards: shards.length,
    heroes: shards.filter(({ hero }) => hero).length,
    heading: fourPlaces(
      sum(
        shards,
        ({ out, sway }) =>
          Math.atan2(out.y + KIT_PUSH.y, out.x + KIT_PUSH.x) + sway,
      ),
    ),
    reach: fourPlaces(sum(shards, ({ reach }) => reach)),
    spin: fourPlaces(sum(shards, ({ spin }) => spin)),
    life: fourPlaces(sum(shards, ({ life }) => life)),
    sparks: sparks.length,
    sparkAngle: fourPlaces(sum(sparks, ({ angle }) => angle)),
    sparkReach: fourPlaces(sum(sparks, ({ reach }) => reach / radius)),
    // A spark of the kit's is drawn 0.6 of its length, and 0.3 units at least.
    sparkLength: fourPlaces(sum(sparks, ({ length }) => length / radius / 0.6)),
    sparkLife: fourPlaces(sum(sparks, ({ delay, life }) => delay + life)),
    puffs: puffs.length,
    puffAngle: fourPlaces(sum(puffs, ({ angle }) => angle)),
    puffR: fourPlaces(sum(puffs, ({ at, r }) => at + r)),
    glints: glints.length,
    glintR: fourPlaces(sum(glints, ({ at, r }) => r + at.x + at.y)),
    glintDelay: fourPlaces(sum(glints, ({ delay, turn }) => delay + turn)),
    facing: fourPlaces(
      sum(shards, ({ facing }) => facing.x + facing.y + facing.z),
    ),
  };
}

/** Returns a rock broken at a turn, by a blow along a way, as the scene keeps it. */
function brokenAt(
  made: Break,
  turn = 0,
  way: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
): Broken {
  return { made, turn, push: shardPushOf(way.x, way.y, turn, { x: 0, y: 0 }) };
}

/**
 * Returns a record's entries with each number rounded to nine places, so
 * one worked out two ways reads the same.
 */
function ninePlaces(record: object): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === "number" ? Math.round(value * 1e9) / 1e9 : value,
    ]),
  );
}

/** Returns a record a polygon's place is written into. */
function placed(): Placed {
  return { x: 0, y: 0, turn: 0, scale: 0, color: 0, alpha: 0 };
}

/** Returns a record a disc's or a ring's place is written into. */
function round(): Round {
  return { x: 0, y: 0, radius: 0, width: 0, color: 0, alpha: 0 };
}

/** Returns a record a spark's line is written into. */
function streak(): Streak {
  return { fromX: 0, fromY: 0, toX: 0, toY: 0, width: 0, color: 0, alpha: 0 };
}

/** The largest stone's first outline's break, which most specs break. */
const STONE = breakOf({ kind: "stone", size: "large", outline: 0 });

/** The scale the art's specs draw at's rock radius for a large rock, in device pixels. */
const LARGE_PX = ROCK_RADIUS.large * ART_SCALE.unit;

/** Returns the latest time a break of a rock shows anything, in milliseconds after it broke. */
function lastShownAt(made: Break): number {
  return Math.max(
    ...made.shards.map(({ life }) => 30 + life),
    ...made.sparks.map(({ delay, life }) => delay + life),
    ...made.glints.map(({ delay }) => delay + 150),
  );
}

/** Returns whether anything of a break shows a time after it broke. */
function showsAt(made: Break, since: number, scale: ArtScale): boolean {
  const broken = brokenAt(made);
  const energy = energyOf(DARK.flame, DARK);
  return [
    wholeAt(broken, since, DARK, scale, placed()),
    dustAt(broken, since, DARK, scale, round()),
    ...made.shards.map((shard) =>
      shardAt(shard, broken, since, DARK, scale, placed()),
    ),
    ...made.puffs.map((puff) =>
      puffAt(puff, broken, since, DARK, scale, round()),
    ),
    ...made.sparks.map((tick) =>
      sparkAt(tick, broken, since, energy, scale, streak(), streak()),
    ),
    ...made.glints.map((glint) =>
      glintAt(glint, broken, since, DARK, scale, placed()),
    ),
  ].some(Boolean);
}

/** A scale of a device pixel to a field unit and none to a CSS pixel, which pads nothing. */
const UNPADDED: ArtScale = { unit: 1, pixelRatio: 0 };

/** Returns how far from a break's middle anything of it is drawn a time after it broke, in field units, turned and pushed. */
function drawnReachAt(made: Break, since: number): number {
  const broken = brokenAt(made, 0.7, { x: 0.6, y: -0.8 });
  const energy = energyOf(DARK.flame, DARK);
  const reachOfPoints = (points: readonly { x: number; y: number }[]) =>
    Math.max(...points.map(({ x, y }) => Math.hypot(x, y)));
  const reaches: number[] = [];
  const shape = placed();
  if (wholeAt(broken, since, DARK, UNPADDED, shape)) {
    reaches.push(shape.scale * reachOfPoints(made.shape.outline));
  }
  for (const shard of made.shards) {
    if (shardAt(shard, broken, since, DARK, UNPADDED, shape)) {
      reaches.push(
        Math.hypot(shape.x, shape.y) +
          shape.scale * reachOfPoints(shard.points),
      );
    }
  }
  const disc = round();
  if (dustAt(broken, since, DARK, UNPADDED, disc)) {
    reaches.push(disc.radius + disc.width / 2);
  }
  for (const puff of made.puffs) {
    if (puffAt(puff, broken, since, DARK, UNPADDED, disc)) {
      reaches.push(Math.hypot(disc.x, disc.y) + disc.radius);
    }
  }
  const body = streak();
  for (const tick of made.sparks) {
    if (sparkAt(tick, broken, since, energy, UNPADDED, body, streak())) {
      reaches.push(Math.hypot(body.toX, body.toY) + body.width / 2);
    }
  }
  for (const glint of made.glints) {
    if (glintAt(glint, broken, since, DARK, UNPADDED, shape)) {
      reaches.push(Math.hypot(shape.x, shape.y) + shape.scale);
    }
  }
  return Math.max(0, ...reaches);
}

/** Returns how far from where it struck anything of a held hit's spark is drawn at any time, in field units, a few milliseconds apart. */
function farthestHeld(ticks: readonly Tick[]): number {
  const energy = energyOf(DARK.flame, DARK);
  const body = streak();
  const flash = placed();
  return Math.max(
    ...Array.from({ length: HELD_MS / 2 }, (_, i) =>
      Math.max(
        0,
        ...ticks.map((tick) =>
          impactTickAt(tick, 0.7, i * 2, energy, UNPADDED, body, streak())
            ? Math.hypot(body.toX, body.toY) + body.width / 2
            : 0,
        ),
        impactFlashAt(0.7, i * 2, energy, UNPADDED, flash) ? flash.scale : 0,
      ),
    ),
  );
}

/** Returns how far from a break's middle anything of it is drawn at any time, in field units, a few milliseconds apart. */
function farthestDrawn(made: Break): number {
  return Math.max(
    ...Array.from({ length: BREAK_MS / 2 }, (_, i) =>
      drawnReachAt(made, i * 2),
    ),
  );
}

describe("makeBreak()", () => {
  it.each(KIT_BREAKS)(
    "breaks a $size $kind as the kit does, from its seed",
    (kit) => {
      const made = makeBreak(makeRock(kit.kind, kit.size, 3), 3);

      expect(kitSumsOf(made, kit.kind, kit.size)).toEqual(kit);
    },
  );

  it("throws a stone's own facets as its shards, each where it lay, but the dents, too small to fly", () => {
    const shape = rockShape({ kind: "stone", size: "large", outline: 0 });

    const laid = STONE.shards.map(({ points, at }) =>
      points.map(({ x, y }) => ({ x: x + at.x, y: y + at.y })),
    );

    const facets = shape.facets.map(({ points }) => points);
    expect({
      own: laid.every((points) =>
        facets.some(
          (facet) =>
            facet.length === points.length &&
            facet.every(
              (point, i) =>
                Math.abs(point.x - (points[i]?.x ?? NaN)) < 1e-12 &&
                Math.abs(point.y - (points[i]?.y ?? NaN)) < 1e-12,
            ),
        ),
      ),
      fewer: laid.length < facets.length,
    }).toEqual({ own: true, fewer: true });
  });

  it("splits ice's triangles into two slivers each", () => {
    const shape = rockShape({ kind: "ice", size: "small", outline: 0 });

    const made = makeBreak(shape, 1);

    expect(made.shards).toHaveLength(2 * shape.facets.length);
  });

  it("flies an ice facet of more than three corners whole, as only a triangle splits", () => {
    const square = [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
    ];
    const shape: RockShape = {
      ...rockShape({ kind: "ice", size: "small", outline: 0 }),
      facets: [{ points: square, facing: { x: 0, y: 0, z: 1 }, part: "body" }],
    };

    const [shard, ...rest] = makeBreak(shape, 1).shards;

    expect({ points: shard?.points, rest }).toEqual({
      points: square,
      rest: [],
    });
  });

  it("joins iron's facets into a few heavy plates that barely turn", () => {
    const shape = rockShape({ kind: "iron", size: "large", outline: 0 });

    const made = makeBreak(shape, 1);

    expect({
      fewer: made.shards.length < shape.facets.length / 2,
      barely: made.shards.every(({ spin }) => Math.abs(spin) <= 0.9),
    }).toEqual({ fewer: true, barely: true });
  });

  it("throws more heroes, sparks and puffs the larger the rock", () => {
    const heroesOf = (size: RockSize): readonly number[] =>
      Array.from({ length: ROCK_OUTLINES }, (_, outline) => {
        const made = breakOf({ kind: "stone", size, outline });
        return made.shards.filter(({ hero }) => hero).length;
      });
    const of = (size: RockSize): object => {
      const made = breakOf({ kind: "stone", size, outline: 0 });
      return { sparks: made.sparks.length, puffs: made.puffs.length };
    };

    expect({
      large: heroesOf("large"),
      medium: heroesOf("medium"),
      small: heroesOf("small"),
      sizes: [of("large"), of("medium"), of("small")],
    }).toEqual({
      large: Array.from({ length: ROCK_OUTLINES }, () => 6),
      medium: Array.from({ length: ROCK_OUTLINES }, () => 5),
      small: Array.from({ length: ROCK_OUTLINES }, () => 4),
      sizes: [
        { sparks: 4, puffs: 8 },
        { sparks: 2, puffs: 5 },
        { sparks: 2, puffs: 5 },
      ],
    });
  });

  it("throws every gem of a crystal as a shard that flies the whole time", () => {
    const made = breakOf({ kind: "crystal", size: "medium", outline: 2 });

    const gems = made.shards.filter(({ part }) => part === "gem");

    expect({
      some: gems.length > 0,
      heroes: gems.every(({ hero }) => hero),
    }).toEqual({ some: true, heroes: true });
  });

  it("throws no dust off a volatile rock, which blasts", () => {
    const made = breakOf({ kind: "volatile", size: "large", outline: 0 });

    expect([made.dust, made.puffs]).toEqual([0, []]);
  });
});

describe("breakOf()", () => {
  it.each(KINDS_AND_SIZES)(
    "breaks a %s rock %s in each outline from the seed its outline is cut from, the same every time",
    (kind, size) => {
      const breaks = Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
        breakOf({ kind, size, outline }),
      );

      expect({
        same: breaks.map((_, outline) => breakOf({ kind, size, outline })),
        seeded: breaks,
      }).toEqual({
        same: breaks,
        seeded: Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
          makeBreak(rockShape({ kind, size, outline }), FIRST_SEED + outline),
        ),
      });
    },
  );

  it("breaks each outline its own way", () => {
    const first = breakOf({ kind: "stone", size: "large", outline: 0 });

    const second = breakOf({ kind: "stone", size: "large", outline: 1 });

    expect(second.shards).not.toEqual(first.shards);
  });

  it("throws for an outline no rock is drawn in", () => {
    expect(() =>
      breakOf({ kind: "stone", size: "large", outline: ROCK_OUTLINES }),
    ).toThrow(RangeError);
  });
});

describe("a break's time", () => {
  it("is under half a second", () => {
    expect(BREAK_MS).toBeLessThan(500);
  });

  it.each(KINDS_AND_SIZES)(
    "leaves nothing of a %s rock %s's break, in any outline, by its time",
    (kind, size) => {
      const breaks = Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
        breakOf({ kind, size, outline }),
      );

      expect({
        last: breaks.every((made) => lastShownAt(made) <= BREAK_MS),
        shown: breaks.map((made) => showsAt(made, BREAK_MS, ART_SCALE)),
      }).toEqual({
        last: true,
        shown: breaks.map(() => false),
      });
    },
  );

  it.each(KINDS_AND_SIZES)(
    "draws a %s rock %s's break no farther from its middle than its reach, and most of the way there",
    (kind, size) => {
      const made = breakOf({ kind, size, outline: 0 });

      const farthest = farthestDrawn(made);

      expect({
        within: farthest <= made.reach + 1e-9,
        most: farthest > made.reach * 0.8,
      }).toEqual({ within: true, most: true });
    },
  );

  it("shows the rock whole until it comes apart, then its shards", () => {
    const broken = brokenAt(STONE);
    const shardsAt = (since: number): number =>
      STONE.shards.filter((shard) =>
        shardAt(shard, broken, since, DARK, ART_SCALE, placed()),
      ).length;

    expect({
      whole: [0, 29, 30].map((since) =>
        wholeAt(broken, since, DARK, ART_SCALE, placed()),
      ),
      shards: [0, 29, 30].map(shardsAt),
    }).toEqual({
      whole: [true, true, false],
      shards: [0, 0, STONE.shards.length],
    });
  });

  it("flies most shards for a few frames and its heroes the whole time", () => {
    const broken = brokenAt(STONE);

    const left = STONE.shards.filter((shard) =>
      shardAt(shard, broken, 230, DARK, ART_SCALE, placed()),
    );

    expect(left).toEqual(STONE.shards.filter(({ hero }) => hero));
  });
});

describe("wholeAt()", () => {
  it("flashes the rock's ink toward white on a dark field as it breaks, unturned from where it lay", () => {
    const into = placed();
    const ink = DARK.rocks.stone;

    wholeAt(brokenAt(STONE, 0.5), 0, DARK, ART_SCALE, into);

    expect(into).toEqual({
      x: 0,
      y: 0,
      turn: 0.5,
      scale: LARGE_PX,
      color: mixTone(ink, mixTone(ink, 0xffffff, 0.9), 0.86),
      alpha: 1,
    });
  });

  it("flashes it toward a pale tint of its ink on a light field", () => {
    const into = placed();
    const ink = ART_PALETTE.rocks.stone;

    wholeAt(brokenAt(STONE), 0, ART_PALETTE, ART_SCALE, into);

    expect(into.color).toBe(mixTone(ink, mixTone(ink, 0xffffff, 0.62), 0.86));
  });

  it("fades the flash after its first frame or two", () => {
    const flashAt = (since: number): number => {
      const into = placed();
      wholeAt(brokenAt(STONE), since, DARK, ART_SCALE, into);
      return into.color;
    };

    expect(flashAt(29)).not.toBe(flashAt(0));
  });
});

describe("shardAt()", () => {
  /** A hero of the stone's that lies off its middle. */
  const hero = STONE.shards.find((shard) => shard.hero) ?? STONE.shards[0];

  it("lays a shard where its facet lay, at its size, as the rock comes apart, turned with the rock", () => {
    const turn = 0.7;
    const into = placed();

    shardAt(hero!, brokenAt(STONE, turn), 30, DARK, ART_SCALE, into);

    const at = turnedBy(hero!.at, turn);
    expect({ ...into, color: 0 }).toEqual({
      x: at.x * LARGE_PX,
      y: at.y * LARGE_PX,
      turn,
      scale: LARGE_PX,
      color: 0,
      alpha: 1,
    });
  });

  it("flies it out along its way, pushed along the blow's, as far as its reach once its life is nearly run", () => {
    const blow = { x: 0, y: 1 };
    const into = placed();
    const broken = brokenAt(STONE, 0, blow);

    shardAt(hero!, broken, 30 + hero!.life * 0.999, DARK, ART_SCALE, into);

    const heading = Math.atan2(hero!.out.y + 0.38, hero!.out.x) + hero!.sway;
    const far = hero!.reach;
    expect([into.x / LARGE_PX, into.y / LARGE_PX]).toEqual([
      expect.closeTo(hero!.at.x + Math.cos(heading) * far, 6),
      expect.closeTo(hero!.at.y + Math.sin(heading) * far, 6),
    ]);
  });

  it("turns the blow's push back by the rock's turn, as the rock lay", () => {
    const push = shardPushOf(1, 0, Math.PI / 2, { x: 0, y: 0 });

    expect([push.x, push.y]).toEqual([
      expect.closeTo(0, 12),
      expect.closeTo(-0.38, 12),
    ]);
  });

  it("pushes nothing for a blow that came no way", () => {
    expect(shardPushOf(0, 0, 1, { x: 9, y: 9 })).toEqual({ x: 0, y: 0 });
  });

  it("tumbles it and shrinks it as it flies", () => {
    const into = placed();
    const half = 30 + hero!.life / 2;

    shardAt(hero!, brokenAt(STONE, 0.2), half, DARK, ART_SCALE, into);

    expect([into.turn, into.scale]).toEqual([
      0.2 + hero!.spin / 2,
      (LARGE_PX * (1 + hero!.shrink)) / 2,
    ]);
  });

  it("colors it as the field's light falls on the way it faces once its flash is over, fading toward the field's color", () => {
    const into = placed();
    const since = 30 + hero!.life / 2;
    const turned = 0.2 + hero!.spin / 2;

    shardAt(hero!, brokenAt(STONE, 0.2), since, DARK, ART_SCALE, into);

    const lit = inLight(
      DARK.rocks.stone,
      litBy(hero!.facing, turned, DARK.rockLight),
    );
    expect([into.color, into.alpha]).toEqual([
      mixTone(lit, DARK.field, 0.5 ** 1.6 * 0.85),
      1 - 0.5 ** 3,
    ]);
  });

  it("colors a crystal's gem in the crystal's ink, its body in a stone's", () => {
    const crystal = breakOf({ kind: "crystal", size: "large", outline: 0 });
    const inkOf = (part: "gem" | "body"): number => {
      const shard = crystal.shards.find((each) => each.part === part)!;
      const into = placed();
      shardAt(shard, brokenAt(crystal), 30 + 100, DARK, ART_SCALE, into);
      const faced = litBy(
        shard.facing,
        shard.spin * (100 / shard.life),
        DARK.rockLight,
      );
      const lit = (ink: number): number =>
        mixTone(
          inLight(ink, faced),
          DARK.field,
          (100 / shard.life) ** 1.6 * 0.85,
        );
      return into.color === lit(DARK.rocks.crystal)
        ? DARK.rocks.crystal
        : into.color === lit(DARK.rocks.stone)
          ? DARK.rocks.stone
          : NaN;
    };

    expect([inkOf("gem"), inkOf("body")]).toEqual([
      DARK.rocks.crystal,
      DARK.rocks.stone,
    ]);
  });

  it("flashes it toward the flash's tone as it first flies", () => {
    const flashed = placed();
    const after = placed();
    const broken = brokenAt(STONE);

    shardAt(hero!, broken, 31, DARK, ART_SCALE, flashed);
    shardAt(hero!, broken, 95, DARK, ART_SCALE, after);

    const lit = inLight(
      DARK.rocks.stone,
      litBy(hero!.facing, hero!.spin * (65 / hero!.life), DARK.rockLight),
    );
    expect({
      brighter: flashed.color !== after.color,
      over:
        after.color ===
        mixTone(lit, DARK.field, (65 / hero!.life) ** 1.6 * 0.85),
    }).toEqual({ brighter: true, over: true });
  });

  it("is gone once its life has run", () => {
    expect(
      shardAt(
        hero!,
        brokenAt(STONE),
        30 + hero!.life,
        DARK,
        ART_SCALE,
        placed(),
      ),
    ).toBe(false);
  });
});

describe("dustAt() and puffAt()", () => {
  it("spreads the dust's ring from inside the rock to past its edge, thinning and fading, in its ink mixed toward the field", () => {
    const first = round();
    const later = round();
    const broken = brokenAt(STONE);

    dustAt(broken, 16, DARK, ART_SCALE, first);
    dustAt(broken, 400, DARK, ART_SCALE, later);

    expect({
      from: first.radius > 0.7 * LARGE_PX && first.radius < LARGE_PX,
      past: later.radius > 1.7 * LARGE_PX && later.radius < 1.75 * LARGE_PX,
      thins: later.width < first.width,
      fades: later.alpha < first.alpha,
      color: first.color,
    }).toEqual({
      from: true,
      past: true,
      thins: true,
      fades: true,
      color: mixTone(DARK.rocks.stone, DARK.field, 0.3),
    });
  });

  it("mixes the dust further toward a light field", () => {
    const into = round();

    dustAt(brokenAt(STONE), 100, ART_PALETTE, ART_SCALE, into);

    expect(into.color).toBe(
      mixTone(ART_PALETTE.rocks.stone, ART_PALETTE.field, 0.45),
    );
  });

  it("draws the ring a CSS pixel wide at least", () => {
    const into = round();
    const small = { unit: 1, pixelRatio: 3 };

    dustAt(brokenAt(STONE), 400, DARK, small, into);

    expect(into.width).toBe(3);
  });

  it("shows no dust before it starts or once it has spread", () => {
    const broken = brokenAt(STONE);

    expect(
      [15, BREAK_MS - 20].map((since) =>
        dustAt(broken, since, DARK, ART_SCALE, round()),
      ),
    ).toEqual([false, false]);
  });

  it("lays each puff on the ring, turned with the rock, swelling as it fades", () => {
    const [puff] = STONE.puffs;
    const ring = round();
    const into = round();
    const turn = 1.1;
    const broken = brokenAt(STONE, turn);

    dustAt(broken, 200, DARK, ART_SCALE, ring);
    puffAt(puff!, broken, 200, DARK, ART_SCALE, into);

    const done = (200 - 15) / (BREAK_MS - 35);
    expect(ninePlaces(into)).toEqual(
      ninePlaces({
        x: Math.cos(puff!.angle + turn) * ring.radius * puff!.at,
        y: Math.sin(puff!.angle + turn) * ring.radius * puff!.at,
        radius: LARGE_PX * puff!.r * (0.7 + 0.9 * done),
        width: 0,
        color: ring.color,
        alpha: 0.42 * (1 - done),
      }),
    );
  });

  it("shows no puff where no dust shows", () => {
    const [puff] = STONE.puffs;

    expect(puffAt(puff!, brokenAt(STONE), 10, DARK, ART_SCALE, round())).toBe(
      false,
    );
  });
});

describe("sparkAt() and tickAt()", () => {
  const energy = energyOf(DARK.flame, DARK);
  const tick = { angle: 0, reach: 2, length: 0.5, delay: 20, life: 200 };
  const start = { from: 0.5, width: 0.1 };

  it("throws a spark out from near the middle along its way once its delay is past, its head bright", () => {
    const body = streak();
    const hot = streak();

    tickAt(tick, 20, start, 0, energy, ART_SCALE, body, hot);

    const from = 0.5 * ART_SCALE.unit;
    expect({ body, hot }).toEqual({
      body: {
        fromX: from,
        fromY: 0,
        toX: from,
        toY: 0,
        width: 0.1 * ART_SCALE.unit,
        color: energy.body,
        alpha: 1,
      },
      hot: {
        fromX: from,
        fromY: 0,
        toX: from,
        toY: 0,
        width: 0.1 * ART_SCALE.unit * 0.6,
        color: energy.hot,
        alpha: 1,
      },
    });
  });

  it("flies its head out to its reach, its tail behind it, shortening and fading", () => {
    const body = streak();
    const hot = streak();

    tickAt(tick, 20 + 100, start, 0, energy, ART_SCALE, body, hot);

    const { unit } = ART_SCALE;
    const head = (0.5 + 2 * (1 - 0.5 ** 3)) * unit;
    const tail = head - 0.5 * unit * (1 - 0.5 * 0.7);
    expect([body.fromX, body.toX, hot.fromX, body.alpha]).toEqual([
      expect.closeTo(tail, 9),
      expect.closeTo(head, 9),
      expect.closeTo(tail + (head - tail) * 0.55, 9),
      0.75,
    ]);
  });

  it("turns it by the way it is thrown about, and draws it a CSS pixel wide at least", () => {
    const body = streak();

    tickAt(
      tick,
      120,
      start,
      Math.PI / 2,
      energy,
      { unit: 1, pixelRatio: 2 },
      body,
      streak(),
    );

    expect([body.fromX, body.width]).toEqual([expect.closeTo(0, 9), 2]);
  });

  it("shows nothing before its delay or after its life", () => {
    expect(
      [19, 220].map((since) =>
        tickAt(tick, since, start, 0, energy, ART_SCALE, streak(), streak()),
      ),
    ).toEqual([false, false]);
  });

  it("throws a break's sparks from near its middle, as wide as its kind's", () => {
    const iron = breakOf({ kind: "iron", size: "large", outline: 0 });
    const [spark] = iron.sparks;
    const body = streak();

    sparkAt(
      spark!,
      brokenAt(iron),
      spark!.delay,
      energy,
      ART_SCALE,
      body,
      streak(),
    );

    const from = ROCK_RADIUS.large * 0.45 * ART_SCALE.unit;
    expect([Math.hypot(body.fromX, body.fromY), body.width]).toEqual([
      expect.closeTo(from, 9),
      0.14 * ART_SCALE.unit,
    ]);
  });
});

describe("glintAt()", () => {
  const ice = breakOf({ kind: "ice", size: "large", outline: 0 });
  const [glint] = ice.glints;

  it("swells a glint where it shows, turned with the rock, padded, then lets it go", () => {
    const into = placed();
    const turn = 0.4;
    const peak = glint!.delay + 0.35 * 150;

    glintAt(glint!, brokenAt(ice, turn), peak, DARK, ART_SCALE, into);

    const at = turnedBy(glint!.at, turn);
    expect(ninePlaces(into)).toEqual(
      ninePlaces({
        x: at.x * LARGE_PX,
        y: at.y * LARGE_PX,
        turn: glint!.turn,
        scale: LARGE_PX * glint!.r + 0.6 * ART_SCALE.pixelRatio,
        color: DARK.glint,
        alpha: 0.95,
      }),
    );
  });

  it("draws it in the rock's ink on a light field", () => {
    const into = placed();

    glintAt(
      glint!,
      brokenAt(ice),
      glint!.delay + 50,
      ART_PALETTE,
      ART_SCALE,
      into,
    );

    expect(into.color).toBe(ART_PALETTE.rocks.ice);
  });

  it("shows it as a speck as it starts, and nothing before its delay or after its time", () => {
    const into = placed();
    const broken = brokenAt(ice);

    const shown = [glint!.delay - 1, glint!.delay, glint!.delay + 150].map(
      (since) => glintAt(glint!, broken, since, DARK, ART_SCALE, into),
    );

    expect(shown).toEqual([false, true, false]);
  });

  it("draws a four-point star, its waist a fifth of its reach", () => {
    expect(
      GLINT_POINTS.map(({ x, y }) => fourPlaces(Math.hypot(x, y))),
    ).toEqual([1, 0.2, 1, 0.2, 1, 0.2, 1, 0.2]);
  });
});

describe("a held hit's spark", () => {
  const energy = energyOf(DARK.flame, DARK);

  it("throws five sparks off a rock, seven off iron, which rings", () => {
    expect([impactOf("stone", 1).length, impactOf("iron", 1).length]).toEqual([
      5, 7,
    ]);
  });

  it("throws the shape its serial picks, so hits in a row throw theirs apart", () => {
    expect({
      apart: impactOf("stone", 1) !== impactOf("stone", 2),
      again: impactOf("stone", 1) === impactOf("stone", 9),
      made: impactOf("stone", 1),
    }).toEqual({ apart: true, again: true, made: makeImpact(5, 2) });
  });

  it("fans its sparks back about the way the shot came", () => {
    const toward = 2;
    const fan = 2 * Math.PI * 0.42;

    const ways = impactOf("stone", 3).map((tick) => {
      const body = streak();
      impactTickAt(tick, toward, 120, energy, ART_SCALE, body, streak());
      return Math.atan2(body.toY, body.toX) - toward;
    });

    expect(ways.every((way) => Math.abs(way) <= fan / 2)).toBe(true);
  });

  it("flashes a four-point spark in the bright middle, turned to the way the shot came, shrinking and fading", () => {
    const into = placed();

    impactFlashAt(1.5, 50, energy, ART_SCALE, into);

    const done = (50 * 0.8) / 80;
    expect(into).toEqual({
      x: 0,
      y: 0,
      turn: 1.5,
      scale: 0.42 * ART_SCALE.unit * (1 - done * 0.6),
      color: energy.hot,
      alpha: 1 - done,
    });
  });

  it("draws a four-point star for its flash, its waist under a third of its reach", () => {
    expect(
      IMPACT_POINTS.map(({ x, y }) => fourPlaces(Math.hypot(x, y))),
    ).toEqual([1, 0.3, 1, 0.3, 1, 0.3, 1, 0.3]);
  });

  it("draws it no farther from where it struck than its reach, off iron or any other kind, and most of the way there", () => {
    const farthest = Math.max(
      ...(["stone", "iron"] as const).flatMap((kind) =>
        Array.from({ length: 8 }, (_, serial) =>
          farthestHeld(impactOf(kind, serial)),
        ),
      ),
    );

    expect({
      within: farthest <= HELD_REACH + 1e-9,
      most: farthest > HELD_REACH * 0.8,
    }).toEqual({ within: true, most: true });
  });

  it("leaves nothing of it by its time", () => {
    const shown = [5, 7].flatMap((count) =>
      Array.from({ length: 8 }, (_, seed) => makeImpact(count, seed + 1))
        .flat()
        .map((tick) =>
          impactTickAt(tick, 0, HELD_MS, energy, ART_SCALE, streak(), streak()),
        ),
    );

    expect({
      ticks: shown.some(Boolean),
      flash: impactFlashAt(0, HELD_MS, energy, ART_SCALE, placed()),
    }).toEqual({ ticks: false, flash: false });
  });

  it("throws it from the rim of the rock toward a way, as the rock has turned", () => {
    const rock = {
      kind: "stone",
      size: "large",
      outline: 2,
      angle: 1,
    } as const;

    const rim = rimToward(rock, 0.3);

    expect(rim).toBe(
      reachAt(rockShape(rock).outline, 0.3 - 1) * ROCK_RADIUS.large,
    );
  });

  it("throws it back toward the ship, the short way across the wrap", () => {
    const field = { ship: { x: 1, y: 20 }, torus: { width: 72, height: 40 } };

    expect(towardShip(field, 71, 20, DARK)).toBeCloseTo(0, 12);
  });

  it("throws it toward the field's light while no ship flies", () => {
    const field = { ship: null, torus: { width: 72, height: 40 } };
    const { way } = DARK.rockLight;

    expect(towardShip(field, 10, 10, DARK)).toBe(Math.atan2(way.y, way.x));
  });

  it("draws its sparks as four-point stars of a radius, pinched and turned", () => {
    const [first, waist] = sparkPoints(2, 0.5, Math.PI / 2);

    expect([first?.x, first?.y, Math.hypot(waist!.x, waist!.y)]).toEqual([
      expect.closeTo(0, 12),
      2,
      expect.closeTo(1, 12),
    ]);
  });
});

describe("roundOf()", () => {
  it("draws a round in the fewest corners whose sides fall no further inside its circle than it may, or the finest there is", () => {
    const radii = [2, 5, 10, 20, 40, 80, 150];

    const corners = radii.map((radius) => roundOf(radius, 0.5, 1).sides.length);

    expect(corners).toEqual([6, 8, 12, 16, 24, 32, 48]);
  });

  it("draws a round of a size in CSS pixels in as many corners at any pixel ratio", () => {
    const corners = [1, 2, 3].map(
      (pixelRatio) => roundOf(20 * pixelRatio, 0.5, pixelRatio).sides.length,
    );

    expect(corners).toEqual([16, 16, 16]);
  });

  it("closes a round's sides on its circle, each meeting the next, and fans its inside from its first corner", () => {
    const { sides, fan } = roundOf(10, 0.5, 1);
    const text = ({ x, y }: { x: number; y: number }): string =>
      `${fourPlaces(x)},${fourPlaces(y)}`;

    const ends = sides.map(([, to]) => text(to));

    expect({
      ends,
      radii: new Set(
        sides.flat().map(({ x, y }) => fourPlaces(Math.hypot(x, y))),
      ),
      fan: fan.map((corners) => corners.map(text)),
    }).toEqual({
      ends: [...sides.slice(1), ...sides.slice(0, 1)].map(([from]) =>
        text(from),
      ),
      radii: new Set([1]),
      fan: Array.from({ length: sides.length - 2 }, (_, triangle) =>
        [0, triangle + 1, triangle + 2].map((corner) =>
          text(sides[corner]?.[0] ?? { x: Number.NaN, y: Number.NaN }),
        ),
      ),
    });
  });
});
