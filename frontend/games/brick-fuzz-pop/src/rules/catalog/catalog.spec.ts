import { ZAP_HITS } from "../tuning";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickTrait,
  brickKind,
  hasTrait,
  isBrickKindId,
  kindIntroducedAt,
} from "./bricks";

/** Spells a count from one to six, as the catalog's sentences do. */
function spelled(n: number): string {
  return ["one", "two", "three", "four", "five", "six"][n - 1] ?? String(n);
}

const BREAKING = BRICK_KIND_IDS.filter((id) => brickKind(id).hits !== "never");
const LASTING = BRICK_KIND_IDS.filter((id) => brickKind(id).hits === "never");
const ZAPPING = BRICK_KIND_IDS.filter((id) => hasTrait(id, "zaps"));

describe("the brick kinds", () => {
  it("are Warm-up's five, Sparks' five, Tricks' four and Thick walls' two, in How to play's order", () => {
    expect(BRICK_KIND_IDS).toEqual([
      "brick",
      "tough",
      "steel",
      "rowZapper",
      "columnZapper",
      "bomb",
      "crossZapper",
      "xZapper",
      "wool",
      "cage",
      "bumper",
      "prism",
      "portal",
      "plated",
      "shell",
      "moss",
    ]);
  });

  it.each(BRICK_KIND_IDS)("give %s a name", (id) => {
    expect(brickKind(id).name).toMatch(/^[A-Z][a-z]*( [a-z]+)*$/);
  });

  it.each(BRICK_KIND_IDS)("say what %s does, in a sentence", (id) => {
    expect(brickKind(id).about).toMatch(/^[A-Z].*\.$/);
  });

  it("name every kind apart from the others", () => {
    const names = BRICK_KIND_IDS.map((id) => brickKind(id).name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("are listed in the order the levels bring them in", () => {
    const firsts = BRICK_KIND_IDS.map((id) => brickKind(id).firstLevel);

    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
  });

  it.each(BRICK_KIND_IDS)("bring %s in at one of the 36 levels", (id) => {
    const { firstLevel } = brickKind(id);

    expect([
      Number.isInteger(firstLevel),
      firstLevel >= 1,
      firstLevel <= 36,
    ]).toEqual([true, true, true]);
  });

  it("bring the plain brick in at the first level", () => {
    expect(BRICK_KINDS.brick.firstLevel).toBe(1);
  });

  it.each(BRICK_KIND_IDS)(
    "name %s as the kind its first level introduces",
    (id) => {
      expect(kindIntroducedAt(brickKind(id).firstLevel)).toBe(id);
    },
  );

  it("name no kind for a level that introduces none", () => {
    expect(kindIntroducedAt(2)).toBeNull();
  });

  it.each(BREAKING)("break %s with a hit at least", (id) => {
    expect(Number(brickKind(id).hits)).toBeGreaterThanOrEqual(1);
  });

  it.each(BREAKING)("let a legend give %s at least its own hits", (id) => {
    const { hits, mostHits } = brickKind(id);

    expect(mostHits).toBeGreaterThanOrEqual(Number(hits));
  });

  it.each(BREAKING)("score %s's hits as it breaks", (id) => {
    expect(brickKind(id).points).toBeGreaterThan(0);
  });

  it.each(LASTING)(
    "need %s broken never, score it nothing nor let a legend give it hits",
    (id) => {
      const { needed, points, mostHits } = brickKind(id);

      expect({ needed, points, mostHits }).toEqual({
        needed: false,
        points: 0,
        mostHits: 0,
      });
    },
  );

  it.each(BRICK_KIND_IDS)(
    "give %s the trait never exactly when it never breaks",
    (id) => {
      expect(hasTrait(id, "never")).toBe(brickKind(id).hits === "never");
    },
  );

  it.each(BRICK_KIND_IDS)("need %s exactly when it breaks", (id) => {
    expect(brickKind(id).needed).toBe(brickKind(id).hits !== "never");
  });

  it.each(BRICK_KIND_IDS)(
    "let %s stop a fuzzball unless it teleports",
    (id) => {
      expect(brickKind(id).solid).toBe(!hasTrait(id, "teleports"));
    },
  );

  it.each(ZAPPING)("break %s, which zaps, at a hit", (id) => {
    expect(brickKind(id).mostHits).toBe(1);
  });

  it.each(ZAPPING)("zap %s's reach for the tuning's hits", (id) => {
    const zaps = brickKind(id).traits.filter(
      (trait): trait is Extract<BrickTrait, { kind: "zaps" }> =>
        trait.kind === "zaps",
    );

    expect(zaps.map(({ hits }) => hits)).toEqual([ZAP_HITS]);
  });

  it("let steel earth a fuzzball's charge", () => {
    expect(hasTrait("steel", "earths")).toBe(true);
  });

  it("spell out the tough brick's hits as they are", () => {
    const { hits, mostHits, about } = BRICK_KINDS.tough;

    expect(about).toContain(`${spelled(hits)} to ${spelled(mostHits)} hits`);
  });

  it.each(["plated", "shell", "moss"] as const)(
    "spell out the %s brick's hits as they are",
    (id) => {
      const { hits, mostHits, about } = BRICK_KINDS[id];

      expect(about).toContain(`${spelled(hits)} or ${spelled(mostHits)} hits`);
    },
  );

  it.each([
    ["shell", 28, "shelled"],
    ["moss", 29, "regrows"],
  ] as const)(
    "catalog the %s brick as plan.md's table of bricks has it, brought in at level %i, its trait %s",
    (id, firstLevel, trait) => {
      expect(BRICK_KINDS[id]).toMatchObject({
        hits: 2,
        mostHits: 3,
        needed: true,
        points: 10,
        solid: true,
        firstLevel,
        traits: [{ kind: trait }],
      });
    },
  );

  it.each([
    [
      "bumper",
      {
        hits: "never",
        needed: false,
        solid: true,
        firstLevel: 19,
        traits: [
          { kind: "never" },
          { kind: "earths" },
          { kind: "kicks", radius: 0.38 },
        ],
      },
    ],
    [
      "prism",
      {
        hits: 1,
        mostHits: 1,
        needed: true,
        points: 30,
        solid: true,
        firstLevel: 20,
        traits: [{ kind: "splits", cos: Math.sqrt(3) / 2, sin: 0.5 }],
      },
    ],
    [
      "portal",
      {
        hits: "never",
        needed: false,
        solid: false,
        firstLevel: 21,
        traits: [{ kind: "never" }, { kind: "teleports" }],
      },
    ],
    [
      "plated",
      {
        hits: 2,
        mostHits: 3,
        needed: true,
        points: 10,
        solid: true,
        firstLevel: 22,
        traits: [{ kind: "plated" }],
      },
    ],
  ] as const)(
    "catalog the %s as plan.md's table of bricks has it",
    (id, entry) => {
      expect(BRICK_KINDS[id]).toMatchObject(entry);
    },
  );

  it("know their ids, and nothing else", () => {
    expect([
      isBrickKindId("steel"),
      isBrickKindId("toString"),
      isBrickKindId("cannon"),
      isBrickKindId(3),
    ]).toEqual([true, false, false, false]);
  });
});
