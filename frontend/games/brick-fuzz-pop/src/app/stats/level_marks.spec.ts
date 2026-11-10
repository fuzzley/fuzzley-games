import { LEVELS, levelsOf } from "../../rules/levels/levels";
import type { Stats } from "../../rules/run/stats";
import { levelMarksOf } from "./level_marks";

/** Returns the stats of a player with records of some levels, by id. */
function statsWith(levels: Stats["levels"]): Pick<Stats, "levels"> {
  return { levels };
}

describe("levelMarksOf", () => {
  it("marks every level the game has, by its id", () => {
    const marks = levelMarksOf(LEVELS, new Set(), statsWith({}));

    expect(Object.keys(marks)).toEqual(LEVELS.map(({ data }) => data.id));
  });

  it("opens the first level alone to a new player, with no stars or best", () => {
    const marks = levelMarksOf(LEVELS, new Set(), statsWith({}));

    expect([marks["hello-wall"], marks["stripes"]]).toEqual([
      { open: true, stars: 0, best: null },
      { open: false, stars: 0, best: null },
    ]);
  });

  it("marks a level cleared with its stars and best, and opens the next", () => {
    const marks = levelMarksOf(
      LEVELS,
      new Set(["hello-wall"]),
      statsWith({ "hello-wall": { points: 2400, rounds: 6, stars: 2 } }),
    );

    expect([marks["hello-wall"], marks["stripes"], marks["pips"]]).toEqual([
      { open: true, stars: 2, best: 2400 },
      { open: true, stars: 0, best: null },
      { open: false, stars: 0, best: null },
    ]);
  });

  it("shows no stars or best of a level the progress hasn't cleared, whatever the stats keep", () => {
    const marks = levelMarksOf(
      LEVELS,
      new Set(),
      statsWith({ pips: { points: 900, rounds: 4, stars: 3 } }),
    );

    expect(marks["pips"]).toEqual({ open: false, stars: 0, best: null });
  });

  it("marks the levels it is handed, by their ids", () => {
    const levels = levelsOf([
      {
        id: "set",
        name: "Set",
        levels: ["a", "b", "c"].map((id) => ({
          id,
          name: id,
          boon: "hot",
          bricks: [],
        })),
      },
    ]);

    const marks = levelMarksOf(levels, new Set(["a"]), statsWith({}));

    expect(marks).toEqual({
      a: { open: true, stars: 0, best: null },
      b: { open: true, stars: 0, best: null },
      c: { open: false, stars: 0, best: null },
    });
  });

  it("marks a level cleared whose records were lost open, with no stars", () => {
    const marks = levelMarksOf(LEVELS, new Set(["stripes"]), statsWith({}));

    expect(marks["stripes"]).toEqual({ open: true, stars: 0, best: null });
  });
});
