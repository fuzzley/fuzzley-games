import { isKeyOf, keysOf } from "@fz/core/records";
import { BRICK_KIND_IDS, brickKind, isBrickKindId } from "../catalog/bricks";
import { CEILINGWARD, FLOORWARD, LEFT, RIGHT } from "../grid";
import {
  LEGEND,
  type LegendBrick,
  type LegendCharacter,
  type LegendKindId,
  NO_BRICK,
  PORTAL_MARKS,
  tintOf,
} from "./legend";

const CHARACTERS = keysOf(LEGEND);

/** The characters whose kinds the catalog holds, with the kind. */
const BUILT = CHARACTERS.flatMap((character) => {
  const { kind } = LEGEND[character];
  return isBrickKindId(kind) ? [[character, kind] as const] : [];
});

// Every kind the catalog holds is one the legend names, as the compiler
// checks here, so a kind added under an id the legend doesn't use fails.
const CATALOGED: readonly LegendKindId[] = BRICK_KIND_IDS;

/** Returns the kinds the legend names. */
function legendKinds(): Set<string> {
  return new Set(CHARACTERS.map((character) => LEGEND[character].kind));
}

describe("the legend", () => {
  it("names a character for every kind the catalog holds", () => {
    const named = legendKinds();

    expect(CATALOGED.filter((id) => !named.has(id))).toEqual([]);
  });

  it('names all sixteen kinds of plan.md\'s "The bricks"', () => {
    expect(legendKinds().size).toBe(16);
  });

  it.each(CHARACTERS)("writes %s as one character", (character) => {
    expect(character).toHaveLength(1);
  });

  it("keeps the empty cell's character for no brick", () => {
    expect(isKeyOf(NO_BRICK, LEGEND)).toBe(false);
  });

  it.each(BUILT)(
    "gives %s the hits its kind, %s, allows",
    (character, kind) => {
      const { hits, mostHits } = brickKind(kind);
      const given = LEGEND[character].hits;

      expect(
        hits === "never" ? given === 0 : given >= hits && given <= mostHits,
      ).toBe(true);
    },
  );

  it.each(["2", "3", "4", "5", "6"] as const)(
    "makes %s a tough brick of that many hits",
    (character) => {
      expect(LEGEND[character]).toEqual({
        kind: "tough",
        hits: Number(character),
        plates: 0,
      });
    },
  );

  it.each(
    CHARACTERS.filter((character) => LEGEND[character].kind !== "plated"),
  )("plates no face of %s, which isn't a plated brick", (character) => {
    expect(LEGEND[character].plates).toBe(0);
  });

  // A plate covers a brick's faces, as grid.ts names them.
  it.each<[LegendCharacter, LegendBrick]>([
    ["v", { kind: "plated", hits: 2, plates: FLOORWARD }],
    ["U", { kind: "plated", hits: 2, plates: FLOORWARD | LEFT | RIGHT }],
  ])("plates %s's faces as the grid names them", (character, brick) => {
    expect(LEGEND[character]).toEqual(brick);
  });

  // C12: a character for each kind's brick of 2 to 3 hits that the drafts
  // don't use.
  it.each<[LegendCharacter, LegendBrick]>([
    ["T", { kind: "shell", hits: 3, plates: 0 }],
    ["V", { kind: "plated", hits: 3, plates: FLOORWARD }],
    ["^", { kind: "plated", hits: 2, plates: CEILINGWARD }],
  ])("keeps %s for C12's brick", (character, brick) => {
    expect(LEGEND[character]).toEqual(brick);
  });

  it("writes a wall's two pairs of portals apart, its first pair's mark first", () => {
    const portals = CHARACTERS.filter(
      (character) => LEGEND[character].kind === "portal",
    );

    expect([portals, PORTAL_MARKS]).toEqual([
      ["@", "&"],
      ["@", "&"],
    ]);
  });
});

describe("tintOf", () => {
  /** Returns the legend's characters whose bricks are of some kinds, or of none of them. */
  const charactersOf = (
    kinds: readonly LegendKindId[],
    of: boolean,
  ): LegendCharacter[] =>
    CHARACTERS.filter(
      (character) => kinds.includes(LEGEND[character].kind) === of,
    );

  it.each(charactersOf(["brick", "tough"], true))(
    "tints %s by its wall row, the eight in turn from the lowest",
    (character) => {
      expect([0, 1, 7, 8, 13].map((row) => tintOf(character, row))).toEqual([
        0, 1, 7, 0, 5,
      ]);
    },
  );

  it.each(charactersOf(["brick", "tough", "portal"], false))(
    "leaves %s its own ink, whatever its row",
    (character) => {
      expect(tintOf(character, 5)).toBe(0);
    },
  );

  it.each<[LegendCharacter, number]>([
    ["@", 0],
    ["&", 1],
  ])("gives the portal %s its pair's mark, %s", (character, mark) => {
    expect(tintOf(character, 5)).toBe(mark);
  });
});
