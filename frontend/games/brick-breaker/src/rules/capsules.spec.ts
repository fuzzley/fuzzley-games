import {
  type PictureOptions,
  ballOf,
  eventsOf,
  fieldFrom,
  headingOf,
  playWithoutBall,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import { hitBrick } from "./bricks";
import { CAPSULES, CAPSULE_IDS, type CapsuleId } from "./catalog/capsules";
import { type Field, launch, steerField } from "./field";
import { cellIndex, rowMiddle } from "./grid";
import { stepsIn } from "./stepper";
import { FALLING_POOL, catchCapsule } from "./capsules";
import {
  BALL_RADIUS,
  CAPSULE_FALL_SPEED,
  CAPSULE_HEIGHT,
  CATCH_HOLD_MS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  MAX_CAPSULES,
  PADDLE_ANGLE,
  PADDLE_TOP,
  PADDLE_WIDTH,
  STEP_S,
} from "./tuning";

/** A brick far down the field, which keeps a level from clearing. */
const KEEPER = ["", "", "", "", "", "", "", "", "", "o"];

/** How far a capsule falls in a step. */
const FALL = CAPSULE_FALL_SPEED * STEP_S;

/** The steps a capsule falling from the first row takes to reach the paddle. */
const TO_PADDLE =
  Math.ceil((PADDLE_TOP - CAPSULE_HEIGHT / 2 - rowMiddle(0)) / FALL) + 1;

/** The steps a capsule falling from the first row takes to pass the floor. */
const TO_FLOOR =
  Math.ceil((FIELD_HEIGHT + CAPSULE_HEIGHT / 2 - rowMiddle(0)) / FALL) + 1;

/**
 * Returns a field in play, with no ball until a spec throws one, of one row
 * of bricks over the keeper, capsules falling as the options say.
 */
function fieldOf(row: string, options: PictureOptions = {}): Field {
  return playWithoutBall(
    fieldFrom([row, ...KEEPER], { capsules: ["wide"], ...options }),
  );
}

/** Breaks the bricks in the first row's columns, one after another. */
function breakTop(field: Field, ...columns: number[]): void {
  for (const column of columns) {
    const brick = field.bricks[cellIndex(column, 0)];
    if (brick) hitBrick(field, brick, 0, 0);
  }
}

/** Returns the capsules falling, by id. */
function falling(field: Field): CapsuleId[] {
  return field.falling.filter((each) => each.live).map((each) => each.id);
}

/** Returns the steps an effect lasts. */
function stepsOf(id: CapsuleId): number {
  const { effect } = CAPSULES[id];
  return stepsIn("ms" in effect ? effect.ms : 0);
}

describe("a brick the level needs", () => {
  it("lets a capsule fall from its middle, by the level's chance", () => {
    const field = fieldOf("o", { drops: 1 });

    breakTop(field, 0);

    expect(field.falling[0]).toMatchObject({
      live: true,
      id: "wide",
      x: 1,
      y: 2.5,
    });
  });

  it("says a capsule fell", () => {
    const field = fieldOf("o", { drops: 1 });

    breakTop(field, 0);

    expect(eventsOf(field)).toEqual(["broken", "dropped"]);
  });

  it("lets none fall when the level gives no chance", () => {
    const field = fieldOf("o");

    breakTop(field, 0);

    expect(falling(field)).toEqual([]);
  });

  it("lets one fall only by the level's chance", () => {
    const fell = Array.from({ length: 200 }, (_, seed) => {
      const field = fieldOf("o", { drops: 0.25, seed });
      breakTop(field, 0);
      return falling(field).length;
    });

    const count = fell.filter((each) => each > 0).length;

    // About 50 of 200.
    expect(count).toBeGreaterThan(30);
    expect(count).toBeLessThan(70);
  });

  it("lets none fall when the level's pool is empty", () => {
    const field = fieldOf("o", { drops: 1, capsules: [] });

    breakTop(field, 0);

    expect(falling(field)).toEqual([]);
  });

  it(`lets no more than ${String(MAX_CAPSULES)} fall at once`, () => {
    const field = fieldOf("oooo", { drops: 1 });

    breakTop(field, 0, 1, 2, 3);

    expect(falling(field)).toHaveLength(MAX_CAPSULES);
  });
});

describe("a brick the level doesn't need", () => {
  it("lets no capsule fall", () => {
    const field = fieldOf("+", { drops: 1 });

    breakTop(field, 0);

    expect(falling(field)).toEqual([]);
  });
});

describe("a gift brick", () => {
  it("lets a capsule fall however many are falling", () => {
    const field = fieldOf("ooo?", { drops: 1 });

    breakTop(field, 0, 1, 2, 3);

    expect(falling(field)).toHaveLength(MAX_CAPSULES + 1);
  });

  it(`lets none fall once the field's ${String(FALLING_POOL)} records are falling`, () => {
    const field = fieldOf("?????????");

    breakTop(field, 0, 1, 2, 3, 4, 5, 6, 7, 8);

    expect(falling(field)).toHaveLength(FALLING_POOL);
  });

  it("gives the capsule the level pins to it", () => {
    const field = fieldOf("?", { gift: "life" });

    breakTop(field, 0);

    expect(falling(field)).toEqual(["life"]);
  });

  it("gives one drawn from the level's pool when none is pinned", () => {
    const field = fieldOf("?", { capsules: ["multi"] });

    breakTop(field, 0);

    expect(falling(field)).toEqual(["multi"]);
  });

  it("gives none once the last ball is lost", () => {
    const field = fieldOf("?");
    throwBall(field, 5, 29.5, 180);
    stepTimes(field, 10);

    breakTop(field, 0);

    expect(falling(field)).toEqual([]);
  });

  it("gives none as it clears the level", () => {
    const field = playWithoutBall(fieldFrom(["?"], { capsules: ["wide"] }));

    breakTop(field, 0);

    expect({ falling: falling(field), events: eventsOf(field) }).toEqual({
      falling: [],
      events: ["broken", "cleared"],
    });
  });

  it("gives none when the level's pool is empty", () => {
    const field = fieldOf("?", { capsules: [] });

    breakTop(field, 0);

    expect(falling(field)).toEqual([]);
  });

  it.each([
    ["relaxed", []],
    ["normal", ["narrow"]],
  ] as const)("at %s, gives a bad capsule: %j", (speed, ids) => {
    const field = fieldOf("?", { capsules: ["narrow"], speed });

    breakTop(field, 0);

    expect(falling(field)).toEqual(ids);
  });

  it.each(CAPSULE_IDS)("at Relaxed, gives %s only if it is good", (id) => {
    const field = fieldOf("?", { gift: id, capsules: [], speed: "relaxed" });

    breakTop(field, 0);

    expect(falling(field)).toEqual(CAPSULES[id].tone === "good" ? [id] : []);
  });

  it("at Relaxed, draws only good ones from a pool with bad ones", () => {
    const drawn = Array.from({ length: 40 }, (_, seed) => {
      const options: PictureOptions = {
        capsules: ["narrow", "wide", "fast"],
        speed: "relaxed",
        seed,
      };
      const field = fieldOf("?", options);
      breakTop(field, 0);
      return falling(field)[0];
    });

    expect(new Set(drawn)).toEqual(new Set(["wide"]));
  });

  it("at Relaxed, gives one drawn for a bad capsule pinned to it", () => {
    const field = fieldOf("?", { gift: "fast", speed: "relaxed" });

    breakTop(field, 0);

    expect(falling(field)).toEqual(["wide"]);
  });
});

describe("the draw", () => {
  it("picks capsules by their weight", () => {
    const drawn = Array.from({ length: 1100 }, (_, seed) => {
      const field = fieldOf("?", { capsules: ["wide", "life"], seed });
      breakTop(field, 0);
      return falling(field)[0];
    });

    const lives = drawn.filter((id) => id === "life").length;

    // Life weighs 1 against Wide's 10: about 100 of 1,100.
    expect(lives).toBeGreaterThan(70);
    expect(lives).toBeLessThan(130);
  });

  it("picks the same capsules from the same seed", () => {
    const options: PictureOptions = {
      drops: 1,
      capsules: ["wide", "multi", "slow"],
      seed: 9,
    };
    const [first, second] = [fieldOf("ooo", options), fieldOf("ooo", options)];

    breakTop(first, 0, 1, 2);
    breakTop(second, 0, 1, 2);

    expect(falling(first)).toEqual(falling(second));
  });
});

describe("a falling capsule", () => {
  it("falls at its speed", () => {
    const field = fieldOf("?");
    breakTop(field, 0);

    stepTimes(field, 1);

    expect(field.falling[0]?.y).toBeCloseTo(2.5 + CAPSULE_FALL_SPEED * STEP_S);
  });

  it("is caught by the paddle, which starts its effect", () => {
    const field = fieldOf("......?");
    breakTop(field, 6);

    stepTimes(field, TO_PADDLE);

    expect({
      falling: falling(field),
      goal: field.paddle.goalWidth,
      events: eventsOf(field),
    }).toEqual({
      falling: [],
      goal: CAPSULES.wide.effect.width,
      events: ["broken", "dropped", "caught"],
    });
  });

  it("is missed once it falls past the floor", () => {
    const field = fieldOf("?");
    breakTop(field, 0);

    stepTimes(field, TO_FLOOR);

    expect({
      falling: falling(field),
      goal: field.paddle.goalWidth,
      events: eventsOf(field),
    }).toEqual({
      falling: [],
      goal: PADDLE_WIDTH,
      events: ["broken", "dropped", "missed"],
    });
  });
});

describe("an effect", () => {
  it("lasts its time", () => {
    const field = fieldOf("");
    catchCapsule(field, "wide", 0, 0);

    stepTimes(field, stepsOf("wide") - 1);

    expect(field.paddle.goalWidth).toBe(CAPSULES.wide.effect.width);
  });

  it("then ends", () => {
    const field = fieldOf("");
    catchCapsule(field, "wide", 0, 0);

    stepTimes(field, stepsOf("wide"));

    expect({
      goal: field.paddle.goalWidth,
      inEffect: field.effects["paddle-size"].capsule,
    }).toEqual({ goal: PADDLE_WIDTH, inEffect: null });
  });

  it("gives way to the next of its group", () => {
    const field = fieldOf("");
    catchCapsule(field, "wide", 0, 0);

    catchCapsule(field, "narrow", 0, 0);

    expect({
      goal: field.paddle.goalWidth,
      inEffect: field.effects["paddle-size"].capsule,
    }).toEqual({ goal: CAPSULES.narrow.effect.width, inEffect: "narrow" });
  });

  it("starts its time over when caught again", () => {
    const field = fieldOf("");
    catchCapsule(field, "wide", 0, 0);
    stepTimes(field, 600);

    catchCapsule(field, "wide", 0, 0);

    expect(field.effects["paddle-size"].endsAt).toBe(600 + stepsOf("wide"));
  });

  it("ends, every one, as the last ball is lost, and what falls goes", () => {
    const field = fieldOf("?", { gift: "life" });
    for (const id of ["wide", "fire", "net", "laser", "slow"] as const) {
      catchCapsule(field, id, 0, 0);
    }
    throwBall(field, 5, 29.5, 175);
    breakTop(field, 0);

    stepTimes(field, 10);

    expect({
      state: field.state,
      inEffect: Object.values(field.effects).filter((each) => each.capsule),
      falling: falling(field),
      field: {
        goal: field.paddle.goalWidth,
        ballKind: field.ballKind,
        mode: field.mode,
        net: field.net,
        paceScale: field.paceScale,
        climbRate: field.climbRate,
      },
    }).toEqual({
      state: "lost",
      inEffect: [],
      falling: [],
      field: {
        goal: PADDLE_WIDTH,
        ballKind: "normal",
        mode: null,
        net: false,
        paceScale: 1,
        climbRate: 1,
      },
    });
  });
});

describe("Slow", () => {
  it("brings the balls back to their base, and climbs half as fast", () => {
    const field = fieldOf("");
    field.climbed = 10;

    catchCapsule(field, "slow", 0, 0);

    expect({ climbed: field.climbed, rate: field.climbRate }).toEqual({
      climbed: 0,
      rate: 0.5,
    });
  });
});

describe("Fast", () => {
  it("speeds the balls up by a quarter", () => {
    const field = fieldOf("");
    catchCapsule(field, "fast", 0, 0);

    expect(field.paceScale).toBe(1.25);
  });
});

describe("Multiball", () => {
  it("splits a ball in flight into three, 25° apart", () => {
    const field = fieldOf("");
    throwBall(field, 13, 15, 10);

    catchCapsule(field, "multi", 0, 0);

    const headings = field.balls
      .filter((ball) => ball.live)
      .map((ball) => Math.round(headingOf(ball)));
    expect(headings).toEqual([10, 35, -15]);
  });

  it("makes no more balls than the field holds", () => {
    const field = fieldOf("");
    throwBall(field, 5, 15, 10, 0);
    throwBall(field, 13, 15, 10, 1);
    throwBall(field, 20, 15, 10, 2);

    catchCapsule(field, "multi", 0, 0);

    expect(field.balls.filter((ball) => ball.live)).toHaveLength(8);
  });

  it("leaves a ball on the paddle as it is", () => {
    const field = fieldFrom(KEEPER);

    catchCapsule(field, "multi", 0, 0);

    expect(field.balls.filter((ball) => ball.live)).toHaveLength(1);
  });
});

describe("Extra life", () => {
  it("brings a life, for the run to add", () => {
    const field = fieldOf("");

    catchCapsule(field, "life", 0, 0);

    expect({
      lives: field.livesGained,
      inEffect: field.effects.life.capsule,
    }).toEqual({ lives: 1, inEffect: null });
  });
});

describe("Catch", () => {
  /** The step in which the ball lands on the paddle, from 1.14 above it. */
  const LANDED = 9;

  /** Returns a field catching, its ball about to land 1 right of the paddle's middle. */
  function catching(): Field {
    const field = fieldOf("");
    catchCapsule(field, "catch", 0, 0);
    throwBall(field, 14, 26, 180);
    return field;
  }

  it("holds a ball where it lands on the paddle", () => {
    const field = catching();

    stepTimes(field, 10);

    expect(ballOf(field)).toMatchObject({
      held: true,
      x: 14,
      y: PADDLE_TOP - BALL_RADIUS,
    });
  });

  it("meets it once as it lands", () => {
    const field = catching();

    stepTimes(field, 10);

    expect(eventsOf(field)).toEqual(["caught", "paddle"]);
  });

  it("holds a ball the paddle moves into, meeting it once", () => {
    const field = fieldOf("");
    catchCapsule(field, "catch", 0, 0);
    throwBall(field, 13, PADDLE_TOP, 180);

    stepTimes(field, 5);

    expect({
      held: ballOf(field).held,
      events: eventsOf(field),
    }).toEqual({ held: true, events: ["caught", "paddle"] });
  });

  it("holds it as long as it may", () => {
    const field = catching();

    stepTimes(field, LANDED + stepsIn(CATCH_HOLD_MS) - 1);

    expect(ballOf(field).held).toBe(true);
  });

  it("then lets it go by where it landed", () => {
    const field = catching();

    stepTimes(field, LANDED + stepsIn(CATCH_HOLD_MS));

    expect({
      held: ballOf(field).held,
      heading: Math.round(headingOf(ballOf(field))),
    }).toEqual({ held: false, heading: PADDLE_ANGLE / 2 });
  });

  it("lets it go at once when the player launches", () => {
    const field = catching();
    stepTimes(field, 10);

    launch(field);

    expect({
      held: ballOf(field).held,
      events: eventsOf(field),
    }).toEqual({ held: false, events: ["caught", "paddle", "launched"] });
  });

  it("keeps a ball caught at its end on it as it shrinks, and in the field", () => {
    const field = fieldOf("");
    catchCapsule(field, "catch", 0, 0);
    throwBall(field, 15, 26, 180);
    stepTimes(field, 10);
    catchCapsule(field, "narrow", 0, 0);
    stepTimes(field, 60);
    steerField(field, { to: FIELD_WIDTH, by: 0, push: 0 });
    stepTimes(field, 30);

    launch(field);
    stepTimes(field, 30);

    const ball = ballOf(field);
    expect({
      live: ball.live,
      inField: ball.x >= BALL_RADIUS && ball.x <= FIELD_WIDTH - BALL_RADIUS,
    }).toEqual({ live: true, inField: true });
  });
});

describe("Net", () => {
  it("turns back a ball that falls past the paddle, and goes", () => {
    const field = fieldOf("");
    catchCapsule(field, "net", 0, 0);
    const ball = throwBall(field, 5, 27, 180);

    stepTimes(field, 20);

    expect({
      up: ball.dy < 0,
      net: field.net,
      events: eventsOf(field),
    }).toEqual({ up: true, net: false, events: ["caught", "netted"] });
  });

  it("turns back only one", () => {
    const field = fieldOf("");
    catchCapsule(field, "net", 0, 0);
    throwBall(field, 5, 27, 180, 0);
    throwBall(field, 20, 27.5, 180, 1);

    stepTimes(field, 40);

    expect(eventsOf(field)).toEqual(["caught", "netted", "lost"]);
  });
});
