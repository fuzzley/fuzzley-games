import { levelsOf } from "@fz/core/levels";
import {
  brickAt,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import { hitBrick } from "../bricks/bricks";
import type { Field } from "../field/field";
import type { LevelData, LevelSetData } from "../levels/levels";
import {
  STAR,
  STAR_IDS,
  type StarsRecord,
  starsHeld,
  starsIn,
  starsRecordOf,
  starsWon,
  withStars,
} from "./stars";

/** Returns a level's data, of a single brick. */
function levelOf(id: string): LevelData {
  return { id, name: id, mark: 5, bricks: ["o"] };
}

/** Three levels: the first, the second, and the third, redrawn on a second layout with a new mark. */
const LEVELS = levelsOf<LevelSetData>([
  {
    id: "set",
    name: "Set",
    place: "playroom",
    drops: 0,
    levels: [
      levelOf("first"),
      levelOf("second"),
      { ...levelOf("third"), layout: 2, mark: 30 },
    ],
  },
]);

/** Every star a level can win. */
const EVERY_STAR = STAR.clear | STAR.clean | STAR.streak;

/**
 * Returns a field of a row of plain bricks, its mark as given, with the
 * first `broken` of them broken in one streak.
 */
function playedField(bricks: number, mark: number, broken = bricks): Field {
  const field = fieldFrom(["o".repeat(bricks)], { mark });
  for (let column = 0; column < broken; column++) {
    hitBrick(field, brickAt(field, column, 0), 0, 0);
  }
  return field;
}

describe("starsWon", () => {
  it("wins every star for a level cleared without losing a life, its mark reached", () => {
    expect(starsWon(playedField(5, 5))).toBe(EVERY_STAR);
  });

  it("wins the streak's star by the best streak of the play, not its last", () => {
    const field = playedField(6, 5, 5);
    throwBall(field, 13, 26, 180);
    stepTimes(field, 10);

    hitBrick(field, brickAt(field, 5, 0), 0, 0);

    expect(starsWon(field)).toBe(EVERY_STAR);
  });

  it("wins no streak's star short of the level's mark", () => {
    expect(starsWon(playedField(5, 6))).toBe(STAR.clear | STAR.clean);
  });

  it("wins no clean star for a level that cost a life", () => {
    const field = playedField(5, 5);
    field.livesLost = 1;

    expect(starsWon(field)).toBe(STAR.clear | STAR.streak);
  });

  it("wins no star for a level not yet cleared", () => {
    expect(starsWon(playedField(6, 5, 5))).toBe(0);
  });
});

describe("starsIn", () => {
  it("names the stars among some bits, in the order they are shown", () => {
    expect(starsIn(STAR.streak | STAR.clear)).toEqual(["clear", "streak"]);
  });

  it("names every star among every bit, as the stars are listed", () => {
    expect([starsIn(EVERY_STAR), STAR_IDS]).toEqual([
      ["clear", "clean", "streak"],
      ["clear", "clean", "streak"],
    ]);
  });

  it("names none among no bits", () => {
    expect(starsIn(0)).toEqual([]);
  });
});

describe("starsHeld", () => {
  const RECORD: StarsRecord = { levels: { first: STAR.clear | STAR.clean } };

  it("returns the stars a level holds", () => {
    expect(starsHeld(RECORD, "first")).toBe(STAR.clear | STAR.clean);
  });

  it("returns none for a level that holds none", () => {
    expect(starsHeld(RECORD, "second")).toBe(0);
  });
});

describe("starsRecordOf", () => {
  it("reads each level's stars as stored", () => {
    const stored = { levels: { first: EVERY_STAR, second: STAR.clear } };

    expect(starsRecordOf(stored, LEVELS, new Set())).toEqual(stored);
  });

  it("keeps the stars of a level redrawn with a new mark since they were won", () => {
    const stored = { levels: { third: EVERY_STAR } };

    expect(starsRecordOf(stored, LEVELS, new Set())).toEqual(stored);
  });

  it("drops the stars of a level the game doesn't have", () => {
    const stored = { levels: { gone: EVERY_STAR, first: STAR.clear } };

    expect(starsRecordOf(stored, LEVELS, new Set())).toEqual({
      levels: { first: STAR.clear },
    });
  });

  it.each<[string, unknown]>([
    ["a record that isn't one", "stars"],
    ["levels that aren't a record", { levels: [STAR.clear] }],
    ["no levels", {}],
    ["nothing", null],
  ])("reads %s as no stars", (_, stored) => {
    expect(starsRecordOf(stored, LEVELS, new Set())).toEqual({ levels: {} });
  });

  it.each<[string, unknown]>([
    ["stars that are no number", "7"],
    ["stars that aren't whole", 1.5],
    ["no stars", 0],
    ["stars below none", -1],
    ["a star no level wins", 8],
    ["a star no level wins, with the clear", 8 | STAR.clear],
    ["stars without the clear", STAR.clean | STAR.streak],
  ])("drops a level's %s, keeping the others'", (_, stars) => {
    const stored = { levels: { first: stars, second: STAR.clear } };

    expect(starsRecordOf(stored, LEVELS, new Set())).toEqual({
      levels: { second: STAR.clear },
    });
  });

  it("gives every level the progress has cleared its first star, beside the stars it holds", () => {
    const stored = { levels: { first: STAR.clear | STAR.streak } };

    const record = starsRecordOf(stored, LEVELS, new Set(["first", "second"]));

    expect(record).toEqual({
      levels: { first: STAR.clear | STAR.streak, second: STAR.clear },
    });
  });

  it("gives no star for a level cleared that the game doesn't have", () => {
    expect(starsRecordOf(null, LEVELS, new Set(["gone"]))).toEqual({
      levels: {},
    });
  });
});

describe("withStars", () => {
  const HELD: StarsRecord = { levels: { first: STAR.clear } };

  it("adds the stars a level won to those it holds", () => {
    const held: StarsRecord = { levels: { first: STAR.clear | STAR.streak } };

    expect(withStars(held, "first", STAR.clear | STAR.clean)).toEqual({
      levels: { first: EVERY_STAR },
    });
  });

  it("keeps a star won before that a later play didn't win", () => {
    const held: StarsRecord = { levels: { first: EVERY_STAR } };

    expect(withStars(held, "first", STAR.clear)).toBe(held);
  });

  it("adds a level with no stars before, leaving the others' as they are", () => {
    expect(withStars(HELD, "second", STAR.clear)).toEqual({
      levels: { first: STAR.clear, second: STAR.clear },
    });
  });

  it("returns the same record for no star won", () => {
    expect(withStars(HELD, "second", 0)).toBe(HELD);
  });
});
