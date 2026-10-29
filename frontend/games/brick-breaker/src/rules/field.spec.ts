import {
  NO_STEER,
  ballOf,
  eventsOf,
  fieldFrom,
  headingOf,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import { type Field, launch, serve, steerField, stepField } from "./field";
import { catchCapsule } from "./capsules";
import { cellIndex } from "./grid";
import { ballSpeed } from "./speed";
import {
  BALL_RADIUS,
  FLATTEST,
  LULL_BOUNCES,
  LULL_TURN,
  PADDLE_ANGLE,
  PADDLE_TOP,
  SERVE_ANGLE,
  STEP_S,
} from "./tuning";

/** A brick in the top left corner, far from where the specs throw their balls. */
const FAR_BRICK = ["o"];

/**
 * Returns rows of a picture with one row of bricks, the sixth, from 7 to 8
 * down, beside the brick far away that keeps the level from clearing.
 */
function sixthRow(row: string): string[] {
  return ["o", "", "", "", "", row];
}

/** Returns how far the field's first ball moved in its last step. */
function lastMove(field: Field): number {
  const ball = ballOf(field);
  return Math.hypot(ball.x - ball.lastX, ball.y - ball.lastY);
}

describe("a new field", () => {
  it("counts the bricks the level needs, but not steel", () => {
    const field = fieldFrom(["oo#", "2.#"]);

    expect(field.needed).toBe(3);
  });

  it("waits to serve its first ball, on the paddle's middle", () => {
    const field = fieldFrom(FAR_BRICK);

    expect({
      state: field.state,
      live: field.balls.filter((ball) => ball.live).length,
      ball: ballOf(field),
    }).toMatchObject({
      state: "serve",
      live: 1,
      ball: { held: true, x: 13, y: PADDLE_TOP - BALL_RADIUS },
    });
  });
});

describe("the serve", () => {
  it("keeps the ball on the paddle as the paddle moves", () => {
    const field = fieldFrom(FAR_BRICK);
    steerField(field, { ...NO_STEER, push: 1 });

    stepTimes(field, 10);

    expect(ballOf(field).x).toBe(field.paddle.x);
  });

  it("waits for the player, however long", () => {
    const field = fieldFrom(FAR_BRICK);

    stepTimes(field, 1000);

    expect({ state: field.state, y: ballOf(field).y }).toEqual({
      state: "serve",
      y: PADDLE_TOP - BALL_RADIUS,
    });
  });

  it("sends the ball off to the right when the paddle hasn't moved", () => {
    const field = fieldFrom(FAR_BRICK);

    launch(field);

    expect(headingOf(ballOf(field))).toBeCloseTo(SERVE_ANGLE);
  });

  it("sends the ball off toward the way the paddle last moved", () => {
    const field = fieldFrom(FAR_BRICK);
    steerField(field, { ...NO_STEER, to: 8 });
    stepTimes(field, 2);

    launch(field);

    expect(headingOf(ballOf(field))).toBeCloseTo(-SERVE_ANGLE);
  });

  it("launches nothing once the last ball is lost", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 5, 29.5, 180);
    stepTimes(field, 10);

    launch(field);

    expect(field.state).toBe("lost");
  });

  it("puts the level in play, and says so once", () => {
    const field = fieldFrom(FAR_BRICK);

    launch(field);
    launch(field);

    expect({ state: field.state, events: eventsOf(field) }).toEqual({
      state: "playing",
      events: ["launched"],
    });
  });

  it("moves the ball on once it is launched", () => {
    const field = fieldFrom(FAR_BRICK);
    launch(field);

    stepField(field);

    expect(lastMove(field)).toBeCloseTo(ballSpeed("normal", 1, 0) * STEP_S);
  });
});

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
      broken: field.bricks[5 * 13 + 6]?.broken,
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
      hits: field.bricks[5 * 13 + 6]?.hits,
      events: eventsOf(field),
    }).toEqual({ hits: 1, events: ["hit"] });
  });

  it("never break when steel, nor speed the ball up", () => {
    const field = fieldFrom(sixthRow("......#"));
    throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: field.bricks[5 * 13 + 6]?.broken,
      climbed: field.climbed,
      events: eventsOf(field),
    }).toEqual({ broken: false, climbed: 0, events: ["hit"] });
  });

  it("take one hit from a ball that meets a face's end and its corner at once", () => {
    const field = fieldFrom(sixthRow("......2"));
    throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect(field.bricks[5 * 13 + 6]?.hits).toBe(1);
  });

  it("break without counting toward the level when it doesn't need them", () => {
    const field = fieldFrom(sixthRow("......+"));
    throwBall(field, 13, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: field.bricks[5 * 13 + 6]?.broken,
      needed: field.needed,
      state: field.state,
    }).toEqual({ broken: true, needed: 1, state: "playing" });
  });

  it("both break when a ball meets the seam between them, which turns it once", () => {
    const field = fieldFrom(sixthRow(".....oo"));
    const ball = throwBall(field, 12, 10, 0);

    stepTimes(field, 15);

    expect({
      broken: [5 * 13 + 5, 5 * 13 + 6].map(
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

describe("a cleared level", () => {
  it("stands still", () => {
    const field = fieldFrom(["......o"]);
    const ball = throwBall(field, 13, 6, 0);
    stepTimes(field, 30);
    const where = { x: ball.x, y: ball.y };

    stepTimes(field, 10);

    expect({ x: ball.x, y: ball.y }).toEqual(where);
  });
});

describe("a lost ball", () => {
  it("loses the level's ball once it falls past the floor", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 5, 29.5, 180);

    stepTimes(field, 10);

    expect({ state: field.state, events: eventsOf(field) }).toEqual({
      state: "lost",
      events: ["lost"],
    });
  });

  it("brings the ball's speed back to its base", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 5, 29.5, 180);
    field.climbed = 5;

    stepTimes(field, 10);

    expect(field.climbed).toBe(0);
  });

  it("goes on while another ball is in play", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 5, 29.5, 180);
    throwBall(field, 13, 15, 0, 1);

    stepTimes(field, 10);

    expect({ state: field.state, live: ballOf(field).live }).toEqual({
      state: "playing",
      live: false,
    });
  });

  it("is followed by a ball on the paddle, once served again", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 5, 29.5, 180);
    stepTimes(field, 10);

    serve(field);

    expect({ state: field.state, ball: ballOf(field) }).toMatchObject({
      state: "serve",
      ball: { live: true, held: true, x: field.paddle.x },
    });
  });

  it("can't be served again while a ball is in play", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 13, 15, 0);

    serve(field);

    expect({
      state: field.state,
      live: field.balls.filter((ball) => ball.live).length,
    }).toEqual({ state: "playing", live: 1 });
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

  it("is a turn the run's seed decides", () => {
    // The first draw from seed 1 turns the ball one way, and from 3 the other.
    const headings = [1, 3].map((seed) => {
      const field = fieldFrom(FAR_BRICK, { seed });
      const ball = throwBall(field, 1, 15, -45);
      ball.bounces = LULL_BOUNCES;
      stepTimes(field, 10);
      return headingOf(ball);
    });

    expect(headings[0]).not.toBeCloseTo(headings[1] ?? 0);
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

describe("a field", () => {
  /** Plays a level from a seed, steered the same way every time, and returns it. */
  function play(seed: number): Field {
    const field = fieldFrom(
      ["oooooooooooo", "o2o2o#o2o2o2o", "#...#...#...#"],
      {
        seed,
      },
    );
    for (let frame = 0; frame < 3000; frame++) {
      if (field.state === "lost") serve(field);
      launch(field);
      steerField(field, { ...NO_STEER, to: 3 + (frame % 41) * 0.5 });
      stepTimes(field, 2);
    }
    return field;
  }

  it("plays the same, from the same seed and steering", () => {
    const [first, second] = [play(7), play(7)];

    expect({
      balls: first.balls,
      paddle: first.paddle,
      bricks: first.bricks,
      draws: first.draws,
      events: first.events.latest,
    }).toEqual({
      balls: second.balls,
      paddle: second.paddle,
      bricks: second.bricks,
      draws: second.draws,
      events: second.events.latest,
    });
  });

  it("keeps where each ball was a step ago, to draw between", () => {
    const field = fieldFrom(FAR_BRICK);
    const ball = throwBall(field, 13, 15, 0);

    stepField(field);

    expect({ lastX: ball.lastX, lastY: ball.lastY }).toEqual({
      lastX: 13,
      lastY: 15,
    });
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
  it("hits the eight bricks around each brick it strikes", () => {
    // The ball rises through the gap to strike the middle brick of the three
    // rows, from 7 to 8 down.
    const rows = [".....ooo", ".....ooo", ".....o.o"];
    const field = fieldFrom(["o", "", "", "", ...rows]);
    throwBall(field, 13, 12, 0);
    catchCapsule(field, "blast", 0, 0);

    stepTimes(field, 35);

    expect(field.needed).toBe(1);
  });
});
