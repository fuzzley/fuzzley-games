import { stepsBetween } from "../testing/numbers";
import { RADIANS_PER_DEGREE } from "./angles";
import { PICKUPS } from "./catalog/pickups";
import { ROCK_KINDS, ROCK_SIZES } from "./catalog/rocks";
import { PILOT_COLORS } from "./pilots";
import { stepsIn } from "./stepper";
import {
  CHAIN,
  CHAIN_MS,
  COAST_HALF_LIFE_MS,
  COMET_MARGIN,
  COMET_RADIUS,
  COMET_TILT,
  DASH_CARRY,
  DASH_GUARD_MS,
  DASH_MS,
  DASH_RECHARGE_MS,
  DASH_SPEED,
  DROUGHT_MS,
  ENTRY_ALONG,
  FIELD_LONGEST_SIDE,
  FIELD_SHORT_SIDE,
  FIRST_SHIP_POINTS,
  FIRST_SHIPS,
  HEADING_EASE,
  HEADING_TURN_RATE,
  KEY_TURN_RAMP_MS,
  MAX_SHIPS,
  PICKUP_BLINK_MS,
  PICKUP_CATCH_REACH,
  PICKUP_DRIFT,
  PICKUP_LIFE_MS,
  PICKUP_PULL_REACH,
  PICKUP_PULL_SPEED,
  PIECE_PUSH,
  PIECE_TURN,
  ROCK_RADIUS,
  ROCK_SPEED,
  ROCK_SPIN,
  SHIP_HIT_RADIUS,
  SHIP_POINTS,
  SHOT_LIFE_MS,
  SHOT_SPEED,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_RADIUS,
  STRAY_SPEED,
  STRAY_TILT,
  STRAY_TURN,
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
    ["a stray's turn", STRAY_TURN],
    ["where along an edge a crossing comes in", ENTRY_ALONG],
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

  it("blinks a pickup only toward the end of its life", () => {
    expect(PICKUP_BLINK_MS).toBeLessThan(PICKUP_LIFE_MS / 2);
  });

  it("draws a pickup in faster than it drifts away", () => {
    expect(PICKUP_PULL_SPEED).toBeGreaterThan(PICKUP_DRIFT);
  });

  it("draws a pickup in from farther than the ship catches it", () => {
    expect(PICKUP_CATCH_REACH).toBeLessThan(PICKUP_PULL_REACH);
  });

  it("draws pickups in from farther with the Magnet", () => {
    expect(PICKUP_PULL_REACH).toBeLessThan(PICKUPS.magnet.effect.reach);
  });

  // So no pickup floats as a drought ends, and the one it lets go never
  // waits on how many may float at once.
  it("lets a drought outlast a pickup's life", () => {
    expect(DROUGHT_MS).toBeGreaterThan(PICKUP_LIFE_MS);
  });

  it("starts a run with a ship at least", () => {
    expect(FIRST_SHIPS).toBeGreaterThan(0);
  });

  it("starts a run with no more ships than it can have", () => {
    expect(FIRST_SHIPS).toBeLessThanOrEqual(MAX_SHIPS);
  });

  it("gives a full crew and a stray adrift a color each", () => {
    expect(MAX_SHIPS + 1).toBeLessThanOrEqual(PILOT_COLORS);
  });

  it("flies a stray slower than the ship's top speed, so the ship can catch it", () => {
    expect(STRAY_SPEED).toBeLessThan(TOP_SPEED);
  });

  it("brings a stray home once the ship touches its bubble", () => {
    expect(STRAY_CATCH_REACH).toBeGreaterThanOrEqual(
      STRAY_RADIUS + SHIP_HIT_RADIUS,
    );
  });

  // A stray leaves once its middle is its bubble's reach past an edge, and
  // a curve too wide to fit within that can't stay on the field, wherever a
  // Magnet leaves it.
  it("curves a stray's crossing too wide to stay on the field, so it always leaves", () => {
    const tightest = (2 * STRAY_SPEED) / (STRAY_TURN.most * RADIANS_PER_DEGREE);

    expect(tightest).toBeGreaterThan(FIELD_SHORT_SIDE + 2 * STRAY_RADIUS);
  });

  it("brings strays and comets in away from an edge's corners", () => {
    expect(Math.min(ENTRY_ALONG.least, 1 - ENTRY_ALONG.most)).toBeGreaterThan(
      0,
    );
  });

  it.each([
    ["a stray", STRAY_TILT],
    ["a comet", COMET_TILT],
  ])(
    "heads %s into the field, less than a quarter turn off straight across",
    (_, tilt) => {
      expect(tilt).toBeLessThan(90);
    },
  );

  it("starts a comet with its head out of sight", () => {
    expect(COMET_MARGIN).toBeGreaterThanOrEqual(COMET_RADIUS);
  });

  it("gives a chain's breaks more than a step to follow each other", () => {
    expect(stepsIn(CHAIN_MS)).toBeGreaterThan(1);
  });

  it("scores a longer chain more times, and each of its rows more than once", () => {
    const froms = CHAIN.map((row) => row.from);
    const times = CHAIN.map((row) => row.times);

    expect([
      stepsBetween(froms).filter((step) => step >= 0),
      stepsBetween(times).filter((step) => step >= 0),
      times.filter((n) => n <= 1),
    ]).toEqual([[], [], []]);
  });

  // A mark that didn't move on would gain a ship every step.
  it.each([
    ["the first ship", FIRST_SHIP_POINTS],
    ["each after it", SHIP_POINTS],
  ])("brings %s by points above 0", (_, points) => {
    expect(points).toBeGreaterThan(0);
  });
});
