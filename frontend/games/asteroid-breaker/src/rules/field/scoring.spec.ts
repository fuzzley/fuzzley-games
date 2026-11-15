import {
  type PictureOptions,
  KEEPER,
  kindsLoggedOn,
  fieldFrom,
  loggedOn,
  placeStray,
  shipOf,
  wholeRocks,
} from "../../testing/field_picture";
import { pointsFor } from "../catalog/rocks";
import { type Blow, type Rock, hitRock } from "../rocks/rocks";
import type { Crew, Pilot } from "../ship/pilots";
import {
  BURR_POINTS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  MOST_CREW,
  SPARK_POINTS,
  STATIC_STEPS,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
} from "../tuning";
import { type Field, stepField } from "./field";
import {
  clearingPoints,
  scoreBurr,
  scoreSpark,
  scoreStray,
  tallyOf,
} from "./scoring";

/** A small stone's points. */
const SMALL = pointsFor("stone", "small");

/** Static's first step that scores more than once, the table's last row. */
const [, , FIRST_STEP] = STATIC_STEPS;

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

/** Breaks a field's whole small rocks one after another, and returns the points each scored. */
function breakSmalls(field: Field): number[] {
  return smallRocks(field).map((rock) => {
    const before = field.score;
    hitRock(field, rock, 0, 0);
    return field.score - before;
  });
}

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

  it("logs its points at its place, before static's multiplier, and the multiplier", () => {
    const field = stones(1, { charge: FIRST_STEP.from });
    const { x, y } = onlySmall(field);

    breakSmalls(field);

    expect(loggedOn(field).slice(-1)).toEqual([
      expect.objectContaining({
        kind: "scored",
        x,
        y,
        points: SMALL,
        times: FIRST_STEP.times,
      }),
    ]);
  });
});

describe("static's multiplier", () => {
  it.each(STATIC_STEPS)(
    "scores a break $times times from $from static",
    ({ from, times }) => {
      const field = stones(1, { charge: from });

      expect(breakSmalls(field)).toEqual([SMALL * times]);
    },
  );

  it("scores a break once below its first step", () => {
    const field = stones(1, { charge: FIRST_STEP.from - 1 });

    expect(breakSmalls(field)).toEqual([SMALL]);
  });

  it("keeps apart what it added", () => {
    const field = stones(2, { charge: FIRST_STEP.from });

    breakSmalls(field);

    expect([field.rockPoints, field.staticPoints]).toEqual([
      2 * SMALL,
      2 * SMALL * (FIRST_STEP.times - 1),
    ]);
  });
});

describe("a stray caught", () => {
  it("scores its points times static's multiplier as it joins the line, its own among the strays'", () => {
    const field = fieldFrom(SHIP_PICTURE, { charge: FIRST_STEP.from });
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);

    stepField(field);

    expect({
      home: field.strays.broughtHome,
      score: field.score,
      strays: field.strayPoints,
    }).toEqual({
      home: 1,
      score: STRAY_POINTS * FIRST_STEP.times,
      strays: STRAY_POINTS,
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

describe("scoreBurr", () => {
  it("scores a burr popped its points times static's multiplier, its own among the rocks', logged at its place", () => {
    const field = fieldFrom(SHIP_PICTURE, { charge: FIRST_STEP.from });

    scoreBurr(field, 10, 12);

    expect({
      score: field.score,
      rocks: field.rockPoints,
      added: field.staticPoints,
      logged: loggedOn(field),
    }).toEqual({
      score: BURR_POINTS * FIRST_STEP.times,
      rocks: BURR_POINTS,
      added: BURR_POINTS * (FIRST_STEP.times - 1),
      logged: [
        expect.objectContaining({
          kind: "scored",
          x: 10,
          y: 12,
          points: BURR_POINTS,
          times: FIRST_STEP.times,
        }),
      ],
    });
  });

  it("scores nothing once the run is over", () => {
    const field = fieldFrom(SHIP_PICTURE, { crew: crewOf(null) });

    scoreBurr(field, 10, 12);

    expect([field.score, field.rockPoints]).toEqual([0, 0]);
  });
});

describe("scoreSpark", () => {
  it("scores a spark its points times static's multiplier, its own among the sparks' and what static added among static's", () => {
    const field = fieldFrom(SHIP_PICTURE, { charge: FIRST_STEP.from });

    const scored = scoreSpark(field, 10, 12, 3);

    expect({
      scored,
      score: field.score,
      sparks: field.sparkPoints,
      added: field.staticPoints,
    }).toEqual({
      scored: true,
      score: SPARK_POINTS * FIRST_STEP.times,
      sparks: SPARK_POINTS,
      added: SPARK_POINTS * (FIRST_STEP.times - 1),
    });
  });

  it("logs the spark at its place with the pilot who gathered it, its points and the multiplier", () => {
    const field = fieldFrom(SHIP_PICTURE, { charge: FIRST_STEP.from });

    scoreSpark(field, 10, 12, 3);

    expect(loggedOn(field)).toEqual([
      expect.objectContaining({
        kind: "sparked",
        x: 10,
        y: 12,
        pilot: 3,
        points: SPARK_POINTS,
        times: FIRST_STEP.times,
      }),
    ]);
  });

  it("scores and logs nothing once the run is over", () => {
    const field = fieldFrom(SHIP_PICTURE, { crew: crewOf(null) });

    const scored = scoreSpark(field, 10, 12, 3);

    expect([scored, field.score, loggedOn(field)]).toEqual([false, 0, []]);
  });
});

describe("tallyOf", () => {
  /** A picture of the ship and a row of small stones below it. */
  const PICTURE = ["", ".........^", "", "", "SSS"];

  it("parts a cleared wave's points into the rocks', static's, the strays' and the clearing's", () => {
    const field = fieldFrom(PICTURE);
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);
    stepField(field);
    field.charge.level = FIRST_STEP.from;
    breakSmalls(field);

    stepField(field);

    expect(tallyOf(field)).toEqual({
      rocks: SMALL * 3,
      sparks: 0,
      static: SMALL * 3 * (FIRST_STEP.times - 1),
      strays: STRAY_POINTS,
      cleared: CLEAR_POINTS,
      clean: CLEAN_POINTS,
    });
  });

  it("counts what static added to a stray's points among static's, the parts adding up to the wave's score", () => {
    const field = fieldFrom(PICTURE, { charge: FIRST_STEP.from });
    breakSmalls(field);
    const ship = shipOf(field);
    placeStray(field, ship.x, ship.y);

    stepField(field);

    const rocks = SMALL * 3;
    const added = (rocks + STRAY_POINTS) * (FIRST_STEP.times - 1);
    expect([tallyOf(field), field.score]).toEqual([
      {
        rocks,
        sparks: 0,
        static: added,
        strays: STRAY_POINTS,
        cleared: CLEAR_POINTS,
        clean: CLEAN_POINTS,
      },
      rocks + added + STRAY_POINTS + CLEAR_POINTS + CLEAN_POINTS,
    ]);
  });

  it("counts the sparks' own points apart, and what static added to them among static's", () => {
    const field = fieldFrom(SHIP_PICTURE, { charge: FIRST_STEP.from });
    scoreSpark(field, 10, 12, 3);
    scoreSpark(field, 10, 12, 3);

    expect(tallyOf(field)).toMatchObject({
      sparks: SPARK_POINTS * 2,
      static: SPARK_POINTS * 2 * (FIRST_STEP.times - 1),
    });
  });

  it("counts no clean wave's points for one that took a hit", () => {
    const field = fieldFrom(["S"]);
    field.hits = 1;
    hitRock(field, onlySmall(field), 0, 0);

    stepField(field);

    expect(tallyOf(field)).toEqual({
      rocks: SMALL,
      sparks: 0,
      static: 0,
      strays: 0,
      cleared: CLEAR_POINTS,
      clean: 0,
    });
  });
});
