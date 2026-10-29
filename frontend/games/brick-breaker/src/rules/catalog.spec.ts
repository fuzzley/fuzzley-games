import { BALL_KIND_IDS, ballKind } from "./catalog/balls";
import {
  BRICK_KINDS,
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
  hasTrait,
  isBrickKindId,
} from "./catalog/bricks";
import {
  CAPSULES,
  CAPSULE_IDS,
  type CapsuleId,
  capsule,
  isCapsuleId,
} from "./catalog/capsules";
import type { Level } from "./level";
import { LEVELS, parseLevel } from "./levels";
import { CATCH_HOLD_MS, MAX_LIVES } from "./tuning";

/**
 * The brick kinds no level uses yet, which the sets to come bring; once the
 * last set is in, the list is empty and every kind is used.
 */
const KINDS_TO_COME: readonly BrickKindId[] = [
  "steel",
  "blast",
  "ghost",
  "regrow",
];

/**
 * The capsules no level lets fall yet, which the sets to come bring; once
 * the last set is in, the list is empty and every capsule can fall.
 */
const CAPSULES_TO_COME: readonly CapsuleId[] = [
  "narrow",
  "fire",
  "fast",
  "blast",
];

/** Every level, ready to play, with its number. */
const PLAYED = LEVELS.map(
  (entry) => [entry.number, parseLevel(entry)] as const,
);

/**
 * Returns whether a capsule can fall in a level: pinned to a gift brick, or
 * in its pool with a chance of falling or an unpinned gift brick to draw it.
 */
function canFall(level: Level, id: CapsuleId): boolean {
  const bricks = level.cells.filter((brick) => brick !== null);
  const draws = bricks.some(
    (brick) => hasTrait(brick.kind, "gives") && brick.capsule === null,
  );
  return (
    bricks.some((brick) => brick.capsule === id) ||
    (level.capsules.includes(id) && (level.drops > 0 || draws))
  );
}

/** Returns a pattern for a time in whole seconds, as a sentence says it. */
function seconds(ms: number): RegExp {
  return new RegExp(String.raw`\b${String(ms / 1000)} seconds\b`);
}

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
      "the longest a caught ball waits",
      CAPSULES.catch.about,
      `${String(CATCH_HOLD_MS / 1000)} seconds at most`,
    ],
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

  // A brick that grows back would have to be counted again by the field.
  it.each(BRICK_KIND_IDS.filter((id) => hasTrait(id, "regrows")))(
    "need %s, which regrows, broken never",
    (id) => {
      expect(brickKind(id).needed).toBe(false);
    },
  );

  it("say how long a regrowing brick takes to grow back", () => {
    const [trait] = BRICK_KINDS.regrow.traits;

    expect(BRICK_KINDS.regrow.about).toMatch(seconds(trait.afterMs));
  });

  it.each(BRICK_KIND_IDS)("score %s's hits, if it breaks", (id) => {
    const kind = brickKind(id);

    expect(kind.points > 0).toBe(kind.hits !== "never");
  });

  it("know their ids, and nothing else", () => {
    expect([
      isBrickKindId("steel"),
      isBrickKindId("toString"),
      isBrickKindId(3),
    ]).toEqual([true, false, false]);
  });
});

describe("the ball kinds", () => {
  it.each(BALL_KIND_IDS.filter((id) => ballKind(id).passes))(
    "let %s pass through only what a hit of it breaks",
    (id) => {
      expect(ballKind(id).damage).toBe("breaks");
    },
  );

  it.each(BALL_KIND_IDS)(
    "keep %s a normal ball's size, the only one the physics reads",
    (id) => {
      expect(ballKind(id).size).toBe(1);
    },
  );
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
      const ms = "ms" in effect ? effect.ms : Number.NaN;

      expect(capsule(id).about).toMatch(seconds(ms));
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

describe("the levels", () => {
  it("use every brick kind, but those the sets to come bring", () => {
    const used = new Set(
      PLAYED.flatMap(([, level]) =>
        level.cells.flatMap((brick) => (brick ? [brick.kind] : [])),
      ),
    );

    expect(BRICK_KIND_IDS.filter((id) => !used.has(id))).toEqual(KINDS_TO_COME);
  });

  it("let every capsule fall, but those the sets to come bring", () => {
    const falling = CAPSULE_IDS.filter((id) =>
      PLAYED.some(([, level]) => canFall(level, id)),
    );

    expect(CAPSULE_IDS.filter((id) => !falling.includes(id))).toEqual(
      CAPSULES_TO_COME,
    );
  });

  it.each(CAPSULE_IDS.filter((id) => !CAPSULES_TO_COME.includes(id)))(
    "let %s first fall in the level it joins the pool at",
    (id) => {
      const first = PLAYED.find(([, level]) => canFall(level, id));

      expect(first?.[0]).toBe(capsule(id).from);
    },
  );
});
