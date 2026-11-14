import { headingOf } from "../../testing/field_picture";
import { cellIndex, cellMiddleX, cellMiddleY } from "../grid";
import {
  BALL_RADIUS,
  FIELD_WIDTH,
  FLATTEST,
  FRIEND_INKS,
  PADDLE_TOP,
  SERVE_ANGLE,
} from "../tuning";
import {
  type Ball,
  OWN_INK,
  createBall,
  followPaddle,
  holdBall,
  isBallInCell,
  nextFriendInk,
  overlapsBox,
  reflectBall,
  releaseBall,
  serveBall,
  settleBall,
  splitOff,
  turnBall,
} from "./balls";
import { createPaddle } from "./paddle";

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

  it("lets a ball it rests meet portals again", () => {
    const ball = { ...createBall(), portalled: true };

    holdBall(ball, createPaddle(), 0);

    expect(ball.portalled).toBe(false);
  });
});

describe("followPaddle", () => {
  it("keeps a resting ball where it rests as the paddle moves", () => {
    const ball = createBall();
    holdBall(ball, { ...createPaddle(), x: 10 }, -1);

    followPaddle(ball, { ...createPaddle(), x: 12 });

    expect(ball.x).toBe(11);
  });

  it("moves a resting ball in from an end the paddle shrank past", () => {
    const ball = createBall();
    holdBall(ball, { ...createPaddle(), x: 10, width: 6 }, 2.5);

    followPaddle(ball, { ...createPaddle(), x: 10, width: 2 });

    expect({ x: ball.x, offset: ball.offset }).toEqual({ x: 11, offset: 1 });
  });

  it.each([
    ["left", 1, -1, BALL_RADIUS],
    ["right", FIELD_WIDTH - 1, 1, FIELD_WIDTH - BALL_RADIUS],
  ])("keeps a resting ball off the %s wall", (_, x, offset, at) => {
    const ball = createBall();
    holdBall(ball, { ...createPaddle(), x: 13 }, offset);

    followPaddle(ball, { ...createPaddle(), x });

    expect(ball.x).toBe(at);
  });
});

describe("splitOff", () => {
  it("puts a copy in play where the ball is, wearing its ink", () => {
    const ball = { ...heading(0, -1), x: 5, y: 9, ink: 3 };
    const copy = createBall();

    splitOff(ball, copy, 30);

    expect({
      copy: { live: copy.live, x: copy.x, y: copy.y, ink: copy.ink },
      heading: headingOf(copy),
    }).toEqual({
      copy: { live: true, x: 5, y: 9, ink: 3 },
      heading: expect.closeTo(30) as unknown,
    });
  });

  it.each([true, false])(
    "puts a copy in play passing over portals as the ball does, %s, as come out of one when it did",
    (portalled) => {
      const ball = { ...heading(0, -1), portalled, jumpedAt: 50 };
      const copy = { ...createBall(), portalled: !portalled };

      splitOff(ball, copy, 30);

      expect([copy.portalled, copy.jumpedAt]).toEqual([portalled, 50]);
    },
  );
});

describe("releaseBall", () => {
  it("puts a ball in play at a place, heading at an angle, wearing an ink", () => {
    const ball = createBall();

    releaseBall(ball, 7, 4.5, -15, 2);

    expect({
      ball: { live: ball.live, held: ball.held, x: ball.x, y: ball.y },
      last: [ball.lastX, ball.lastY],
      ink: ball.ink,
      heading: headingOf(ball),
    }).toEqual({
      ball: { live: true, held: false, x: 7, y: 4.5 },
      last: [7, 4.5],
      ink: 2,
      heading: expect.closeTo(-15) as unknown,
    });
  });

  it("lets a ball it puts in play meet portals, as one that never went through one", () => {
    const ball = { ...createBall(), portalled: true, jumpedAt: 50 };

    releaseBall(ball, 7, 4.5, -15, 2);

    expect([ball.portalled, ball.jumpedAt]).toEqual([false, 0]);
  });
});

describe("createBall", () => {
  it("makes a ball the player's own", () => {
    expect(createBall().ink).toBe(OWN_INK);
  });
});

describe("nextFriendInk", () => {
  it("dresses each friend a level frees in the friends' inks in turn, the first again after the last", () => {
    const inks = [0, 1, FRIEND_INKS - 1, FRIEND_INKS, FRIEND_INKS + 2].map(
      nextFriendInk,
    );

    expect(inks).toEqual([0, 1, FRIEND_INKS - 1, 0, 2]);
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

describe("overlapsBox", () => {
  const box = { left: 10, top: 10, right: 12, bottom: 11 };

  it.each([
    ["inside it", 11, 10.5, true],
    ["just over its side", 12 + BALL_RADIUS * 0.9, 10.5, true],
    ["just off its side", 12 + BALL_RADIUS * 1.1, 10.5, false],
    [
      "off its corner, though in reach across and down alone",
      12.3,
      11.3,
      false,
    ],
  ])("says whether a ball %s overlaps it", (_, x, y, overlaps) => {
    const ball = { ...createBall(), x, y };

    expect(overlapsBox(ball, box)).toBe(overlaps);
  });
});

describe("isBallInCell", () => {
  const cell = cellIndex(3, 2);

  it.each([
    ["a ball in play in it", true, cellMiddleX(cell), true],
    ["a ball in play just over its side", true, cellMiddleX(cell) + 1.3, true],
    ["a ball in play off its side", true, cellMiddleX(cell) + 1.4, false],
    ["a ball out of play in it", false, cellMiddleX(cell), false],
  ])("says whether %s is in a cell", (_, live, x, inCell) => {
    const balls = [
      createBall(),
      { ...createBall(), live, x, y: cellMiddleY(cell) },
    ];

    expect(isBallInCell(balls, cell)).toBe(inCell);
  });
});
