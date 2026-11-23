import { type LevelMark, levelMarksOf } from "./level_marks";

/** What the spec's game keeps of a level cleared: its best points and its most stars, either lost from a store. */
interface Kept {
  readonly points?: number;
  readonly stars?: number;
}

/** Five levels made up for the spec, "a" to "e", numbered 1 to 5. */
const LEVELS = ["a", "b", "c", "d", "e"].map((id) => ({ data: { id } }));

/** Returns a level's stars and best, as the spec's game reads its record. */
function markOf({ points, stars }: Kept): Pick<LevelMark, "stars" | "best"> {
  return { stars: stars ?? 0, best: points ?? null };
}

/** A level locked and never cleared. */
const LOCKED: LevelMark = { open: false, stars: 0, best: null };

/** A level open and never cleared. */
const OPEN: LevelMark = { open: true, stars: 0, best: null };

describe("levelMarksOf", () => {
  it("marks every level the game has, by its id", () => {
    const marks = levelMarksOf(LEVELS, new Set(), {}, markOf);

    expect(Object.keys(marks)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("opens the first level alone to a new player, with no stars or best", () => {
    const marks = levelMarksOf(LEVELS, new Set(), {}, markOf);

    expect([marks["a"], marks["b"]]).toEqual([OPEN, LOCKED]);
  });

  it("marks a level cleared with its stars and best, as the game reads them, and opens the next", () => {
    const marks = levelMarksOf(
      LEVELS,
      new Set(["a"]),
      { a: { points: 2400, stars: 2 } },
      markOf,
    );

    expect([marks["a"], marks["b"], marks["c"]]).toEqual([
      { open: true, stars: 2, best: 2400 },
      OPEN,
      LOCKED,
    ]);
  });

  it("shows no stars or best of a level the progress hasn't cleared, whatever the records keep", () => {
    const marks = levelMarksOf(
      LEVELS,
      new Set(),
      { c: { points: 900, stars: 3 } },
      markOf,
    );

    expect(marks["c"]).toEqual(LOCKED);
  });

  it("opens every level where asked to", () => {
    const marks = levelMarksOf(LEVELS, new Set(), {}, markOf, true);

    expect(
      Object.entries(marks)
        .filter(([, { open }]) => !open)
        .map(([id]) => id),
    ).toEqual([]);
  });

  it("shows stars and best only where the progress has a level cleared, while every level is open", () => {
    const marks = levelMarksOf(
      LEVELS,
      new Set(["a"]),
      { a: { points: 2400, stars: 2 }, c: { points: 900, stars: 3 } },
      markOf,
      true,
    );

    expect([marks["a"], marks["c"]]).toEqual([
      { open: true, stars: 2, best: 2400 },
      OPEN,
    ]);
  });

  it("marks a level cleared whose records were lost open, with no stars", () => {
    const marks = levelMarksOf(LEVELS, new Set(["b"]), {}, markOf);

    expect(marks["b"]).toEqual(OPEN);
  });
});
