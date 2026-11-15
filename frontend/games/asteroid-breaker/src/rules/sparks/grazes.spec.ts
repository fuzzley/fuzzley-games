import {
  KEEPER,
  fieldFrom,
  kindsLoggedOn,
  loggedOn,
  placeComet,
  placeRock,
  shipOf,
  stepTimes,
} from "../../testing/field_picture";
import type { Field } from "../field/field";
import { rockHitRadius } from "../rocks/rocks";
import {
  COMET_RADIUS,
  GRAZE_MARGIN,
  GRAZE_STATIC,
  SHIP_HIT_RADIUS,
} from "../tuning";
import { countGrazes, spendPasses } from "./grazes";

/** A picture of the ship, the keeper far off it. */
const SHIP_PICTURE = [...KEEPER, "", "", "", ".........^"];

/** How far from the pod's middle a small rock touches its hit circle. */
const TOUCH = SHIP_HIT_RADIUS + rockHitRadius("small");

/** Where a small rock lies off the pod: clear, near the hit circle, touching it, and just beyond a near miss. */
const CLEAR = TOUCH + GRAZE_MARGIN + 3;
const NEAR = TOUCH + GRAZE_MARGIN / 2;
const TOUCHING = TOUCH - 0.1;
const BEYOND = TOUCH + GRAZE_MARGIN + 0.01;

/** Returns a field of the ship and the keeper. */
function shipField(): Field {
  return fieldFrom(SHIP_PICTURE);
}

/**
 * Moves what passes to each of a list of places in turn, so far to the
 * right of the pod, along a line through its middle, and counts the near
 * misses at each.
 */
function passAlong(
  field: Field,
  passing: { x: number; y: number },
  offsets: readonly number[],
): void {
  const ship = shipOf(field);
  for (const offset of offsets) {
    passing.x = ship.x + offset;
    passing.y = ship.y;
    countGrazes(field);
  }
}

/** Returns how many near misses a field has logged. */
function grazesOn(field: Field): number {
  return kindsLoggedOn(field).filter((kind) => kind === "grazed").length;
}

describe("countGrazes", () => {
  it("counts a rock that came near the pod's hit circle untouched as it draws off, logged at the ship the way to it, and adds its static", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);
    const { x, y } = shipOf(field);

    passAlong(field, rock, [CLEAR, NEAR, CLEAR]);

    expect([loggedOn(field), field.charge.level]).toEqual([
      [expect.objectContaining({ kind: "grazed", x, y, wayX: 1, wayY: 0 })],
      GRAZE_STATIC,
    ]);
  });

  it("holds static from the near miss before it drains", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);
    field.steps = 300;

    passAlong(field, rock, [CLEAR, NEAR, CLEAR]);

    expect(field.charge.lastSparkAt).toBe(300);
  });

  it("counts none while a rock is still near", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);

    passAlong(field, rock, [CLEAR, NEAR, NEAR]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts a pass once, however long it stays near", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);

    passAlong(field, rock, [CLEAR, NEAR, NEAR, NEAR, CLEAR, CLEAR]);

    expect(grazesOn(field)).toBe(1);
  });

  it("counts a rock's next pass once it has drawn off clear", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);

    passAlong(field, rock, [CLEAR, NEAR, CLEAR, NEAR, CLEAR]);

    expect(grazesOn(field)).toBe(2);
  });

  it("counts none for a rock that touched the pod's hit circle on its pass", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);

    passAlong(field, rock, [CLEAR, NEAR, TOUCHING, NEAR, CLEAR]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts none for a rock that passed beyond a near miss", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);

    passAlong(field, rock, [CLEAR, BEYOND, CLEAR]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts none for a rock laid near the pod, as a piece is, drawing off", () => {
    const field = shipField();
    const ship = shipOf(field);
    const rock = placeRock(field, "small", ship.x + NEAR, ship.y);

    passAlong(field, rock, [NEAR, CLEAR]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts none for a rock broken on its pass", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);
    passAlong(field, rock, [CLEAR, NEAR]);
    rock.live = false;

    passAlong(field, rock, [CLEAR]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts a comet that came near the pod's hit circle untouched as it draws off", () => {
    const field = shipField();
    const comet = placeComet(field, 0, 0);
    const touch = SHIP_HIT_RADIUS + COMET_RADIUS;

    passAlong(field, comet, [touch + 3, touch + GRAZE_MARGIN / 2, touch + 3]);

    expect(grazesOn(field)).toBe(1);
  });

  it("counts none for a comet that touched the pod's hit circle on its pass", () => {
    const field = shipField();
    const comet = placeComet(field, 0, 0);
    const touch = SHIP_HIT_RADIUS + COMET_RADIUS;

    passAlong(field, comet, [touch + 3, touch - 0.1, touch + 3]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts a comet whose middle came onto the field near the pod's hit circle as it draws off, as it hits only from there", () => {
    const field = shipField();
    const ship = shipOf(field);
    ship.x = SHIP_HIT_RADIUS + COMET_RADIUS + GRAZE_MARGIN / 2 - 0.1;
    const comet = placeComet(field, -0.1, ship.y);

    for (const x of [-0.1, 0.1, 6]) {
      comet.x = x;
      countGrazes(field);
    }

    expect(grazesOn(field)).toBe(1);
  });

  it("counts none for a comet gone", () => {
    const field = shipField();
    const comet = placeComet(field, 0, 0);
    const touch = SHIP_HIT_RADIUS + COMET_RADIUS;
    passAlong(field, comet, [touch + 3, touch + GRAZE_MARGIN / 2]);
    comet.live = false;

    passAlong(field, comet, [touch + 3]);

    expect(grazesOn(field)).toBe(0);
  });

  it("counts none once the run is over", () => {
    const field = fieldFrom(KEEPER);
    const rock = placeRock(field, "small", 30, 20);

    for (const x of [30 + CLEAR, 30 + NEAR, 30 + CLEAR]) {
      rock.x = x;
      countGrazes(field);
    }

    expect(grazesOn(field)).toBe(0);
  });
});

describe("spendPasses", () => {
  it("spends a pass under way, so it is no near miss as it draws off", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);
    passAlong(field, rock, [CLEAR, NEAR]);

    spendPasses(field);
    passAlong(field, rock, [CLEAR]);

    expect(grazesOn(field)).toBe(0);
  });

  it("spends every rock's pass and every comet's", () => {
    const field = shipField();
    const rock = placeRock(field, "small", 0, 0);
    const comet = placeComet(field, 0, 0);
    rock.pass = "near";
    comet.pass = "near";

    spendPasses(field);

    expect([rock.pass, comet.pass]).toEqual(["spent", "spent"]);
  });
});

describe("a near miss in play", () => {
  it("counts a rock flying past the pod near its hit circle, once", () => {
    const field = shipField();
    const ship = shipOf(field);
    const rock = placeRock(field, "small", ship.x + 6, ship.y + NEAR);
    rock.vx = -6;

    stepTimes(field, 240);

    expect([grazesOn(field), rock.live]).toEqual([1, true]);
  });
});
