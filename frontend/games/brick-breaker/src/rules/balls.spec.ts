import { headingOf } from "../testing/field_picture";
import {
  type Ball,
  createBall,
  holdBall,
  reflectBall,
  serveBall,
  settleBall,
  turnBall,
} from "./balls";
import { createPaddle } from "./paddle";
import { BALL_RADIUS, FLATTEST, PADDLE_TOP, SERVE_ANGLE } from "./tuning";

/** Returns a ball in play heading a way, not yet of length 1. */
function heading(dx: number, dy: number): Ball {
  return { ...createBall(), live: true, dx, dy };
}

describe("holdBall", () => {
  it("rests a ball on the paddle, at an offset from its middle", () => {
    const ball = createBall();
    const paddle = { ...createPaddle(), x: 10 };

    holdBall(ball, paddle, 0.5);

    expect(ball).toMatchObject({
      live: true,
      held: true,
      x: 10.5,
      y: PADDLE_TOP - BALL_RADIUS,
      lastX: 10.5,
      lastY: PADDLE_TOP - BALL_RADIUS,
    });
  });
});

describe("serveBall", () => {
  it.each([
    [1, SERVE_ANGLE],
    [-1, -SERVE_ANGLE],
  ] as const)("sends a ball facing %i off at %i°", (facing, angle) => {
    const ball = createBall();

    serveBall(ball, facing);

    expect(headingOf(ball)).toBeCloseTo(angle);
  });
});

describe("reflectBall", () => {
  it("turns a ball as a mirror would", () => {
    const ball = heading(0.6, -0.8);

    reflectBall(ball, 0, 1);

    expect([ball.dx, ball.dy]).toEqual([0.6, 0.8]);
  });

  it("leaves a ball moving away from the normal as it is", () => {
    const ball = heading(0.6, 0.8);

    reflectBall(ball, 0, 1);

    expect([ball.dx, ball.dy]).toEqual([0.6, 0.8]);
  });
});

describe("turnBall", () => {
  it("turns a ball clockwise on the field", () => {
    const ball = heading(0, -1);

    turnBall(ball, 30);

    expect(headingOf(ball)).toBeCloseTo(30);
  });
});

describe("settleBall", () => {
  it("brings a ball's direction back to a length of 1", () => {
    const ball = heading(3, -4);

    settleBall(ball, 0, 1);

    expect([ball.dx, ball.dy]).toEqual([0.6, -0.8]);
  });

  it.each([
    ["up and right", 0.99, -0.1, 90 - FLATTEST],
    ["up and left", -0.99, -0.1, FLATTEST - 90],
    ["down and right", 0.99, 0.1, 90 + FLATTEST],
    ["down and left", -0.99, 0.1, -90 - FLATTEST],
    ["straight across", 1, 0, 90 - FLATTEST],
  ])("holds a ball going %s to the flattest it travels", (_, dx, dy, angle) => {
    const ball = heading(dx, dy);

    settleBall(ball, 0, 0);

    expect(headingOf(ball)).toBeCloseTo(angle);
  });

  it("leaves a ball steeper than the flattest as it is", () => {
    const ball = heading(4, -3);

    settleBall(ball, 0, 1);

    expect([ball.dx, ball.dy]).toEqual([0.8, -0.6]);
  });

  it("holds a ball to the flattest going away from what it met, not back into it", () => {
    // Off a corner up and to its left, a little down and right is back in.
    const ball = heading(0.98, 0.2);

    settleBall(ball, 0.28, -0.96);

    expect(headingOf(ball)).toBeCloseTo(90 - FLATTEST);
  });
});
