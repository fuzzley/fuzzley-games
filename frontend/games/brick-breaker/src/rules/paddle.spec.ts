import type { Box } from "./grid";
import {
  type Paddle,
  type Steer,
  createPaddle,
  movePaddle,
  paddleBox,
  paddleTopOf,
  steerPaddle,
} from "./paddle";
import { STEP_MS } from "./stepper";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  KEY_RAMP_MS,
  KEY_SPEED,
  PADDLE_HEIGHT,
  PADDLE_RESIZE_SPEED,
  PADDLE_TOP,
  POINTER_SPEED,
  STEP_S,
  TALLEST_FIELD,
} from "./tuning";

/** The steps held keys take to bring the paddle to its fastest. */
const RAMP_STEPS = Math.ceil(KEY_RAMP_MS / STEP_MS);

/** Steers a paddle, then moves it a number of steps. */
function drive(paddle: Paddle, steer: Partial<Steer>, steps = 1): void {
  steerPaddle(paddle, { to: null, by: 0, push: 0, ...steer });
  for (let i = 0; i < steps; i++) movePaddle(paddle);
}

describe("createPaddle", () => {
  it("puts the paddle in the field's middle, at its first width, facing right", () => {
    const paddle = createPaddle();

    expect(paddle).toEqual({
      x: 13,
      lastX: 13,
      top: PADDLE_TOP,
      width: 4,
      goalWidth: 4,
      target: null,
      dragging: false,
      push: 0,
      speed: 0,
      facing: 1,
    });
  });
});

describe("the paddle by keys", () => {
  it("ramps up to its fastest", () => {
    const paddle = createPaddle();

    drive(paddle, { push: 1 }, RAMP_STEPS - 1);

    expect(paddle.speed).toBeLessThan(KEY_SPEED);
  });

  it("reaches its fastest once the ramp has run", () => {
    const paddle = createPaddle();

    drive(paddle, { push: 1 }, RAMP_STEPS);

    expect(paddle.speed).toBe(KEY_SPEED);
  });

  it("moves by its speed each step", () => {
    const paddle = createPaddle();
    drive(paddle, { push: -1 }, RAMP_STEPS);

    drive(paddle, { push: -1 });

    expect(paddle.lastX - paddle.x).toBeCloseTo(KEY_SPEED * STEP_S);
  });

  it("stops as the keys are let go", () => {
    const paddle = createPaddle();
    drive(paddle, { push: 1 }, RAMP_STEPS);

    drive(paddle, {});

    expect({ moved: paddle.x - paddle.lastX, speed: paddle.speed }).toEqual({
      moved: 0,
      speed: 0,
    });
  });

  it("ramps up again from nothing the other way", () => {
    const paddle = createPaddle();
    drive(paddle, { push: 1 }, RAMP_STEPS);

    drive(paddle, { push: -1 });

    expect(paddle.speed).toBeCloseTo((-KEY_SPEED * STEP_MS) / KEY_RAMP_MS);
  });

  it("stops at the right wall", () => {
    const paddle = createPaddle();

    drive(paddle, { push: 1 }, 120);

    expect(paddle.x).toBe(FIELD_WIDTH - 2);
  });

  it("stops at the left wall", () => {
    const paddle = createPaddle();

    drive(paddle, { push: -1 }, 120);

    expect(paddle.x).toBe(2);
  });

  it("lets go of where a pointer asked it to be", () => {
    const paddle = createPaddle();
    drive(paddle, { to: 20 });

    drive(paddle, { push: 1 });

    expect(paddle.target).toBeNull();
  });
});

describe("the paddle by a pointer", () => {
  it("heads for the pointer at the pointer's top speed", () => {
    const paddle = createPaddle();

    drive(paddle, { to: 20 });

    expect(paddle.x).toBeCloseTo(13 + POINTER_SPEED * STEP_S);
  });

  it("comes to rest under the pointer", () => {
    const paddle = createPaddle();

    drive(paddle, { to: 15.5 }, 10);

    expect(paddle.x).toBe(15.5);
  });

  it("goes no further than the wall, however far the pointer goes", () => {
    const paddle = createPaddle();

    drive(paddle, { to: 40 }, 60);

    expect(paddle.x).toBe(FIELD_WIDTH - 2);
  });

  it("keeps heading where a pointer last asked once it stops asking", () => {
    const paddle = createPaddle();
    drive(paddle, { to: 9 });

    drive(paddle, {}, 10);

    expect(paddle.x).toBe(9);
  });

  it("is dragged from where a finger last left it heading", () => {
    const paddle = createPaddle();
    drive(paddle, { by: 2 });

    drive(paddle, { by: 1 }, 10);

    expect(paddle.x).toBe(16);
  });

  it("faces the way it last moved", () => {
    const paddle = createPaddle();

    drive(paddle, { to: 5 });

    expect(paddle.facing).toBe(-1);
  });

  it("keeps facing the way it last moved once it stops", () => {
    const paddle = createPaddle();
    drive(paddle, { to: 12 }, 2);

    drive(paddle, { to: 14 }, 3);

    expect(paddle.facing).toBe(1);
  });
});

describe("the paddle's width", () => {
  it("grows toward a new width, a step at a time", () => {
    const paddle = createPaddle();
    paddle.goalWidth = 6;

    drive(paddle, {});

    expect(paddle.width).toBeCloseTo(4 + PADDLE_RESIZE_SPEED * STEP_S);
  });

  it("comes to rest at its new width", () => {
    const paddle = createPaddle();
    paddle.goalWidth = 2.6;

    drive(paddle, {}, 60);

    expect(paddle.width).toBe(2.6);
  });

  it("stays within the walls as it grows beside one", () => {
    const paddle = createPaddle();
    drive(paddle, { push: -1 }, 120);
    paddle.goalWidth = 6;

    drive(paddle, {}, 60);

    expect(paddle.x).toBe(3);
  });

  it("keeps a paddle the keys left at a wall against it as it narrows", () => {
    const paddle = createPaddle();
    drive(paddle, { push: 1 }, 120);
    drive(paddle, {});
    paddle.goalWidth = 2.6;

    drive(paddle, {}, 60);

    expect(paddle.x).toBe(FIELD_WIDTH - 1.3);
  });

  it("keeps a paddle the keys left at the left wall against it as it narrows", () => {
    const paddle = createPaddle();
    drive(paddle, { push: -1 }, 120);
    drive(paddle, {});
    paddle.goalWidth = 2.6;

    drive(paddle, {}, 60);

    expect(paddle.x).toBe(1.3);
  });

  it("keeps a finger's drag that reached a wall against it as it narrows", () => {
    const paddle = createPaddle();
    drive(paddle, { by: -20 }, 120);
    paddle.goalWidth = 2.6;

    drive(paddle, {}, 60);

    expect(paddle.x).toBe(1.3);
  });

  it("comes back under a pointer resting by a wall once it narrows again", () => {
    const paddle = createPaddle();
    drive(paddle, { to: 2.5 }, 120);
    paddle.goalWidth = 6;
    drive(paddle, {}, 60);
    paddle.goalWidth = 4;

    drive(paddle, {}, 120);

    expect(paddle.x).toBe(2.5);
  });

  it("keeps a pointer's place past a wall at the wall as it narrows", () => {
    const paddle = createPaddle();
    paddle.goalWidth = 6;
    drive(paddle, {}, 60);
    drive(paddle, { to: 30 }, 120);
    paddle.goalWidth = 4;

    drive(paddle, {}, 240);

    expect(paddle.x).toBe(FIELD_WIDTH - 2);
  });
});

describe("paddleTopOf", () => {
  it("puts the paddle as far above the floor of a taller field", () => {
    const above = [FIELD_HEIGHT, TALLEST_FIELD].map(
      (height) => height - paddleTopOf(height),
    );

    expect(above).toEqual([
      FIELD_HEIGHT - PADDLE_TOP,
      FIELD_HEIGHT - PADDLE_TOP,
    ]);
  });
});

describe("paddleBox", () => {
  it("writes the box of a paddle lowered on a taller field", () => {
    const paddle = createPaddle();
    paddle.top = paddleTopOf(TALLEST_FIELD);
    const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

    paddleBox(paddle, box);

    expect([box.top, box.bottom]).toEqual([
      paddle.top,
      paddle.top + PADDLE_HEIGHT,
    ]);
  });

  it("writes the paddle's box", () => {
    const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

    paddleBox(createPaddle(), box);

    expect(box).toEqual({
      left: 11,
      top: PADDLE_TOP,
      right: 15,
      bottom: PADDLE_TOP + PADDLE_HEIGHT,
    });
  });
});
