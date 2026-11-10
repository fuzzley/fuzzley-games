import { ZAP_HITS } from "../tuning";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickTrait,
  brickKind,
  hasTrait,
  isBrickKindId,
} from "./bricks";

/** Spells a count from one to six, as the catalog's sentences do. */
function spelled(n: number): string {
  return ["one", "two", "three", "four", "five", "six"][n - 1] ?? String(n);
}

const BREAKING = BRICK_KIND_IDS.filter((id) => brickKind(id).hits !== "never");
const LASTING = BRICK_KIND_IDS.filter((id) => brickKind(id).hits === "never");
const ZAPPING = BRICK_KIND_IDS.filter((id) => hasTrait(id, "zaps"));

describe("the brick kinds", () => {
  it("are the first five in How to play's order", () => {
    expect(BRICK_KIND_IDS).toEqual([
      "brick",
      "tough",
      "steel",
      "rowZapper",
      "columnZapper",
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

  it("know their ids, and nothing else", () => {
    expect([
      isBrickKindId("steel"),
      isBrickKindId("toString"),
      isBrickKindId("bomb"),
      isBrickKindId(3),
    ]).toEqual([true, false, false, false]);
  });
});
