import {
  NO_STEER,
  ballOf,
  eventsOf,
  fieldFrom,
  headingOf,
  lastEvent,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import { CUSTOM_PERCENT, SPEED_INFO, ballSpeed, customFactor } from "../speed";
import { STEP_MS } from "../stepper";
import {
  BALL_RADIUS,
  FIELD_HEIGHT,
  FLATTEST,
  KEY_RAMP_MS,
  KEY_SPEED,
  PADDLE_TOP,
  SERVE_ANGLE,
  STEP_S,
  TALLEST_FIELD,
} from "../tuning";
import {
  type Field,
  keySpeedOf,
  launch,
  reshapeField,
  serve,
  steerField,
  stepField,
} from "./field";

/** A brick in the top left corner, far from where the specs throw their balls. */
const FAR_BRICK = ["o"];

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

describe("reshapeField", () => {
  it("makes a field waiting to serve taller, its paddle and ball as far above the new floor", () => {
    const field = fieldFrom(FAR_BRICK);
    const top = PADDLE_TOP + TALLEST_FIELD - FIELD_HEIGHT;

    reshapeField(field, TALLEST_FIELD);

    expect({
      height: field.height,
      top: field.paddle.top,
      ball: ballOf(field),
    }).toMatchObject({
      height: TALLEST_FIELD,
      top,
      ball: { held: true, y: top - BALL_RADIUS, lastY: top - BALL_RADIUS },
    });
  });

  it.each([
    [FIELD_HEIGHT - 10, FIELD_HEIGHT],
    [TALLEST_FIELD + 10, TALLEST_FIELD],
  ])("makes a field asked to be %i tall %i tall instead", (asked, height) => {
    const field = fieldFrom(FAR_BRICK);

    reshapeField(field, asked);

    expect([field.height, field.paddle.top]).toEqual([
      height,
      PADDLE_TOP + height - FIELD_HEIGHT,
    ]);
  });

  it("leaves a field asked to be a height that is no number as it is", () => {
    const field = fieldFrom(FAR_BRICK, { height: TALLEST_FIELD });

    reshapeField(field, Number.NaN);

    expect(field.height).toBe(TALLEST_FIELD);
  });

  it("leaves a field with a ball in flight as it is", () => {
    const field = fieldFrom(FAR_BRICK);
    throwBall(field, 13, 15, 0);

    reshapeField(field, TALLEST_FIELD);

    expect({ height: field.height, top: field.paddle.top }).toEqual({
      height: FIELD_HEIGHT,
      top: PADDLE_TOP,
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

  it("moves the ball on as far as its speed scale says", () => {
    const field = fieldFrom(FAR_BRICK);
    field.ballSpeedScale = 1.5;
    launch(field);

    stepField(field);

    expect(lastMove(field)).toBeCloseTo(
      ballSpeed("normal", 1, 0) * 1.5 * STEP_S,
    );
  });

  it("moves a Custom ball on as far as the player's speed says", () => {
    const field = fieldFrom(FAR_BRICK, { speed: "custom" });
    field.customPercent = 150;
    launch(field);

    stepField(field);

    expect(lastMove(field)).toBeCloseTo(
      ballSpeed("normal", 1, 0) * 1.5 * STEP_S,
    );
  });

  it("leaves the ball at any other speed as fast as its speed says", () => {
    const field = fieldFrom(FAR_BRICK, { speed: "fast" });
    field.customPercent = 150;
    launch(field);

    stepField(field);

    expect(lastMove(field)).toBeCloseTo(ballSpeed("fast", 1, 0) * STEP_S);
  });
});

describe("keySpeedOf", () => {
  it.each([
    ["normal", 200, KEY_SPEED],
    ["custom", 50, KEY_SPEED],
    ["custom", 120, KEY_SPEED],
    [
      "custom",
      200,
      (KEY_SPEED * 2 * SPEED_INFO.custom.top) / SPEED_INFO.fast.top,
    ],
  ] as const)(
    "has held keys move the paddle at %s with Custom at %i%% at %f",
    (speed, customPercent, keySpeed) => {
      const field = fieldFrom(FAR_BRICK, { speed });
      field.customPercent = customPercent;

      expect(keySpeedOf(field)).toBeCloseTo(keySpeed);
    },
  );

  it.each([CUSTOM_PERCENT.least, 100, CUSTOM_PERCENT.most])(
    "has held keys move the paddle faster than a Custom ball at %i%% crosses the field at its top",
    (customPercent) => {
      const field = fieldFrom(FAR_BRICK, { speed: "custom" });
      field.customPercent = customPercent;
      const top = SPEED_INFO.custom.top * customFactor("custom", customPercent);

      expect(keySpeedOf(field)).toBeGreaterThan(
        top * Math.cos((FLATTEST * Math.PI) / 180),
      );
    },
  );

  it("moves the paddle by held keys at that speed", () => {
    const field = fieldFrom(FAR_BRICK, { speed: "custom" });
    field.customPercent = 200;
    steerField(field, { ...NO_STEER, push: 1 });

    stepTimes(field, Math.ceil(KEY_RAMP_MS / STEP_MS));

    expect(field.paddle.speed).toBeCloseTo(keySpeedOf(field));
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

  it("stays in play past the floor a field of the least height has, on a taller one", () => {
    const field = fieldFrom(FAR_BRICK, { height: TALLEST_FIELD });
    throwBall(field, 5, 29.5, 180);

    stepTimes(field, 10);

    expect(field.state).toBe("playing");
  });

  it("is lost past a taller field's floor", () => {
    const field = fieldFrom(FAR_BRICK, { height: TALLEST_FIELD });
    throwBall(field, 5, TALLEST_FIELD - 0.5, 180);

    stepTimes(field, 10);

    expect({ state: field.state, at: lastEvent(field)?.y }).toEqual({
      state: "lost",
      at: TALLEST_FIELD,
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

describe("a field", () => {
  /**
   * Plays a level from a seed, steered the same way every time, and returns
   * it: capsules fall, and steel shuts some balls in long enough to lull.
   */
  function play(seed: number): Field {
    const field = fieldFrom(
      ["oooooooooooo", "o2o2o#o2o2o2o", "#...#...#...#", "#.#.#.#.#.#.#"],
      { seed, drops: 0.4, capsules: ["wide", "multi", "slow", "narrow"] },
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

  it("draws from its seed as it plays", () => {
    expect(play(7).draws).toBeGreaterThan(0);
  });

  it("stands still once cleared, to be drawn where it is", () => {
    const field = fieldFrom(["......o"]);
    const ball = throwBall(field, 13, 6, 0);

    stepTimes(field, 30);

    expect({
      ball: [ball.lastX, ball.lastY],
      paddle: field.paddle.lastX,
    }).toEqual({ ball: [ball.x, ball.y], paddle: field.paddle.x });
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
