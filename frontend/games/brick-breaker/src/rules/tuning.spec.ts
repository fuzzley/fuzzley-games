import { FUZZBALL_INKS } from "@fz/phaser/color";
import {
  AIM_MOST,
  BALL_RADIUS,
  BRICKS_TOP,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  COLUMNS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  FIRST_LIVES,
  FLATTEST,
  FRIEND_INKS,
  FRIEND_SPREAD,
  GUIDE_DOT_GAP,
  GUIDE_PAST_TURN,
  KEY_SPEED,
  MAX_LIVES,
  MOST_GUIDE_DOTS,
  PADDLE_HEIGHT,
  PADDLE_TOP,
  PADDLE_WIDTH,
  ROWS,
  SERVE_ANGLE,
  TALLEST_FIELD,
} from "./tuning";
import { PRESET_SPEEDS, SPEED_INFO } from "./speed";

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

  it("lets a field grow no shorter than it is", () => {
    expect(TALLEST_FIELD).toBeGreaterThanOrEqual(FIELD_HEIGHT);
  });

  it("keeps the paddle above the floor", () => {
    expect(FIELD_HEIGHT - PADDLE_TOP - PADDLE_HEIGHT).toBeGreaterThan(0);
  });

  it("sends a freed friend up no flatter than the flattest a ball travels", () => {
    expect(FRIEND_SPREAD).toBeLessThanOrEqual(90 - FLATTEST);
  });

  it("sends an aimed serve up no flatter than the flattest a ball travels", () => {
    expect(AIM_MOST).toBeLessThanOrEqual(90 - FLATTEST);
  });

  it("serves a quick press within an aim's reach, so the aim's limit never turns it", () => {
    expect(SERVE_ANGLE).toBeLessThanOrEqual(AIM_MOST);
  });

  it("lays the guide's first dot's middle beyond the ball's edge", () => {
    expect(GUIDE_DOT_GAP).toBeGreaterThan(BALL_RADIUS);
  });

  it("lays a dot past the guide's turn, which shows the way the ball turns", () => {
    expect(GUIDE_PAST_TURN).toBeGreaterThanOrEqual(GUIDE_DOT_GAP);
  });

  // The pool is worked out from the field, so this holds a number written
  // in its place.
  it("pools the guide's dots along the tallest field's diagonal and past its turn", () => {
    expect(MOST_GUIDE_DOTS).toBeGreaterThanOrEqual(
      Math.ceil(
        (Math.hypot(FIELD_WIDTH, TALLEST_FIELD) + GUIDE_PAST_TURN) /
          GUIDE_DOT_GAP,
      ),
    );
  });

  it.each(["light", "dark"] as const)(
    "dresses the friends in as many inks as the %s fuzzballs have",
    (mode) => {
      expect(FRIEND_INKS).toBe(FUZZBALL_INKS[mode].length);
    },
  );

  it("starts a run with fewer lives than the most it can hold", () => {
    expect(FIRST_LIVES).toBeLessThan(MAX_LIVES);
  });

  it.each(PRESET_SPEEDS)(
    "has held keys move the paddle faster than the ball crosses the field at %s's top",
    (speed) => {
      const flattest = (FLATTEST * Math.PI) / 180;

      expect(KEY_SPEED).toBeGreaterThan(
        SPEED_INFO[speed].top * Math.cos(flattest),
      );
    },
  );
});
