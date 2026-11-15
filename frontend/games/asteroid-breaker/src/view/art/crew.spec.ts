import type { Field } from "../../rules/field/field";
import type { Loose } from "../../rules/hazards/loose";
import type { TowLink } from "../../rules/ship/tow";
import { stepsIn } from "../../rules/stepper";
import type { Moving } from "../../rules/torus";
import {
  LOOSE_LIFE_MS,
  LOOSE_SWELL_MS,
  STRAY_RADIUS,
} from "../../rules/tuning";
import {
  PICTURE_TORUS as TORUS,
  fieldFrom,
  placeComet,
  placeLoose,
  placeRock,
  shipOf,
} from "../../testing/field_picture";
import {
  LOOSE_BLINK_MS,
  TOW_RADIUS,
  isLooseFrightened,
  looseBlinks,
  looseFaceOf,
  looseLookOf,
  looseRadius,
  towFaceOf,
  towLookOf,
} from "./crew";
import { BLINK_MS, FACE_MS, createFaceMoments } from "./faces";

/**
 * Returns a field with the pod flying in its corner, nose up, the first
 * crew's two in tow laid straight out below it, no rocks near, at a step
 * no one blinks at.
 */
function towField(): Field {
  const field = fieldFrom(["...", ".^.", "..."]);
  field.steps = stepsIn(BLINK_MS.takes);
  return field;
}

/** Returns a field's link of the line in tow at a place in it, failing the spec if it has none. */
function linkOf(field: Field, link: number): TowLink {
  const at = field.tow[link];
  if (!at) throw new Error(`The field has no link ${String(link)}.`);
  return at;
}

/** Returns one of the crew knocked loose on a field, knocked loose a number of steps before its step. */
function looseFor(field: Field, stepsAgo: number): Loose {
  const loose = placeLoose(field, 30, 20);
  loose.knockedAt = field.steps - stepsAgo;
  return loose;
}

/** Returns a record a look is written into. */
function blank(): Moving {
  return { x: 9, y: 9 };
}

describe("towFaceOf", () => {
  it("rests while the line flies and nothing has happened", () => {
    const field = towField();

    expect(towFaceOf(field, 0, createFaceMoments(), true)).toBe("rest");
  });

  it("is happy over a cleared wave", () => {
    const field = towField();
    field.cleared = true;

    expect(towFaceOf(field, 1, createFaceMoments(), true)).toBe("happy");
  });

  it("cheers a while after one of the crew is brought aboard", () => {
    const field = towField();
    const moments = createFaceMoments();
    moments.cheeredAt = field.steps - stepsIn(FACE_MS.happy) + 1;

    expect(towFaceOf(field, 0, moments, true)).toBe("happy");
  });

  it("gets over a cheer in a while", () => {
    const field = towField();
    const moments = createFaceMoments();
    moments.cheeredAt = field.steps - stepsIn(FACE_MS.happy);

    expect(towFaceOf(field, 0, moments, true)).toBe("rest");
  });

  it("eeps a while after one of the crew is knocked loose", () => {
    const field = towField();
    const moments = createFaceMoments();
    moments.knockedAt = field.steps - stepsIn(FACE_MS.eep) + 1;

    expect(towFaceOf(field, 1, moments, true)).toBe("eep");
  });

  it("gets over a fright in a while", () => {
    const field = towField();
    const moments = createFaceMoments();
    moments.knockedAt = field.steps - stepsIn(FACE_MS.eep);

    expect(towFaceOf(field, 1, moments, true)).toBe("rest");
  });

  it("cheers rather than eeping, as one knocked loose is caught again", () => {
    const field = towField();
    const moments = createFaceMoments();
    moments.knockedAt = field.steps;
    moments.cheeredAt = field.steps;

    expect(towFaceOf(field, 0, moments, true)).toBe("happy");
  });

  it("startles as a rock passes close to its bubble", () => {
    const field = towField();
    const at = linkOf(field, 0);
    placeRock(field, "small", at.x - 2.4, at.y);

    expect(towFaceOf(field, 0, createFaceMoments(), true)).toBe("eep");
  });

  it("pays a rock passing close to the one ahead no heed", () => {
    const field = towField();
    const at = linkOf(field, 0);
    placeRock(field, "small", at.x - 2.4, at.y);

    expect(towFaceOf(field, 1, createFaceMoments(), true)).toBe("rest");
  });

  it("pays a rock passing a little farther off no heed", () => {
    const field = towField();
    const at = linkOf(field, 0);
    placeRock(field, "small", at.x - 2.6, at.y);

    expect(towFaceOf(field, 0, createFaceMoments(), true)).toBe("rest");
  });

  it("startles as a comet crosses close to its bubble", () => {
    const field = towField();
    const at = linkOf(field, 1);
    placeComet(field, at.x + 2.4, at.y);

    expect(towFaceOf(field, 1, createFaceMoments(), true)).toBe("eep");
  });

  it("rests at a place no one rides, startled by no rock passing its link", () => {
    const field = towField();
    field.crew = { ...field.crew, tow: [1] };
    const at = linkOf(field, 1);
    placeRock(field, "small", at.x + 1, at.y);

    expect(towFaceOf(field, 1, createFaceMoments(), true)).toBe("rest");
  });

  it("sleeps while the pod waits", () => {
    const field = towField();
    shipOf(field).waiting = true;

    expect(towFaceOf(field, 0, createFaceMoments(), true)).toBe("sleepy");
  });

  it("blinks at the step its color's blink comes", () => {
    const field = towField();
    field.steps = stepsIn(BLINK_MS.lag);

    expect(towFaceOf(field, 0, createFaceMoments(), true)).toBe("blink");
  });

  it("never blinks where motion isn't welcome", () => {
    const field = towField();
    field.steps = stepsIn(BLINK_MS.lag);

    expect(towFaceOf(field, 0, createFaceMoments(), false)).toBe("rest");
  });
});

describe("towLookOf", () => {
  it("looks at the pod, the first in tow", () => {
    const field = towField();

    const look = towLookOf(field, 0, blank());

    expect(look.x).toBeCloseTo(0, 9);
    expect(look.y).toBeCloseTo(-1, 9);
  });

  it("looks at the one ahead of it", () => {
    const field = towField();
    linkOf(field, 0).x += 1.6;

    const look = towLookOf(field, 1, blank());

    expect(look.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(look.y).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it("looks at the nearest rock within its watch", () => {
    const field = towField();
    const at = linkOf(field, 1);
    placeRock(field, "small", at.x + 4, at.y);

    expect(towLookOf(field, 1, blank())).toEqual({ x: 1, y: 0 });
  });

  it("looks at the pod the short way across the field's edge", () => {
    const field = fieldFrom([...Array.from({ length: 9 }, () => "..."), ".^."]);

    const look = towLookOf(field, 0, blank());

    expect(linkOf(field, 0).y).toBeLessThan(1);
    expect(look.y).toBeCloseTo(-1, 9);
  });

  it("looks straight out with no pod", () => {
    const field = towField();
    field.ship = null;

    expect(towLookOf(field, 0, blank())).toEqual({ x: 0, y: 0 });
  });

  it("looks straight out from a place no one rides, its link left where it was laid", () => {
    const field = towField();
    field.crew = { ...field.crew, tow: [1] };

    expect(towLookOf(field, 1, blank())).toEqual({ x: 0, y: 0 });
  });

  it("looks straight out while it rides right on the one ahead", () => {
    const field = towField();
    const ahead = linkOf(field, 0);
    const at = linkOf(field, 1);
    at.x = ahead.x;
    at.y = ahead.y;

    expect(towLookOf(field, 1, blank())).toEqual({ x: 0, y: 0 });
  });

  it("writes into the record it is handed", () => {
    const field = towField();
    const into = blank();

    expect(towLookOf(field, 0, into)).toBe(into);
  });
});

describe("looseRadius", () => {
  it("is a bubble in tow's as it is knocked loose", () => {
    const field = towField();

    expect(looseRadius(looseFor(field, 0), field.steps)).toBe(TOW_RADIUS);
  });

  it("swells most of the way in the first half of its swell", () => {
    const field = towField();
    const loose = looseFor(field, stepsIn(LOOSE_SWELL_MS / 2));

    expect(looseRadius(loose, field.steps)).toBeGreaterThan(
      TOW_RADIUS + ((STRAY_RADIUS - TOW_RADIUS) * 3) / 4,
    );
  });

  it("is a stray's once it has swelled, and stays so", () => {
    const field = towField();
    const swelled = looseFor(field, stepsIn(LOOSE_SWELL_MS));
    const later = looseFor(field, stepsIn(LOOSE_SWELL_MS) * 3);

    expect([
      looseRadius(swelled, field.steps),
      looseRadius(later, field.steps),
    ]).toEqual([STRAY_RADIUS, STRAY_RADIUS]);
  });
});

describe("isLooseFrightened", () => {
  it("is in a fright for a while after it is knocked loose", () => {
    const field = towField();
    const loose = looseFor(field, stepsIn(FACE_MS.eep) - 1);

    expect(isLooseFrightened(loose, field.steps)).toBe(true);
  });

  it("gets over its fright in a while", () => {
    const field = towField();
    const loose = looseFor(field, stepsIn(FACE_MS.eep));

    expect(isLooseFrightened(loose, field.steps)).toBe(false);
  });
});

describe("looseFaceOf", () => {
  it("eeps in its fright", () => {
    const field = towField();
    const loose = looseFor(field, 0);

    expect(looseFaceOf(loose, field.steps, true)).toBe("eep");
  });

  it("pleads to be caught once over its fright", () => {
    const field = towField();
    const loose = looseFor(field, stepsIn(FACE_MS.eep));

    expect(looseFaceOf(loose, field.steps, true)).toBe("plead");
  });

  it("blinks as its color's blink comes, where motion is welcome", () => {
    const field = towField();
    field.steps = stepsIn(BLINK_MS.lag) * 6;
    const loose = looseFor(field, stepsIn(FACE_MS.eep));

    expect([
      looseFaceOf(loose, field.steps, true),
      looseFaceOf(loose, field.steps, false),
    ]).toEqual(["blink", "plead"]);
  });
});

describe("looseLookOf", () => {
  it("looks at the pod", () => {
    const at = { x: 30, y: 20 };

    expect(
      looseLookOf({ wayX: 1, wayY: 0 }, at, { x: 30, y: 25 }, TORUS, blank()),
    ).toEqual({ x: 0, y: 1 });
  });

  it("looks at the pod the short way across the field's edge", () => {
    const at = { x: 1, y: 20 };

    expect(
      looseLookOf({ wayX: 1, wayY: 0 }, at, { x: 70, y: 20 }, TORUS, blank()),
    ).toEqual({ x: -1, y: 0 });
  });

  it("looks the way it flies with no pod", () => {
    const at = { x: 30, y: 20 };

    expect(
      looseLookOf({ wayX: 0, wayY: -1 }, at, null, TORUS, blank()),
    ).toEqual({
      x: 0,
      y: -1,
    });
  });

  it("looks the way it flies with the pod right there", () => {
    const at = { x: 30, y: 20 };

    expect(looseLookOf({ wayX: -1, wayY: 0 }, at, at, TORUS, blank())).toEqual({
      x: -1,
      y: 0,
    });
  });

  it("writes into the record it is handed", () => {
    const into = blank();

    expect(
      looseLookOf({ wayX: 1, wayY: 0 }, { x: 0, y: 0 }, null, TORUS, into),
    ).toBe(into);
  });
});

describe("looseBlinks", () => {
  /** How many steps after it is knocked loose its last blinking stretch begins. */
  const BLINKS_FROM = stepsIn(LOOSE_LIFE_MS) - stepsIn(LOOSE_BLINK_MS);

  it("shows steadily until its last stretch", () => {
    const field = towField();
    const loose = looseFor(field, BLINKS_FROM - 1);

    expect(looseBlinks(loose, field.steps)).toBe(false);
  });

  it("blinks through its last stretch before it floats home", () => {
    const field = towField();
    const starting = looseFor(field, BLINKS_FROM);
    const ending = looseFor(field, stepsIn(LOOSE_LIFE_MS) - 1);

    expect([
      looseBlinks(starting, field.steps),
      looseBlinks(ending, field.steps),
    ]).toEqual([true, true]);
  });
});
