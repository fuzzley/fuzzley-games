import { type ArtFrame, type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { SPECIAL_IDS } from "../../rules/catalog/specials";
import {
  ART_PALETTE,
  ART_SCALE,
  SMALLEST_SCALE,
  billionths,
} from "../../testing/art_frames";
import { coverageOf, shareApart } from "../../testing/coverage";
import { bodyFrames, bodyInksOf, bodyOf, seatOf } from "./bodies";
import { BODY, SQUARE } from "./design_square";
import { FRAMES, FRAME_NAMES, type Fur, LIFTS, type Lift } from "./frame_names";

/** The bodies in the specs' palette, at their scale, a device pixel to each of the design's units. */
const BODIES = bodyFrames(ART_PALETTE, ART_SCALE);

/**
 * The least share of the area either of two kinds covers, fur and body,
 * that only one of them does, with no color at all: about the share by
 * which blue's round coat and green's curls, the nearest two, stand apart
 * at rest, less a little.
 */
const APART = 0.15;

/** How many points of the grid the masks are weighed on lie across a square: one to a CSS pixel of the smallest square, 40 px. */
const POINTS_A_SQUARE = 40;

/** Returns a kind's body in a fur at a lift. */
function bodyIn(kind: KindId, fur: Fur, lift: Lift = "rest"): ArtFrame {
  return frameNamed(BODIES, FRAMES.body(kind, fur, lift));
}

/** Returns where a drawing reaches each way. */
function edgesOf(commands: readonly DrawCommand[]): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const areas = commands.map(extentOf);
  return {
    left: Math.min(...areas.map(({ x }) => x)),
    right: Math.max(...areas.map(({ x, width }) => x + width)),
    top: Math.min(...areas.map(({ y }) => y)),
    bottom: Math.max(...areas.map(({ y, height }) => y + height)),
  };
}

/** Returns which points of a grid about its square's middle, half a square further each way, a body's frame covers, a point to each square's fortieth. */
function maskOf(frame: ArtFrame): Uint8Array {
  const step = ART_SCALE.unit / POINTS_A_SQUARE;
  return coverageOf(frame.commands, {
    from: {
      x: frame.width / 2 - ART_SCALE.unit + step / 2,
      y: frame.height / 2 - ART_SCALE.unit + step / 2,
    },
    step,
    across: 2 * POINTS_A_SQUARE,
    down: 2 * POINTS_A_SQUARE,
  });
}

/** Returns each pair of kinds, the first before the second in the catalog. */
function pairsOfKinds(): readonly (readonly [KindId, KindId])[] {
  return KIND_IDS.flatMap((kind, i) =>
    KIND_IDS.slice(i + 1).map((other) => [kind, other] as const),
  );
}

/** Returns the colors a drawing is drawn in, in the order they first come, each once. */
function colorsIn(commands: readonly DrawCommand[]): readonly number[] {
  return [...new Set(commands.map(({ color }) => color))];
}

/** Returns how far a special's rim reaches past its body's disc, the last shape in the square's color past the last of all, to a billionth. */
function rimWidthOf(commands: readonly DrawCommand[]): number {
  const rim = commands
    .filter(({ color }) => color === ART_PALETTE.square)
    .at(-1);
  const body = commands.at(-1);
  return rim?.kind === "circle" && body?.kind === "circle"
    ? billionths(rim.radius - body.radius)
    : NaN;
}

/** Returns each kind with each special. */
function specialsOfKinds(): readonly (readonly [
  KindId,
  (typeof SPECIAL_IDS)[number],
])[] {
  return KIND_IDS.flatMap((kind) =>
    SPECIAL_IDS.map((special) => [kind, special] as const),
  );
}

describe("bodyFrames", () => {
  it("draws each kind's body in each fur at rest and on end, in the order FRAME_NAMES lists them", () => {
    expect(BODIES.map(({ name }) => name)).toEqual(
      FRAME_NAMES.filter((name) => name.startsWith("body-")),
    );
  });

  it.each(KIND_IDS)("draws a plain %s in its ink alone", (kind) => {
    expect(
      LIFTS.map((lift) => colorsIn(bodyIn(kind, "plain", lift).commands)),
    ).toEqual(LIFTS.map(() => [ART_PALETTE.kinds[kind]]));
  });

  it.each(specialsOfKinds())(
    "draws a %s %s's second fur first, in its second ink, then its rim in the square's color, then the fuzzball in its ink",
    (kind, special) => {
      const runs = bodyIn(kind, special).commands.reduce<number[]>(
        (colors, { color }) =>
          colors.at(-1) === color ? colors : [...colors, color],
        [],
      );

      expect(runs).toEqual([
        ART_PALETTE.secondFurs[kind],
        ART_PALETTE.square,
        ART_PALETTE.kinds[kind],
      ]);
    },
  );

  it.each(KIND_IDS)(
    "draws a plain %s's body as a disc 58% of its square across, over its fur",
    (kind) => {
      const body = bodyIn(kind, "plain").commands.at(-1);

      // 29 of the square's 100 device pixels round, at the specs' scale.
      expect(body).toMatchObject({ kind: "circle", radius: 29 });
    },
  );

  it.each(pairsOfKinds())(
    `tells %s from %s by its outline alone, at rest and on end, ${String(APART * 100)}% of the area either covers apart`,
    (kind, other) => {
      const apart = LIFTS.map((lift) =>
        shareApart(
          maskOf(bodyIn(kind, "plain", lift)),
          maskOf(bodyIn(other, "plain", lift)),
        ),
      );

      expect(Math.min(...apart)).toBeGreaterThanOrEqual(APART);
    },
  );

  it.each(KIND_IDS)(
    "stands %s's fur on end over more of its square than at rest",
    (kind) => {
      const [rest = 0, onEnd = 0] = LIFTS.map((lift) =>
        maskOf(bodyIn(kind, "plain", lift)).reduce(
          (sum, point) => sum + point,
          0,
        ),
      );

      expect(onEnd).toBeGreaterThan(rest);
    },
  );

  it("rims a special's fuzzball a CSS pixel wide at least, at the smallest square", () => {
    const puffer = frameNamed(
      bodyFrames(ART_PALETTE, SMALLEST_SCALE),
      FRAMES.body("blue", "puffer", "rest"),
    );

    expect(rimWidthOf(puffer.commands)).toBeGreaterThanOrEqual(
      Math.ceil(SMALLEST_SCALE.pixelRatio),
    );
  });
});

describe("bodyOf", () => {
  it.each(KIND_IDS)(
    "keeps a plain %s at rest inside its square, fur and all",
    (kind) => {
      const { left, right, top, bottom } = edgesOf(
        bodyOf(kind, "plain", "rest", bodyInksOf(ART_PALETTE, kind), 0),
      );

      expect(Math.max(-left, right, -top, bottom)).toBeLessThanOrEqual(
        SQUARE / 2,
      );
    },
  );

  it.each(KIND_IDS)(
    "seats a plain %s so the whole of it at rest lies centered in its square, to 3% of it",
    (kind) => {
      const { left, right, top, bottom } = edgesOf(
        bodyOf(kind, "plain", "rest", bodyInksOf(ART_PALETTE, kind), 0),
      );

      expect(
        Math.max(Math.abs(left + right), Math.abs(top + bottom)) / 2,
      ).toBeLessThanOrEqual(0.03 * SQUARE);
    },
  );

  it.each(specialsOfKinds())(
    "draws a %s %s's fuzzball as large as its seat says, where it says",
    (kind, special) => {
      const seat = seatOf(kind, special);
      const body = bodyOf(
        kind,
        special,
        "rest",
        bodyInksOf(ART_PALETTE, kind),
        2,
      ).at(-1);

      expect(body).toMatchObject({
        kind: "circle",
        x: seat.x,
        y: seat.y,
        radius: BODY * seat.scale,
      });
    },
  );

  it("rims a special's fuzzball as wide as it is told", () => {
    expect(
      rimWidthOf(
        bodyOf("green", "wisp", "rest", bodyInksOf(ART_PALETTE, "green"), 3),
      ),
    ).toBe(3);
  });
});

describe("seatOf", () => {
  it.each(KIND_IDS)(
    "seats a plain %s where its kind sits, at its own size",
    (kind) => {
      expect(seatOf(kind, "plain").scale).toBe(1);
    },
  );

  it.each([
    ["dasher-across", { x: 0, y: BODY * 0.24 * 0.6, scale: 0.86 }],
    ["dasher-down", { x: 0, y: BODY * 0.24 * 0.6, scale: 0.86 }],
    ["puffer", { x: 0, y: BODY * 0.24 * 0.6, scale: 0.86 }],
    ["wisp", { x: 0, y: BODY * 0.42, scale: 0.8 }],
  ] as const)(
    "seats an amber %s closer in, or under its seed-head, and smaller, to make room for its second fur",
    (special, seat) => {
      expect(seatOf("amber", special)).toEqual(seat);
    },
  );
});
