import {
  KEEPER,
  ballOf,
  brickAt,
  eventsOf,
  fieldFrom,
  headingOf,
  lastEvent,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import { BRICK_KINDS } from "../catalog/bricks";
import type { Field } from "../field/field";
import { cellIndex, cellMiddleX, cellMiddleY } from "../grid";
import { OWN_INK } from "../paddle/balls";
import { stepsIn } from "../stepper";
import { FRIEND_INKS, FRIEND_SPREAD, MAX_BALLS } from "../tuning";
import { hitBrick, neededLeft } from "./bricks";

/** The steps a blast waits before it goes off. */
const FUSE_STEPS = stepsIn(BRICK_KINDS.blast.traits[0].delayMs);

/** The steps a regrowing brick waits before it grows back. */
const REGROW_STEPS = stepsIn(BRICK_KINDS.regrow.traits[0].afterMs);

/** Hits the brick in a cell of the field a number of times. */
function hitAt(field: Field, column: number, row: number, times = 1): void {
  for (let i = 0; i < times; i++)
    hitBrick(field, brickAt(field, column, row), 0, 0);
}

/** Returns the hits left of each brick in a row of the field, null where none or broken. */
function hitsInRow(
  field: Field,
  row: number,
  columns: number,
): (number | null)[] {
  return Array.from({ length: columns }, (_, column) => {
    const brick = field.bricks[cellIndex(column, row)];
    return brick && !brick.broken ? brick.hits : null;
  });
}

describe("a brick", () => {
  it("breaks at a hit, and says so", () => {
    const field = fieldFrom(["o", ...KEEPER]);

    const broke = hitBrick(field, brickAt(field, 0, 0), 1, 2);

    expect({ broke, events: eventsOf(field), needed: field.needed }).toEqual({
      broke: true,
      events: ["broken"],
      needed: 1,
    });
  });

  it("says how long the streak was as it broke, itself counted", () => {
    const field = fieldFrom(["oo", ...KEEPER]);
    hitBrick(field, brickAt(field, 0, 0), 1, 2);

    hitBrick(field, brickAt(field, 1, 0), 3, 2);

    expect(lastEvent(field)).toMatchObject({ kind: "broken", streak: 2 });
  });

  it("takes as many hits as the level gives it", () => {
    const field = fieldFrom(["3", ...KEEPER]);

    hitAt(field, 0, 0, 2);

    expect({
      hits: brickAt(field, 0, 0).hits,
      events: eventsOf(field),
    }).toEqual({ hits: 1, events: ["hit", "hit"] });
  });

  it("takes no more hits once broken", () => {
    const field = fieldFrom(["o", ...KEEPER]);
    hitAt(field, 0, 0);

    const broke = hitBrick(field, brickAt(field, 0, 0), 0, 0);

    expect({ broke, needed: field.needed, events: eventsOf(field) }).toEqual({
      broke: false,
      needed: 1,
      events: ["broken"],
    });
  });

  it("clears the level as the last one it needs breaks", () => {
    const field = fieldFrom(["o#"]);

    hitAt(field, 0, 0);

    expect({ state: field.state, events: eventsOf(field) }).toEqual({
      state: "cleared",
      events: ["broken", "cleared"],
    });
  });
});

describe("a brick that never breaks", () => {
  it("never breaks, however often it is hit", () => {
    const field = fieldFrom(["#", ...KEEPER]);

    hitAt(field, 0, 0, 10);

    expect(brickAt(field, 0, 0).broken).toBe(false);
  });
});

describe("a hidden brick", () => {
  it("doesn't show as the level starts", () => {
    const field = fieldFrom(["~", ...KEEPER]);

    expect(brickAt(field, 0, 0).shown).toBe(false);
  });

  it("shows at its first hit, and holds", () => {
    const field = fieldFrom(["~", ...KEEPER]);

    hitAt(field, 0, 0);

    expect(brickAt(field, 0, 0)).toMatchObject({ shown: true, broken: false });
  });

  it("breaks at its second hit", () => {
    const field = fieldFrom(["~", ...KEEPER]);

    hitAt(field, 0, 0, 2);

    expect(brickAt(field, 0, 0).broken).toBe(true);
  });
});

describe("a brick that blasts", () => {
  it("waits a beat after it breaks", () => {
    const field = fieldFrom(["ooo", "o*o", "ooo", ...KEEPER]);
    hitAt(field, 1, 1);

    stepTimes(field, FUSE_STEPS - 1);

    expect(hitsInRow(field, 0, 3)).toEqual([1, 1, 1]);
  });

  it("then breaks the eight bricks around it", () => {
    const field = fieldFrom(["ooo", "o*o", "ooo", ...KEEPER]);
    hitAt(field, 1, 1);

    stepTimes(field, FUSE_STEPS);

    expect([0, 1, 2].map((row) => hitsInRow(field, row, 3))).toEqual([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
  });

  it("hits each brick around it once, and says it went off", () => {
    const field = fieldFrom(["3o", "*#", ...KEEPER]);
    hitAt(field, 0, 1);

    stepTimes(field, FUSE_STEPS);

    expect({
      rows: [hitsInRow(field, 0, 2), hitsInRow(field, 1, 2)],
      events: eventsOf(field),
    }).toEqual({
      rows: [
        [2, null],
        [null, 0],
      ],
      events: ["broken", "blast", "hit", "broken", "hit"],
    });
  });

  // A chain set off at one end, its far brick in the other.
  it.each([
    ["rightward", "**o", 0, 2],
    ["leftward", "o**", 2, 0],
  ])("sets off a blast beside it a beat later, %s", (_, row, first, far) => {
    const field = fieldFrom([row, ...KEEPER]);
    hitAt(field, first, 0);
    stepTimes(field, 2 * FUSE_STEPS - 1);
    const before = brickAt(field, far, 0).broken;

    stepTimes(field, 1);

    expect([before, brickAt(field, far, 0).broken]).toEqual([false, true]);
  });

  it("clears the level when it breaks the last brick the level needs", () => {
    const field = fieldFrom(["o*o"]);
    hitAt(field, 1, 0);

    stepTimes(field, FUSE_STEPS);

    expect({
      state: field.state,
      needed: field.needed,
      events: eventsOf(field),
    }).toEqual({
      state: "cleared",
      needed: 0,
      events: ["broken", "blast", "broken", "broken", "cleared"],
    });
  });

  it("hits nothing more once it has cleared the level", () => {
    const field = fieldFrom(["o*+"]);
    hitAt(field, 1, 0);

    stepTimes(field, FUSE_STEPS);

    expect({
      events: eventsOf(field),
      regrow: brickAt(field, 2, 0).broken,
    }).toEqual({
      events: ["broken", "blast", "broken", "cleared"],
      regrow: false,
    });
  });

  it("goes out, lit with another that clears the level as it goes off", () => {
    const field = fieldFrom(["*o..*+"]);
    hitAt(field, 0, 0);
    hitAt(field, 4, 0);

    stepTimes(field, FUSE_STEPS);

    expect(eventsOf(field)).toEqual([
      "broken",
      "broken",
      "blast",
      "broken",
      "cleared",
    ]);
  });

  it("goes out, still lit, as the level clears", () => {
    const field = fieldFrom(["#*+"]);
    hitAt(field, 1, 0);

    stepTimes(field, FUSE_STEPS);

    expect({
      events: eventsOf(field),
      regrow: brickAt(field, 2, 0).broken,
    }).toEqual({ events: ["broken", "cleared"], regrow: false });
  });

  it("clears the level still, once the last ball is lost", () => {
    const field = fieldFrom(["o*o"]);
    hitAt(field, 1, 0);
    throwBall(field, 5, 29.5, 180);

    stepTimes(field, FUSE_STEPS);

    expect({ state: field.state, events: eventsOf(field) }).toEqual({
      state: "cleared",
      events: ["broken", "lost", "blast", "broken", "broken", "cleared"],
    });
  });

  it("neither speeds the balls up nor starts their bounces again", () => {
    const field = fieldFrom(["ooo", "o*o", "ooo", ...KEEPER]);
    const ball = throwBall(field, 20, 25, 0);
    ball.bounces = 5;
    hitAt(field, 1, 1);

    stepTimes(field, FUSE_STEPS);

    expect({ climbed: field.climbed, bounces: ball.bounces }).toEqual({
      climbed: 0,
      bounces: 5,
    });
  });
});

describe("a brick that regrows", () => {
  it("stays broken a while", () => {
    const field = fieldFrom(["+", ...KEEPER]);
    hitAt(field, 0, 0);

    stepTimes(field, REGROW_STEPS - 1);

    expect(brickAt(field, 0, 0).broken).toBe(true);
  });

  it("then grows back whole, and says so", () => {
    const field = fieldFrom(["+", ...KEEPER]);
    hitAt(field, 0, 0);

    stepTimes(field, REGROW_STEPS);

    expect({
      brick: brickAt(field, 0, 0),
      events: eventsOf(field),
    }).toMatchObject({
      brick: { broken: false, hits: 1 },
      events: ["broken", "regrown"],
    });
  });

  it("waits while a ball is in its place", () => {
    // The brick lies from 0 to 2 across and 2 to 3 down.
    const field = fieldFrom(["+", ...KEEPER]);
    hitAt(field, 0, 0);
    stepTimes(field, REGROW_STEPS - 2);
    throwBall(field, 1, 2.5, 180);

    stepTimes(field, 4);

    expect(brickAt(field, 0, 0).broken).toBe(true);
  });

  it("grows back once the ball has left its place", () => {
    const field = fieldFrom(["+", ...KEEPER]);
    hitAt(field, 0, 0);
    stepTimes(field, REGROW_STEPS - 2);
    throwBall(field, 1, 2.5, 180);

    stepTimes(field, 30);

    expect(brickAt(field, 0, 0).broken).toBe(false);
  });
});

describe("a plated brick", () => {
  it("takes a hit from a blast below it", () => {
    const field = fieldFrom(["u", "*", ...KEEPER]);
    hitAt(field, 0, 1);

    stepTimes(field, FUSE_STEPS);

    expect(brickAt(field, 0, 0).broken).toBe(true);
  });
});

describe("a cage", () => {
  /** Returns a field in play from rows of bricks, its ball far below them. */
  function inPlay(rows: readonly string[], seed = 1): Field {
    const field = fieldFrom([...rows, ...KEEPER], { seed });
    throwBall(field, 20, 25, 0);
    return field;
  }

  /** Returns the heading of the friend a cage frees on a field in play from a seed. */
  function freedHeading(seed: number): number {
    const field = inPlay(["c"], seed);
    hitAt(field, 0, 0, 2);
    return headingOf(ballOf(field, 1));
  }

  it("holds at its first hit, freeing nobody", () => {
    const field = inPlay(["c"]);

    hitAt(field, 0, 0);

    expect({
      hits: brickAt(field, 0, 0).hits,
      live: field.balls.filter((ball) => ball.live).length,
      events: eventsOf(field),
    }).toEqual({ hits: 1, live: 1, events: ["hit"] });
  });

  it("frees a friend at its middle as it breaks, and says so", () => {
    const field = inPlay(["...", "..c"]);

    hitAt(field, 2, 1, 2);

    expect({
      friend: ballOf(field, 1),
      events: eventsOf(field),
    }).toMatchObject({
      friend: {
        live: true,
        held: false,
        x: cellMiddleX(cellIndex(2, 1)),
        y: cellMiddleY(cellIndex(2, 1)),
        ink: 0,
      },
      events: ["hit", "broken", "freed"],
    });
  });

  it(`sends its friend up within ${String(FRIEND_SPREAD)}° of straight up, either way, by the field's draw`, () => {
    const headings = [1, 2, 3, 4, 5, 6, 7, 8].map(freedHeading);

    expect({
      within: headings.every((heading) => Math.abs(heading) <= FRIEND_SPREAD),
      left: headings.some((heading) => heading < 0),
      right: headings.some((heading) => heading > 0),
    }).toEqual({ within: true, left: true, right: true });
  });

  it("draws the friend's heading as the field's next draw", () => {
    const field = inPlay(["c"]);
    hitAt(field, 0, 0);
    const draws = field.draws;

    hitAt(field, 0, 0);

    expect(field.draws).toBe(draws + 1);
  });

  it("dresses each friend in the next ink, the first again after the last", () => {
    const field = inPlay(["cc"]);
    field.friendsFreed = FRIEND_INKS - 1;

    hitAt(field, 0, 0, 2);
    hitAt(field, 1, 0, 2);

    expect([ballOf(field, 1).ink, ballOf(field, 2).ink]).toEqual([
      FRIEND_INKS - 1,
      0,
    ]);
  });

  it("breaks, freeing nobody and drawing nothing, with every ball the field holds in play", () => {
    const field = inPlay(["c"]);
    for (let i = 1; i < MAX_BALLS; i++) throwBall(field, 20, 25, 0, i);

    hitAt(field, 0, 0, 2);

    expect({
      broken: brickAt(field, 0, 0).broken,
      draws: field.draws,
      friendsFreed: field.friendsFreed,
      events: eventsOf(field),
    }).toEqual({
      broken: true,
      draws: 0,
      friendsFreed: 0,
      events: ["hit", "broken"],
    });
  });

  it("breaks, freeing nobody and drawing nothing, while the level isn't in play", () => {
    const field = fieldFrom(["c", ...KEEPER]);

    hitAt(field, 0, 0, 2);

    expect({
      live: field.balls.filter((ball) => ball.live).length,
      draws: field.draws,
      friendsFreed: field.friendsFreed,
      events: eventsOf(field),
    }).toEqual({
      live: 1,
      draws: 0,
      friendsFreed: 0,
      events: ["hit", "broken"],
    });
  });

  it("frees nobody as it clears the level", () => {
    const field = fieldFrom(["c"]);
    throwBall(field, 20, 25, 0);

    hitAt(field, 0, 0, 2);

    expect({
      live: field.balls.filter((ball) => ball.live).length,
      events: eventsOf(field),
    }).toEqual({ live: 1, events: ["hit", "broken", "cleared"] });
  });

  it("leaves its friend in play once the player's ball is lost, at no life's cost", () => {
    const field = inPlay(["c"]);
    hitAt(field, 0, 0, 2);
    throwBall(field, 5, 29.5, 180);

    stepTimes(field, 10);

    expect({
      state: field.state,
      livesLost: field.livesLost,
      own: ballOf(field).live,
      friend: ballOf(field, 1).live,
    }).toEqual({ state: "playing", livesLost: 0, own: false, friend: true });
  });

  it("leaves the player's own ball in its own ink", () => {
    const field = inPlay(["c"]);

    hitAt(field, 0, 0, 2);

    expect(ballOf(field).ink).toBe(OWN_INK);
  });
});

describe("keys and gates", () => {
  it("count the keys a level lays", () => {
    expect(fieldFrom(["kk=k", ...KEEPER]).keysLeft).toBe(3);
  });

  it("stand the gates as steel while a key is left", () => {
    const field = fieldFrom(["k=k", ...KEEPER]);

    hitAt(field, 0, 0);
    hitAt(field, 1, 0, 5);

    expect({
      gate: brickAt(field, 1, 0).broken,
      keysLeft: field.keysLeft,
      needed: field.needed,
      events: eventsOf(field),
    }).toEqual({
      gate: false,
      keysLeft: 1,
      needed: 2,
      events: ["broken", "hit", "hit", "hit", "hit", "hit"],
    });
  });

  it("open every gate as the last key breaks, and say so where it was", () => {
    const field = fieldFrom(["k=..", "..=k", ...KEEPER]);
    hitAt(field, 0, 0);

    hitAt(field, 3, 1);

    expect({
      gates: [brickAt(field, 1, 0).broken, brickAt(field, 2, 1).broken],
      keysLeft: field.keysLeft,
      events: eventsOf(field),
      opened: lastEvent(field),
    }).toMatchObject({
      gates: [true, true],
      keysLeft: 0,
      events: ["broken", "broken", "opened"],
      opened: {
        x: cellMiddleX(cellIndex(3, 1)),
        y: cellMiddleY(cellIndex(3, 1)),
        cell: -1,
      },
    });
  });

  it("open the gates unsaid as the last key clears the level", () => {
    const field = fieldFrom(["k="]);

    hitAt(field, 0, 0);

    expect({
      gate: brickAt(field, 1, 0).broken,
      state: field.state,
      events: eventsOf(field),
    }).toEqual({ gate: true, state: "cleared", events: ["broken", "cleared"] });
  });
});

describe("neededLeft", () => {
  it("counts the bricks a level needs that are not yet broken", () => {
    const field = fieldFrom(["o2#+~*"]);
    hitAt(field, 0, 0);

    expect(neededLeft(field.bricks)).toBe(3);
  });
});
