import type { Viewport } from "@fz/phaser/layout";
import { AIM_COUNT, FIRST_X } from "../../rules/tuning";
import { boardCanvas } from "../../testing/canvases";
import {
  type FieldMetrics,
  fieldMetrics,
  fieldShape,
  toCanvas,
} from "../field/field_metrics";
import { BY_POINTER, type PointerAimings, STRAIGHT_UP } from "./aiming";
import {
  HOLD_NOTCH_MS,
  type KeyPress,
  type PointerView,
  Steering,
  aimToward,
  chargeAfter,
} from "./steering";

/** An upright phone's canvas: a field 17 rows deep at 40 device px a unit, its cells from (15, 48). */
const PHONE = boardCanvas(390, 844);

/** The field laid out on {@link PHONE}. */
const METRICS = fieldMetrics(PHONE, fieldShape(PHONE));

/** A frame's time in these specs, which adds up to whole notches exactly. */
const FRAME_MS = 25;

/** Each kind of pointer pulling back. */
const PULLED: PointerAimings = { mouse: "pullBack", finger: "pullBack" };

/** Each kind of pointer pointing and holding. */
const POINTED: PointerAimings = {
  mouse: "pointAndHold",
  finger: "pointAndHold",
};

/** Returns a steering of a field laid out on a canvas, its pointers aiming as given. */
function steeringOf(
  aimings: PointerAimings = BY_POINTER,
  canvas: Viewport = PHONE,
  metrics: FieldMetrics = METRICS,
): Steering {
  const steering = new Steering(metrics, canvas);
  steering.aimWith(aimings);
  return steering;
}

/** Returns a finger at a place of the field, in field units, changed as given. */
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

/** Returns the mouse at a place of the field, in field units, changed as given. */
function mouse(
  x: number,
  y: number,
  changes: Partial<PointerView> = {},
): PointerView {
  return { ...finger(x, y), id: 0, wasTouch: false, ...changes };
}

/** Returns a key pressed, by `event.code`, changed as given. */
function key(code: string, changes: Partial<KeyPress> = {}): KeyPress {
  return { code, shiftKey: false, repeat: false, ...changes };
}

/** Presses a key some times over. */
function pressTimes(steering: Steering, code: string, times: number): void {
  for (let press = 0; press < times; press++) steering.keyDown(key(code));
}

/** Reads the steering for frames that add up to some milliseconds, the fuzzball waiting at the floor's middle. */
function readFor(steering: Steering, ms: number, frameMs = FRAME_MS): void {
  for (let played = 0; played < ms; played += frameMs) {
    steering.read(frameMs, FIRST_X);
  }
}

/** Reads a frame of the steering, the fuzzball waiting at the floor's middle. */
function frame(steering: Steering) {
  return steering.read(FRAME_MS, FIRST_X);
}

describe("aimToward", () => {
  it.each([
    ["straight up", 0, 1, STRAIGHT_UP],
    [
      "8° up on the right",
      Math.cos(Math.PI / 22.5),
      Math.sin(Math.PI / 22.5),
      0,
    ],
    ["45° up on the right", 1, 1, 148],
    [
      "45.1°, nearer 45°",
      Math.cos((45.1 * Math.PI) / 180),
      Math.sin((45.1 * Math.PI) / 180),
      148,
    ],
    [
      "45.2°, nearer 45.25°",
      Math.cos((45.2 * Math.PI) / 180),
      Math.sin((45.2 * Math.PI) / 180),
      149,
    ],
    ["along the floor to the right", 1, 0, 0],
    ["along the floor to the left", -1, 0, AIM_COUNT - 1],
    ["under the floor on the right", 1, -1, 0],
    ["under the floor on the left", -1, -1, AIM_COUNT - 1],
    ["straight down", 0, -1, 0],
  ])("snaps a heading %s to aim %i", (_name, across, up, aim) => {
    expect(aimToward(across, up)).toBe(aim);
  });
});

describe("chargeAfter", () => {
  it.each([
    [0, 0],
    [HOLD_NOTCH_MS - 1, 0],
    [HOLD_NOTCH_MS, 1],
    [4 * HOLD_NOTCH_MS, 4],
    [5 * HOLD_NOTCH_MS, 5],
    [6 * HOLD_NOTCH_MS - 1, 5],
    [6 * HOLD_NOTCH_MS, 4],
    [9 * HOLD_NOTCH_MS, 1],
    [10 * HOLD_NOTCH_MS, 0],
    [11 * HOLD_NOTCH_MS, 1],
  ])("charges a press held %i ms to %i", (ms, charge) => {
    expect(chargeAfter(ms)).toBe(charge);
  });
});

describe("Steering's keys", () => {
  it("start straight up with no charge", () => {
    const steering = steeringOf();

    expect(frame(steering)).toEqual({
      aim: STRAIGHT_UP,
      charge: 0,
      release: false,
      fast: false,
      keyed: false,
    });
  });

  it.each([
    ["ArrowLeft", false, STRAIGHT_UP + 4],
    ["KeyA", false, STRAIGHT_UP + 4],
    ["ArrowRight", false, STRAIGHT_UP - 4],
    ["KeyD", false, STRAIGHT_UP - 4],
    ["ArrowLeft", true, STRAIGHT_UP + 1],
    ["ArrowRight", true, STRAIGHT_UP - 1],
  ])("turn the aim at %s, Shift held %s, to %i", (code, shiftKey, aim) => {
    const steering = steeringOf();

    steering.keyDown(key(code, { shiftKey }));

    expect(frame(steering).aim).toBe(aim);
  });

  it.each([
    ["ArrowLeft", AIM_COUNT - 1],
    ["ArrowRight", 0],
  ])("hold the aim at its end however often %s is pressed", (code, aim) => {
    const steering = steeringOf();

    pressTimes(steering, code, 90);

    expect(frame(steering).aim).toBe(aim);
  });

  it.each([
    ["ArrowUp", 2],
    ["KeyW", 2],
  ])("raise the charge a notch at %s", (code, charge) => {
    const steering = steeringOf();
    steering.keyDown(key("ArrowUp"));

    steering.keyDown(key(code));

    expect(frame(steering).charge).toBe(charge);
  });

  it.each(["ArrowDown", "KeyS"])("lower the charge a notch at %s", (code) => {
    const steering = steeringOf();
    pressTimes(steering, "ArrowUp", 3);

    steering.keyDown(key(code));

    expect(frame(steering).charge).toBe(2);
  });

  it.each([
    ["ArrowUp", 5],
    ["ArrowDown", 0],
  ])(
    "hold the charge at its end however often %s is pressed",
    (code, charge) => {
      const steering = steeringOf();

      pressTimes(steering, code, 9);

      expect(frame(steering).charge).toBe(charge);
    },
  );

  it("let the shot fly at Space, at the aim and the charge", () => {
    const steering = steeringOf();
    steering.keyDown(key("ArrowLeft"));
    pressTimes(steering, "ArrowUp", 3);

    steering.keyDown(key("Space"));

    expect(frame(steering)).toMatchObject({
      aim: STRAIGHT_UP + 4,
      charge: 3,
      release: true,
    });
  });

  it("start the next shot at the same aim with no charge", () => {
    const steering = steeringOf();
    steering.keyDown(key("ArrowLeft"));
    pressTimes(steering, "ArrowUp", 3);
    steering.keyDown(key("Space"));
    frame(steering);

    const next = frame(steering);

    expect(next).toMatchObject({
      aim: STRAIGHT_UP + 4,
      charge: 0,
      release: false,
    });
  });

  it("let nothing fly at a held Space's repeat", () => {
    const steering = steeringOf();

    steering.keyDown(key("Space", { repeat: true }));

    expect(frame(steering).release).toBe(false);
  });

  it("count the first shot let fly in a frame, at its aim and its charge", () => {
    const steering = steeringOf();
    pressTimes(steering, "ArrowUp", 2);
    steering.keyDown(key("Space"));
    steering.keyDown(key("ArrowLeft"));
    steering.keyDown(key("ArrowUp"));

    steering.keyDown(key("Space"));

    expect(frame(steering)).toMatchObject({
      aim: STRAIGHT_UP,
      charge: 2,
      release: true,
    });
  });

  it.each(["ArrowLeft", "ArrowUp"])(
    "say the keys changed the shot on the frame %s was pressed",
    (code) => {
      const steering = steeringOf();

      steering.keyDown(key(code));

      expect(frame(steering).keyed).toBe(true);
    },
  );

  it("say nothing of the keys on the frame after", () => {
    const steering = steeringOf();
    steering.keyDown(key("ArrowLeft"));
    frame(steering);

    const next = frame(steering);

    expect(next.keyed).toBe(false);
  });

  it("say nothing of the keys for Space", () => {
    const steering = steeringOf();

    steering.keyDown(key("Space"));

    expect(frame(steering).keyed).toBe(false);
  });

  it("hold fast-forward while F is held", () => {
    const steering = steeringOf();

    steering.keyDown(key("KeyF"));

    expect(frame(steering).fast).toBe(true);
  });

  it("hold fast-forward through F's repeats", () => {
    const steering = steeringOf();
    steering.keyDown(key("KeyF"));

    steering.keyDown(key("KeyF", { repeat: true }));

    expect(frame(steering).fast).toBe(true);
  });

  it("let go of fast-forward as F is let go", () => {
    const steering = steeringOf();
    steering.keyDown(key("KeyF"));

    steering.keyUp("KeyF");

    expect(frame(steering).fast).toBe(false);
  });

  it.each([
    ["ArrowLeft", true],
    ["KeyS", true],
    ["Space", true],
    ["KeyF", true],
    ["KeyX", false],
    ["KeyR", false],
    ["KeyP", false],
    ["Enter", false],
    ["Escape", false],
    ["KeyQ", false],
  ])(
    "say whether they took %s, leaving the scene the rest: %s",
    (code, taken) => {
      const steering = steeringOf();

      expect(steering.keyDown(key(code))).toBe(taken);
    },
  );

  it("call a charge the keys chose off at Escape, taking it from the pause", () => {
    const steering = steeringOf();
    steering.keyDown(key("ArrowUp"));

    const taken = steering.keyDown(key("Escape"));

    expect([taken, frame(steering).charge]).toEqual([true, 0]);
  });

  it("call a pressed pointer's shot off at Escape, so its letting go flies nothing", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));

    const taken = steering.keyDown(key("Escape"));
    steering.pointerUp(mouse(4.5, 5));

    expect([taken, frame(steering).release]).toEqual([true, false]);
  });

  it("forget F and a press as the player looks away", () => {
    const steering = steeringOf();
    steering.keyDown(key("KeyF"));
    steering.pointerDown(mouse(4.5, 5));

    steering.letGo();
    steering.pointerUp(mouse(4.5, 5));

    expect(frame(steering)).toMatchObject({ fast: false, release: false });
  });
});

describe("Steering's pointer, pointing and holding", () => {
  it("aims at a mouse that hasn't pressed", () => {
    const steering = steeringOf();

    steering.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering).aim).toBe(148);
  });

  it("aims from where the fuzzball waits", () => {
    const steering = steeringOf();
    steering.read(FRAME_MS, 2);

    steering.pointerMove(mouse(1, 1.25));

    expect(steering.read(FRAME_MS, 2).aim).toBe(AIM_COUNT - 1 - 148);
  });

  it("keeps the aim while the mouse is on the fuzzball itself", () => {
    const steering = steeringOf();

    steering.pointerMove(mouse(FIRST_X + 0.1, 0.3));

    expect(frame(steering).aim).toBe(STRAIGHT_UP);
  });

  it("aims again at a mouse at rest as the fuzzball waits somewhere new", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(AIM_COUNT - 1 - 148);
  });

  it("keeps the keys' aim as the fuzzball waits somewhere new", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    steering.keyDown(key("ArrowLeft"));
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(152);
  });

  it("keeps a drag's aim as the fuzzball waits somewhere new", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));
    steering.pointerUp(finger(2.5, 6));
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(148);
  });

  it("keeps the aim of a finger lifted as the fuzzball waits somewhere new", () => {
    const steering = steeringOf(POINTED);
    steering.pointerDown(finger(FIRST_X + 1, 1.25));
    steering.pointerUp(finger(FIRST_X + 1, 1.25));
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(148);
  });

  it("keeps aiming at a mouse at rest through a sideways scroll", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    steering.wheel(0);
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(AIM_COUNT - 1 - 148);
  });

  it("keeps aiming at a mouse at rest as the settings change but leave it pointing", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    steering.aimWith(POINTED);
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(AIM_COUNT - 1 - 148);
  });

  it("stops aiming at a mouse at rest once the settings have it pull back", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    steering.aimWith(PULLED);
    frame(steering);

    const next = steering.read(FRAME_MS, FIRST_X + 2);

    expect(next.aim).toBe(148);
  });

  it("keeps the keys' aim until the mouse moves again", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    frame(steering);

    steering.keyDown(key("ArrowLeft"));

    expect(frame(steering).aim).toBe(152);
  });

  it("follows a pressed mouse", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));

    steering.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering).aim).toBe(148);
  });

  it("aims at a mouse that pulls back only while it is pressed", () => {
    const steering = steeringOf(PULLED);

    steering.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering).aim).toBe(STRAIGHT_UP);
  });

  it.each([
    [0, 0],
    [250, 1],
    [1250, 5],
    [1500, 4],
    [2500, 0],
    [2750, 1],
  ])("charges a press held %i ms to %i, for the meter", (ms, charge) => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));

    readFor(steering, ms);

    expect(frame(steering).charge).toBe(charge);
  });

  it("lets the shot fly as the press is let go, at the aim and the charge the last frame showed", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    readFor(steering, 725);

    steering.pointerUp(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering)).toMatchObject({
      aim: 148,
      charge: 2,
      release: true,
    });
  });

  it("lets the shot fly at the aim the guide showed though the mouse is let go past the canvas", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));

    steering.pointerUp({ ...mouse(FIRST_X + 1, 1.25), y: PHONE.height + 30 });

    expect(frame(steering)).toMatchObject({ aim: 148, release: true });
  });

  it.each([30, 60, 144])(
    "lets a press held 1.3 s fly at the same charge at %i frames a second",
    (rate) => {
      const steering = steeringOf();
      steering.pointerDown(mouse(4.5, 5));
      readFor(steering, 1300, 1000 / rate);

      steering.pointerUp(mouse(4.5, 5));

      expect(frame(steering).charge).toBe(5);
    },
  );

  it("starts each press's charge afresh", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));
    readFor(steering, 750);
    steering.pointerUp(mouse(4.5, 5));
    frame(steering);

    steering.pointerDown(mouse(4.5, 5));
    readFor(steering, 250);

    expect(frame(steering).charge).toBe(1);
  });

  it("keeps the wheel's nudge through a click where the mouse rests", () => {
    const steering = steeringOf();
    steering.pointerMove(mouse(FIRST_X + 1, 1.25));
    steering.wheel(-100);

    steering.pointerDown(mouse(FIRST_X + 1, 1.25));
    steering.pointerUp(mouse(FIRST_X + 1, 1.25));

    expect(frame(steering)).toMatchObject({ aim: 149, release: true });
  });

  it("lets a click fly plain", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));

    steering.pointerUp(mouse(4.5, 5));

    expect(frame(steering)).toMatchObject({ charge: 0, release: true });
  });

  it("lets a held press fly at Space, at the charge shown", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));
    readFor(steering, 750);

    steering.keyDown(key("Space"));

    expect(frame(steering)).toMatchObject({ charge: 3, release: true });
  });

  it("calls a charge off at a right click, so letting go flies nothing", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));
    readFor(steering, 750);

    steering.pointerDown(mouse(4.5, 5, { button: 2 }));
    steering.pointerUp(mouse(4.5, 5));

    expect(frame(steering)).toMatchObject({ charge: 0, release: false });
  });

  it.each([1, 2, 3, 4])(
    "charges and flies nothing at the mouse's button %i",
    (button) => {
      const steering = steeringOf();

      steering.pointerDown(mouse(4.5, 5, { button }));
      readFor(steering, 750);
      steering.pointerUp(mouse(4.5, 5, { button }));

      expect(frame(steering)).toMatchObject({ charge: 0, release: false });
    },
  );

  it("presses for the mouse however near the canvas's sides", () => {
    const steering = steeringOf();

    steering.pointerDown({ ...mouse(4.5, 5), x: 0 });
    steering.pointerUp({ ...mouse(4.5, 5), x: 0 });

    expect(frame(steering).release).toBe(true);
  });

  it("flies nothing as another of the mouse's buttons is let go while the main one is held", () => {
    const steering = steeringOf();
    steering.pointerDown(mouse(4.5, 5));

    steering.pointerUp(mouse(4.5, 5, { button: 1 }));

    expect(frame(steering).release).toBe(false);
  });

  it.each([
    [-100, STRAIGHT_UP + 1],
    [100, STRAIGHT_UP - 1],
    [0, STRAIGHT_UP],
  ])("turns the aim an aim at a wheel turned by %i", (deltaY, aim) => {
    const steering = steeringOf();

    steering.wheel(deltaY);

    expect(frame(steering).aim).toBe(aim);
  });

  it("aims at a finger pressed where the settings have it point and hold", () => {
    const steering = steeringOf(POINTED);

    steering.pointerDown(finger(FIRST_X - 1, 1.25));

    expect(frame(steering).aim).toBe(AIM_COUNT - 1 - 148);
  });

  it("charges a finger held where the settings have it point and hold, and lets it fly", () => {
    const steering = steeringOf(POINTED);
    steering.pointerDown(finger(4.5, 5));
    steering.pointerMove(finger(FIRST_X + 1, 1.25));
    readFor(steering, 500);

    steering.pointerUp(finger(FIRST_X + 1, 1.25));

    expect(frame(steering)).toMatchObject({
      aim: 148,
      charge: 2,
      release: true,
    });
  });
});

describe("Steering's pointer, pulling back", () => {
  it("aims opposite a finger's drag", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));

    steering.pointerMove(finger(2.5, 6));

    expect(frame(steering).aim).toBe(148);
  });

  it.each([
    [0.5, 0],
    [1.39, 0],
    [1.4, 1],
    [2.3, 2],
    [5, 5],
    [8, 5],
  ])("charges a drag %f units long to %i", (length, charge) => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 10));

    steering.pointerMove(finger(4.5, 10 - length));

    expect(frame(steering).charge).toBe(charge);
  });

  it("keeps the aim while the drag is within its dead zone", () => {
    const steering = steeringOf();
    steering.keyDown(key("ArrowLeft"));
    steering.pointerDown(finger(4.5, 8));

    steering.pointerMove(finger(4.1, 8));

    expect(frame(steering)).toMatchObject({
      aim: STRAIGHT_UP + 4,
      charge: 0,
    });
  });

  it("drops the charge as a drag comes back within its dead zone, keeping the aim", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.pointerMove(finger(4.4, 8));

    expect(frame(steering)).toMatchObject({ aim: 148, charge: 0 });
  });

  it("starts a drag with no charge, whatever the keys chose", () => {
    const steering = steeringOf();
    pressTimes(steering, "ArrowUp", 3);

    steering.pointerDown(finger(4.5, 8));

    expect(frame(steering).charge).toBe(0);
  });

  it("lets the shot fly as a drag past its dead zone is let go", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.pointerUp(finger(2.5, 6));

    expect(frame(steering)).toMatchObject({
      aim: 148,
      charge: 2,
      release: true,
    });
  });

  it("calls the shot off as a drag is let go back within its dead zone", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));
    steering.pointerMove(finger(4.4, 8));

    steering.pointerUp(finger(4.4, 8));

    expect(frame(steering)).toMatchObject({ charge: 0, release: false });
  });

  it("lets a drag fly from the very edge of its dead zone", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(4.5, 7.5));

    steering.pointerUp(finger(4.5, 7.5));

    expect(frame(steering)).toMatchObject({ charge: 0, release: true });
  });

  it("calls a tap off after a drag that flew", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));
    steering.pointerUp(finger(2.5, 6));
    frame(steering);

    steering.pointerDown(finger(4.5, 8));
    steering.pointerUp(finger(4.5, 8));

    expect(frame(steering).release).toBe(false);
  });

  it("lets the shot fly as a drag ends over the bar, past the canvas", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 10));
    steering.pointerMove({ ...finger(4.5, 0), y: PHONE.height + 30 });

    steering.pointerUp({ ...finger(4.5, 0), y: PHONE.height + 30 });

    expect(frame(steering)).toMatchObject({
      aim: STRAIGHT_UP,
      charge: 5,
      release: true,
    });
  });

  it("calls the shot off at a second finger, so neither flies", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.pointerDown(finger(6, 6, { id: 2 }));
    steering.pointerUp(finger(2.5, 6));
    steering.pointerUp(finger(6, 3, { id: 2 }));

    expect(frame(steering)).toMatchObject({ charge: 0, release: false });
  });

  it("follows only the finger pressed", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.pointerMove(finger(4.5, 4, { id: 2 }));

    expect(frame(steering).aim).toBe(148);
  });

  it("calls the shot off as the browser takes the touch away", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.pointerUp(finger(2.5, 6, { wasCanceled: true }));

    expect(frame(steering)).toMatchObject({ charge: 0, release: false });
  });

  it("calls the shot off as the pointer is lost, so letting go flies nothing", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.callOff();
    steering.pointerUp(finger(2.5, 6));

    expect(frame(steering)).toMatchObject({ charge: 0, release: false });
  });

  it.each([
    [15, false],
    [16, true],
    [PHONE.width - 16, true],
    [PHONE.width - 15, false],
  ])(
    "leaves a finger pressed within 16 CSS px of the canvas's sides to the browser: a press at %i flies %s",
    (x, flies) => {
      const steering = steeringOf();

      steering.pointerDown({ ...finger(4.5, 8), x });
      steering.pointerMove({ ...finger(4.5, 2), x });
      steering.pointerUp({ ...finger(4.5, 2), x });

      expect(frame(steering).release).toBe(flies);
    },
  );

  it("leaves the aim alone as a finger left to the browser moves", () => {
    const steering = steeringOf();
    steering.pointerDown({ ...finger(4.5, 8), x: 15 });

    steering.pointerMove(finger(FIRST_X + 1, 1.25));

    expect(frame(steering).aim).toBe(STRAIGHT_UP);
  });

  it("lets nothing fly as a finger left to the browser is let go during a drag", () => {
    const steering = steeringOf();
    steering.pointerDown(finger(4.5, 8));
    steering.pointerMove(finger(2.5, 6));

    steering.pointerDown({ ...finger(4.5, 8, { id: 2 }), x: 15 });
    steering.pointerUp({ ...finger(4.5, 2, { id: 2 }), x: 15 });

    expect(frame(steering)).toMatchObject({ aim: 148, release: false });
  });

  it.each([
    [31, false],
    [32, true],
  ])(
    "measures a side's 16 CSS px in device pixels at 2×: a press at %i device px flies %s",
    (x, flies) => {
      const canvas = boardCanvas(390, 844, 2);
      const metrics = fieldMetrics(canvas, fieldShape(canvas));
      const steering = steeringOf(BY_POINTER, canvas, metrics);

      steering.pointerDown({ ...finger(4.5, 8, {}, metrics), x });
      steering.pointerMove({ ...finger(4.5, 2, {}, metrics), x });
      steering.pointerUp({ ...finger(4.5, 2, {}, metrics), x });

      expect(frame(steering).release).toBe(flies);
    },
  );

  it("keeps the way a press began with though the settings change during it", () => {
    const steering = steeringOf(PULLED);
    steering.pointerDown(finger(4.5, 8));
    steering.aimWith(POINTED);

    steering.pointerMove(finger(2.5, 6));

    expect(frame(steering).aim).toBe(148);
  });

  it("presses for a mouse's main button where the settings have it pull back", () => {
    const steering = steeringOf(PULLED);
    steering.pointerDown(mouse(4.5, 8));
    steering.pointerMove(mouse(2.5, 6));

    steering.pointerUp(mouse(2.5, 6));

    expect(frame(steering)).toMatchObject({
      aim: 148,
      charge: 2,
      release: true,
    });
  });

  it("lets a mouse's drag fly as its last move showed though it is let go past the canvas", () => {
    const steering = steeringOf(PULLED);
    steering.pointerDown(mouse(4.5, 8));
    steering.pointerMove(mouse(2.5, 6));

    steering.pointerUp({ ...mouse(4.5, 0), y: PHONE.height + 30 });

    expect(frame(steering)).toMatchObject({
      aim: 148,
      charge: 2,
      release: true,
    });
  });

  it("measures a drag in the units of the field it is handed last", () => {
    const steering = steeringOf();
    const canvas = boardCanvas(390, 844, 2);
    const metrics = fieldMetrics(canvas, fieldShape(canvas));
    steering.measure(metrics, canvas);
    steering.pointerDown(finger(4.5, 10, {}, metrics));

    steering.pointerMove(finger(4.5, 8.6, {}, metrics));

    expect(frame(steering).charge).toBe(1);
  });
});

describe("Steering's frames", () => {
  it("hands each frame the same record", () => {
    const steering = steeringOf();

    const first = frame(steering);

    expect(frame(steering)).toBe(first);
  });
});
