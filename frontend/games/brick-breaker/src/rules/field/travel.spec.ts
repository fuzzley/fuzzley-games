// A ball's travel is played through the field's steps, as a picture of
// the field reads best.

import {
  NO_STEER,
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
import { cellIndex, columnOf, rowOf } from "../grid";
import { ballSpeed } from "../speed";
import {
  BALL_RADIUS,
  FLATTEST,
  LULL_BOUNCES,
  LULL_TURN,
  MAX_CONTACTS,
  PADDLE_ANGLE,
  PADDLE_TOP,
  PADDLE_WIDTH,
  STEP_S,
} from "../tuning";
import { type Field, steerField, stepField } from "./field";

/** A brick in the top left corner, far from where the specs throw their balls. */
const FAR_BRICK = ["o"];

/**
 * Returns rows of a picture with one row of bricks, the sixth, from 7 to 8
 * down, beside the brick far away that keeps the level from clearing.
 */
function sixthRow(row: string): string[] {
  return ["o", "", "", "", "", row];
}

/** Returns where a ball thrown at the left wall heads after a lull's turn there, from a seed. */
function lullHeading(seed: number): number {
  const field = fieldFrom(FAR_BRICK, { seed });
  const ball = throwBall(field, 1, 15, -45);
  ball.bounces = LULL_BOUNCES;
  stepTimes(field, 10);
  return headingOf(ball);
}

/** Returns how far the field's first ball moved in its last step. */
function lastMove(field: Field): number {
  const ball = ballOf(field);
  return Math.hypot(ball.x - ball.lastX, ball.y - ball.lastY);
}

describe("the walls", () => {
  it.each([
    ["left", 1, 15, -45, 45],
    ["right", 25, 15, 45, -45],
    ["top", 13, 1, 30, 150],
    ["top left corner", 1, 1, -45, 135],
  ])("turn a ball off the %s as a mirror would", (_, x, y, heading, turned) => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, x, y, heading);

    stepTimes(field, 10);

    expect(headingOf(ball)).toBeCloseTo(turned);
  });

  it("send back the way it came a ball that meets two at once at a right angle", () => {
    // Heading 0.6 left for each 0.8 up, it reaches both walls at once, two
    // and a half steps on: never at a step's end, where rounding could have it
    // meet one wall in that step and the other in the next.
    const field = fieldFrom(FAR_BRICK);
    const heading = (-Math.atan2(0.6, 0.8) * 180) / Math.PI;
    const reach = 2.5 * ballSpeed("normal", 1, 0) * STEP_S;
    const ball = throwBall(
      field,
      BALL_RADIUS + 0.6 * reach,
      BALL_RADIUS + 0.8 * reach,
      heading,
    );

    stepTimes(field, 10);

    expect({
      way: [ball.dx, ball.dy].map((each) => Number(each.toFixed(3))),
      events: eventsOf(field),
    }).toEqual({ way: [0.6, 0.8], events: ["wall"] });
  });

  it("say a ball bounced off them", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 1, 1, -45);

    stepTimes(field, 10);

    expect(eventsOf(field)).toEqual(["wall"]);
  });

  it("never let a ball travel flatter than the flattest", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 2, 15, -80);

    stepTimes(field, 20);

    expect(headingOf(ball)).toBeCloseTo(90 - FLATTEST);
  });
});

describe("the paddle", () => {
  it.each([
    [0, 0],
    [1, PADDLE_ANGLE / 2],
    [-1, -PADDLE_ANGLE / 2],
    [2, PADDLE_ANGLE],
    [-2, -PADDLE_ANGLE],
    [2.2, PADDLE_ANGLE],
  ])(
    "sends a ball that lands %f from its middle off at %f°",
    (offset, angle) => {
      const field = fieldFrom(FAR_BRICK);
      const ball = throwBall(field, 13 + offset, 26, 180);

      stepTimes(field, 10);

      expect(headingOf(ball)).toBeCloseTo(angle);
    },
  );

  it("sends a ball that meets its end back up and outward", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 9, 27.9, 90);

    stepTimes(field, 15);

    expect(headingOf(ball)).toBeCloseTo(-PADDLE_ANGLE);
  });

  it("says a ball bounced off it", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 13, 26, 180);

    stepTimes(field, 10);

    expect(eventsOf(field)).toEqual(["paddle"]);
  });

  it("lets a ball rising from under it pass up through it", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 13, 29.5, 0);

    stepTimes(field, 20);

    expect({ above: ball.y < PADDLE_TOP, rising: ball.dy < 0 }).toEqual({
      above: true,
      rising: true,
    });
  });

  it("leaves a ball whose middle has fallen below it", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 15.5, 28.4, 180);
    steerField(field, { ...NO_STEER, to: 14 });

    stepField(field);

    expect(ball.y).toBeGreaterThan(28.4);
  });

  it.each([
    ["narrower than a ball", 0.7],
    ["a little wider than a ball, which it would shuttle in", 0.8],
  ])("leaves no gap beside a wall %s", (_, gap) => {
    const field = fieldFrom(FAR_BRICK);
    steerField(field, { ...NO_STEER, to: PADDLE_WIDTH / 2 + gap });
    stepTimes(field, 40);
    const ball = throwBall(field, BALL_RADIUS, 26, 180);

    stepTimes(field, 30);

    expect(ball.y).toBeLessThan(26);
  });

  it("lifts a falling ball it is moved into onto its top, and sends it off", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 15.5, 27.6, 180);
    steerField(field, { ...NO_STEER, to: 14 });

    stepField(field);

    expect({
      heading: Math.round(headingOf(ball)),
      above: ball.y < PADDLE_TOP,
    }).toEqual({ heading: 45, above: true });
  });
});

describe("the bricks", () => {
  it("break at a hit, and turn the ball", () => {
    const field = fieldFrom(sixthRow("......o"));
    const ball = throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: field.bricks[cellIndex(6, 5)]?.broken,
      heading: Math.abs(headingOf(ball)),
      events: eventsOf(field),
    }).toEqual({ broken: true, heading: 180, events: ["broken"] });
  });

  it("speed the ball up a share of its base for each hit", () => {
    const field = fieldFrom(sixthRow("......o"));
    throwBall(field, 13, 10, 0);
    stepTimes(field, 15);

    stepField(field);

    expect(lastMove(field)).toBeCloseTo(ballSpeed("normal", 1, 1) * STEP_S);
  });

  it("take as many hits as a tough brick's", () => {
    const field = fieldFrom(sixthRow("......2"));
    throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      hits: field.bricks[cellIndex(6, 5)]?.hits,
      events: eventsOf(field),
    }).toEqual({ hits: 1, events: ["hit"] });
  });

  it("never break when steel, nor speed the ball up", () => {
    const field = fieldFrom(sixthRow("......#"));
    throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: field.bricks[cellIndex(6, 5)]?.broken,
      climbed: field.climbed,
      events: eventsOf(field),
    }).toEqual({ broken: false, climbed: 0, events: ["hit"] });
  });

  it("take one hit from a ball that meets a face's end and its corner at once", () => {
    const field = fieldFrom(sixthRow("......2"));
    throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect(field.bricks[cellIndex(6, 5)]?.hits).toBe(1);
  });

  it("break without counting toward the level when it doesn't need them", () => {
    const field = fieldFrom(sixthRow("......+"));
    throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: field.bricks[cellIndex(6, 5)]?.broken,
      needed: field.needed,
      state: field.state,
    }).toEqual({ broken: true, needed: 1, state: "playing" });
  });

  it("turn a ball once when it meets the seam between two", () => {
    const field = fieldFrom(sixthRow(".....##"));
    const ball = throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect({
      bounces: ball.bounces,
      heading: Math.abs(Math.round(headingOf(ball))),
    }).toEqual({ bounces: 1, heading: 180 });
  });

  it("stop a ball too fast to stop between steps", () => {
    // A step of 5.3 at this pace, more than five bricks are tall.
    const field = fieldFrom(sixthRow("......o"), { pace: 40 });
    throwBall(field, 13, 10, 0);

    stepField(field);

    expect(field.bricks[cellIndex(6, 5)]?.broken).toBe(true);
  });

  it(`turn a ball at most ${String(MAX_CONTACTS)} times a step, and hold it`, () => {
    // A cell shut in by steel, from 12 to 14 across and 7 to 8 down.
    const field = fieldFrom(
      ["o", "", "", "", ".....###", ".....#.#", ".....###"],
      {
        pace: 40,
      },
    );
    const ball = throwBall(field, 13, 7.5, 30);

    stepField(field);

    expect({
      bounces: ball.bounces,
      inside: ball.x > 12 && ball.x < 14 && ball.y > 7 && ball.y < 8,
    }).toEqual({ bounces: MAX_CONTACTS, inside: true });
  });

  it("both break when a ball meets the seam between them, which turns it once", () => {
    const field = fieldFrom(sixthRow(".....oo"));
    const ball = throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: [cellIndex(5, 5), cellIndex(6, 5)].map(
        (cell) => field.bricks[cell]?.broken,
      ),
      heading: Math.abs(headingOf(ball)),
    }).toEqual({ broken: [true, true], heading: 180 });
  });

  it("send a ball turned flat off a corner away from it, never back into it", () => {
    // A steel brick from 10 to 12 across and 5 to 6 down; the ball glances
    // off its top right corner, going down and right at the flattest.
    const field = fieldFrom(["o", "", "", ".....#"]);
    const ball = throwBall(field, 11.631, 4.483, 90 + FLATTEST);

    stepTimes(field, 20);

    expect(headingOf(ball)).toBeCloseTo(90 - FLATTEST);
  });

  it("clear the level once every one it needs is broken, steel left standing", () => {
    const field = fieldFrom(["......o#"]);
    throwBall(field, 13, 6, 0);

    stepTimes(field, 30);

    expect({ state: field.state, events: eventsOf(field) }).toEqual({
      state: "cleared",
      events: ["broken", "cleared"],
    });
  });
});

describe("a plated brick", () => {
  it("turns a ball rising into its underside, takes no hit, and says so", () => {
    const field = fieldFrom(sixthRow("......u"));
    const ball = throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      hits: brickAt(field, 6, 5).hits,
      heading: Math.abs(headingOf(ball)),
      climbed: field.climbed,
      events: eventsOf(field),
    }).toEqual({ hits: 1, heading: 180, climbed: 0, events: ["plated"] });
  });

  it("turns a ball rising into its bottom corner, taking no hit", () => {
    // The brick lies from 12 to 14 across and 7 to 8 down; the ball rises
    // straight at its bottom left corner.
    const field = fieldFrom(sixthRow("......u"));
    const ball = throwBall(field, 10, 10, 45);

    stepTimes(field, 20);

    expect({
      hits: brickAt(field, 6, 5).hits,
      heading: Math.round(headingOf(ball)),
      events: eventsOf(field),
    }).toEqual({ hits: 1, heading: -135, events: ["plated"] });
  });

  it("turns a ball that meets its bottom corner and its side's end at once, taking no hit", () => {
    // Heading straight across along the line of its foot, at 8 down, the
    // ball touches the corner and the end of the left face together; a
    // heading of 90° rounds to a hair upward, so it rises.
    const field = fieldFrom(sixthRow("......u"));
    throwBall(field, 9, 8, 90);

    stepTimes(field, 20);

    expect({
      hits: brickAt(field, 6, 5).hits,
      events: eventsOf(field),
    }).toEqual({ hits: 1, events: ["plated"] });
  });

  it("says so once as a ball rises into its bottom face's end and corner at once", () => {
    // The ball's middle rises straight up the line of the brick's left end,
    // at 12 across.
    const field = fieldFrom(sixthRow("......u"));
    throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect(eventsOf(field)).toEqual(["plated"]);
  });

  it("takes a hit at its bottom corner from a falling ball", () => {
    // Falling a little as it goes right, the ball passes under the left
    // face and meets the bottom left corner, at 12, 8.
    const field = fieldFrom(sixthRow("......u"));
    throwBall(field, 10, 7.95, 95);

    stepTimes(field, 20);

    expect({
      broken: brickAt(field, 6, 5).broken,
      events: eventsOf(field),
    }).toEqual({ broken: true, events: ["broken"] });
  });

  it("takes the reach of a blast ball's hit on a brick beside it", () => {
    // The ball rises into the seam between the two, meeting the plate's
    // underside and the plain brick's at once.
    const field = fieldFrom(sixthRow(".....ou"));
    throwBall(field, 12, 10, 0);
    catchCapsule(field, "blast", 0, 0);

    stepTimes(field, 15);

    expect({
      broken: [brickAt(field, 5, 5).broken, brickAt(field, 6, 5).broken],
      events: eventsOf(field),
    }).toEqual({
      broken: [true, true],
      events: ["caught", "plated", "broken", "broken"],
    });
  });

  it.each([
    ["above", 13, 4, 180],
    ["the left", 9, 7.5, 90],
    ["the right", 17, 7.5, -90],
  ])("takes a hit from %s", (_, x, y, heading) => {
    const field = fieldFrom(sixthRow("......u"));
    throwBall(field, x, y, heading);

    stepTimes(field, 20);

    expect({
      broken: brickAt(field, 6, 5).broken,
      events: eventsOf(field),
    }).toEqual({ broken: true, events: ["broken"] });
  });

  it("takes a hit of two from above, and holds", () => {
    const field = fieldFrom(sixthRow("......U"));
    throwBall(field, 13, 4, 180);

    stepTimes(field, 20);

    expect(brickAt(field, 6, 5).hits).toBe(1);
  });

  it("turns a fire ball rising into its underside, taking no hit", () => {
    const field = fieldFrom(sixthRow("......u"));
    const ball = throwBall(field, 13, 10, 0);
    catchCapsule(field, "fire", 0, 0);

    stepTimes(field, 15);

    expect({
      broken: brickAt(field, 6, 5).broken,
      falling: ball.dy > 0,
    }).toEqual({ broken: false, falling: true });
  });

  it("breaks under a fire ball from a side, which passes through", () => {
    const field = fieldFrom(sixthRow("......u"));
    const ball = throwBall(field, 9, 7.5, 90);
    catchCapsule(field, "fire", 0, 0);

    stepTimes(field, 20);

    expect({
      broken: brickAt(field, 6, 5).broken,
      onward: ball.dx > 0,
    }).toEqual({ broken: true, onward: true });
  });

  it("sets off no blast around it as a blast ball turns off its underside", () => {
    const field = fieldFrom(["o", "", "", "", ".....ooo", ".....ouo"]);
    throwBall(field, 13, 12, 0);
    catchCapsule(field, "blast", 0, 0);

    stepTimes(field, 35);

    expect({
      broken: field.bricks.filter((brick) => brick?.broken).length,
      events: eventsOf(field),
    }).toEqual({ broken: 0, events: ["caught", "plated"] });
  });

  it("takes no hit as a ball rises into the seam beside a brick that does", () => {
    const field = fieldFrom(sixthRow(".....ou"));
    const ball = throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: [brickAt(field, 5, 5).broken, brickAt(field, 6, 5).broken],
      heading: Math.abs(headingOf(ball)),
      events: eventsOf(field),
    }).toEqual({
      broken: [true, false],
      heading: 180,
      events: ["plated", "broken"],
    });
  });
});

describe("a gate", () => {
  it("turns a ball as steel while a key is left", () => {
    const field = fieldFrom(["ok", "", "", "", "", "......="]);
    const ball = throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: brickAt(field, 6, 5).broken,
      heading: Math.abs(headingOf(ball)),
      events: eventsOf(field),
    }).toEqual({ broken: false, heading: 180, events: ["hit"] });
  });

  it("lets a ball by once the last key has broken", () => {
    const field = fieldFrom(["ok", "", "", "", "", "......="]);
    hitBrick(field, brickAt(field, 1, 0), 0, 0);
    const ball = throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({ above: ball.y < 7, rising: ball.dy < 0 }).toEqual({
      above: true,
      rising: true,
    });
  });
});

describe("a lull", () => {
  it(`turns a ball a few degrees at the wall after ${String(LULL_BOUNCES)} bounces`, () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 1, 15, -45);
    ball.bounces = LULL_BOUNCES;

    stepTimes(field, 10);

    const turn = Math.abs(headingOf(ball) - 45);
    expect(turn).toBeGreaterThanOrEqual(LULL_TURN.least);
    expect(turn).toBeLessThanOrEqual(LULL_TURN.most);
  });

  it("starts the count again once it has turned the ball", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 1, 15, -45);
    ball.bounces = LULL_BOUNCES;

    stepTimes(field, 10);

    expect(ball.bounces).toBe(0);
  });

  it("leaves a ball with fewer bounces as a mirror would", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 1, 15, -45);
    ball.bounces = LULL_BOUNCES - 1;

    stepTimes(field, 10);

    expect(headingOf(ball)).toBeCloseTo(45);
  });

  it("is the same turn from the same seed", () => {
    expect(lullHeading(1)).toBe(lullHeading(1));
  });

  it("is another turn from another seed", () => {
    // The first draw from seed 1 turns the ball one way, and from 3 the other.
    expect(lullHeading(1)).not.toBeCloseTo(lullHeading(3));
  });

  it("is turned out of the wall again if it turns the ball back into it", () => {
    // Seed 3's first draw turns the ball about 5.5° back toward the wall it
    // left 2° from straight up.
    const field = fieldFrom(FAR_BRICK, { seed: 3 });
    const ball = throwBall(field, 0.5, 15, -2);
    ball.bounces = LULL_BOUNCES;

    stepTimes(field, 40);

    expect({ events: eventsOf(field), away: ball.dx > 0 }).toEqual({
      events: ["wall"],
      away: true,
    });
  });

  it("is counted again from the paddle", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 13, 26, 180);
    ball.bounces = LULL_BOUNCES + 5;

    stepTimes(field, 10);

    expect(ball.bounces).toBe(0);
  });

  it("is counted again from a brick the level needs, broken", () => {
    const field = fieldFrom(sixthRow("......o"));
    const ball = throwBall(field, 13, 10, 0);
    ball.bounces = LULL_BOUNCES + 5;

    stepTimes(field, 15);

    expect(ball.bounces).toBe(0);
  });
});

describe("a fire ball", () => {
  it("breaks every brick it touches that can break, and passes through", () => {
    const field = fieldFrom(["o", "", "", "", "......4", "......o"]);
    const ball = throwBall(field, 13, 10, 0);
    catchCapsule(field, "fire", 0, 0);

    stepTimes(field, 40);

    expect({
      broken: [cellIndex(6, 4), cellIndex(6, 5)].map(
        (cell) => field.bricks[cell]?.broken,
      ),
      rising: ball.dy < 0,
    }).toEqual({ broken: [true, true], rising: true });
  });

  it("is turned by steel beside a wall", () => {
    const field = fieldFrom(sixthRow("#"));
    const ball = throwBall(field, 1, 10, 0);
    catchCapsule(field, "fire", 0, 0);

    stepTimes(field, 15);

    expect(ball.dy).toBeGreaterThan(0);
  });

  it("is turned by steel", () => {
    const field = fieldFrom(sixthRow("......#"));
    const ball = throwBall(field, 13, 10, 0);
    catchCapsule(field, "fire", 0, 0);

    stepTimes(field, 15);

    expect(ball.dy).toBeGreaterThan(0);
  });
});

describe("a blast ball", () => {
  /** Returns the column and row of each broken brick, row by row. */
  function brokenOf(field: Field): [number, number][] {
    return field.bricks.flatMap((brick) =>
      brick?.broken ? [[columnOf(brick.cell), rowOf(brick.cell)]] : [],
    );
  }

  it("hits the eight bricks around each brick it strikes", () => {
    // The ball rises through the gap to strike the middle brick of the three
    // rows, from 7 to 8 down.
    const rows = [".....ooo", ".....ooo", ".....o.o"];
    const field = fieldFrom(["o", "", "", "", ...rows]);
    throwBall(field, 13, 12, 0);
    catchCapsule(field, "blast", 0, 0);

    stepTimes(field, 35);

    expect(brokenOf(field)).toEqual([
      [5, 4],
      [6, 4],
      [7, 4],
      [5, 5],
      [6, 5],
      [7, 5],
      [5, 6],
      [7, 6],
    ]);
  });

  it.each([".....2o", ".....o2"])(
    "strikes both of two bricks it meets at once, as %s, and reaches around each",
    (row) => {
      // The ball rises up the seam between the two, 8 to 9 down.
      const field = fieldFrom(["o", "", "", "", "", "", row]);
      throwBall(field, 12, 12, 0);
      catchCapsule(field, "blast", 0, 0);

      stepTimes(field, 35);

      expect({
        broken: brokenOf(field),
        climbed: field.climbed,
        bounces: field.balls[0]?.bounces,
      }).toEqual({
        broken: [
          [5, 6],
          [6, 6],
        ],
        climbed: 2,
        bounces: 0,
      });
    },
  );
});
