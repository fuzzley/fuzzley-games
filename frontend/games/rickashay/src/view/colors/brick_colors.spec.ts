import { TINT } from "@fz/brick-wall/view/inks";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { PORTAL_MARKS } from "../../rules/levels/legend";
import { brickColor } from "./brick_colors";
import { type WallPalette, wallPalette } from "./palette";

/** A light palette, whose tints and steel the spec's own replace. */
const MADE = wallPalette(
  {
    field: "#fafafa",
    fieldLine: "#d0d0d0",
    fieldText: "#101010",
    fieldMuted: "#707070",
    page: "#eeeeee",
    accent: "#00aa00",
    danger: "#ff0000",
    warning: "#ffa500",
    onWarning: "#202000",
  },
  "light",
);

/** A palette whose every tint and steel are colors no other takes, so a brick colored from the wrong one shows. */
const PALETTE: WallPalette = {
  ...MADE,
  tints: MADE.tints.map((_, tint) => 0x100000 + tint),
  steel: 0x200000,
};

/** Every tint a tile takes, 0 to 7. */
const TINTS: readonly number[] = Object.values(TINT);

/** The tints a portal takes, its pair's place among the legend's marks. */
const PAIRS = PORTAL_MARKS.map((_, pair) => pair);

/** The kinds their row's ink colors. */
const TINTED = ["brick", "tough", "gem"] as const satisfies readonly KindId[];

/** The kinds drawn in steel. */
const STEELED = ["steel", "ramp", "hatch"] as const satisfies readonly KindId[];

/** The kinds drawn in a tile's ink of their own, with its name. */
const INKED = [
  ["spring", "pink"],
  ["plated", "orange"],
  ["moss", "amber"],
  ["lock", "violet"],
] as const satisfies readonly (readonly [KindId, keyof typeof TINT])[];

describe("brickColor", () => {
  it.each(TINTED)("colors a %s in its tint's ink, its row's", (kind) => {
    expect(TINTS.map((tint) => brickColor({ kind, tint }, PALETTE))).toEqual(
      PALETTE.tints,
    );
  });

  it.each(STEELED)("colors a %s in steel, whatever its tint", (kind) => {
    expect(TINTS.map((tint) => brickColor({ kind, tint }, PALETTE))).toEqual(
      TINTS.map(() => PALETTE.steel),
    );
  });

  it.each(INKED)("colors a %s in %s, whatever its tint", (kind, name) => {
    expect(TINTS.map((tint) => brickColor({ kind, tint }, PALETTE))).toEqual(
      TINTS.map(() => 0x100000 + TINT[name]),
    );
  });

  it("colors the first pair of portals violet and the second teal, by their tints, the places of the legend's marks", () => {
    expect(
      PAIRS.map((tint) => brickColor({ kind: "portal", tint }, PALETTE)),
    ).toEqual([0x100000 + TINT.violet, 0x100000 + TINT.teal]);
  });

  it("knows how every cataloged kind is colored, by its tint, in steel, in an ink of its own or by its pair", () => {
    const known: readonly KindId[] = [
      ...TINTED,
      ...STEELED,
      ...INKED.map(([kind]) => kind),
      "portal",
    ];

    expect([...known].sort()).toEqual([...KIND_IDS].sort());
  });

  it.each([
    { kind: "brick", tint: TINTS.length },
    { kind: "portal", tint: PAIRS.length },
  ] as const)("refuses a $kind of tint $tint, which no ink has", (brick) => {
    expect(() => brickColor(brick, PALETTE)).toThrow(RangeError);
  });
});
