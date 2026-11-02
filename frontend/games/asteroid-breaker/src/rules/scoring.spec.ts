import {
  type PictureOptions,
  KEEPER,
  PICTURE_TORUS,
  eventsOf,
  fieldFrom,
  loggedOn,
  placeRock,
  placeStray,
  shipOf,
  stepTimes,
  wholeRocks,
} from "../testing/field_picture";
import { ROCK_KINDS, rockPoints } from "./catalog/rocks";
import { type Field, stepField } from "./field";
import type { Crew } from "./pilots";
import { type Blow, type Rock, hitRock } from "./rocks";
import {
  chainCountOf,
  chainMultiplier,
  clearingPoints,
  multiplier,
  pointsOf,
  tallyOf,
} from "./scoring";
import { stepsIn } from "./stepper";
import {
  CHAIN,
  CHAIN_MS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  FIRST_SHIP_POINTS,
  MAX_SHIPS,
  SHIP_POINTS,
  STRAY_POINTS,
} from "./tuning";

/** A small stone's points. */
const SMALL = rockPoints("stone", "small");

/** The steps a chain's time lasts. */
const CHAIN_STEPS = stepsIn(CHAIN_MS);

/** The shortest chain that scores more than once, the table's last row. */
const [, , SHORTEST] = CHAIN;

/** A picture of a ship in the field's middle, the keeper beside it. */
const SHIP_PICTURE = [...KEEPER, "", "", ".........^"];

/** Returns a crew of pilots flying and at home, the last color given 2. */
function crewOf(flying: readonly number[], home: readonly number[] = []): Crew {
  return { flying, home, lastGiven: 2 };
}

/** Returns a field of a row of small stones, as many as given, the keeper keeping its wave from clearing. */
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

/** Returns a field whose small stone, broken, brought the run's points to the next ship's mark, banked and crew as the options say. */
function atMark(options: PictureOptions = {}): Field {
  const field = stones(1, { banked: FIRST_SHIP_POINTS - SMALL, ...options });
  breakSmalls(field);
  return field;
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
  it("adds more for a wave cleared without losing a ship", () => {
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

    expect(field.score).toBe(rockPoints("ice", "small"));
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

  it("ends as the ship is lost", () => {
    const field = fieldFrom(["^B"]);
    field.chain = SHORTEST.from;

    stepField(field);

    expect([field.shipsLost, field.chain]).toEqual([1, 0]);
  });
});

describe("a stray brought home", () => {
  it("scores its points times the chain's multiplier, without counting on in it", () => {
    const field = fieldFrom(SHIP_PICTURE);
    field.chain = SHORTEST.from;
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);

    stepField(field);

    expect([field.strays.broughtHome, field.score, field.chain]).toEqual([
      1,
      STRAY_POINTS * SHORTEST.times,
      SHORTEST.from,
    ]);
  });
});

describe("a cleared wave", () => {
  it.each([
    ["scores more cleared without losing a ship", 0],
    ["scores less once it has lost one", 1],
  ])("%s", (_, shipsLost) => {
    const field = fieldFrom(["S"]);
    field.shipsLost = shipsLost;
    hitRock(field, onlySmall(field), 0, 0);

    stepField(field);

    expect([field.cleared, field.score]).toEqual([
      true,
      SMALL + clearingPoints(shipsLost),
    ]);
  });
});

describe("a run over", () => {
  it("scores nothing for a break once the last ship is lost, so its score doesn't hang on how its last steps fall into frames", () => {
    const field = fieldFrom(["^B", "", "", "S"], { crew: crewOf([3]) });
    stepField(field);

    hitRock(field, onlySmall(field), 0, 0);

    expect([field.score, eventsOf(field)]).toEqual([0, ["lost", "broken"]]);
  });

  it("scores nothing for a wave a blast clears once the last ship is lost, though a stray waits at home", () => {
    const field = fieldFrom(["S"], { crew: crewOf([], [5]) });
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

  it("counts what the chain added to a stray's points among the chains'", () => {
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

    expect(tallyOf(field)).toEqual({
      rocks: SMALL * SHORTEST.from,
      chains: (SMALL + STRAY_POINTS) * (SHORTEST.times - 1),
      strays: STRAY_POINTS,
      cleared: CLEAR_POINTS,
      clean: CLEAN_POINTS,
    });
  });

  it("counts no clean wave's points for one that lost a ship", () => {
    const field = fieldFrom(["S"]);
    field.shipsLost = 1;
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

describe("pointsOf", () => {
  it("adds up a wave's tally", () => {
    const tally = {
      rocks: 1,
      chains: 20,
      strays: 300,
      cleared: 4000,
      clean: 50000,
    };

    expect(pointsOf(tally)).toBe(54321);
  });
});

describe("the ships points bring", () => {
  it("come as the run's points reach the next mark, flown by a new pilot, the mark moving on", () => {
    const field = atMark({ crew: crewOf([0, 1]) });

    stepField(field);

    expect([field.crew, field.nextShipAt]).toEqual([
      { flying: [0, 1, 3], home: [], lastGiven: 3 },
      FIRST_SHIP_POINTS + SHIP_POINTS,
    ]);
  });

  it("don't come before the run's points reach it", () => {
    const field = atMark({ banked: FIRST_SHIP_POINTS - SMALL - 1 });

    stepField(field);

    expect(field.nextShipAt).toBe(FIRST_SHIP_POINTS);
  });

  it("log the ship and its pilot", () => {
    const field = atMark({ crew: crewOf([0, 1]) });

    stepField(field);

    expect(loggedOn(field).filter((event) => event.kind === "gained")).toEqual([
      expect.objectContaining({
        x: PICTURE_TORUS.width / 2,
        y: PICTURE_TORUS.height / 2,
        pilot: 3,
      }),
    ]);
  });

  it("are flown by the first stray at home", () => {
    const field = atMark({ crew: crewOf([0, 1], [5, 6]) });

    stepField(field);

    expect(field.crew).toEqual(crewOf([0, 1, 5], [6]));
  });

  // Three, as the field gains them twice a step.
  it("come one for each mark passed at once", () => {
    const field = atMark({
      crew: crewOf([0]),
      banked: FIRST_SHIP_POINTS + 2 * SHIP_POINTS - SMALL,
    });

    stepField(field);

    expect([field.crew.flying.length, field.nextShipAt]).toEqual([
      4,
      FIRST_SHIP_POINTS + 3 * SHIP_POINTS,
    ]);
  });

  it("spend a mark passed with the most ships flying", () => {
    const crew = crewOf(Array.from({ length: MAX_SHIPS }, (_, color) => color));
    const field = atMark({ crew });

    stepField(field);

    expect([field.crew, field.nextShipAt, eventsOf(field)]).toEqual([
      crew,
      FIRST_SHIP_POINTS + SHIP_POINTS,
      ["broken", "scored"],
    ]);
  });

  it("don't come once no one is flying, the run over", () => {
    const field = stones(0, { crew: crewOf([]), banked: FIRST_SHIP_POINTS });

    stepField(field);

    expect([field.crew.flying, field.nextShipAt]).toEqual([
      [],
      FIRST_SHIP_POINTS,
    ]);
  });

  it("come before the ship meets a rock, so the step's points save a run whose last ship it takes", () => {
    const field = fieldFrom(["^B", "", "", "S"], {
      crew: crewOf([3]),
      banked: FIRST_SHIP_POINTS - SMALL,
    });
    breakSmalls(field);

    stepField(field);

    expect([field.shipsLost, field.crew.flying]).toEqual([1, [4]]);
  });

  it("come after the wave clears, for its clearing's points", () => {
    const field = fieldFrom(["S"], {
      banked: FIRST_SHIP_POINTS - SMALL - clearingPoints(0),
    });
    hitRock(field, onlySmall(field), 0, 0);

    stepField(field);

    expect(field.nextShipAt).toBe(FIRST_SHIP_POINTS + SHIP_POINTS);
  });
});
