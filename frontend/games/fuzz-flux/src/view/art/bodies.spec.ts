import { type ArtFrame, type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { ART_PALETTE, ART_SCALE } from "../../testing/art_frames";
import { coverageOf, shareApart } from "../../testing/coverage";
import { bodyFrames, plainBody } from "./bodies";
import { SQUARE } from "./design_square";
import { FRAMES, FRAME_NAMES, LIFTS, type Lift } from "./frame_names";

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

/** Returns a kind's plain body at a lift. */
function bodyOf(kind: KindId, lift: Lift): ArtFrame {
  return frameNamed(BODIES, FRAMES.body(kind, "plain", lift));
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

describe("bodyFrames", () => {
  it("draws each kind's plain body at rest and on end, in the order FRAME_NAMES lists them", () => {
    expect(BODIES.map(({ name }) => name)).toEqual(
      FRAME_NAMES.filter((name) => /^body-[a-z]+-plain-/.test(name)),
    );
  });

  it.each(KIND_IDS)("draws %s in its ink alone", (kind) => {
    const colors = new Set(
      LIFTS.flatMap((lift) =>
        bodyOf(kind, lift).commands.map(({ color }) => color),
      ),
    );

    expect([...colors]).toEqual([ART_PALETTE.kinds[kind]]);
  });

  it.each(KIND_IDS)(
    "draws %s's body as a disc 58% of its square across, over its fur",
    (kind) => {
      const body = bodyOf(kind, "rest").commands.at(-1);

      // 29 of the square's 100 device pixels round, at the specs' scale.
      expect(body).toMatchObject({ kind: "circle", radius: 29 });
    },
  );

  it.each(pairsOfKinds())(
    `tells %s from %s by its outline alone, at rest and on end, ${String(APART * 100)}% of the area either covers apart`,
    (kind, other) => {
      const apart = LIFTS.map((lift) =>
        shareApart(maskOf(bodyOf(kind, lift)), maskOf(bodyOf(other, lift))),
      );

      expect(Math.min(...apart)).toBeGreaterThanOrEqual(APART);
    },
  );

  it.each(KIND_IDS)(
    "stands %s's fur on end over more of its square than at rest",
    (kind) => {
      const [rest = 0, onEnd = 0] = LIFTS.map((lift) =>
        maskOf(bodyOf(kind, lift)).reduce((sum, point) => sum + point, 0),
      );

      expect(onEnd).toBeGreaterThan(rest);
    },
  );
});

describe("plainBody", () => {
  it.each(KIND_IDS)(
    "keeps %s at rest inside its square, fur and all",
    (kind) => {
      const { left, right, top, bottom } = edgesOf(plainBody(kind, 0, "rest"));

      expect(Math.max(-left, right, -top, bottom)).toBeLessThanOrEqual(
        SQUARE / 2,
      );
    },
  );

  it.each(KIND_IDS)(
    "seats %s so the whole of it at rest lies centered in its square, to 3% of it",
    (kind) => {
      const { left, right, top, bottom } = edgesOf(plainBody(kind, 0, "rest"));

      expect(
        Math.max(Math.abs(left + right), Math.abs(top + bottom)) / 2,
      ).toBeLessThanOrEqual(0.03 * SQUARE);
    },
  );
});
