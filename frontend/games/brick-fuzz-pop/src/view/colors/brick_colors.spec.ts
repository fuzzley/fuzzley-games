import { isKeyOf, isOneOf, keysOf, recordOf } from "@fz/core/records";
import { BRICK_KIND_IDS, type BrickKindId } from "../../rules/catalog/bricks";
import { PORTAL_MARKS } from "../../rules/levels/legend";
import { PALETTES } from "../../testing/roles";
import { brickColor } from "./brick_colors";
import { TINT } from "./inks";
import { FIELD_ROLES, type WallPalette, wallPalette } from "./palette";

/** Classic felt's palette, whose colors the spec's own replace where it reads them. */
const MADE = wallPalette(PALETTES.rolesIn("classic", FIELD_ROLES), "light");

/**
 * A palette whose every tint, every special kind's body and every pair of
 * portals' body is a color no other takes, so a brick colored from the
 * wrong one shows.
 */
const PALETTE: WallPalette = {
  ...MADE,
  tints: MADE.tints.map((_, tint) => 0x100000 + tint),
  kinds: recordOf(keysOf(MADE.kinds), (kind) => ({
    ...MADE.kinds[kind],
    body: 0x200000 + keysOf(MADE.kinds).indexOf(kind),
  })),
  portals: [
    { ...MADE.portals[0], body: 0x300000 },
    { ...MADE.portals[1], body: 0x300001 },
  ],
};

/** Every tint a tile takes, 0 to 7. */
const TINTS: readonly number[] = Object.values(TINT);

/** The tints a portal takes, its pair's place among the legend's marks. */
const PAIRS = PORTAL_MARKS.map((_, pair) => pair);

/** The kinds a brick's tint colors. */
const TINTED = ["brick", "tough"] as const satisfies readonly BrickKindId[];

/** The kinds colored by their pair's inks. */
const PAIRED = ["portal"] as const satisfies readonly BrickKindId[];

/** The kinds that keep inks of their own in the palette. */
const INKED = BRICK_KIND_IDS.filter((kind) => isKeyOf(kind, PALETTE.kinds));

describe("brickColor", () => {
  it.each(INKED)(
    "colors a %s's shards in the body of the inks the palette keeps for its kind, whatever its tint",
    (kind) => {
      const { body } = PALETTE.kinds[kind];

      expect(TINTS.map((tint) => brickColor({ kind, tint }, PALETTE))).toEqual(
        TINTS.map(() => body),
      );
    },
  );

  it.each(TINTED)("colors a %s's shards in its tint's ink", (kind) => {
    expect(TINTS.map((tint) => brickColor({ kind, tint }, PALETTE))).toEqual(
      PALETTE.tints,
    );
  });

  it.each(PAIRED)(
    "colors a %s's shards in the body of its pair's inks",
    (kind) => {
      expect(PAIRS.map((tint) => brickColor({ kind, tint }, PALETTE))).toEqual(
        PALETTE.portals.map(({ body }) => body),
      );
    },
  );

  it("knows how every cataloged kind's shards are colored, by its own inks, its pair's or its tint", () => {
    expect(
      BRICK_KIND_IDS.filter(
        (kind) =>
          !isOneOf(kind, INKED) &&
          !isOneOf(kind, PAIRED) &&
          !isOneOf(kind, TINTED),
      ),
    ).toEqual([]);
  });

  it.each([
    { kind: "brick", tint: TINTS.length },
    { kind: "portal", tint: PAIRS.length },
  ] as const)("refuses a $kind of tint $tint, which no ink has", (brick) => {
    expect(() => brickColor(brick, PALETTE)).toThrow(RangeError);
  });
});
