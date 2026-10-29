import {
  eventsOf,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import { type Brick, hitBrick } from "./bricks";
import { BRICK_KINDS } from "./catalog/bricks";
import type { Field } from "./field";
import { cellIndex } from "./grid";
import { stepsIn } from "./stepper";

/** The steps a blast waits before it goes off. */
const FUSE_STEPS = stepsIn(BRICK_KINDS.blast.traits[0].delayMs);

/** The steps a regrowing brick waits before it grows back. */
const REGROW_STEPS = stepsIn(BRICK_KINDS.regrow.traits[0].afterMs);

/** A brick far down the field, which keeps a level from clearing. */
const KEEPER = ["", "", "", "", "", "", "", "", "", "o"];

/** Returns the brick in a cell of the field. */
function brickAt(field: Field, column: number, row: number): Brick {
  const brick = field.bricks[cellIndex(column, row)];
  if (!brick) throw new Error(`No brick at ${String(column)}, ${String(row)}.`);
  return brick;
}

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

describe("a hard brick", () => {
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
