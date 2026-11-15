import { MOST_LIFT } from "@fz/style/fuzzball";
import type { Field } from "../../rules/field/field";
import type { FieldEventKind } from "../../rules/field/events";
import { rockHitRadius } from "../../rules/rocks/rocks";
import { stepsIn } from "../../rules/stepper";
import type { Moving } from "../../rules/torus";
import {
  COMET_RADIUS,
  SHIP_HIT_RADIUS,
  STATIC_MOST,
  STATIC_STEPS,
} from "../../rules/tuning";
import {
  fieldFrom,
  placeComet,
  placeRock,
  shipOf,
} from "../../testing/field_picture";
import {
  BLINK_MS,
  DASH_LEAN,
  FACE_MS,
  LEAN_MS,
  WATCH_REACH,
  adriftFaceOf,
  createFaceMoments,
  easeLean,
  faceOf,
  hearFace,
  isBlinking,
  liftOf,
  lookOf,
  pushOf,
} from "./faces";

/** The level static's first step starts from. */
const FIRST_STEP_FROM = Math.min(...STATIC_STEPS.map(({ from }) => from));

/** The ship's place in `podField()`'s picture. */
const POD = { x: 6, y: 6 } as const;

/** Returns a field with the pod flying in its corner, no rocks near, at a step past its first blink. */
function podField(): Field {
  const field = fieldFrom(["...", ".^.", "..."]);
  field.steps = stepsIn(BLINK_MS.takes);
  return field;
}

/** Returns a record a look or a push is written into. */
function blank(): Moving {
  return { x: 0, y: 0 };
}

describe("faceOf", () => {
  it("rests while the pod flies and nothing has happened", () => {
    const field = podField();

    expect(faceOf(field, createFaceMoments(), true)).toBe("rest");
  });

  it("rests with no pod", () => {
    const field = podField();
    field.ship = null;

    expect(faceOf(field, createFaceMoments(), true)).toBe("rest");
  });

  it("sleeps while the pod waits", () => {
    const field = podField();
    shipOf(field).waiting = true;

    expect(faceOf(field, createFaceMoments(), true)).toBe("sleepy");
  });

  it("sets its face while the pod thrusts", () => {
    const field = podField();
    shipOf(field).held.thrust = 1;

    expect(faceOf(field, createFaceMoments(), true)).toBe("set");
  });

  it("sets its face while the pod fires", () => {
    const field = podField();
    shipOf(field).held.fire = true;

    expect(faceOf(field, createFaceMoments(), true)).toBe("set");
  });

  it("squeezes in a dash, whatever else it answers", () => {
    const field = podField();
    shipOf(field).dashSteps = 3;
    const moments = createFaceMoments();
    moments.knockedAt = field.steps;

    expect(faceOf(field, moments, true)).toBe("squeeze");
  });

  it("is dizzy for as long as a hit keeps the pod untouchable", () => {
    const field = podField();
    const moments = createFaceMoments();
    hearFace(moments, { kind: "knocked" }, field.steps);
    field.steps += stepsIn(FACE_MS.dizzy) - 1;

    expect(faceOf(field, moments, true)).toBe("dizzy");
  });

  it("gets over a hit once the pod is touchable again", () => {
    const field = podField();
    const moments = createFaceMoments();
    hearFace(moments, { kind: "knocked" }, field.steps);
    field.steps += stepsIn(FACE_MS.dizzy);

    expect(faceOf(field, moments, true)).toBe("rest");
  });

  it("gets over a near miss in a while", () => {
    const field = podField();
    const moments = createFaceMoments();
    moments.startledAt = field.steps;
    field.steps += stepsIn(FACE_MS.eep);

    expect(faceOf(field, moments, true)).toBe("rest");
  });

  it("gets over a catch in a while", () => {
    const field = podField();
    const moments = createFaceMoments();
    moments.cheeredAt = field.steps;
    field.steps += stepsIn(FACE_MS.happy);

    expect(faceOf(field, moments, true)).toBe("rest");
  });

  it.each<FieldEventKind>(["shielded", "grazed"])(
    "eeps as a Shield takes a rock for the pod, or as one passes near it untouched, as the rules count a near miss, %s",
    (kind) => {
      const field = podField();
      const moments = createFaceMoments();
      hearFace(moments, { kind }, field.steps);

      expect(faceOf(field, moments, true)).toBe("eep");
    },
  );

  it("is dizzy rather than eeping after a hit and a near miss", () => {
    const field = podField();
    const moments = createFaceMoments();
    moments.knockedAt = field.steps;
    moments.startledAt = field.steps;

    expect(faceOf(field, moments, true)).toBe("dizzy");
  });

  it.each<FieldEventKind>(["joined", "home", "recaught", "cleared"])(
    "is happy a while after a stray or one of the crew is brought back, %s",
    (kind) => {
      const field = podField();
      const moments = createFaceMoments();
      hearFace(moments, { kind }, field.steps);
      field.steps += stepsIn(FACE_MS.happy) - 1;

      expect(faceOf(field, moments, true)).toBe("happy");
    },
  );

  it("is happy over a cleared wave, however long ago it cleared", () => {
    const field = podField();
    field.cleared = true;

    expect(faceOf(field, createFaceMoments(), true)).toBe("happy");
  });

  it("is happy over a cleared wave caught in a dash", () => {
    const field = podField();
    field.cleared = true;
    shipOf(field).dashSteps = 3;

    expect(faceOf(field, createFaceMoments(), true)).toBe("happy");
  });

  it("is happy over a wave cleared by the rock that hit the pod", () => {
    const field = podField();
    field.cleared = true;
    const moments = createFaceMoments();
    moments.knockedAt = field.steps;

    expect(faceOf(field, moments, true)).toBe("happy");
  });

  it("eeps rather than cheering after a near miss and a catch", () => {
    const field = podField();
    const moments = createFaceMoments();
    moments.cheeredAt = field.steps;
    moments.startledAt = field.steps;

    expect(faceOf(field, moments, true)).toBe("eep");
  });

  it("cheers rather than sleeping or setting its face", () => {
    const field = podField();
    shipOf(field).held.thrust = 1;
    const moments = createFaceMoments();
    moments.cheeredAt = field.steps;

    expect(faceOf(field, moments, true)).toBe("happy");
  });

  it("ignores an event that asks nothing of its face", () => {
    const field = podField();
    const moments = createFaceMoments();
    hearFace(moments, { kind: "fired" }, field.steps);

    expect(moments).toEqual(createFaceMoments());
  });

  it("blinks at the step its color's blink comes", () => {
    const field = podField();
    field.crew = { ...field.crew, pilot: 2 };
    field.steps = 2 * stepsIn(BLINK_MS.lag);

    expect(faceOf(field, createFaceMoments(), true)).toBe("blink");
  });

  it("never blinks where motion isn't welcome", () => {
    const field = podField();
    field.steps = 0;

    expect(faceOf(field, createFaceMoments(), false)).toBe("rest");
  });
});

describe("isBlinking", () => {
  it("blinks every while, for as long as a blink takes", () => {
    const every = stepsIn(BLINK_MS.every);
    const shut = Array.from({ length: 3 * every }, (_, step) =>
      isBlinking(step, 0, true),
    ).filter(Boolean).length;

    expect(shut).toBe(3 * stepsIn(BLINK_MS.takes));
  });

  it("blinks each pilot's color a while after the color before it", () => {
    const at = stepsIn(BLINK_MS.lag);

    expect([isBlinking(at, 0, true), isBlinking(at, 1, true)]).toEqual([
      false,
      true,
    ]);
  });

  it("holds a later color's eyes open as the field's steps begin", () => {
    expect(isBlinking(0, 1, true)).toBe(false);
  });

  it("holds its eyes open where motion isn't welcome", () => {
    expect(isBlinking(0, 0, false)).toBe(false);
  });
});

describe("adriftFaceOf", () => {
  it("pleads between blinks", () => {
    expect(adriftFaceOf(stepsIn(BLINK_MS.takes), 0, true)).toBe("plead");
  });

  it("blinks as its color's blink comes", () => {
    expect(adriftFaceOf(0, 0, true)).toBe("blink");
  });
});

describe("lookOf", () => {
  it("looks the way the pod points with nothing near", () => {
    const field = podField();

    const look = lookOf(field, Math.PI / 2, blank());

    expect([look.x, look.y]).toEqual([
      expect.closeTo(0, 9),
      expect.closeTo(1, 9),
    ]);
  });

  it("looks at the nearest rock within its watch", () => {
    const field = podField();
    const watch = rockHitRadius("small") + SHIP_HIT_RADIUS + WATCH_REACH;
    placeRock(field, "small", POD.x + watch, POD.y);
    placeRock(field, "small", POD.x, POD.y + watch - 1);

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 0, y: 1 });
  });

  it("looks past a rock beyond its watch", () => {
    const field = podField();
    const watch = rockHitRadius("small") + SHIP_HIT_RADIUS + WATCH_REACH;
    placeRock(field, "small", POD.x, POD.y + watch + 0.1);

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 1, y: 0 });
  });

  it("pays no heed to a comet yet to come onto the field across the wrap", () => {
    const field = podField();
    placeComet(field, field.torus.width + 2, POD.y);

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 1, y: 0 });
  });

  it("pays no heed to a comet gone by", () => {
    const field = podField();
    placeComet(field, POD.x, POD.y + 2).live = false;

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 1, y: 0 });
  });

  it("looks past a rock that broke", () => {
    const field = podField();
    placeRock(field, "small", POD.x, POD.y + 2).live = false;

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 1, y: 0 });
  });

  it("looks at a rock within its watch across the field's edge", () => {
    const field = podField();
    const gap = rockHitRadius("small") + SHIP_HIT_RADIUS + WATCH_REACH - 1;
    placeRock(field, "small", POD.x - gap + field.torus.width, POD.y);

    const look = lookOf(field, Math.PI / 2, blank());

    expect(look).toEqual({ x: -1, y: 0 });
  });

  it("looks at a comet crossing within its watch", () => {
    const field = podField();
    placeComet(field, POD.x, POD.y + COMET_RADIUS + SHIP_HIT_RADIUS + 1);

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 0, y: 1 });
  });

  it("pays no heed to a comet still being warned of", () => {
    const field = podField();
    placeComet(field, POD.x, POD.y + COMET_RADIUS).warnSteps = 10;

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 1, y: 0 });
  });

  it("looks straight out from a rock right on the pod", () => {
    const field = podField();
    placeRock(field, "small", POD.x, POD.y);

    const look = lookOf(field, 0, blank());

    expect(look).toEqual({ x: 0, y: 0 });
  });

  it("looks straight out with no pod", () => {
    const field = podField();
    field.ship = null;

    const look = lookOf(field, 0, { x: 1, y: 1 });

    expect(look).toEqual({ x: 0, y: 0 });
  });

  it("writes into the record it is handed", () => {
    const into = blank();

    expect(lookOf(podField(), 0, into)).toBe(into);
  });
});

describe("liftOf", () => {
  it("lies flat with no static", () => {
    expect(liftOf(podField())).toBe(0);
  });

  it("lies flat just short of static's first step", () => {
    const field = podField();
    field.charge.level = FIRST_STEP_FROM - 1;

    expect(liftOf(field)).toBe(0);
  });

  it.each(STATIC_STEPS.map(({ from, times }) => [from, times - 1]))(
    "lifts at each of static's steps, from %i to %i",
    (level, lift) => {
      const field = podField();
      field.charge.level = level;

      expect(liftOf(field)).toBe(lift);
    },
  );

  it("stands on end at full static", () => {
    const field = podField();
    field.charge.level = STATIC_MOST;

    expect(liftOf(field)).toBe(MOST_LIFT);
  });

  it("stays lifted over a cleared wave, as static is carried to the next", () => {
    const field = podField();
    field.charge.level = STATIC_MOST;
    field.cleared = true;

    expect(liftOf(field)).toBe(MOST_LIFT);
  });
});

describe("pushOf", () => {
  it("pushes the way the pod points as hard as it thrusts", () => {
    const field = podField();
    shipOf(field).held.thrust = 0.5;

    const push = pushOf(field, 0, blank());

    expect(push).toEqual({ x: 0.5, y: 0 });
  });

  it("pushes harder in a dash", () => {
    const field = podField();
    shipOf(field).dashSteps = 2;

    const push = pushOf(field, Math.PI, blank());

    expect([push.x, push.y]).toEqual([-DASH_LEAN, expect.closeTo(0, 9)]);
  });

  it("pushes nothing over a cleared wave, caught in a dash", () => {
    const field = podField();
    field.cleared = true;
    shipOf(field).dashSteps = 2;

    expect(pushOf(field, 0, blank())).toEqual({ x: 0, y: 0 });
  });

  it("pushes nothing as the pod coasts", () => {
    const field = podField();

    expect(pushOf(field, 0, blank())).toEqual({ x: 0, y: 0 });
  });

  it("pushes nothing with no pod", () => {
    const field = podField();
    field.ship = null;

    expect(pushOf(field, 0, blank())).toEqual({ x: 0, y: 0 });
  });
});

describe("easeLean", () => {
  it("leans into a push faster than it settles from one", () => {
    const into = easeLean(blank(), { x: 1, y: 0 }, 16, true);
    const settled = easeLean({ x: 1, y: 0 }, blank(), 16, true);

    expect(into.x).toBeGreaterThan(1 - settled.x);
  });

  it("settles most of the way in the time it takes", () => {
    const lean = easeLean({ x: 1, y: 0 }, blank(), LEAN_MS.settle, true);

    expect(lean.x).toBeCloseTo(Math.exp(-3), 2);
  });

  it("follows the push at once where motion isn't welcome", () => {
    const lean = easeLean({ x: 1, y: 0 }, { x: 0, y: 2 }, 16, false);

    expect(lean).toEqual({ x: 0, y: 2 });
  });

  it("writes into the lean it is handed", () => {
    const lean = blank();

    expect(easeLean(lean, { x: 1, y: 0 }, 16, true)).toBe(lean);
  });
});
