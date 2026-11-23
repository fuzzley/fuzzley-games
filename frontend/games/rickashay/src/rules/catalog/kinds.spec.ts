import { keysOf } from "@fz/core/records";
import {
  KINDS,
  KIND_IDS,
  type Kind,
  type KindId,
  hasTrait,
  isKindId,
  kindIntroducedAt,
  kindOf,
} from "./kinds";

const BREAKING = KIND_IDS.filter((id) => kindOf(id).hits !== "never");
const LASTING = KIND_IDS.filter((id) => kindOf(id).hits === "never");

/** The numbers of the four sets' 36 levels. */
const LEVELS = Array.from({ length: 36 }, (_, index) => index + 1);

describe("the kinds of brick", () => {
  it("are the eleven of the design's \"The bricks\", in How to play's order", () => {
    expect(KIND_IDS).toEqual([
      "brick",
      "tough",
      "steel",
      "ramp",
      "hatch",
      "spring",
      "gem",
      "portal",
      "plated",
      "moss",
      "lock",
    ]);
  });

  it("are cataloged in the order of their ids", () => {
    expect(keysOf(KINDS)).toEqual(KIND_IDS);
  });

  // The design's table of bricks, each kind's hits, the letters "In a
  // picture" gives it, whether a level needs it and its first level.
  it.each<[KindId, Omit<Kind, "traits">]>([
    [
      "brick",
      {
        name: "Brick",
        hits: 1,
        mostHits: 1,
        needed: true,
        letters: ["o"],
        firstLevel: 1,
      },
    ],
    [
      "tough",
      {
        name: "Tough brick",
        hits: 2,
        mostHits: 6,
        needed: true,
        letters: ["2", "3", "4", "5", "6"],
        firstLevel: 4,
      },
    ],
    [
      "steel",
      {
        name: "Steel brick",
        hits: "never",
        mostHits: 0,
        needed: false,
        letters: ["#"],
        firstLevel: 7,
      },
    ],
    [
      "ramp",
      {
        name: "Ramp",
        hits: "never",
        mostHits: 0,
        needed: false,
        letters: ["L", "J", "F", "7"],
        firstLevel: 10,
      },
    ],
    [
      "hatch",
      {
        name: "Hatch",
        hits: "never",
        mostHits: 0,
        needed: false,
        letters: ["="],
        firstLevel: 12,
      },
    ],
    [
      "spring",
      {
        name: "Spring brick",
        hits: 1,
        mostHits: 1,
        needed: true,
        letters: ["S"],
        firstLevel: 13,
      },
    ],
    [
      "gem",
      {
        name: "Gem",
        hits: 1,
        mostHits: 1,
        needed: true,
        letters: ["G"],
        firstLevel: 19,
      },
    ],
    [
      "portal",
      {
        name: "Portal",
        hits: "never",
        mostHits: 0,
        needed: false,
        letters: ["@", "&"],
        firstLevel: 21,
      },
    ],
    [
      "plated",
      {
        name: "Plated brick",
        hits: 2,
        mostHits: 3,
        needed: true,
        letters: ["v", "V", "U"],
        firstLevel: 22,
      },
    ],
    [
      "moss",
      {
        name: "Moss brick",
        hits: 2,
        mostHits: 3,
        needed: true,
        letters: ["M", "N"],
        firstLevel: 28,
      },
    ],
    [
      "lock",
      {
        name: "Lock",
        hits: 1,
        mostHits: 1,
        needed: true,
        letters: ["x", "y", "z"],
        firstLevel: 29,
      },
    ],
  ])("catalog %s as the design's table of bricks has it", (id, entry) => {
    expect(kindOf(id)).toMatchObject(entry);
  });

  it.each<[KindId, readonly string[]]>([
    ["brick", []],
    ["tough", []],
    ["steel", ["never"]],
    ["ramp", ["never", "slants"]],
    ["hatch", ["never", "holds"]],
    ["spring", ["springs"]],
    ["gem", ["faceted"]],
    ["portal", ["never", "teleports"]],
    ["plated", ["plated"]],
    ["moss", ["regrows"]],
    ["lock", ["bolted"]],
  ])("give %s the traits %j", (id, traits) => {
    expect(kindOf(id).traits.map(({ kind }) => kind)).toEqual(traits);
  });

  it.each(KIND_IDS)("name %s in sentence case", (id) => {
    expect(kindOf(id).name).toMatch(/^[A-Z][a-z]*( [a-z]+)*$/);
  });

  it("name every kind apart from the others", () => {
    const names = KIND_IDS.map((id) => kindOf(id).name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("write no two kinds in the same character", () => {
    const letters = KIND_IDS.flatMap((id) => kindOf(id).letters);

    expect(new Set(letters).size).toBe(letters.length);
  });

  it.each(KIND_IDS.flatMap((id) => kindOf(id).letters))(
    "write %s as one character",
    (letter) => {
      expect(letter).toHaveLength(1);
    },
  );

  it("are listed in the order the levels bring them in, each at its own", () => {
    const firsts = KIND_IDS.map((id) => kindOf(id).firstLevel);

    expect(firsts).toEqual([...new Set(firsts)].sort((a, b) => a - b));
  });

  it.each(KIND_IDS)("bring %s in at one of the 36 levels", (id) => {
    expect(LEVELS).toContain(kindOf(id).firstLevel);
  });

  it.each(BREAKING)("break %s at a hit at least", (id) => {
    expect(Number(kindOf(id).hits)).toBeGreaterThanOrEqual(1);
  });

  it.each(LASTING)("need %s broken never, nor give it hits", (id) => {
    const { needed, mostHits } = kindOf(id);

    expect({ needed, mostHits }).toEqual({ needed: false, mostHits: 0 });
  });

  it.each(KIND_IDS)("need %s exactly when it breaks", (id) => {
    expect(kindOf(id).needed).toBe(kindOf(id).hits !== "never");
  });

  it.each(KIND_IDS)(
    "give %s the trait never exactly when it never breaks",
    (id) => {
      expect(hasTrait(id, "never")).toBe(kindOf(id).hits === "never");
    },
  );
});

describe("kindIntroducedAt", () => {
  it.each(KIND_IDS)("names %s at its first level", (id) => {
    expect(kindIntroducedAt(kindOf(id).firstLevel)).toBe(id);
  });

  it("names no kind for a level that brings none in", () => {
    expect(kindIntroducedAt(2)).toBeNull();
  });
});

describe("hasTrait", () => {
  it("says a kind has a trait it lists", () => {
    expect(hasTrait("hatch", "holds")).toBe(true);
  });

  it("says a kind lacks a trait it doesn't list", () => {
    expect(hasTrait("brick", "never")).toBe(false);
  });
});

describe("isKindId", () => {
  it.each(KIND_IDS)("takes %s", (id) => {
    expect(isKindId(id)).toBe(true);
  });

  it.each(["Steel", "bomb", "toString", "", 3, null])("refuses %s", (value) => {
    expect(isKindId(value)).toBe(false);
  });
});
