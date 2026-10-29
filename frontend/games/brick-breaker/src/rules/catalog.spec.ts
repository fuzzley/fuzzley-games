import { BALL_KIND_IDS, ballKind } from "./catalog/balls";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  brickKind,
  hasTrait,
} from "./catalog/bricks";
import {
  CAPSULES,
  CAPSULE_IDS,
  capsule,
  isCapsuleId,
} from "./catalog/capsules";
import { MAX_LIVES } from "./tuning";

/** Spells a count from one to eight, as the catalogs' sentences do. */
function spelled(n: number): string {
  const words = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
  ];
  return words[n - 1] ?? String(n);
}

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

  it.each(["brick", "ball", "capsule"])(
    "name every %s apart from the others",
    (catalog) => {
      const names = ENTRIES.filter(([each]) => each === catalog).map(
        ([, , entry]) => entry.name,
      );

      const repeated = names.filter((name, i) => names.indexOf(name) !== i);

      expect(repeated).toEqual([]);
    },
  );

  it.each([
    [
      "the tough brick's hits",
      BRICK_KINDS.tough.about,
      `${spelled(BRICK_KINDS.tough.hits)} to ${spelled(BRICK_KINDS.tough.mostHits)} hits`,
    ],
    ["the most lives", CAPSULES.life.about, `up to ${spelled(MAX_LIVES)}`],
    [
      "the balls one splits into",
      CAPSULES.multi.about,
      `into ${spelled(CAPSULES.multi.effect.into)}`,
    ],
  ])("spell out %s as they are", (_, about, words) => {
    expect(about).toContain(words);
  });
});

describe("the brick kinds", () => {
  const breaking = BRICK_KIND_IDS.filter(
    (id) => brickKind(id).hits !== "never",
  );
  const lasting = BRICK_KIND_IDS.filter((id) => brickKind(id).hits === "never");

  it.each(breaking)("break %s with a hit at least", (id) => {
    expect(Number(brickKind(id).hits)).toBeGreaterThanOrEqual(1);
  });

  it.each(breaking)("let a legend give %s at least its own hits", (id) => {
    const { hits, mostHits } = brickKind(id);

    expect(mostHits).toBeGreaterThanOrEqual(Number(hits));
  });

  it.each(lasting)(
    "need %s broken never, nor let a legend give it hits",
    (id) => {
      const { needed, mostHits } = brickKind(id);

      expect({ needed, mostHits }).toEqual({ needed: false, mostHits: 0 });
    },
  );

  it.each(BRICK_KIND_IDS)("make %s hard exactly when it never breaks", (id) => {
    expect(hasTrait(id, "hard")).toBe(brickKind(id).hits === "never");
  });

  it("say how long a regrowing brick takes to grow back", () => {
    const regrow = brickKind("regrow");
    const trait = regrow.traits.find((each) => each.kind === "regrows");

    expect(regrow.about).toContain(`${(trait?.afterMs ?? 0) / 1000} seconds`);
  });

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

  it.each(CAPSULE_IDS.filter((id) => "ms" in capsule(id).effect))(
    "say how long %s lasts",
    (id) => {
      const effect = capsule(id).effect;
      const ms = "ms" in effect ? effect.ms : 0;

      expect(capsule(id).about).toContain(`${ms / 1000} seconds`);
    },
  );

  it.each(BALL_KIND_IDS.filter((id) => id !== "normal"))(
    "let a capsule make a ball %s",
    (id) => {
      const makers = CAPSULE_IDS.filter((each) => {
        const effect = capsule(each).effect;
        return effect.kind === "ball" && effect.ball === id;
      });

      expect(makers).not.toEqual([]);
    },
  );

  it("know their ids, and nothing else", () => {
    expect([
      isCapsuleId("wide"),
      isCapsuleId("toString"),
      isCapsuleId(3),
    ]).toEqual([true, false, false]);
  });
});
