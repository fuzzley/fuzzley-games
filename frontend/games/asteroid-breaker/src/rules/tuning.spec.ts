import { stepsBetween } from "../testing/numbers";
import { ROCK_KINDS, ROCK_SIZES } from "./catalog/rocks";
import { stepsIn } from "./stepper";
import {
  COAST_HALF_LIFE_MS,
  DASH_CARRY,
  DASH_GUARD_MS,
  DASH_MS,
  DASH_RECHARGE_MS,
  DASH_SPEED,
  FIELD_LONGEST_SIDE,
  FIELD_SHORT_SIDE,
  HEADING_EASE,
  HEADING_TURN_RATE,
  KEY_TURN_RAMP_MS,
  PIECE_PUSH,
  PIECE_TURN,
  ROCK_RADIUS,
  ROCK_SPEED,
  ROCK_SPIN,
  SHOT_LIFE_MS,
  SHOT_SPEED,
  STEP_S,
  THRUST,
  TOP_SPEED,
} from "./tuning";

/** Each size's radius, largest first. */
const RADII = ROCK_SIZES.map((size) => ROCK_RADIUS[size]);

/** Each size's speeds, largest first. */
const SPEEDS = ROCK_SIZES.map((size) => ROCK_SPEED[size]);

/** The slowest a rock kind flies, against its size's speed. */
const SLOWEST_KIND = Math.min(
  ...Object.values(ROCK_KINDS).map((kind) => kind.speed),
);

// The numbers are the game's to tune; these hold what tuning must not break.
describe("the tuning", () => {
  it("lets the field's long side grow no shorter than its short side", () => {
    expect(FIELD_LONGEST_SIDE).toBeGreaterThanOrEqual(FIELD_SHORT_SIDE);
  });

  it("lets full thrust bring the ship to its top speed against the coasting", () => {
    const fastest = (THRUST * COAST_HALF_LIFE_MS) / 1000 / Math.LN2;

    expect(fastest).toBeGreaterThan(TOP_SPEED);
  });

  it("ramps the keys' turn in over several steps, so a tap turns less than a held key", () => {
    expect(stepsIn(KEY_TURN_RAMP_MS)).toBeGreaterThanOrEqual(4);
  });

  it("eases the turn toward a heading within less than a quarter turn of it", () => {
    expect(HEADING_EASE).toBeLessThan(90);
  });

  it("slows the turn toward a heading over more than a step's turn, so the ship eases onto it", () => {
    expect(HEADING_TURN_RATE * STEP_S).toBeLessThan(HEADING_EASE);
  });

  it("throws a dash faster than the ship's top speed", () => {
    expect(DASH_SPEED).toBeGreaterThan(TOP_SPEED);
  });

  it("leaves a ship a little faster after a dash: by less than half its top speed", () => {
    expect(DASH_CARRY).toBeLessThan(TOP_SPEED / 2);
  });

  it("guards a dash for more steps than it throws the ship", () => {
    expect(stepsIn(DASH_GUARD_MS)).toBeGreaterThan(stepsIn(DASH_MS));
  });

  it("charges a dash only after its guard ends, so dashing can't keep the ship untouchable", () => {
    expect(stepsIn(DASH_RECHARGE_MS)).toBeGreaterThan(stepsIn(DASH_GUARD_MS));
  });

  it("flies a still ship's shot past the middle of the field's short side", () => {
    expect((SHOT_SPEED * SHOT_LIFE_MS) / 1000).toBeGreaterThan(
      FIELD_SHORT_SIDE / 2,
    );
  });

  // A shot carries the ship's velocity only up to its top speed, a dash's too.
  it("fades a shot at the fastest it goes before it circles the field's short side", () => {
    expect(((SHOT_SPEED + TOP_SPEED) * SHOT_LIFE_MS) / 1000).toBeLessThan(
      FIELD_SHORT_SIDE,
    );
  });

  it("fires a shot faster than a dash throws the ship, so a dashing ship never catches its shot", () => {
    expect(SHOT_SPEED + TOP_SPEED).toBeGreaterThan(DASH_SPEED);
  });

  it("makes each size of rock smaller than the size before", () => {
    expect(stepsBetween(RADII).filter((step) => step >= 0)).toEqual([]);
  });

  it("flies a broken rock's pieces faster than it, as both ends of their size's speeds rise", () => {
    const leasts = stepsBetween(SPEEDS.map((span) => span.least));
    const mosts = stepsBetween(SPEEDS.map((span) => span.most));

    expect([...leasts, ...mosts].filter((step) => step <= 0)).toEqual([]);
  });

  it.each([
    ["each size's speeds", ...SPEEDS],
    ["a rock's spin", ROCK_SPIN],
    ["a piece's turn", PIECE_TURN],
  ])("draws %s from a span above 0", (_, ...spans) => {
    const broken = spans.filter(
      (span) => !(span.least > 0 && span.least <= span.most),
    );

    expect(broken).toEqual([]);
  });

  it("turns a broken rock's pieces less than a quarter turn off its travel, so they fly on its way", () => {
    expect(PIECE_TURN.most).toBeLessThan(90);
  });

  it("pushes a piece along the hit by less than the slowest piece flies", () => {
    expect(PIECE_PUSH).toBeLessThan(ROCK_SPEED.large.least * SLOWEST_KIND);
  });
});
