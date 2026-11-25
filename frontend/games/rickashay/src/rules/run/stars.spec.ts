import { DEPTHS } from "@fz/brick-wall/rules/field";
import { parFrom, parOf } from "@fz/brick-wall/rules/par";
import { createRun } from "@fz/brick-wall/rules/run";
import warmUpMarks from "../../testing/warm_up_marks.json";
import { WARM_UP_LEVELS } from "../../testing/warm_up_levels";
import { PAR_SHARE } from "../tuning";
import { UNTALLIED } from "./scoring";
import {
  type ClearedPlay,
  MOST_STARS,
  type Marks,
  STARS,
  type StarFlags,
  marksOf,
  rallyMarkOf,
  starCount,
  starsEarned,
  starsFor,
  withStarsEarned,
} from "./stars";

/** Warm-up's marks, as a fixture of `marks/warm-up.json` holds them. */
const MARKS: Marks = warmUpMarks;

/** A level cleared in 6 rounds against a par of 6, its best rally 13 against a mark of 14. */
const AT_PAR: ClearedPlay = { rounds: 6, par: 6, rally: 13, mark: 14 };

/** The stars of a level cleared within par, short of its rally mark. */
const WITHIN_PAR: StarFlags = { cleared: true, par: true, mark: false };

/** The stars of a level cleared at its rally mark, past its par. */
const AT_MARK: StarFlags = { cleared: true, par: false, mark: true };

describe("STARS", () => {
  it("names the stars as the Cleared card does, cleared, then par, then the rally mark", () => {
    expect([STARS, MOST_STARS]).toEqual([["cleared", "par", "mark"], 3]);
  });
});

describe("marksOf", () => {
  it("joins the marks of every set's levels", () => {
    const first: Marks = { par: { a: { "11": 4 } }, rally: { a: { "11": 9 } } };
    const second: Marks = {
      par: { b: { "11": 6 } },
      rally: { b: { "11": 12 } },
    };

    expect(marksOf([first, second])).toEqual({
      par: { a: { "11": 4 }, b: { "11": 6 } },
      rally: { a: { "11": 9 }, b: { "11": 12 } },
    });
  });
});

describe("rallyMarkOf", () => {
  it.each([
    ["first-bounce", 11, 8],
    ["pips", 11, 14],
    ["pips", 22, 19],
  ])("finds %s's rally mark on a field %i deep, %i", (id, depth, mark) => {
    expect(rallyMarkOf(id, depth, MARKS)).toBe(mark);
  });

  it("throws for a level the marks don't hold", () => {
    expect(() => rallyMarkOf("trapdoor", 11, MARKS)).toThrow(
      'Level "trapdoor" has no rally mark on a field 11 deep.',
    );
  });

  it("throws for a depth the marks don't hold", () => {
    expect(() => rallyMarkOf("pips", 23, MARKS)).toThrow(
      'Level "pips" has no rally mark on a field 23 deep.',
    );
  });
});

describe("starsFor", () => {
  it("gives a level cleared its star for clearing it, however it was played", () => {
    const stars = starsFor({ ...AT_PAR, rounds: 30, rally: 0 });

    expect(stars).toEqual({ cleared: true, par: false, mark: false });
  });

  it.each([
    [5, true],
    [6, true],
    [7, false],
  ])(
    "gives a level of par 6 cleared in %i rounds the star for par: %s",
    (rounds, earned) => {
      expect(starsFor({ ...AT_PAR, rounds }).par).toBe(earned);
    },
  );

  it.each([
    [13, false],
    [14, true],
    [40, true],
  ])(
    "gives a level of rally mark 14 whose best rally was %i the mark's star: %s",
    (rally, earned) => {
      expect(starsFor({ ...AT_PAR, rally }).mark).toBe(earned);
    },
  );
});

describe("starsEarned", () => {
  // Pips, level 4, begun on a field 22 deep: par 9 and a rally mark of 19
  // there, where on a field 11 deep its mark is 14.
  it.each([
    [18, false],
    [19, true],
  ])(
    "reads the rally mark on the depth the level began on, a best rally of %i earning it: %s",
    (bestRally, earned) => {
      const run = createRun({ id: 1, level: 4, depth: 22 }, WARM_UP_LEVELS, {
        pars: MARKS.par,
        untallied: UNTALLIED,
      });
      const play = { ...run, rounds: 9, tally: { ...UNTALLIED, bestRally } };

      expect(starsEarned(play, WARM_UP_LEVELS, MARKS)).toEqual({
        cleared: true,
        par: true,
        mark: earned,
      });
    },
  );

  it("holds the level in play to its par as the run has it, not the marks' own", () => {
    const play = {
      level: 1,
      depth: 11,
      par: 3,
      rounds: 5,
      tally: { ...UNTALLIED, bestRally: 7 },
    };

    expect(starsEarned(play, WARM_UP_LEVELS, MARKS)).toEqual({
      cleared: true,
      par: false,
      mark: false,
    });
  });
});

describe("starCount", () => {
  it.each<[StarFlags, number]>([
    [{ cleared: true, par: false, mark: false }, 1],
    [WITHIN_PAR, 2],
    [AT_MARK, 2],
    [{ cleared: true, par: true, mark: true }, 3],
  ])("counts %j as %i", (stars, count) => {
    expect(starCount(stars)).toBe(count);
  });
});

describe("withStarsEarned", () => {
  it("keeps each star either game earned", () => {
    expect(withStarsEarned(WITHIN_PAR, AT_MARK)).toEqual({
      cleared: true,
      par: true,
      mark: true,
    });
  });

  it("keeps the stars themselves where the game earned none they lack", () => {
    const earned = { ...WITHIN_PAR, par: false };

    expect(withStarsEarned(WITHIN_PAR, earned)).toBe(WITHIN_PAR);
  });

  it("leaves the stars it is handed as they were", () => {
    const kept = structuredClone(WITHIN_PAR);
    const earned = structuredClone(AT_MARK);

    withStarsEarned(kept, earned);

    expect([kept, earned]).toEqual([WITHIN_PAR, AT_MARK]);
  });
});

describe("the fixture of Warm-up's marks", () => {
  /** Every level's par on every depth, as the fixture holds them. */
  const PARS = WARM_UP_LEVELS.flatMap(({ data: { id } }) =>
    DEPTHS.map((depth) => parOf(id, depth, MARKS.par)),
  );

  it("holds a rally mark of 1 or more for every level on every depth", () => {
    const marks = WARM_UP_LEVELS.flatMap(({ data: { id } }) =>
      DEPTHS.map((depth) => rallyMarkOf(id, depth, MARKS)),
    );

    expect(marks.filter((mark) => !Number.isInteger(mark) || mark < 1)).toEqual(
      [],
    );
  });

  it("holds for every level on every depth a par that a certificate's rounds give", () => {
    const given = (par: number): boolean =>
      Array.from({ length: par }, (_, rounds) =>
        parFrom(rounds + 1, PAR_SHARE),
      ).includes(par);

    expect(PARS.filter((par) => !given(par))).toEqual([]);
  });
});
