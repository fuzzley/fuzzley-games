import {
  type PictureOptions,
  KEEPER,
  kindsLoggedOn,
  fieldFrom,
  loggedOn,
  placeRock,
  placeStray,
  shipOf,
  stepTimes,
  wholeRocks,
} from "../../testing/field_picture";
import { ROCK_KINDS, pointsFor } from "../catalog/rocks";
import { type Blow, type Rock, hitRock } from "../rocks/rocks";
import type { Crew, Pilot } from "../ship/pilots";
import { stepsIn } from "../stepper";
import {
  CHAIN,
  CHAIN_MS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  MOST_CREW,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
} from "../tuning";
import { type Field, stepField } from "./field";
import {
  chainCountOf,
  chainMultiplier,
  clearingPoints,
  multiplier,
  scoreStray,
  tallyOf,
} from "./scoring";

/** A small stone's points. */
const SMALL = pointsFor("stone", "small");

/** The steps a chain's time lasts. */
const CHAIN_STEPS = stepsIn(CHAIN_MS);

/** The shortest chain that scores more than once, the table's last row. */
const [, , SHORTEST] = CHAIN;

/** A picture of a ship in the field's middle, the keeper beside it. */
const SHIP_PICTURE = [...KEEPER, "", "", ".........^"];

/** Returns a crew of a pilot at the controls or none, those in tow, and those gone home, the last color given 2. */
function crewOf(
  pilot: Pilot | null,
  tow: readonly Pilot[] = [],
  home: readonly Pilot[] = [],
): Crew {
  return { pilot, tow, home, lastGiven: 2 };
}

/**
 * Returns a field of a row of small stones, as many as given, the keeper
 * keeping its wave from clearing.
 */
function stones(count: number, options: PictureOptions = {}): Field {
  return fieldFrom([...KEEPER, "", "S".repeat(count)], options);
}

/** Returns a field's whole small rocks, in their slots' order. */
function smallRocks(field: Field): Rock[] {
  return wholeRocks(field).filter((rock) => rock.size === "small");
}

/** Returns a field's only whole small rock, failing the spec if it has another or none. */
function onlySmall(field: Field): Rock {
  const [rock, ...others] = smallRocks(field);
  if (!rock || others.length > 0) {
    throw new Error("The field has no one small rock.");
  }
  return rock;
}

/**
 * Breaks a field's whole small rocks one after another, a number of steps
 * apart, the first at the step it stands at, and returns the points each
 * scored.
 */
function breakSmalls(field: Field, apart = 0): number[] {
  return smallRocks(field).map((rock) => {
    const before = field.score;
    hitRock(field, rock, 0, 0);
    field.steps += apart;
    return field.score - before;
  });
}

describe("multiplier", () => {
  it.each(CHAIN)(
    "scores a break $times times from the $from-th in a chain",
    ({ from, times }) => {
      expect(multiplier(from)).toBe(times);
    },
  );

  it("scores a break once before the shortest chain that scores more", () => {
    expect(multiplier(SHORTEST.from - 1)).toBe(1);
  });
});

describe("chainMultiplier", () => {
  it.each([
    [
      "the chain's multiplier while its time lasts",
      CHAIN_STEPS,
      SHORTEST.times,
    ],
    ["1 once its time is up", CHAIN_STEPS + 1, 1],
  ])("says %s", (_, after, times) => {
    const field = stones(0);
    field.chain = SHORTEST.from;
    field.steps = after;

    expect(chainMultiplier(field)).toBe(times);
  });
});

describe("clearingPoints", () => {
  it("adds more for a wave cleared without a hit taken", () => {
    expect([clearingPoints(0), clearingPoints(1)]).toEqual([
      CLEAR_POINTS + CLEAN_POINTS,
      CLEAR_POINTS,
    ]);
  });
});

describe("a broken rock", () => {
  it("scores its kind's points for its size", () => {
    const field = fieldFrom([...KEEPER, "", "S"], { kind: "ice" });

    hitRock(field, onlySmall(field), 0, 0);

    expect(field.score).toBe(pointsFor("ice", "small"));
  });

  it("scores nothing for a hit it holds", () => {
    const field = fieldFrom(KEEPER, { kind: "iron" });
    const [rock] = wholeRocks(field);
    if (!rock) throw new Error("The picture has a rock.");

    hitRock(field, rock, 0, 0);

    expect(field.score).toBe(0);
  });

  it.each<[string, Blow, number]>([
    ["scores by a blow that breaks it, as the Shield's does", "breaks", SMALL],
    ["scores nothing smashed by a comet", "smashes", 0],
  ])("%s", (_, blow, points) => {
    const field = stones(1);

    hitRock(field, onlySmall(field), 0, 0, blow);

    expect(field.score).toBe(points);
  });

  it("logs its points at its place, before the chain's multiplier, and the multiplier", () => {
    const field = stones(SHORTEST.from);
    const last = smallRocks(field).at(-1);
    if (!last) throw new Error("The picture has small rocks.");
    const { x, y } = last;

    breakSmalls(field);

    expect(loggedOn(field).slice(-1)).toEqual([
      expect.objectContaining({
        kind: "scored",
        x,
        y,
        points: SMALL,
        times: SHORTEST.times,
      }),
    ]);
  });
});

describe("chainCountOf", () => {
  it("counts a break the first of a chain on a field with none", () => {
    expect(chainCountOf(stones(1))).toBe(1);
  });

  it("counts a break the next of the chain within its time", () => {
    const field = stones(2);

    breakSmalls(field);

    expect(chainCountOf(field)).toBe(3);
  });

  it("counts a break the first of a new chain once the last's time is up", () => {
    const field = stones(2);

    breakSmalls(field, CHAIN_STEPS + 1);

    expect(chainCountOf(field)).toBe(1);
  });
});

describe("the chain", () => {
  it("scores a break more from the shortest chain that scores more", () => {
    const field = stones(SHORTEST.from);

    const scored = breakSmalls(field);

    expect(scored).toEqual([
      ...Array<number>(SHORTEST.from - 1).fill(SMALL),
      SMALL * SHORTEST.times,
    ]);
  });

  it("keeps apart what its multiplier added", () => {
    const field = stones(SHORTEST.from);

    breakSmalls(field);

    expect(field.chainPoints).toBe(SMALL * (SHORTEST.times - 1));
  });

  it.each([
    [
      "goes on through breaks just within its time",
      CHAIN_STEPS,
      SHORTEST.times,
    ],
    ["starts again from a break just past it", CHAIN_STEPS + 1, 1],
  ])("%s of the last", (_, apart, times) => {
    const field = stones(SHORTEST.from);

    const scored = breakSmalls(field, apart);

    expect(scored.at(-1)).toBe(SMALL * times);
  });

  it("counts the breaks a blast makes", () => {
    const field = fieldFrom(KEEPER);
    const volatile = placeRock(field, "medium", 30, 20, "volatile");
    for (const [x, y] of [
      [27, 20],
      [33, 20],
      [30, 17],
      [30, 23],
    ] as const) {
      placeRock(field, "small", x, y);
    }
    hitRock(field, volatile, 0, 0);

    stepTimes(field, stepsIn(ROCK_KINDS.volatile.traits[0].delayMs));

    expect([smallRocks(field), field.chain]).toEqual([[], 5]);
  });

  it("counts no rock a comet smashes", () => {
    const field = stones(2);
    const [first, second] = smallRocks(field);
    if (!first || !second) throw new Error("The picture has two small rocks.");
    hitRock(field, first, 0, 0);

    hitRock(field, second, 0, 0, "smashes");

    expect(field.chain).toBe(1);
  });

  it("ends as the ship takes a hit", () => {
    const field = fieldFrom(["^B"]);
    field.chain = SHORTEST.from;

    stepField(field);

    expect([field.hits, field.chain]).toEqual([1, 0]);
  });
});

describe("a stray caught", () => {
  it("scores its points times the chain's multiplier as it joins the line, without counting on in it, its own among the strays'", () => {
    const field = fieldFrom(SHIP_PICTURE);
    field.chain = SHORTEST.from;
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);

    stepField(field);

    expect({
      home: field.strays.broughtHome,
      score: field.score,
      strays: field.strayPoints,
      chain: field.chain,
    }).toEqual({
      home: 1,
      score: STRAY_POINTS * SHORTEST.times,
      strays: STRAY_POINTS,
      chain: SHORTEST.from,
    });
  });

  it("scores more as it goes straight home with the most in tow", () => {
    const tow = Array.from({ length: MOST_CREW - 1 }, (_, at) => at + 1);
    const field = fieldFrom(SHIP_PICTURE, { crew: crewOf(0, tow) });
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);

    stepField(field);

    expect([field.score, field.strayPoints]).toEqual([
      STRAY_HOME_POINTS,
      STRAY_HOME_POINTS,
    ]);
  });
});

describe("a cleared wave", () => {
  it.each([
    ["scores more cleared without a hit taken", 0],
    ["scores less once it has taken one", 1],
  ])("%s", (_, hits) => {
    const field = fieldFrom(["S"]);
    field.hits = hits;
    hitRock(field, onlySmall(field), 0, 0);

    stepField(field);

    expect([field.cleared, field.score]).toEqual([
      true,
      SMALL + clearingPoints(hits),
    ]);
  });
});

describe("a run over", () => {
  it("scores nothing for a break once a hit ends the run, so its score doesn't hang on how its last steps fall into frames", () => {
    const field = fieldFrom(["^B", "", "", "S"], { crew: crewOf(3) });
    stepField(field);

    hitRock(field, onlySmall(field), 0, 0);

    expect([field.score, field.rockPoints, kindsLoggedOn(field)]).toEqual([
      0,
      0,
      ["lost", "broken"],
    ]);
  });

  it("scores nothing for a stray once a hit ends the run", () => {
    const field = fieldFrom(["S"], { crew: crewOf(null, [], [5]) });

    scoreStray(field, 1, 2, STRAY_POINTS);

    expect([field.score, field.strayPoints, kindsLoggedOn(field)]).toEqual([
      0,
      0,
      [],
    ]);
  });

  it("scores nothing for a wave a blast clears once a hit ends the run, though a stray waits at home", () => {
    const field = fieldFrom(["S"], { crew: crewOf(null, [], [5]) });
    hitRock(field, onlySmall(field), 0, 0);

    stepField(field);

    expect([field.cleared, field.score]).toEqual([true, 0]);
  });
});

describe("tallyOf", () => {
  it("parts a cleared wave's points into the rocks', the chains', the strays' and the clearing's", () => {
    const field = fieldFrom([
      "",
      ".........^",
      "",
      "",
      "S".repeat(SHORTEST.from),
    ]);
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);
    stepField(field);
    breakSmalls(field);

    stepField(field);

    expect(tallyOf(field)).toEqual({
      rocks: SMALL * SHORTEST.from,
      chains: SMALL * (SHORTEST.times - 1),
      strays: STRAY_POINTS,
      cleared: CLEAR_POINTS,
      clean: CLEAN_POINTS,
    });
  });

  it("counts what the chain added to a stray's points among the chains', the parts adding up to the wave's score", () => {
    const field = fieldFrom([
      "",
      ".........^",
      "",
      "",
      "S".repeat(SHORTEST.from),
    ]);
    breakSmalls(field);
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);

    stepField(field);

    const rocks = SMALL * SHORTEST.from;
    const chains = (SMALL + STRAY_POINTS) * (SHORTEST.times - 1);
    expect([tallyOf(field), field.score]).toEqual([
      {
        rocks,
        chains,
        strays: STRAY_POINTS,
        cleared: CLEAR_POINTS,
        clean: CLEAN_POINTS,
      },
      rocks + chains + STRAY_POINTS + CLEAR_POINTS + CLEAN_POINTS,
    ]);
  });

  it("counts no clean wave's points for one that took a hit", () => {
    const field = fieldFrom(["S"]);
    field.hits = 1;
    hitRock(field, onlySmall(field), 0, 0);

    stepField(field);

    expect(tallyOf(field)).toEqual({
      rocks: SMALL,
      chains: 0,
      strays: 0,
      cleared: CLEAR_POINTS,
      clean: 0,
    });
  });
});
