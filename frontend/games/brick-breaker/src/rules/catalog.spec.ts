import { BALL_KIND_IDS, ballKind } from "./catalog/balls";
import { BRICK_KIND_IDS, brickKind, hasTrait } from "./catalog/bricks";
import { CAPSULE_IDS, capsule, isCapsuleId } from "./catalog/capsules";

/** Every entry of the three catalogs, with its catalog's name. */
const ENTRIES = [
  ...BRICK_KIND_IDS.map((id) => ["brick", id, brickKind(id)] as const),
  ...BALL_KIND_IDS.map((id) => ["ball", id, ballKind(id)] as const),
  ...CAPSULE_IDS.map((id) => ["capsule", id, capsule(id)] as const),
];

describe("the catalogs", () => {
  it.each(ENTRIES)("give the %s %s a name", (_, __, entry) => {
    expect(entry.name).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
  });

  it.each(ENTRIES)("say what the %s %s does, in a sentence", (_, __, entry) => {
    expect(entry.about).toMatch(/^[A-Z].*\.$/);
  });

  it("name every entry of a catalog apart", () => {
    const names = (kind: string): string[] =>
      ENTRIES.filter(([catalog]) => catalog === kind).map(
        ([, , entry]) => entry.name,
      );

    expect(
      ["brick", "ball", "capsule"].every(
        (kind) => new Set(names(kind)).size === names(kind).length,
      ),
    ).toBe(true);
  });
});

describe("the brick kinds", () => {
  it.each(BRICK_KIND_IDS)(
    "give %s its hits, or none for one that never breaks",
    (id) => {
      const kind = brickKind(id);

      expect(
        kind.hits === "never"
          ? kind.mostHits === 0 && !kind.needed && hasTrait(id, "hard")
          : kind.hits >= 1 && kind.mostHits >= kind.hits,
      ).toBe(true);
    },
  );

  it.each(BRICK_KIND_IDS)("score %s's hits, if it breaks", (id) => {
    const kind = brickKind(id);

    expect(kind.points > 0).toBe(kind.hits !== "never");
  });
});

describe("the capsules", () => {
  it.each(CAPSULE_IDS)("weigh %s above nothing", (id) => {
    expect(capsule(id).weight).toBeGreaterThan(0);
  });

  it.each(CAPSULE_IDS)("let %s join from a level after the first", (id) => {
    expect(capsule(id).from).toBeGreaterThan(1);
  });

  it("are listed in the order they join the pool", () => {
    const froms = CAPSULE_IDS.map((id) => capsule(id).from);

    expect(froms).toEqual([...froms].sort((a, b) => a - b));
  });

  it("know their ids, and nothing else", () => {
    expect([
      isCapsuleId("wide"),
      isCapsuleId("toString"),
      isCapsuleId(3),
    ]).toEqual([true, false, false]);
  });
});
