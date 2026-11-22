import {
  NO_STEER,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import { catchCapsule } from "../bricks/capsules";
import { cellIndex } from "../grid";
import {
  AIM_MOST,
  BALL_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_TOP,
  SERVE_ANGLE,
  TALLEST_FIELD,
} from "../tuning";
import { type Field, steerField } from "./field";
import {
  type GuidePlace,
  type ServeGuide,
  createServeGuide,
  serveGuide,
} from "./guide";

/** A brick in the top left corner, out of the way of a serve. */
const FAR_BRICK = ["o"];

/** Where the waiting ball's middle lies, down the field, on the paddle as a level starts. */
const BALL_Y = PADDLE_TOP - BALL_RADIUS;

/**
 * Rocket, level 9, as the design's `aim-steep.webp` shows it: the bricks
 * left standing, the green flame brick alone at column 8, row 12.
 */
const ROCKET = [
  "......o",
  ".....ooo",
  "....ooooo",
  "....ooooo",
  "....ooooo",
  "....ooooo",
  "....ooooo",
  "....ooooo",
  "...ooooooo",
  "..ooo.oooo",
  "..ooo..ooooo",
  ".o..o.o....o",
  "........o",
];

/** Returns a field from a picture, the player aiming its serve. */
function aimedAt(rows: readonly string[], aim: number | null): Field {
  const field = fieldFrom(rows);
  steerField(field, { ...NO_STEER, aim });
  return field;
}

/** Returns the guide of a field as it stands. */
function guideOf(field: Field): ServeGuide {
  const guide = createServeGuide();
  serveGuide(field, guide);
  return guide;
}

/** Returns the dots a guide shows. */
function dotsOf(guide: ServeGuide): GuidePlace[] {
  return guide.dots.places.slice(0, guide.dots.count);
}

/** Returns the cells a guide outlines. */
function markedOf(guide: ServeGuide): number[] {
  return guide.marked.cells.slice(0, guide.marked.count);
}

/** Returns a place a distance from another along a heading from straight up, near enough to match. */
function along(
  from: GuidePlace,
  degrees: number,
  distance: number,
): { x: unknown; y: unknown } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: expect.closeTo(from.x + Math.sin(radians) * distance),
    y: expect.closeTo(from.y - Math.cos(radians) * distance),
  };
}

describe("serveGuide", () => {
  it("lays its dots a unit apart along the aim, the first a unit from the ball", () => {
    const guide = guideOf(aimedAt(FAR_BRICK, -15));

    expect(dotsOf(guide).slice(0, 3)).toEqual(
      [1, 2, 3].map((distance) => along({ x: 13, y: BALL_Y }, -15, distance)),
    );
  });

  it("goes the way a quick press would serve, with no aim", () => {
    const guide = guideOf(aimedAt(FAR_BRICK, null));

    expect(dotsOf(guide)[0]).toEqual(
      along({ x: 13, y: BALL_Y }, SERVE_ANGLE, 1),
    );
  });

  it(`leans no more than ${String(AIM_MOST)}°, as the serve`, () => {
    const guide = guideOf(aimedAt(FAR_BRICK, AIM_MOST + 20));

    expect(dotsOf(guide)[0]).toEqual(along({ x: 13, y: BALL_Y }, AIM_MOST, 1));
  });

  it("turns at the top wall and runs on 3 units, outlining nothing", () => {
    // Straight up, the ball meets the wall 26.78 on, and turns straight
    // back down.
    const guide = guideOf(aimedAt(FAR_BRICK, 0));
    const toTurn = BALL_Y - BALL_RADIUS;

    expect({
      count: guide.dots.count,
      last: dotsOf(guide).at(-1),
      marked: markedOf(guide),
    }).toEqual({
      count: 29,
      last: along({ x: 13, y: BALL_RADIUS }, 180, 29 - toTurn),
      marked: [],
    });
  });

  it("stops short of what the ball would meet next, as Rocket shows aimed 12° right", () => {
    // The ball meets the left side of the brick at column 8, row 12, 12.70
    // on, turns left, and would meet the foot of the brick at column 7,
    // row 10, 1.39 on: 12 dots before the turn, 2 after.
    const guide = guideOf(aimedAt(ROCKET, 12));
    const toTurn = (16 - BALL_RADIUS - 13) / Math.sin((12 * Math.PI) / 180);
    const turn = {
      x: 16 - BALL_RADIUS,
      y: BALL_Y - toTurn * Math.cos((12 * Math.PI) / 180),
    };

    expect({
      count: guide.dots.count,
      beforeTurn: dotsOf(guide)[11],
      last: dotsOf(guide).at(-1),
      marked: markedOf(guide),
    }).toEqual({
      count: 14,
      beforeTurn: along({ x: 13, y: BALL_Y }, 12, 12),
      last: along(turn, -12, 14 - toTurn),
      marked: [cellIndex(8, 12)],
    });
  });

  it("outlines a plated brick the ball rises into, which turns it", () => {
    const guide = guideOf(
      aimedAt(["o", "", "", "", "", "", "", "", "", "", "......u"], 0),
    );

    expect(markedOf(guide)).toEqual([cellIndex(6, 10)]);
  });

  it("outlines no bumper, which turns the ball", () => {
    // The ball meets the bumper's disc 13.78 on, turns straight back, and
    // runs on 3.
    const guide = guideOf(
      aimedAt(["o", "", "", "", "", "", "", "", "", "", "......O"], 0),
    );

    expect({ count: guide.dots.count, marked: markedOf(guide) }).toEqual({
      count: 16,
      marked: [],
    });
  });

  it("outlines only the first brick an ordinary ball turns off", () => {
    const guide = guideOf(
      aimedAt(
        ["o", "", "", "", "", "", "", "", "......#", "", "......o", "......o"],
        0,
      ),
    );

    expect({ count: guide.dots.count, marked: markedOf(guide) }).toEqual({
      count: 15,
      marked: [cellIndex(6, 11)],
    });
  });

  it("outlines each brick a fire ball passes through, and what turns it, laying dots through them", () => {
    // Passing the bricks at rows 11 and 10, the ball meets the steel's foot
    // 15.78 on, and turns straight back down through where they stood.
    const field = aimedAt(
      ["o", "", "", "", "", "", "", "", "......#", "", "......o", "......o"],
      0,
    );
    catchCapsule(field, "fire", 0, 0);

    const guide = guideOf(field);

    expect({ count: guide.dots.count, marked: markedOf(guide) }).toEqual({
      count: 18,
      marked: [cellIndex(6, 11), cellIndex(6, 10), cellIndex(6, 8)],
    });
  });

  it("ends at a portal the ball would go into", () => {
    // The ball touches the portal's disc 13.78 on.
    const guide = guideOf(
      aimedAt(["o", "", "@", "", "", "", "", "", "", "", "......@"], 0),
    );

    expect({ count: guide.dots.count, marked: markedOf(guide) }).toEqual({
      count: 13,
      marked: [],
    });
  });

  it("holds every dot of the longest guide, from a ball against a side wall to the far top corner of the tallest field", () => {
    // From the paddle against the left wall, aimed 30° right, the ball meets
    // the right wall 47.28 on, near the top, turns, and would meet the top
    // wall 0.96 on.
    const field = fieldFrom(FAR_BRICK, { height: TALLEST_FIELD });
    steerField(field, { ...NO_STEER, to: 0 });
    stepTimes(field, 60);
    steerField(field, { ...NO_STEER, aim: 30 });
    const from = {
      x: 2,
      y: PADDLE_TOP + TALLEST_FIELD - FIELD_HEIGHT - BALL_RADIUS,
    };
    const toTurn = (FIELD_WIDTH - BALL_RADIUS - from.x) / Math.sin(Math.PI / 6);
    const turn = {
      x: FIELD_WIDTH - BALL_RADIUS,
      y: from.y - toTurn * Math.cos(Math.PI / 6),
    };

    const guide = guideOf(field);

    expect({
      count: guide.dots.count,
      last: dotsOf(guide).at(-1),
    }).toEqual({
      count: 48,
      last: along(turn, -30, 48 - toTurn),
    });
  });

  it("shows nothing once the field is in play", () => {
    const field = aimedAt(FAR_BRICK, 0);
    const guide = guideOf(field);
    throwBall(field, 13, 15, 0);

    serveGuide(field, guide);

    expect({ dots: guide.dots.count, marked: guide.marked.count }).toEqual({
      dots: 0,
      marked: 0,
    });
  });

  it("writes a new aim's guide over the last in the same record", () => {
    // Straight up, the ball meets the foot of the brick at column 6, row
    // 11, 12.78 on, and turns straight back.
    const field = aimedAt(ROCKET, 12);
    const guide = guideOf(field);
    steerField(field, { ...NO_STEER, aim: 0 });

    serveGuide(field, guide);

    expect({
      count: guide.dots.count,
      last: dotsOf(guide).at(-1),
      marked: markedOf(guide),
    }).toEqual({
      count: 15,
      last: along({ x: 13, y: 14 + BALL_RADIUS }, 180, 15 - 12.78),
      marked: [cellIndex(6, 11)],
    });
  });
});
