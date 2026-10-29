import {
  BALL_RADIUS,
  BRICKS_TOP,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  COLUMNS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FIRST_LIVES,
  MAX_LIVES,
  PADDLE_HEIGHT,
  PADDLE_TOP,
  PADDLE_WIDTH,
  ROWS,
} from "./tuning";

// The numbers are the game's to tune; these hold what tuning must not break.
describe("the tuning", () => {
  it("fills the field's width with a row of bricks", () => {
    expect(COLUMNS * BRICK_WIDTH).toBe(FIELD_WIDTH);
  });

  it("leaves room for a ball between the lowest bricks and the paddle", () => {
    const lowest = BRICKS_TOP + ROWS * BRICK_HEIGHT;

    expect(PADDLE_TOP - lowest).toBeGreaterThan(4 * BALL_RADIUS);
  });

  it("keeps the paddle narrower than the field", () => {
    expect(FIELD_WIDTH - PADDLE_WIDTH).toBeGreaterThan(0);
  });

  it("keeps the paddle above the floor", () => {
    expect(FIELD_HEIGHT - PADDLE_TOP - PADDLE_HEIGHT).toBeGreaterThan(0);
  });

  it("starts a run with fewer lives than the most it can hold", () => {
    expect(FIRST_LIVES).toBeLessThan(MAX_LIVES);
  });
});
