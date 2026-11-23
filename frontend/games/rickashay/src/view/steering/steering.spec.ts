import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { FIRST_X } from "@fz/brick-wall/rules/field";
import { boardCanvas } from "@fz/brick-wall/testing/canvases";
import {
  type PointerAiming,
  STRAIGHT_UP,
} from "@fz/brick-wall/view/aim_settings";
import type { AimFrame, PointerView } from "@fz/brick-wall/view/aiming";
import {
  type FieldMetrics,
  fieldMetrics,
  fieldShape,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import { Steering } from "./steering";

/** An upright phone's canvas: a field 17 rows deep at 40 device px a unit, its cells from (15, 48). */
const PHONE = boardCanvas(390, 844);

/** The field laid out on {@link PHONE}. */
const METRICS = fieldMetrics(PHONE, fieldShape(PHONE));

/** The aim from the floor's middle at a place a unit to the right and a unit up from the fuzzball's middle: 45°. */
const RIGHT_45 = 148;

/** The aim 45° up on the left, the mirror of {@link RIGHT_45}. */
const LEFT_45 = AIM_COUNT - 1 - RIGHT_45;

/** How many frames a press is held for, still, in the specs that hold one: four seconds at 60 frames a second. */
const LONG_HOLD_FRAMES = 240;

/** Returns a steering of the field laid out on {@link PHONE}, its pointers aiming as given. */
function steeringOf(aiming: PointerAiming = "pointAndHold"): Steering {
  const steering = new Steering(METRICS, PHONE);
  steering.aimWith(aiming);
  return steering;
}

/** Returns a finger at a place of a field, in field units, changed as given. */
function finger(
  x: number,
  y: number,
  changes: Partial<PointerView> = {},
  metrics: FieldMetrics = METRICS,
): PointerView {
  const place = toCanvas(metrics, x, y);
  return {
    id: 1,
    x: place.x,
    y: place.y,
    wasTouch: true,
    button: 0,
    wasCanceled: false,
    ...changes,
  };
}

/** Returns the mouse at a place of a field, in field units, changed as given. */
function mouse(
  x: number,
  y: number,
  changes: Partial<PointerView> = {},
  metrics: FieldMetrics = METRICS,
): PointerView {
  return { ...finger(x, y, {}, metrics), id: 0, wasTouch: false, ...changes };
}

/** Reads a frame of the steering, the fuzzball waiting at the floor's middle. */
function frame(steering: Steering): Readonly<AimFrame> {
  return steering.read(FIRST_X);
}

/** Reads some frames of the steering, and returns whether any let a shot fly. */
function anyReleased(steering: Steering, frames: number): boolean {
  let released = false;
  for (let read = 0; read < frames; read++) {
    released ||= frame(steering).release;
  }
  return released;
}

// Every wall game's `Aiming` is specced in full in @fz/brick-wall; these
// hold the steering to the design's "Controls" for a shot that is an aim
// alone, and to handing each input on.

describe("Steering, at its start", () => {
  it("aims straight up, with nothing let fly, no keys and no finger aiming", () => {
    const steering = steeringOf();

    const first = frame(steering);

    expect(first).toEqual({
      aim: STRAIGHT_UP,
      release: false,
      keyed: false,
      touch: false,
      touchX: 0,
      touchY: 0,
    });
  });

  it("points and holds unless the settings say otherwise", () => {
    const steering = new Steering(METRICS, PHONE);

    steering.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering).aim).toBe(RIGHT_45);
  });
});

describe("Steering's pointer, pointing and holding", () => {
  it("aims at the mouse unpressed, so its guide follows it", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    frame(steering);

    steering.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(steering).aim).toBe(LEFT_45);
  });

  it("aims from where the fuzzball waits", () => {
    const steering = steeringOf();
    steering.read(2);

    steering.pointerMove(mouse(1, 1.25));

    expect(steering.read(2).aim).toBe(LEFT_45);
  });

  it("lets a click fly at the aim the guide shows", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));

    steering.pointerDown(mouse(FIRST_X + 1, 1.25));
    steering.pointerUp(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("aims at a finger as it presses, and says where it is", () => {
    const steering = steeringOf();
    const pressed = finger(FIRST_X - 1, 1.25);

    steering.pointerDown(pressed);

    expect(frame(steering)).toMatchObject({
      aim: LEFT_45,
      touch: true,
      touchX: pressed.x,
      touchY: pressed.y,
    });
  });

  it("follows a finger as it drags", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 5));

    steering.pointerMove(finger(FIRST_X + 1, 1.25));

    expect(frame(steering).aim).toBe(RIGHT_45);
  });

  it("lets nothing fly while a finger is held, however long", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(FIRST_X + 1, 1.25));

    const released = anyReleased(steering, LONG_HOLD_FRAMES);

    expect(released).toBe(false);
  });

  it("lets the shot fly as a long held finger lets go, at the aim it last showed", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 5));
    steering.pointerMove(finger(FIRST_X + 1, 1.25));
    anyReleased(steering, LONG_HOLD_FRAMES);

    steering.pointerUp(finger(FIRST_X + 1, 1.25));

    expect(frame(steering)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("aims at the mouse on the field it is handed last", () => {
    const wide = boardCanvas(1280, 800);
    const metrics = fieldMetrics(wide, fieldShape(wide));
    const steering = steeringOf();
    steering.measure(metrics, wide);

    steering.pointerMove(mouse(FIRST_X + 1, 1.25, {}, metrics));

    expect(frame(steering).aim).toBe(RIGHT_45);
  });
});

describe("Steering's pointer, pulling back", () => {
  it("aims opposite a finger's drag", () => {
    const steering = steeringOf("pullBack");
    steering.pointerDown(finger(4.5, 8));

    steering.pointerMove(finger(2.5, 6));

    expect(frame(steering).aim).toBe(RIGHT_45);
  });

  it("keeps the aim while a drag is within half a unit of its press", () => {
    const steering = steeringOf("pullBack");
    steering.pointerDown(finger(4.5, 8));

    steering.pointerMove(finger(4.2, 7.7));

    expect(frame(steering).aim).toBe(STRAIGHT_UP);
  });

  it("calls the shot off as a drag is let go within half a unit of its press", () => {
    const steering = steeringOf("pullBack");
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(4.2, 7.7));

    steering.pointerUp(finger(4.2, 7.7));

    expect(frame(steering).release).toBe(false);
  });

  it("lets the shot fly as a drag half a unit long is let go", () => {
    const steering = steeringOf("pullBack");
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(4.5, 7.5));

    steering.pointerUp(finger(4.5, 7.5));

    expect(frame(steering).release).toBe(true);
  });
});

describe("Steering's shot called off", () => {
  it("calls a mouse's shot off at a right click, so letting go flies nothing", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));

    steering.pointerDown(mouse(4.5, 5, { button: 2 }));
    steering.pointerUp(mouse(4.5, 5));

    expect(frame(steering).release).toBe(false);
  });

  it("calls a finger's shot off at a second finger, so neither flies", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 5));

    steering.pointerDown(finger(6, 6, { id: 2 }));
    steering.pointerUp(finger(4.5, 5));
    steering.pointerUp(finger(6, 6, { id: 2 }));

    expect(frame(steering).release).toBe(false);
  });

  it("calls a shot off as the player looks away, so letting go flies nothing", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 5));

    steering.callOff();
    steering.pointerUp(finger(4.5, 5));

    expect(frame(steering)).toMatchObject({ release: false, touch: false });
  });
});
