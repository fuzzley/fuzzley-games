import {
  KEEPER,
  ballOf,
  brickAt,
  eventsOf,
  fieldFrom,
  headingOf,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import { hitBrick } from "../bricks/bricks";
import { catchCapsule } from "../bricks/capsules";
import { CAPSULES } from "../catalog/capsules";
import { stepsIn } from "../stepper";
import {
  CATCH_HOLD_MS,
  FLATTEST,
  SEEKER_LEND,
  SEEKER_TURN,
  STEP_S,
} from "../tuning";
import { type Field, launch } from "./field";

/** How far a seeking ball turns in a step, in degrees. */
const STEP_TURN = SEEKER_TURN * STEP_S;

/** A brick at the top left, far up and to the left of where the specs throw their balls. */
const LEFT = ["o"];

/** A brick at the left of the grid's last row. */
const LOWEST = [...Array<string>(15).fill(""), "o"];

/** Returns a field of the bricks drawn, a ball rising straight up its middle that seeks. */
function seekingUp(rows: readonly string[]): Field {
  const field = fieldFrom(rows);
  throwBall(field, 13, 20, 0).seeks = true;
  return field;
}

/** Returns a field of bricks needing as many as the seeker is lent at, a ball about to land on the paddle. */
function landing(
  dryBounces: number,
  rows: readonly string[] = ["o".repeat(SEEKER_LEND.needed)],
): Field {
  const field = fieldFrom(rows);
  field.dryBounces = dryBounces;
  throwBall(field, 13, 26, 180);
  return field;
}

describe("a seeking ball", () => {
  it(`turns toward the brick the level needs, by ${String(SEEKER_TURN)}° a second at most`, () => {
    const field = seekingUp(LEFT);

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(-40 * STEP_TURN, 9);
  });

  it("turns toward the nearest brick the level needs", () => {
    const field = seekingUp(["o...........", "", "", "", "", "............o"]);

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(40 * STEP_TURN, 9);
  });

  it("turns toward the nearest brick the level needs, though a farther one sits lower", () => {
    const field = seekingUp(["", "", "..........o", "", "o"]);

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(40 * STEP_TURN, 9);
  });

  it("turns until it heads at the brick, then goes on at it", () => {
    const field = fieldFrom(["......o"]);
    throwBall(field, 18, 20, -10).seeks = true;

    stepTimes(field, 40);

    const ball = ballOf(field);
    expect(ball.dx / -ball.dy).toBeCloseTo((13 - ball.x) / (ball.y - 2.5), 9);
  });

  it("leaves a falling ball alone", () => {
    const field = fieldFrom(LEFT);
    throwBall(field, 13, 10, 170).seeks = true;

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(170, 9);
  });

  it("turns no flatter than the flattest a ball travels, so it still rises", () => {
    const field = fieldFrom(LOWEST);
    throwBall(field, 25, 23, -60).seeks = true;

    stepTimes(field, 60);

    expect(headingOf(ballOf(field))).toBeCloseTo(-(90 - FLATTEST), 9);
  });

  it.each([
    ["behind steel", ["o", "#############"]],
    ["a plated brick, whose underside it would meet", ["u"]],
    ["a brick the level doesn't need", ["+"]],
    [
      "behind steel and bumpers in turn, which leave a ball no room to pass",
      ["o", "#O#O#O#O#O#O#"],
    ],
  ])("turns toward none it can't break from below: %s", (_, rows) => {
    const field = seekingUp(rows);

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(0, 9);
  });

  it("turns toward no brick below it, which it can't rise to", () => {
    const field = fieldFrom(LOWEST);
    throwBall(field, 13, 10, 0).seeks = true;

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(0, 9);
  });

  it("turns toward one it can see over one behind steel nearer it", () => {
    const field = seekingUp([
      "o",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "........#o#",
      "........###",
    ]);

    stepTimes(field, 40);

    expect(headingOf(ballOf(field))).toBeCloseTo(-40 * STEP_TURN, 9);
  });

  it("goes on seeking as it breaks a brick the level doesn't need", () => {
    const field = fieldFrom(["......+", ...KEEPER]);
    const ball = throwBall(field, 13, 6, 0);
    ball.seeks = true;

    stepTimes(field, 30);

    expect({ broken: brickAt(field, 6, 0).broken, seeks: ball.seeks }).toEqual({
      broken: true,
      seeks: true,
    });
  });

  it("stops seeking as it breaks a brick the level needs", () => {
    const field = fieldFrom(["......o", ...KEEPER]);
    const ball = throwBall(field, 13, 6, 0);
    ball.seeks = true;

    stepTimes(field, 30);

    expect({ broken: brickAt(field, 6, 0).broken, seeks: ball.seeks }).toEqual({
      broken: true,
      seeks: false,
    });
  });

  it("stops seeking as it is lost", () => {
    const field = fieldFrom(LEFT);
    const ball = throwBall(field, 5, 29.5, 180);
    ball.seeks = true;
    throwBall(field, 13, 15, 0, 1);

    stepTimes(field, 10);

    expect({ live: ball.live, seeks: ball.seeks }).toEqual({
      live: false,
      seeks: false,
    });
  });

  it("splits into balls that don't seek, whatever their records last held", () => {
    const field = fieldFrom(LEFT);
    for (const ball of field.balls) ball.seeks = true;
    throwBall(field, 13, 15, 0);

    catchCapsule(field, "multi", 0, 0);

    expect(field.balls.map((ball) => ball.seeks).slice(0, 3)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("the Seeker", () => {
  it("turns every ball in flight toward the brick the level needs", () => {
    const field = fieldFrom(LEFT);
    catchCapsule(field, "seeker", 0, 0);
    throwBall(field, 13, 20, 0);
    throwBall(field, 15, 20, 0, 1);

    stepTimes(field, 40);

    expect([headingOf(ballOf(field, 0)), headingOf(ballOf(field, 1))]).toEqual([
      expect.closeTo(-40 * STEP_TURN, 9),
      expect.closeTo(-40 * STEP_TURN, 9),
    ]);
  });

  it("is a group of its own, beside a fire ball", () => {
    const field = fieldFrom(LEFT);
    catchCapsule(field, "fire", 0, 0);

    catchCapsule(field, "seeker", 0, 0);

    expect({
      ball: field.ballKind,
      fire: field.effects.ball.capsule,
      seeking: field.seeking,
    }).toEqual({ ball: "fire", fire: "fire", seeking: true });
  });

  it("turns no ball once its time runs out", () => {
    const field = fieldFrom(LEFT);
    catchCapsule(field, "seeker", 0, 0);
    stepTimes(field, stepsIn(CAPSULES.seeker.effect.ms));
    throwBall(field, 13, 20, 0);

    stepTimes(field, 40);

    expect({ seeking: field.seeking, across: ballOf(field).dx }).toEqual({
      seeking: false,
      across: 0,
    });
  });
});

describe("the balls that leave the paddle", () => {
  it("count a serve", () => {
    const field = fieldFrom(LEFT);

    launch(field);

    expect(field.dryBounces).toBe(1);
  });

  it("count a bounce", () => {
    const field = landing(0);

    stepTimes(field, 10);

    expect(field.dryBounces).toBe(1);
  });

  it("count a caught ball as it is let go, not as it is caught", () => {
    const field = landing(0);
    catchCapsule(field, "catch", 0, 0);
    stepTimes(field, 10);
    const caught = field.dryBounces;

    launch(field);

    expect([caught, field.dryBounces]).toEqual([0, 1]);
  });

  it("count a caught ball that leaves by itself", () => {
    const field = landing(0);
    catchCapsule(field, "catch", 0, 0);

    stepTimes(field, stepsIn(CATCH_HOLD_MS) + 10);

    expect(field.dryBounces).toBe(1);
  });

  it("start again as a brick the level needs breaks", () => {
    const field = fieldFrom(["oo"]);
    field.dryBounces = 5;

    hitBrick(field, brickAt(field, 0, 0), 0, 0);

    expect(field.dryBounces).toBe(0);
  });

  it("go on as a brick the level doesn't need breaks", () => {
    const field = fieldFrom(["+", ...KEEPER]);
    field.dryBounces = 5;

    hitBrick(field, brickAt(field, 0, 0), 0, 0);

    expect(field.dryBounces).toBe(5);
  });
});

describe("the paddle", () => {
  it(`lends the seeker to the ball it meets, once ${String(SEEKER_LEND.bounces)} have left it since a needed brick broke, at ${String(SEEKER_LEND.needed)} needed or fewer`, () => {
    const field = landing(SEEKER_LEND.bounces);

    stepTimes(field, 10);

    expect({
      seeks: ballOf(field).seeks,
      events: eventsOf(field),
      dryBounces: field.dryBounces,
    }).toEqual({
      seeks: true,
      events: ["paddle", "seeking"],
      dryBounces: SEEKER_LEND.bounces + 1,
    });
  });

  it("lends it to no ball before enough have left it", () => {
    const field = landing(SEEKER_LEND.bounces - 1);

    stepTimes(field, 10);

    expect(ballOf(field).seeks).toBe(false);
  });

  it("lends it to no ball while the level needs more bricks", () => {
    const field = landing(SEEKER_LEND.bounces, [
      "o".repeat(SEEKER_LEND.needed + 1),
    ]);

    stepTimes(field, 10);

    expect(ballOf(field).seeks).toBe(false);
  });

  it("lends it only to the ball it meets", () => {
    const field = landing(SEEKER_LEND.bounces);
    throwBall(field, 5, 15, 0, 1);

    stepTimes(field, 10);

    expect([ballOf(field, 0).seeks, ballOf(field, 1).seeks]).toEqual([
      true,
      false,
    ]);
  });

  it("lends it to a ball it catches, which leaves seeking", () => {
    const field = landing(SEEKER_LEND.bounces);
    catchCapsule(field, "catch", 0, 0);
    stepTimes(field, 10);

    launch(field);

    expect({ seeks: ballOf(field).seeks, held: ballOf(field).held }).toEqual({
      seeks: true,
      held: false,
    });
  });

  it("says it lent the seeker once, not again to a ball that seeks", () => {
    const field = landing(SEEKER_LEND.bounces);
    ballOf(field).seeks = true;

    stepTimes(field, 10);

    expect(eventsOf(field)).toEqual(["paddle"]);
  });
});
