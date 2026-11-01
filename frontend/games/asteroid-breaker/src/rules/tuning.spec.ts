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
  SHOT_LIFE_MS,
  SHOT_SPEED,
  STEP_S,
  THRUST,
  TOP_SPEED,
} from "./tuning";

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
});
