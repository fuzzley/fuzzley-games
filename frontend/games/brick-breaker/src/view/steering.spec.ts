import { NO_INSETS } from "@fz/phaser/insets";
import { FIELD_HEIGHT } from "../rules/tuning";
import { type FieldMetrics, fieldMetrics, toCanvasX } from "./field_metrics";
import {
  type PointerView,
  Steering,
  TAP_CSS_PX,
  TAP_MS,
  TOUCH_STEERINGS,
  isTouchSteering,
} from "./steering";

/** Returns the metrics of a canvas of 400 by 300 CSS pixels: units of 9 at a pixel ratio of 1, 18 at 2. */
function metricsAt(pixelRatio = 1): FieldMetrics {
  return fieldMetrics(
    {
      width: 400 * pixelRatio,
      height: 300 * pixelRatio,
      pixelRatio,
      insets: NO_INSETS,
    },
    FIELD_HEIGHT,
  );
}

/** Returns a finger at a place of the field, in field units, changed as given. */
function finger(
  x: number,
  changes: Partial<PointerView> = {},
  metrics = metricsAt(),
): PointerView {
  return {
    id: 1,
    x: toCanvasX(metrics, x),
    y: 200,
    wasTouch: true,
    button: 0,
    wasCanceled: false,
    downTime: 1000,
    upTime: 1000,
    ...changes,
  };
}

/** Returns a mouse at a place of the field, in field units, changed as given. */
function mouse(x: number, changes: Partial<PointerView> = {}): PointerView {
  return { ...finger(x), wasTouch: false, ...changes };
}

describe("Steering's keys", () => {
  it.each([
    ["left", -1],
    ["right", 1],
  ] as const)("push the paddle %s while it is held", (key, push) => {
    const steering = new Steering(metricsAt());
    steering.press(key);

    expect(steering.read().push).toBe(push);
  });

  it.each([
    ["left", "right", 1],
    ["right", "left", -1],
  ] as const)(
    "push it the way of the key held last, %s then %s, while both are",
    (first, last, push) => {
      const steering = new Steering(metricsAt());
      steering.press(first);
      steering.press(last);

      expect(steering.read().push).toBe(push);
    },
  );

  it.each([
    ["right", -1],
    ["left", 1],
  ] as const)(
    "push it the way of the key still held, once %s is let go",
    (letGo, push) => {
      const steering = new Steering(metricsAt());
      steering.press("left");
      steering.press("right");
      steering.release(letGo);

      expect(steering.read().push).toBe(push);
    },
  );

  it("push it nowhere once let go", () => {
    const steering = new Steering(metricsAt());
    steering.press("right");
    steering.release("right");

    expect(steering.read().push).toBe(0);
  });

  it.each(["left", "right"] as const)(
    "push it nowhere once the steering lets go of %s",
    (key) => {
      const steering = new Steering(metricsAt());
      steering.press(key);

      steering.letGo();

      expect(steering.read().push).toBe(0);
    },
  );
});

describe("Steering's mouse", () => {
  it("asks for the place it moves to, in field units", () => {
    const steering = new Steering(metricsAt());

    steering.pointerMove(mouse(7.5));

    expect(steering.read().to).toBe(7.5);
  });

  it("asks for nothing on a frame it didn't move", () => {
    const steering = new Steering(metricsAt());
    steering.pointerMove(mouse(7.5));
    steering.read();

    expect(steering.read().to).toBeNull();
  });

  it("launches as it is pressed, there", () => {
    const steering = new Steering(metricsAt());

    const launches = steering.pointerDown(mouse(4), "drag");

    expect({ launches, to: steering.read().to }).toEqual({
      launches: true,
      to: 4,
    });
  });

  it("launches nothing as another button is pressed", () => {
    const steering = new Steering(metricsAt());

    expect(steering.pointerDown(mouse(4, { button: 2 }), "drag")).toBe(false);
  });

  it("is no tap as it is let go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(mouse(4), "drag");

    expect(steering.pointerUp(mouse(4))).toBe(false);
  });

  it("asks for nothing once the steering lets go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerMove(mouse(7.5));

    steering.letGo();

    expect(steering.read().to).toBeNull();
  });
});

describe("Steering's finger, dragging", () => {
  it("moves the paddle as far as it moves, from wherever it lands", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag");
    steering.pointerMove(finger(23));

    expect(steering.read()).toEqual({ to: null, by: 3, push: 0 });
  });

  it("moves the paddle only by what it moved since the last frame", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag");
    steering.pointerMove(finger(23));
    steering.read();
    steering.pointerMove(finger(22));

    expect(steering.read().by).toBe(-1);
  });

  it("launches nothing as it is pressed", () => {
    const steering = new Steering(metricsAt());

    expect(steering.pointerDown(finger(20), "drag")).toBe(false);
  });

  it("steers again once lifted and pressed anew, as another finger", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag");
    steering.pointerUp(finger(20));
    steering.pointerDown(finger(5, { id: 2 }), "drag");
    steering.pointerMove(finger(9, { id: 2 }));

    expect(steering.read().by).toBe(4);
  });

  it("is let alone by a second finger while it steers", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag");
    steering.pointerDown(finger(5, { id: 2 }), "drag");
    steering.pointerMove(finger(9, { id: 2 }));

    expect(steering.read().by).toBe(0);
  });
});

describe("Steering's finger, followed", () => {
  it("asks for the place it lands", () => {
    const steering = new Steering(metricsAt());

    steering.pointerDown(finger(6), "follow");

    expect(steering.read().to).toBe(6);
  });

  it("asks for the place it moves to", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(6), "follow");
    steering.pointerMove(finger(11));

    expect(steering.read()).toEqual({ to: 11, by: 0, push: 0 });
  });

  it("asks for nothing once the steering lets go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(6), "follow");

    steering.letGo();

    expect(steering.read().to).toBeNull();
  });
});

describe("Steering's taps", () => {
  it("launch, a finger pressed briefly that barely moved", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");

    const tapped = steering.pointerUp(finger(10, { upTime: 1000 + TAP_MS }));

    expect(tapped).toBe(true);
  });

  it("aren't a finger held longer", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");

    const tapped = steering.pointerUp(
      finger(10, { upTime: 1000 + TAP_MS + 1 }),
    );

    expect(tapped).toBe(false);
  });

  it("aren't a finger that moved farther, though it came back", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");
    steering.pointerMove(finger(12));

    expect(steering.pointerUp(finger(10))).toBe(false);
  });

  it("aren't a finger let go farther off than a tap moves", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");
    const moved = { x: toCanvasX(metricsAt(), 10) + TAP_CSS_PX + 1 };

    expect(steering.pointerUp(finger(10, moved))).toBe(false);
  });

  it("launch, a finger pressed briefly after one that dragged", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");
    steering.pointerMove(finger(14));
    steering.pointerUp(finger(14));
    steering.pointerDown(finger(14, { id: 2 }), "drag");

    expect(steering.pointerUp(finger(14, { id: 2 }))).toBe(true);
  });

  it("aren't a touch the browser took away", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");

    expect(steering.pointerUp(finger(10, { wasCanceled: true }))).toBe(false);
  });

  it("aren't a finger pressed as the steering let go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");

    steering.letGo();

    expect(steering.pointerUp(finger(10))).toBe(false);
  });

  it("measure how far a finger moved in CSS pixels, whatever the pixel ratio", () => {
    // At a pixel ratio of 2, a unit is 18 device pixels, and a tap may move
    // 16 of them.
    const metrics = metricsAt(2);
    const steering = new Steering(metrics);
    steering.pointerDown(finger(10, {}, metrics), "drag");
    const moved = { x: toCanvasX(metrics, 10) + TAP_CSS_PX * 2 };

    expect(steering.pointerUp(finger(10, moved, metrics))).toBe(true);
  });

  it("aren't the let-go of a second finger", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag");

    expect(steering.pointerUp(finger(10, { id: 2 }))).toBe(false);
  });
});

describe("Steering", () => {
  it("forgets the keys held and the finger pressed as it lets go", () => {
    const steering = new Steering(metricsAt());
    steering.press("left");
    steering.pointerDown(finger(20), "drag");
    steering.pointerMove(finger(23));

    steering.letGo();

    expect({
      steer: steering.read(),
      tapped: steering.pointerUp(finger(20)),
    }).toEqual({ steer: { to: null, by: 0, push: 0 }, tapped: false });
  });

  it("reads places by where the field now lies", () => {
    const steering = new Steering(metricsAt());
    const moved = metricsAt(2);
    steering.measure(moved);

    steering.pointerMove({ ...mouse(0), x: toCanvasX(moved, 8) });

    expect(steering.read().to).toBe(8);
  });

  it("writes each frame's steering into the same object", () => {
    const steering = new Steering(metricsAt());

    expect(steering.read()).toBe(steering.read());
  });
});

describe("isTouchSteering", () => {
  it.each(TOUCH_STEERINGS)("knows %s", (steering) => {
    expect(isTouchSteering(steering)).toBe(true);
  });

  it.each(["swipe", "", 1, null])("refuses %j", (value) => {
    expect(isTouchSteering(value)).toBe(false);
  });
});
