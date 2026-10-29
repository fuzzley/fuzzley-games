import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKindId,
  hasTrait,
} from "../rules/catalog/bricks";
import { TINTS } from "../rules/level";
import {
  ART_PALETTE,
  ART_SCALE,
  drawnIn,
  frameNamed,
} from "../testing/art_frames";
import { atlasFrames } from "./art";
import { type BrickLook, brickColor, brickFrame } from "./brick_art";
import type { ArtFrame } from "./shapes";

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

describe("a tough brick's frame", () => {
  /** Returns the frame a tough brick of four hits shows with some left. */
  function toughWith(hits: number): ArtFrame {
    return frameNamed(
      brickFrame({ kind: "tough", tint: 0, whole: 4, hits, shown: true }),
    );
  }

  it.each([1, 2, 3, 4])("shows a pip for each of %i hits left", (hits) => {
    const frame = toughWith(hits);

    expect(drawnIn(frame, "circle", ART_PALETTE.mark)).toHaveLength(hits);
  });

  it.each([1, 2, 3, 4])(
    "shows a crack for each hit taken, with %i left",
    (hits) => {
      const frame = toughWith(hits);

      expect(drawnIn(frame, "polyline", ART_PALETTE.mark)).toHaveLength(
        4 - hits,
      );
    },
  );

  it("is drawn in the deeper tint", () => {
    const frame = toughWith(4);

    expect(frame.commands[0]).toMatchObject({
      kind: "roundRect",
      color: ART_PALETTE.toughTints[0],
    });
  });
});

describe("a brick's mark", () => {
  it.each([
    ["tough", { whole: 3, hits: 2 }],
    ["steel", { whole: 0, hits: 0 }],
    ["blast", {}],
    ["gift", {}],
    ["regrow", {}],
  ] as const)(
    "is drawn on a %s brick's body in the marks' color",
    (kind, stands) => {
      const frame = frameNamed(
        brickFrame({
          kind,
          tint: 0,
          whole: 1,
          hits: 1,
          shown: true,
          ...stands,
        }),
      );

      expect(frame.commands.slice(1).map((command) => command.color)).toContain(
        ART_PALETTE.mark,
      );
    },
  );

  it("is cut out of a gift brick in its body's color", () => {
    const gift = frameNamed(
      brickFrame({ kind: "gift", tint: 0, whole: 1, hits: 1, shown: true }),
    );

    expect(gift.commands.map((command) => command.color)).toEqual([
      ART_PALETTE.bricks.gift,
      ART_PALETTE.mark,
      ART_PALETTE.bricks.gift,
    ]);
  });
});

describe("brickColor", () => {
  it.each([
    ["plain", ART_PALETTE.tints[2]],
    ["tough", ART_PALETTE.toughTints[2]],
    ["ghost", ART_PALETTE.tints[2]],
    ["regrow", ART_PALETTE.tints[2]],
    ["steel", ART_PALETTE.bricks.steel],
    ["blast", ART_PALETTE.bricks.blast],
    ["gift", ART_PALETTE.bricks.gift],
  ] as const)("draws a %s brick in its body's color", (kind, color) => {
    const look: BrickLook = { kind, tint: 2, whole: 2, hits: 1, shown: true };

    expect(brickColor(look, ART_PALETTE)).toBe(color);
  });

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
