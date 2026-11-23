import type { Viewport } from "@fz/phaser/layout";
import { AIM_COUNT } from "../rules/aims";
import { FIRST_X } from "../rules/field";
import { boardCanvas } from "../testing/canvases";
import {
  type PointerAiming,
  type PointerRelease,
  STRAIGHT_UP,
} from "./aim_settings";
import {
  type AimFrame,
  Aiming,
  DEAD_ZONE,
  type KeyPress,
  type PointerView,
  type PressWatcher,
  aimKeyOf,
  aimToward,
} from "./aiming";
import {
  type FieldMetrics,
  fieldMetrics,
  fieldShape,
  toCanvas,
} from "./field_metrics";

/** An upright phone's canvas: a field 17 rows deep at 40 device px a unit, its cells from (15, 48). */
const PHONE = boardCanvas(390, 844);

/** The field laid out on {@link PHONE}. */
const METRICS = fieldMetrics(PHONE, fieldShape(PHONE));

/** The aim from the floor's middle at a place a unit to the right and a unit up from the fuzzball's middle: 45°. */
const RIGHT_45 = 148;

/** The aim 45° up on the left, the mirror of {@link RIGHT_45}. */
const LEFT_45 = AIM_COUNT - 1 - RIGHT_45;

/** Describes what a watcher heard, in order. */
type Heard = (string | number | null)[];

/** Returns a watcher that writes what it hears into a list. */
function watcherInto(heard: Heard): PressWatcher {
  return {
    pressed: () => heard.push("pressed"),
    pulled: (beyond) => heard.push(beyond),
    released: () => heard.push("released"),
    ended: () => heard.push("ended"),
  };
}

/** Returns an aiming of a field laid out on a canvas, its pointers aiming and letting fly as given. */
function aimingOf(
  aiming: PointerAiming = "pointAndHold",
  release: PointerRelease = "onLetGo",
  watcher?: PressWatcher,
  canvas: Viewport = PHONE,
  metrics: FieldMetrics = METRICS,
): Aiming {
  const made = new Aiming(metrics, canvas, watcher);
  made.aimWith(aiming);
  made.releaseBy(release);
  return made;
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
function pressTimes(aiming: Aiming, code: string, times: number): void {
  for (let press = 0; press < times; press++) aiming.keyDown(key(code));
}

/** Reads a frame of the aiming, the fuzzball waiting at the floor's middle. */
function frame(aiming: Aiming): Readonly<AimFrame> {
  return aiming.read(FIRST_X);
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
    ["45° up on the right", 1, 1, RIGHT_45],
    [
      "45.1°, nearer 45°",
      Math.cos((45.1 * Math.PI) / 180),
      Math.sin((45.1 * Math.PI) / 180),
      RIGHT_45,
    ],
    [
      "45.2°, nearer 45.25°",
      Math.cos((45.2 * Math.PI) / 180),
      Math.sin((45.2 * Math.PI) / 180),
      RIGHT_45 + 1,
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

describe("aimKeyOf", () => {
  it.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
    ["Space", "release"],
  ])("reads %s as a key that does %s to the shot", (code, aimKey) => {
    expect(aimKeyOf(code)).toBe(aimKey);
  });

  it.each(["ArrowUp", "Escape", "KeyF", "ShiftLeft"])(
    "reads %s as doing nothing to the shot",
    (code) => {
      expect(aimKeyOf(code)).toBeNull();
    },
  );
});

describe("Aiming's keys", () => {
  it("start straight up, with nothing let fly and no finger aiming", () => {
    expect(frame(aimingOf())).toEqual({
      aim: STRAIGHT_UP,
      release: false,
      keyed: false,
      touch: false,
      touchX: 0,
      touchY: 0,
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
    const aiming = aimingOf();

    aiming.keyDown(key(code, { shiftKey }));

    expect(frame(aiming).aim).toBe(aim);
  });

  it.each([
    ["ArrowLeft", AIM_COUNT - 1],
    ["ArrowRight", 0],
  ])("hold the aim at its end however often %s is pressed", (code, aim) => {
    const aiming = aimingOf();

    pressTimes(aiming, code, 90);

    expect(frame(aiming).aim).toBe(aim);
  });

  it("let the shot fly at Space, at the aim", () => {
    const aiming = aimingOf();
    aiming.keyDown(key("ArrowLeft"));

    aiming.keyDown(key("Space"));

    expect(frame(aiming)).toMatchObject({
      aim: STRAIGHT_UP + 4,
      release: true,
    });
  });

  it("start the next shot at the same aim, nothing let fly", () => {
    const aiming = aimingOf();
    aiming.keyDown(key("ArrowLeft"));
    aiming.keyDown(key("Space"));
    frame(aiming);

    const next = frame(aiming);

    expect(next).toMatchObject({ aim: STRAIGHT_UP + 4, release: false });
  });

  it("let nothing fly at a held Space's repeat", () => {
    const aiming = aimingOf();

    aiming.keyDown(key("Space", { repeat: true }));

    expect(frame(aiming).release).toBe(false);
  });

  it("count the first shot let fly in a frame, at its aim", () => {
    const aiming = aimingOf();
    aiming.keyDown(key("Space"));
    aiming.keyDown(key("ArrowLeft"));

    aiming.keyDown(key("Space"));

    expect(frame(aiming)).toMatchObject({ aim: STRAIGHT_UP, release: true });
  });

  it("say the keys turned the aim on the frame they were pressed", () => {
    const aiming = aimingOf();

    aiming.keyDown(key("ArrowLeft"));

    expect(frame(aiming).keyed).toBe(true);
  });

  it("say nothing of the keys on the frame after", () => {
    const aiming = aimingOf();
    aiming.keyDown(key("ArrowLeft"));
    frame(aiming);

    const next = frame(aiming);

    expect(next.keyed).toBe(false);
  });

  it("say nothing of the keys for Space", () => {
    const aiming = aimingOf();

    aiming.keyDown(key("Space"));

    expect(frame(aiming).keyed).toBe(false);
  });

  it.each([
    ["ArrowLeft", true],
    ["KeyD", true],
    ["Space", true],
    ["ArrowUp", false],
    ["KeyF", false],
    ["Escape", false],
    ["Enter", false],
  ])(
    "say whether they took %s, leaving the scene the rest: %s",
    (code, taken) => {
      expect(aimingOf().keyDown(key(code))).toBe(taken);
    },
  );
});

describe("Aiming's wheel and nudge", () => {
  it.each([
    [-100, STRAIGHT_UP + 1],
    [100, STRAIGHT_UP - 1],
    [0, STRAIGHT_UP],
  ])("turns the aim an aim at a wheel turned by %i", (deltaY, aim) => {
    const aiming = aimingOf();

    aiming.wheel(deltaY);

    expect(frame(aiming).aim).toBe(aim);
  });

  it.each([
    ["left", STRAIGHT_UP + 1],
    ["right", STRAIGHT_UP - 1],
  ] as const)("nudges the aim an aim %s", (toward, aim) => {
    const aiming = aimingOf();

    aiming.nudge(toward);

    expect(frame(aiming).aim).toBe(aim);
  });

  it.each([
    ["left", AIM_COUNT - 1],
    ["right", 0],
  ] as const)(
    "holds the aim at its end however often it is nudged %s",
    (toward, aim) => {
      const aiming = aimingOf();

      for (let nudge = 0; nudge < AIM_COUNT; nudge++) aiming.nudge(toward);

      expect(frame(aiming).aim).toBe(aim);
    },
  );

  it("says nothing of the keys for a nudge, which its button says itself", () => {
    const aiming = aimingOf();

    aiming.nudge("left");

    expect(frame(aiming).keyed).toBe(false);
  });

  it("keeps a nudge as the fuzzball waits somewhere new, though the mouse pointed before", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.nudge("left");
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(RIGHT_45 + 1);
  });

  it("keeps a nudge through a click where the mouse rests", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.nudge("left");

    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45 + 1, release: true });
  });
});

describe("Aiming's pointer, pointing and holding", () => {
  it("aims at a mouse that hasn't pressed", () => {
    const aiming = aimingOf();

    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(aiming).aim).toBe(RIGHT_45);
  });

  it("aims from where the fuzzball waits", () => {
    const aiming = aimingOf();
    aiming.read(2);

    aiming.pointerMove(mouse(1, 1.25));

    expect(aiming.read(2).aim).toBe(LEFT_45);
  });

  it("keeps the aim while the mouse is on the fuzzball itself", () => {
    const aiming = aimingOf();

    aiming.pointerMove(mouse(FIRST_X + 0.1, 0.3));

    expect(frame(aiming).aim).toBe(STRAIGHT_UP);
  });

  it("aims again at a mouse at rest as the fuzzball waits somewhere new", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(LEFT_45);
  });

  it("keeps the keys' aim as the fuzzball waits somewhere new", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.keyDown(key("ArrowLeft"));
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(RIGHT_45 + 4);
  });

  it("keeps the aim of a finger lifted as the fuzzball waits somewhere new", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(FIRST_X + 1, 1.25));
    aiming.pointerUp(finger(FIRST_X + 1, 1.25));
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(RIGHT_45);
  });

  it("stops aiming at a mouse at rest once the settings have it pull back", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.aimWith("pullBack");
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(RIGHT_45);
  });

  it("follows a pressed mouse", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(4.5, 5));

    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(aiming).aim).toBe(RIGHT_45);
  });

  it("lets the shot fly as the press is let go, at the aim the last move showed", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(4.5, 5));
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));

    aiming.pointerUp({ ...mouse(FIRST_X + 1, 1.25), y: PHONE.height + 30 });

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("lets a held press fly at Space", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(4.5, 5));

    aiming.keyDown(key("Space"));
    aiming.pointerUp(mouse(4.5, 5));

    expect(frame(aiming).release).toBe(true);
  });

  it("calls a shot off at a right click, so letting go flies nothing", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(4.5, 5));

    aiming.pointerDown(mouse(4.5, 5, { button: 2 }));
    aiming.pointerUp(mouse(4.5, 5));

    expect(frame(aiming).release).toBe(false);
  });

  it.each([1, 3, 4])("presses nothing at the mouse's button %i", (button) => {
    const aiming = aimingOf();

    aiming.pointerDown(mouse(4.5, 5, { button }));
    aiming.pointerUp(mouse(4.5, 5, { button }));

    expect([aiming.pressedWay, frame(aiming).release]).toEqual([null, false]);
  });

  it("flies nothing as another of the mouse's buttons is let go while the main one is held", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(4.5, 5));

    aiming.pointerUp(mouse(4.5, 5, { button: 1 }));

    expect(frame(aiming).release).toBe(false);
  });

  it("presses for the mouse however near the canvas's sides", () => {
    const aiming = aimingOf();

    aiming.pointerDown({ ...mouse(4.5, 5), x: 0 });
    aiming.pointerUp({ ...mouse(4.5, 5), x: 0 });

    expect(frame(aiming).release).toBe(true);
  });

  it("aims at a finger as it presses", () => {
    const aiming = aimingOf();

    aiming.pointerDown(finger(FIRST_X - 1, 1.25));

    expect(frame(aiming).aim).toBe(LEFT_45);
  });

  it("follows a finger toward where it drags, not away from it", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(4.5, 5));

    aiming.pointerMove(finger(FIRST_X + 1, 1.25));

    expect(frame(aiming).aim).toBe(RIGHT_45);
  });

  it("calls a finger's shot off at a second finger, so neither flies", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(4.5, 5));

    aiming.pointerDown(finger(6, 6, { id: 2 }));
    aiming.pointerUp(finger(4.5, 5));
    aiming.pointerUp(finger(6, 6, { id: 2 }));

    expect(frame(aiming).release).toBe(false);
  });

  it("calls a finger's shot off as the browser takes the touch away", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(4.5, 5));

    aiming.pointerUp(finger(4.5, 5, { wasCanceled: true }));

    expect(frame(aiming).release).toBe(false);
  });

  it("leaves the aim alone as a finger pressed within a side's 16 CSS px moves", () => {
    const aiming = aimingOf();
    aiming.pointerDown({ ...finger(FIRST_X - 1, 1.25), x: 15 });

    aiming.pointerMove(finger(FIRST_X + 1, 1.25));

    expect(frame(aiming).aim).toBe(STRAIGHT_UP);
  });

  it("keeps a finger's aim over the mouse at rest as the fuzzball waits somewhere new", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(finger(FIRST_X - 1, 1.25));
    aiming.pointerUp(finger(FIRST_X - 1, 1.25));
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(LEFT_45);
  });

  it("keeps aiming at a mouse at rest through a sideways scroll", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.wheel(0);
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(LEFT_45);
  });

  it("keeps aiming at a mouse at rest as the settings hand it pointing again", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.aimWith("pointAndHold");
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(LEFT_45);
  });

  it("keeps the keys' aim over a mouse at rest", () => {
    const aiming = aimingOf();
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    frame(aiming);

    aiming.keyDown(key("ArrowLeft"));

    expect(frame(aiming).aim).toBe(RIGHT_45 + 4);
  });
});

describe("Aiming's pointer, pulling back", () => {
  it("aims opposite a finger's drag", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));

    aiming.pointerMove(finger(2.5, 6));

    expect(frame(aiming).aim).toBe(RIGHT_45);
  });

  it("aims at a mouse that pulls back only while it is pressed", () => {
    const aiming = aimingOf("pullBack");

    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));

    expect(frame(aiming).aim).toBe(STRAIGHT_UP);
  });

  it("keeps the aim while the drag is within its dead zone", () => {
    const aiming = aimingOf("pullBack");
    aiming.keyDown(key("ArrowLeft"));
    aiming.pointerDown(finger(4.5, 8));

    aiming.pointerMove(finger(4.1, 8));

    expect(frame(aiming).aim).toBe(STRAIGHT_UP + 4);
  });

  it("lets the shot fly as a drag past its dead zone is let go", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerUp(finger(2.5, 6));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("calls the shot off as a drag is let go back within its dead zone, keeping its aim", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));
    aiming.pointerMove(finger(4.4, 8));

    aiming.pointerUp(finger(4.4, 8));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: false });
  });

  it("lets a drag fly from the very edge of its dead zone", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(4.5, 8 - DEAD_ZONE));

    aiming.pointerUp(finger(4.5, 8 - DEAD_ZONE));

    expect(frame(aiming).release).toBe(true);
  });

  it("calls a tap off", () => {
    const aiming = aimingOf("pullBack");

    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerUp(finger(4.5, 8));

    expect(frame(aiming).release).toBe(false);
  });

  it("follows only the finger pressed", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerMove(finger(4.5, 4, { id: 2 }));

    expect(frame(aiming).aim).toBe(RIGHT_45);
  });

  it("calls the shot off as the pointer is lost, so letting go flies nothing", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.callOff();
    aiming.pointerUp(finger(2.5, 6));

    expect(frame(aiming).release).toBe(false);
  });

  it.each([
    [15, false],
    [16, true],
    [PHONE.width - 16, true],
    [PHONE.width - 15, false],
  ])(
    "leaves a finger pressed within 16 CSS px of the canvas's sides to the browser: a press at %i flies %s",
    (x, flies) => {
      const aiming = aimingOf("pullBack");

      aiming.pointerDown({ ...finger(4.5, 8), x });
      aiming.pointerMove({ ...finger(4.5, 2), x });
      aiming.pointerUp({ ...finger(4.5, 2), x });

      expect(frame(aiming).release).toBe(flies);
    },
  );

  it("lets nothing fly as a finger left to the browser is let go during a drag", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerDown({ ...finger(4.5, 8, { id: 2 }), x: 15 });
    aiming.pointerUp({ ...finger(4.5, 2, { id: 2 }), x: 15 });

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: false });
  });

  it.each([
    [31, false],
    [32, true],
  ])(
    "measures a side's 16 CSS px in device pixels at 2×: a press at %i device px flies %s",
    (x, flies) => {
      const canvas = boardCanvas(390, 844, 2);
      const metrics = fieldMetrics(canvas, fieldShape(canvas));
      const aiming = aimingOf(
        "pullBack",
        "onLetGo",
        undefined,
        canvas,
        metrics,
      );

      aiming.pointerDown({ ...finger(4.5, 8, {}, metrics), x });
      aiming.pointerMove({ ...finger(4.5, 2, {}, metrics), x });
      aiming.pointerUp({ ...finger(4.5, 2, {}, metrics), x });

      expect(frame(aiming).release).toBe(flies);
    },
  );

  it("keeps the way a press began with though the settings change during it", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.aimWith("pointAndHold");

    aiming.pointerMove(finger(2.5, 6));

    expect([frame(aiming).aim, aiming.pressedWay]).toEqual([
      RIGHT_45,
      "pullBack",
    ]);
  });

  it("calls a tap off after a drag that flew", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));
    aiming.pointerUp(finger(2.5, 6));
    frame(aiming);

    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerUp(finger(4.5, 8));

    expect(frame(aiming).release).toBe(false);
  });

  it("lets the shot fly as a drag ends over the bar, past the canvas", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 10));
    aiming.pointerMove({ ...finger(4.5, 0), y: PHONE.height + 30 });

    aiming.pointerUp({ ...finger(4.5, 0), y: PHONE.height + 30 });

    expect(frame(aiming)).toMatchObject({ aim: STRAIGHT_UP, release: true });
  });

  it("calls the shot off at a second finger, so neither flies", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerDown(finger(6, 6, { id: 2 }));
    aiming.pointerUp(finger(2.5, 6));
    aiming.pointerUp(finger(6, 3, { id: 2 }));

    expect(frame(aiming).release).toBe(false);
  });

  it("calls the shot off as the browser takes the touch away", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerUp(finger(2.5, 6, { wasCanceled: true }));

    expect(frame(aiming).release).toBe(false);
  });

  it("leaves the aim alone as a finger left to the browser moves", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown({ ...finger(4.5, 8), x: 15 });

    aiming.pointerMove(finger(FIRST_X + 1, 1.25));

    expect(frame(aiming).aim).toBe(STRAIGHT_UP);
  });

  it("presses for a mouse's main button where the settings have it pull back", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(mouse(4.5, 8));
    aiming.pointerMove(mouse(2.5, 6));

    aiming.pointerUp(mouse(2.5, 6));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("lets a mouse's drag fly as its last move showed though it is let go past the canvas", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(mouse(4.5, 8));
    aiming.pointerMove(mouse(2.5, 6));

    aiming.pointerUp({ ...mouse(4.5, 0), y: PHONE.height + 30 });

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("keeps a pull back's aim as the fuzzball waits somewhere new, though the mouse pointed before", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(4.5, 5));
    aiming.aimWith("pullBack");
    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X - 1, 1.25));
    aiming.pointerDown(mouse(4.5, 8));
    aiming.pointerMove(mouse(2.5, 6));
    aiming.pointerUp(mouse(2.5, 6));
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(RIGHT_45);
  });

  it("measures a drag in the units of the field it is handed last", () => {
    const heard: Heard = [];
    const aiming = aimingOf("pullBack", "onLetGo", watcherInto(heard));
    const canvas = boardCanvas(390, 844, 2);
    const metrics = fieldMetrics(canvas, fieldShape(canvas));
    aiming.measure(metrics, canvas);
    aiming.pointerDown(finger(4.5, 10, {}, metrics));

    aiming.pointerMove(finger(4.5, 9, {}, metrics));

    expect(heard).toEqual(["pressed", expect.closeTo(1 - DEAD_ZONE, 9)]);
  });
});

describe("Aiming's touch", () => {
  it("says where a finger that points is from its press, in the canvas's device pixels", () => {
    const aiming = aimingOf();
    const at = finger(6, 6);

    aiming.pointerDown(at);

    expect(frame(aiming)).toMatchObject({
      touch: true,
      touchX: at.x,
      touchY: at.y,
    });
  });

  it("follows a finger that points as it drags", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(6, 6));
    const to = finger(3, 9);

    aiming.pointerMove(to);

    expect(frame(aiming)).toMatchObject({
      touch: true,
      touchX: to.x,
      touchY: to.y,
    });
  });

  it("says no finger aims once it lets go and the shot flies", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(6, 6));

    aiming.pointerUp(finger(6, 6));

    expect(frame(aiming)).toMatchObject({ release: true, touch: false });
  });

  it("says no finger aims once the shot is called off", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(6, 6));

    aiming.callOff();

    expect(frame(aiming).touch).toBe(false);
  });

  it("says no finger aims for a mouse, pressed and moved", () => {
    const aiming = aimingOf();
    aiming.pointerDown(mouse(6, 6));

    aiming.pointerMove(mouse(3, 9));

    expect(frame(aiming).touch).toBe(false);
  });

  it("says no finger aims while a pull back is within its dead zone", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));

    aiming.pointerMove(finger(4.5, 7.6));

    expect(frame(aiming).touch).toBe(false);
  });

  it("says where a pulling finger is once it passes its dead zone, and keeps saying so back within it", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));
    const back = finger(4.4, 8);

    aiming.pointerMove(back);

    expect(frame(aiming)).toMatchObject({
      touch: true,
      touchX: back.x,
      touchY: back.y,
    });
  });

  it.each<[string, (aiming: Aiming) => void]>([
    [
      "a second finger",
      (aiming) => {
        aiming.pointerDown(finger(6, 6, { id: 2 }));
      },
    ],
    [
      "the browser taking the touch away",
      (aiming) => {
        aiming.pointerUp(finger(4.5, 5, { wasCanceled: true }));
      },
    ],
  ])("says no finger aims once %s calls the shot off", (_name, callOff) => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(4.5, 5));

    callOff(aiming);

    expect(frame(aiming)).toMatchObject({ release: false, touch: false });
  });

  it("says no finger aims for the keys, turning the aim", () => {
    const aiming = aimingOf();

    aiming.keyDown(key("ArrowLeft"));

    expect(frame(aiming).touch).toBe(false);
  });

  it("says no finger aims for one pressed within a side's 16 CSS px, which the browser keeps", () => {
    const aiming = aimingOf();
    aiming.pointerDown({ ...finger(4.5, 5), x: 15 });

    aiming.pointerMove(finger(3, 9));

    expect(frame(aiming).touch).toBe(false);
  });

  it("says where a pulling finger is once it passes its dead zone, not where it pressed", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    const to = finger(2.5, 6);

    aiming.pointerMove(to);

    expect(frame(aiming)).toMatchObject({
      touch: true,
      touchX: to.x,
      touchY: to.y,
    });
  });

  it("says no finger aims within a pull back's dead zone though the settings have fingers point during it", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.aimWith("pointAndHold");

    aiming.pointerMove(finger(4.5, 7.6));

    expect(frame(aiming).touch).toBe(false);
  });

  it("says no finger aims once a pull back is let go", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerUp(finger(2.5, 6));

    expect(frame(aiming)).toMatchObject({ release: true, touch: false });
  });

  it("starts the next pull back's touch unshown, till it passes its dead zone", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));
    aiming.pointerUp(finger(2.5, 6));
    frame(aiming);

    aiming.pointerDown(finger(4.5, 8));

    expect(frame(aiming).touch).toBe(false);
  });

  it("follows only the finger pressed", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(finger(4.5, 8));
    const to = finger(2.5, 6);
    aiming.pointerMove(to);

    aiming.pointerMove(finger(4.5, 4, { id: 2 }));

    expect(frame(aiming)).toMatchObject({ touchX: to.x, touchY: to.y });
  });

  it("says no finger aims for a mouse that pulls back past its dead zone", () => {
    const aiming = aimingOf("pullBack");
    aiming.pointerDown(mouse(4.5, 8));

    aiming.pointerMove(mouse(2.5, 6));

    expect(frame(aiming).touch).toBe(false);
  });
});

describe("Aiming's watcher", () => {
  it("hears a press, how far a pull back runs past its dead zone, and the shot let fly, then ended", () => {
    const heard: Heard = [];
    const aiming = aimingOf("pullBack", "onLetGo", watcherInto(heard));
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(4.5, 7.8));
    aiming.pointerMove(finger(4.5, 6));

    aiming.pointerUp(finger(4.5, 6));

    expect(heard).toEqual([
      "pressed",
      null,
      expect.closeTo(2 - DEAD_ZONE, 9),
      "released",
      "ended",
    ]);
  });

  it("hears the first shot let fly in a frame alone, each ending", () => {
    const heard: Heard = [];
    const aiming = aimingOf("pointAndHold", "onLetGo", watcherInto(heard));

    aiming.release();
    aiming.release();

    expect(heard).toEqual(["released", "ended", "ended"]);
  });

  it("hears a shot called off end, with nothing let fly", () => {
    const heard: Heard = [];
    const aiming = aimingOf("pointAndHold", "onLetGo", watcherInto(heard));
    aiming.pointerDown(finger(4.5, 5));

    aiming.pointerDown(finger(6, 6, { id: 2 }));

    expect(heard).toEqual(["pressed", "ended"]);
  });

  it("says how the pointer pressed aims until it lets go", () => {
    const aiming = aimingOf();
    aiming.pointerDown(finger(4.5, 5));
    const held = aiming.pressedWay;

    aiming.pointerUp(finger(4.5, 5));

    expect([held, aiming.pressedWay]).toEqual(["pointAndHold", null]);
  });
});

describe("Aiming, released by a button", () => {
  it("lets the shot fly at the button, at the aim the guide shows", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));

    aiming.release();

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("leaves the aim where a lifted finger left it, flying nothing, and shows what the finger covered", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(finger(FIRST_X + 1, 1.25));

    aiming.pointerUp(finger(FIRST_X + 1, 1.25));

    expect(frame(aiming)).toMatchObject({
      aim: RIGHT_45,
      release: false,
      touch: false,
    });
  });

  it("flies the aim a finger left at the button", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(finger(FIRST_X + 1, 1.25));
    aiming.pointerUp(finger(FIRST_X + 1, 1.25));
    frame(aiming);

    aiming.release();

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });

  it("stops following the mouse once its press lets go, so the way to the button moves nothing", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));

    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: false });
  });

  it("keeps the aim the mouse left as the fuzzball waits somewhere new", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));
    frame(aiming);

    const next = aiming.read(FIRST_X + 2);

    expect(next.aim).toBe(RIGHT_45);
  });

  it("follows the mouse again once it presses again", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));

    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(aiming).aim).toBe(LEFT_45);
  });

  it("follows the mouse unpressed once it presses again, though that press is called off", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25, { button: 2 }));

    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(aiming).aim).toBe(LEFT_45);
  });

  it("keeps the aim the mouse left through a shot called off, till it presses again", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerMove(mouse(FIRST_X + 1, 1.25));
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));
    aiming.callOff();

    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(aiming).aim).toBe(RIGHT_45);
  });

  it("follows the mouse unpressed again once the shot flies", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));
    aiming.release();
    frame(aiming);

    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(aiming).aim).toBe(LEFT_45);
  });

  it("follows the mouse unpressed again once the settings have a press let fly", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(mouse(FIRST_X + 1, 1.25));
    aiming.pointerUp(mouse(FIRST_X + 1, 1.25));

    aiming.releaseBy("onLetGo");
    aiming.pointerMove(mouse(FIRST_X - 1, 1.25));

    expect(frame(aiming).aim).toBe(LEFT_45);
  });

  it("keeps the aim of a pull back let go past its dead zone, flying nothing", () => {
    const aiming = aimingOf("pullBack", "byButton");
    aiming.pointerDown(finger(4.5, 8));
    aiming.pointerMove(finger(2.5, 6));

    aiming.pointerUp(finger(2.5, 6));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: false });
  });

  it("still calls a pull back let go within its dead zone off", () => {
    const heard: Heard = [];
    const aiming = aimingOf("pullBack", "byButton", watcherInto(heard));
    aiming.pointerDown(finger(4.5, 8));

    aiming.pointerUp(finger(4.5, 8.2));

    expect(heard).toEqual(["pressed", "ended"]);
  });

  it("lets the shot fly at Space", () => {
    const aiming = aimingOf("pointAndHold", "byButton");
    aiming.pointerDown(finger(FIRST_X + 1, 1.25));
    aiming.pointerUp(finger(FIRST_X + 1, 1.25));

    aiming.keyDown(key("Space"));

    expect(frame(aiming)).toMatchObject({ aim: RIGHT_45, release: true });
  });
});

describe("Aiming's frames", () => {
  it("hands each frame the same record", () => {
    const aiming = aimingOf();
    const first = frame(aiming);

    expect(frame(aiming)).toBe(first);
  });
});
