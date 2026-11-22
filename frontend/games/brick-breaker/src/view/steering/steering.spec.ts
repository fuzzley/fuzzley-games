import { NO_INSETS } from "@fz/phaser/insets";
import { launch, steerField } from "../../rules/field/field";
import { FIELD_HEIGHT, KEY_RAMP_MS } from "../../rules/tuning";
import { KEEPER, fieldFrom, throwBall } from "../../testing/field_picture";
import {
  type FieldMetrics,
  fieldMetrics,
  toCanvasX,
} from "../field/field_metrics";
import {
  AIM_DEAD_CSS_PX,
  AIM_FINE_SPEED,
  AIM_KEY_SPEED,
  GUIDE_DELAY_MS,
  type KeyPress,
  LONGEST_FRAME_MS,
  type PlayerSteer,
  type PointerView,
  Steering,
  TAP_CSS_PX,
  TAP_MS,
  TOUCH_STEERINGS,
  isTouchSteering,
  waitingAim,
} from "./steering";

/** How long a frame takes, in milliseconds, as a display of 60 frames a second draws them. */
const FRAME_MS = 16;

/** The aim a press may start from in these specs, where the ball waits looking up and right, as a serve leaves. */
const SERVE = 20;

/** Says no press may aim, as no ball waits to be served. */
const NO_SERVE = null;

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

/** Returns a pointer moved some device pixels across and down the canvas. */
function moved(
  pointer: PointerView,
  across: number,
  down: number,
): PointerView {
  return { ...pointer, x: pointer.x + across, y: pointer.y + down };
}

/** Returns a key pressed afresh, or as a held key's repeat. */
function key(code: string, repeat = false): KeyPress {
  return { code, repeat };
}

/** Reads a frame's steering, a press aiming from {@link SERVE} or, given null, none may. */
function frame(
  steering: Steering,
  serve: number | null = SERVE,
  ms = FRAME_MS,
): Readonly<PlayerSteer> {
  return steering.read(ms, serve);
}

/** Describes the frame after a let-go, as a spec reads it: the aim it wrote, and whether it launches. */
interface Served {
  readonly aim: number | null;
  readonly launches: boolean;
}

/** Reads a frame, a press aiming from {@link SERVE} or, given null, none may, and returns the aim it wrote and whether it launches. */
function served(steering: Steering, serve: number | null = SERVE): Served {
  const { aim } = steering.read(FRAME_MS, serve);
  return { aim, launches: steering.launches() };
}

/** The frame after a let-go that launches nothing, the aim let go of. */
const CALLED_OFF: Served = { aim: null, launches: false };

/**
 * How long held keys turn the aim at full speed, in seconds, in the time
 * {@link rampUp} reads: half the ramp at half speed, then half at full.
 */
const RAMP_S = (0.75 * KEY_RAMP_MS) / 1000;

/** Reads two frames of half the keys' ramp each, which takes a turn up to its full speed. */
function rampUp(steering: Steering): void {
  frame(steering, SERVE, KEY_RAMP_MS / 2);
  frame(steering, SERVE, KEY_RAMP_MS / 2);
}

/** Reads five frames of 100 ms, half a second, and returns the last's steering. */
function halfSecond(steering: Steering): Readonly<PlayerSteer> {
  for (let i = 0; i < 4; i++) frame(steering, SERVE, 100);
  return frame(steering, SERVE, 100);
}

/** Returns a steering whose launch key holds the serve, from an aim. */
function keyHeld(serve = SERVE): Steering {
  const steering = new Steering(metricsAt());
  steering.keyDown(key("Space"), serve);
  return steering;
}

/** Returns a steering whose mouse holds the serve, pressed at a place of the field. */
function mouseHeld(at = mouse(10)): Steering {
  const steering = new Steering(metricsAt());
  steering.pointerDown(at, "drag", SERVE);
  return steering;
}

/** Returns a steering a finger holds the serve on, pressed at a place of the field. */
function fingerHeld(
  at = finger(10),
  touch: "drag" | "follow" = "drag",
): Steering {
  const steering = new Steering(metricsAt());
  steering.pointerDown(at, touch, SERVE);
  return steering;
}

describe("waitingAim", () => {
  it("reads the aim a quick press serves at from where the waiting ball looks", () => {
    const field = fieldFrom(KEEPER);

    expect(waitingAim(field)).toBe(SERVE);
  });

  it("reads an aim held, as the waiting ball looks along it", () => {
    const field = fieldFrom(KEEPER);

    steerField(field, { to: null, by: 0, push: 0, aim: -35 });

    expect(waitingAim(field)).toBe(-35);
  });

  it("reads none once the ball is served", () => {
    const field = fieldFrom(KEEPER);

    launch(field);

    expect(waitingAim(field)).toBeNull();
  });

  it("reads none while the field serves no ball that waits", () => {
    const field = fieldFrom(KEEPER);
    throwBall(field, 5, 20, 0);

    field.state = "serve";

    expect(waitingAim(field)).toBeNull();
  });
});

describe("Steering's keys", () => {
  it.each([
    ["ArrowLeft", -1],
    ["KeyA", -1],
    ["ArrowRight", 1],
    ["KeyD", 1],
  ] as const)("push the paddle by %s while it is held", (code, push) => {
    const steering = new Steering(metricsAt());

    steering.keyDown(key(code), NO_SERVE);

    expect(frame(steering, NO_SERVE).push).toBe(push);
  });

  it.each([
    ["ArrowLeft", "ArrowRight", 1],
    ["ArrowRight", "ArrowLeft", -1],
  ] as const)(
    "push it the way of the key held last, %s then %s, while both are",
    (first, last, push) => {
      const steering = new Steering(metricsAt());
      steering.keyDown(key(first), NO_SERVE);

      steering.keyDown(key(last), NO_SERVE);

      expect(frame(steering, NO_SERVE).push).toBe(push);
    },
  );

  it.each([
    ["ArrowRight", -1],
    ["ArrowLeft", 1],
  ] as const)(
    "push it the way of the key still held, once %s is let go",
    (letGo, push) => {
      const steering = new Steering(metricsAt());
      steering.keyDown(key("ArrowLeft"), NO_SERVE);
      steering.keyDown(key("ArrowRight"), NO_SERVE);

      steering.keyUp(letGo);

      expect(frame(steering, NO_SERVE).push).toBe(push);
    },
  );

  it("keep pushing while another key held pushes the same way", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("ArrowLeft"), NO_SERVE);
    steering.keyDown(key("KeyA"), NO_SERVE);

    steering.keyUp("ArrowLeft");

    expect(frame(steering, NO_SERVE).push).toBe(-1);
  });

  it("keep pushing at the release of a key not held", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("ArrowLeft"), NO_SERVE);

    steering.keyUp("KeyA");

    expect(frame(steering, NO_SERVE).push).toBe(-1);
  });

  it("push it nowhere once let go", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("ArrowRight"), NO_SERVE);

    steering.keyUp("ArrowRight");

    expect(frame(steering, NO_SERVE).push).toBe(0);
  });

  it("push it nowhere for a key that pushes nothing", () => {
    const steering = new Steering(metricsAt());

    steering.keyDown(key("ShiftLeft"), NO_SERVE);

    expect(frame(steering, NO_SERVE).push).toBe(0);
  });

  it.each([
    ["Left, which pushes", "ArrowLeft", true],
    ["Shift, which turns the aim in small steps", "ShiftRight", true],
    ["Space, which launches while no ball waits", "Space", false],
    ["Esc, which pauses", "Escape", false],
    ["Q, which does nothing", "KeyQ", false],
  ])("say whether they take a key: %s", (_, code, taken) => {
    const steering = new Steering(metricsAt());

    expect(steering.keyDown(key(code), NO_SERVE)).toBe(taken);
  });

  it("say a held key that repeats is taken still", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("ArrowLeft"), NO_SERVE);

    expect(steering.keyDown(key("ArrowLeft", true), NO_SERVE)).toBe(true);
  });

  it.each(["ArrowLeft", "ArrowRight"])(
    "push it nowhere once the steering lets go of %s",
    (code) => {
      const steering = new Steering(metricsAt());
      steering.keyDown(key(code), NO_SERVE);

      steering.letGo();

      expect(frame(steering, NO_SERVE).push).toBe(0);
    },
  );
});

describe("Steering's launch keys", () => {
  it.each(["Space", "ArrowUp", "KeyW"])(
    "hold the serve as %s is pressed while a ball waits, at the aim it would start from, launching nothing yet",
    (code) => {
      const steering = new Steering(metricsAt());

      const taken = steering.keyDown(key(code), SERVE);

      expect({ taken, steer: frame(steering) }).toEqual({
        taken: true,
        steer: {
          to: null,
          by: 0,
          push: 0,
          aim: SERVE,
          showsGuide: false,
          turnEnded: false,
        },
      });
    },
  );

  it("launch as the key holding the serve is let go, at the next frame, at the aim it held", () => {
    const steering = keyHeld();

    steering.keyUp("Space");

    expect(served(steering)).toEqual({ aim: SERVE, launches: true });
  });

  it("let go of the aim once they launch", () => {
    const steering = keyHeld();
    steering.keyUp("Space");
    frame(steering);

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("launch nothing at the let-go of a key that doesn't hold the serve", () => {
    const steering = keyHeld();

    steering.keyUp("ArrowUp");

    expect(served(steering)).toEqual({ aim: SERVE, launches: false });
  });

  it("leave a launch to the scene while no ball waits", () => {
    const steering = new Steering(metricsAt());

    const taken = steering.keyDown(key("Space"), NO_SERVE);

    expect({ taken, aim: frame(steering, NO_SERVE).aim }).toEqual({
      taken: false,
      aim: null,
    });
  });

  it("launch nothing as a key pressed while no ball waited is let go", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("Space"), NO_SERVE);
    frame(steering);

    steering.keyUp("Space");

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("hold nothing at a held key's repeat", () => {
    const steering = new Steering(metricsAt());

    const taken = steering.keyDown(key("Space", true), SERVE);

    expect({ taken, aim: frame(steering).aim }).toEqual({
      taken: false,
      aim: null,
    });
  });

  it("call the aim off at a second launch key, which launches nothing", () => {
    const steering = keyHeld();

    const taken = steering.keyDown(key("ArrowUp"), SERVE);
    steering.keyUp("ArrowUp");
    steering.keyUp("Space");

    expect({ taken, served: served(steering) }).toEqual({
      taken: true,
      served: CALLED_OFF,
    });
  });

  it.each(["Escape", "KeyP"])(
    "call the aim off as %s pauses, leaving the pause to the scene",
    (code) => {
      const steering = keyHeld();

      const taken = steering.keyDown(key(code), SERVE);
      steering.keyUp("Space");

      expect({ taken, served: served(steering) }).toEqual({
        taken: false,
        served: CALLED_OFF,
      });
    },
  );

  it("call the aim off once no press may aim", () => {
    const steering = keyHeld();

    const steer = { ...frame(steering, NO_SERVE) };
    steering.keyUp("Space");

    expect({ steer, served: served(steering) }).toEqual({
      steer: {
        to: null,
        by: 0,
        push: 0,
        aim: null,
        showsGuide: false,
        turnEnded: false,
      },
      served: CALLED_OFF,
    });
  });

  it.each(["Escape", "KeyP"])(
    "launch nothing let go of as %s pauses before the next frame",
    (code) => {
      const steering = keyHeld();
      steering.keyUp("Space");

      steering.keyDown(key(code), SERVE);

      expect(served(steering)).toEqual(CALLED_OFF);
    },
  );

  it("launch nothing let go of once no press may aim", () => {
    const steering = keyHeld();
    steering.keyUp("Space");

    expect(served(steering, NO_SERVE)).toEqual(CALLED_OFF);
  });

  it("show the guide once the serve is held long enough", () => {
    const steering = keyHeld();
    frame(steering, SERVE, GUIDE_DELAY_MS / 2);

    const shown = [
      frame(steering, SERVE, GUIDE_DELAY_MS / 2 - 1).showsGuide,
      frame(steering, SERVE, 1).showsGuide,
    ];

    expect(shown).toEqual([false, true]);
  });

  it("count no more of a slow frame than the longest", () => {
    const steering = keyHeld();

    frame(steering, SERVE, GUIDE_DELAY_MS);

    // The frame counted LONGEST_FRAME_MS, short of the guide's delay.
    expect(
      frame(steering, SERVE, GUIDE_DELAY_MS - LONGEST_FRAME_MS - 1).showsGuide,
    ).toBe(false);
  });

  it.each([
    ["ArrowRight", 1],
    ["KeyD", 1],
    ["ArrowLeft", -1],
    ["KeyA", -1],
  ] as const)(
    "turn the aim by %s, at full speed once ramped up",
    (code, way) => {
      const steering = keyHeld(0);
      steering.keyDown(key(code), SERVE);

      rampUp(steering);
      const { aim } = halfSecond(steering);

      expect(aim).toBe(way * Math.round(AIM_KEY_SPEED * (RAMP_S + 0.5)));
    },
  );

  it("ramp the turn up over the paddle's keys' ramp", () => {
    const steering = keyHeld(0);
    steering.keyDown(key("ArrowRight"), SERVE);

    // Half-way up the ramp, the turn goes at half speed.
    const { aim } = frame(steering, SERVE, KEY_RAMP_MS / 2);

    expect(aim).toBe(Math.round((AIM_KEY_SPEED * KEY_RAMP_MS) / 4000));
  });

  it("ramp the turn up afresh as it changes way", () => {
    const steering = keyHeld(0);
    steering.keyDown(key("ArrowRight"), SERVE);
    rampUp(steering);

    steering.keyUp("ArrowRight");
    steering.keyDown(key("ArrowLeft"), SERVE);
    const { aim } = frame(steering, SERVE, KEY_RAMP_MS / 2);

    // Back by half the ramp's time at half speed.
    expect(aim).toBe(Math.round(AIM_KEY_SPEED * (RAMP_S - KEY_RAMP_MS / 4000)));
  });

  it("turn the aim in small steps while Shift is held", () => {
    const steering = keyHeld(0);
    steering.keyDown(key("ShiftLeft"), SERVE);
    steering.keyDown(key("ArrowRight"), SERVE);

    rampUp(steering);
    const { aim } = halfSecond(steering);

    expect(aim).toBe(Math.round(AIM_FINE_SPEED * (RAMP_S + 0.5)));
  });

  it.each([
    ["ArrowRight", 60],
    ["ArrowLeft", -60],
  ] as const)("turn the aim by %s no further than %i°", (code, most) => {
    const steering = keyHeld(most - Math.sign(most));
    steering.keyDown(key(code), SERVE);

    frame(steering, SERVE, 100);
    const { aim } = frame(steering, SERVE, 100);

    expect(aim).toBe(most);
  });

  it("turn the aim in whole degrees, a nought never negative", () => {
    const steering = keyHeld(0);
    steering.keyDown(key("ArrowLeft"), SERVE);

    const { aim } = frame(steering, SERVE, 5);

    expect(aim).toBe(0);
  });

  it("show the guide at once as the keys turn the aim", () => {
    const steering = keyHeld();
    steering.keyDown(key("ArrowRight"), SERVE);

    expect(frame(steering).showsGuide).toBe(true);
  });

  it("turn nothing by a key held from before the serve was", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("ArrowRight"), SERVE);
    steering.keyDown(key("Space"), SERVE);

    const steer = { ...frame(steering, SERVE, 100) };

    expect(steer).toEqual({
      to: null,
      by: 0,
      push: 1,
      aim: SERVE,
      showsGuide: false,
      turnEnded: false,
    });
  });

  it("turn nothing by a key that turned the last serve's aim", () => {
    const steering = keyHeld();
    steering.keyDown(key("ArrowRight"), SERVE);
    steering.keyUp("Space");
    frame(steering);

    steering.keyDown(key("Space"), SERVE);
    const { aim } = frame(steering, SERVE, 100);

    expect(aim).toBe(SERVE);
  });

  it("turn nothing by the keys while the mouse holds the serve", () => {
    const steering = mouseHeld();

    steering.keyDown(key("ArrowRight"), SERVE);
    const { aim } = frame(steering, SERVE, 100);

    expect(aim).toBe(SERVE);
  });

  it("say a turn ended on the frame after its key is let go, and on that frame alone", () => {
    const steering = keyHeld();
    steering.keyDown(key("ArrowRight"), SERVE);
    const turning = frame(steering).turnEnded;

    steering.keyUp("ArrowRight");
    const ended = frame(steering).turnEnded;
    const after = frame(steering).turnEnded;

    expect({ turning, ended, after }).toEqual({
      turning: false,
      ended: true,
      after: false,
    });
  });

  it("say a turn ended as the other way is pressed over it", () => {
    const steering = keyHeld();
    steering.keyDown(key("ArrowRight"), SERVE);
    frame(steering);

    steering.keyDown(key("ArrowLeft"), SERVE);

    expect(frame(steering).turnEnded).toBe(true);
  });

  it("say no turn ended as the serve is let go of while a key turns it", () => {
    const steering = keyHeld();
    steering.keyDown(key("ArrowRight"), SERVE);
    frame(steering);

    steering.keyUp("Space");
    steering.keyUp("ArrowRight");

    expect(frame(steering).turnEnded).toBe(false);
  });

  it("say no turn ended as a drag turns the aim", () => {
    const steering = mouseHeld();
    steering.pointerMove(moved(mouse(10), 20, -30));
    frame(steering);

    steering.pointerMove(moved(mouse(10), -20, -30));

    expect(frame(steering).turnEnded).toBe(false);
  });
});

describe("Steering's mouse", () => {
  it("asks for the place it moves to, in field units", () => {
    const steering = new Steering(metricsAt());

    steering.pointerMove(mouse(7.5));

    expect(frame(steering).to).toBe(7.5);
  });

  it("asks for nothing on a frame it didn't move", () => {
    const steering = new Steering(metricsAt());
    steering.pointerMove(mouse(7.5));
    frame(steering);

    expect(frame(steering).to).toBeNull();
  });

  it("launches as it is pressed while no ball waits, there", () => {
    const steering = new Steering(metricsAt());

    const launches = steering.pointerDown(mouse(4), "drag", NO_SERVE);

    expect({ launches, to: frame(steering, NO_SERVE).to }).toEqual({
      launches: true,
      to: 4,
    });
  });

  it.each([
    ["while no ball waits", NO_SERVE],
    ["while one does", SERVE],
  ])("launches nothing as another button is pressed, %s", (_, serve) => {
    const steering = new Steering(metricsAt());

    const launches = steering.pointerDown(
      mouse(4, { button: 2 }),
      "drag",
      serve,
    );

    expect({ launches, aim: frame(steering, serve).aim }).toEqual({
      launches: false,
      aim: null,
    });
  });

  it("is no tap as it is let go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(mouse(4), "drag", NO_SERVE);

    expect(steering.pointerUp(mouse(4))).toBe(false);
  });

  it("asks for nothing once the steering lets go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerMove(mouse(7.5));

    steering.letGo();

    expect(frame(steering).to).toBeNull();
  });

  it("holds the serve as it is pressed while a ball waits, at the aim it would start from, launching nothing yet", () => {
    const steering = new Steering(metricsAt());

    const launches = steering.pointerDown(mouse(4), "drag", SERVE);

    expect({ launches, steer: frame(steering) }).toEqual({
      launches: false,
      steer: {
        to: null,
        by: 0,
        push: 0,
        aim: SERVE,
        showsGuide: false,
        turnEnded: false,
      },
    });
  });

  it("launches as it is let go within its zone, however long it was held, at the next frame", () => {
    const steering = mouseHeld();
    frame(steering, SERVE, 1000);

    const atOnce = steering.pointerUp(moved(mouse(10), 5, -5));

    expect({ atOnce, served: served(steering) }).toEqual({
      atOnce: false,
      served: { aim: SERVE, launches: true },
    });
  });

  it("asks for no place as it moves while it holds the serve", () => {
    const steering = mouseHeld();

    steering.pointerMove(mouse(12));

    expect(frame(steering).to).toBeNull();
  });

  it("turns nothing as it drags within its zone", () => {
    const steering = mouseHeld();

    steering.pointerMove(moved(mouse(10), 8, -8));

    expect(frame(steering)).toMatchObject({ aim: SERVE, showsGuide: false });
  });

  it.each([
    ["up and right", 30, -30, 45],
    ["up and left", -10, -30, -18],
    ["straight up", 0, -30, 0],
  ] as const)(
    "aims the way it drags %s, past its zone, and shows the guide at once",
    (_, across, down, aim) => {
      const steering = mouseHeld();

      steering.pointerMove(moved(mouse(10), across, down));

      expect(frame(steering)).toMatchObject({ aim, showsGuide: true });
    },
  );

  it.each([
    ["right", 40, -5, 60],
    ["left", -40, 10, -60],
  ] as const)("aims no further than 60° %s", (_, across, down, aim) => {
    const steering = mouseHeld();

    steering.pointerMove(moved(mouse(10), across, down));

    expect(frame(steering).aim).toBe(aim);
  });

  it("measures its zone in CSS pixels, whatever the pixel ratio", () => {
    const metrics = metricsAt(2);
    const steering = new Steering(metrics);
    const press = finger(10, { wasTouch: false }, metrics);
    steering.pointerDown(press, "drag", SERVE);

    steering.pointerMove(moved(press, 0, -2 * AIM_DEAD_CSS_PX));

    expect(steering.read(FRAME_MS, SERVE).aim).toBe(SERVE);
  });

  it("launches at the aim as it is let go past its zone", () => {
    const steering = mouseHeld();
    steering.pointerMove(moved(mouse(10), 30, -30));

    steering.pointerUp(moved(mouse(10), 30, -30));

    expect(served(steering)).toEqual({ aim: 45, launches: true });
  });

  it("launches at the aim it is let go at, though no frame read it yet", () => {
    const steering = mouseHeld();

    steering.pointerUp(moved(mouse(10), -30, -30));

    expect(served(steering)).toEqual({ aim: -45, launches: true });
  });

  it("hides the guide, holding the aim, as its drag comes back within its zone", () => {
    const steering = mouseHeld();
    steering.pointerMove(moved(mouse(10), 30, -30));
    frame(steering);

    steering.pointerMove(moved(mouse(10), 2, -2));

    expect(frame(steering)).toMatchObject({ aim: 45, showsGuide: false });
  });

  it("calls the aim off as it is let go back within its zone", () => {
    const steering = mouseHeld();
    steering.pointerMove(moved(mouse(10), 30, -30));

    steering.pointerUp(moved(mouse(10), 2, -2));

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("calls the aim off at a press of another button, and launches nothing as it is let go", () => {
    const steering = mouseHeld();

    steering.pointerDown(mouse(10, { button: 2 }), "drag", SERVE);
    steering.pointerUp(mouse(10));

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("holds the serve still as another button is let go", () => {
    const steering = mouseHeld();

    steering.pointerUp(mouse(10, { button: 2 }));

    expect(served(steering)).toEqual({ aim: SERVE, launches: false });
  });

  it("calls the aim off at a finger's press", () => {
    const steering = mouseHeld();

    steering.pointerDown(finger(10), "drag", SERVE);

    expect(frame(steering).aim).toBeNull();
  });

  it("calls the aim off at a launch key's press", () => {
    const steering = mouseHeld();

    steering.keyDown(key("Space"), SERVE);
    steering.pointerUp(mouse(10));

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("shows the guide once the serve is held long enough", () => {
    const steering = mouseHeld();
    frame(steering, SERVE, GUIDE_DELAY_MS / 2);

    const { showsGuide } = frame(steering, SERVE, GUIDE_DELAY_MS / 2);

    expect(showsGuide).toBe(true);
  });
});

describe("Steering's finger, dragging", () => {
  it("moves the paddle as far as it moves, from wherever it lands", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag", NO_SERVE);
    steering.pointerMove(finger(23));

    expect(frame(steering, NO_SERVE)).toEqual({
      to: null,
      by: 3,
      push: 0,
      aim: null,
      showsGuide: false,
      turnEnded: false,
    });
  });

  it("moves the paddle only by what it moved since the last frame", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag", NO_SERVE);
    steering.pointerMove(finger(23));
    frame(steering, NO_SERVE);
    steering.pointerMove(finger(22));

    expect(frame(steering, NO_SERVE).by).toBe(-1);
  });

  it("launches nothing as it is pressed", () => {
    const steering = new Steering(metricsAt());

    expect(steering.pointerDown(finger(20), "drag", NO_SERVE)).toBe(false);
  });

  it("steers again once lifted and pressed anew, as another finger", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag", NO_SERVE);
    steering.pointerUp(finger(20));
    steering.pointerDown(finger(5, { id: 2 }), "drag", NO_SERVE);
    steering.pointerMove(finger(9, { id: 2 }));

    expect(frame(steering, NO_SERVE).by).toBe(4);
  });

  it("is let alone by a second finger while it steers", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(20), "drag", NO_SERVE);
    steering.pointerDown(finger(5, { id: 2 }), "drag", NO_SERVE);
    steering.pointerMove(finger(9, { id: 2 }));

    expect(frame(steering, NO_SERVE).by).toBe(0);
  });
});

describe("Steering's finger, followed", () => {
  it("asks for the place it lands", () => {
    const steering = new Steering(metricsAt());

    steering.pointerDown(finger(6), "follow", NO_SERVE);

    expect(frame(steering, NO_SERVE).to).toBe(6);
  });

  it("asks for the place it moves to", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(6), "follow", NO_SERVE);
    steering.pointerMove(finger(11));

    expect(frame(steering, NO_SERVE)).toEqual({
      to: 11,
      by: 0,
      push: 0,
      aim: null,
      showsGuide: false,
      turnEnded: false,
    });
  });

  it("asks for nothing once the steering lets go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(6), "follow", NO_SERVE);

    steering.letGo();

    expect(frame(steering, NO_SERVE).to).toBeNull();
  });
});

describe("Steering's finger, as a ball waits", () => {
  it("steers as ever while its drag stays within its zone, holding no aim", () => {
    const steering = fingerHeld();

    steering.pointerMove(moved(finger(10), 9, -6));

    expect(frame(steering)).toEqual({
      to: null,
      by: 1,
      push: 0,
      aim: null,
      showsGuide: false,
      turnEnded: false,
    });
  });

  it("asks for the place it lands, followed", () => {
    const steering = fingerHeld(finger(6), "follow");

    expect(frame(steering)).toMatchObject({ to: 6, aim: null });
  });

  it.each([
    ["straight up", 0, -30, 0],
    ["up and right", 10, -30, 18],
    ["up and left, at 45°", -20, -20, -45],
  ] as const)(
    "aims once its drag leaves its zone %s, steering nothing as it does",
    (_, across, down, aim) => {
      const steering = fingerHeld();

      steering.pointerMove(moved(finger(10), across, down));

      expect(frame(steering)).toMatchObject({
        by: 0,
        aim,
        showsGuide: true,
      });
    },
  );

  it("aims as far over as its drag goes once it aims, within 60°", () => {
    const steering = fingerHeld();
    steering.pointerMove(moved(finger(10), 0, -30));

    steering.pointerMove(moved(finger(10), 60, -10));

    expect(frame(steering).aim).toBe(60);
  });

  it.each([
    ["sideways", 20, 0],
    ["up, but further over than 45°", 20, -19],
    ["down", 0, 20],
  ] as const)(
    "steers on, holding no aim, once its drag leaves its zone %s",
    (_, across, down) => {
      const steering = fingerHeld();

      steering.pointerMove(moved(finger(10), across, down));

      expect(frame(steering)).toMatchObject({
        by: across / metricsAt().unit,
        aim: null,
        showsGuide: false,
        turnEnded: false,
      });
    },
  );

  it("launches nothing as it lifts once it steers", () => {
    const steering = fingerHeld();
    steering.pointerMove(moved(finger(10), 20, 0));

    const atOnce = steering.pointerUp(moved(finger(10), 20, 0));

    expect({ atOnce, served: served(steering) }).toEqual({
      atOnce: false,
      served: CALLED_OFF,
    });
  });

  it("launches as it lifts within its zone, however long it was held", () => {
    const steering = fingerHeld();
    frame(steering, SERVE, 1000);

    const atOnce = steering.pointerUp(finger(10, { upTime: 9000 }));

    // It never aimed, so it serves as a quick press would.
    expect({ atOnce, served: served(steering) }).toEqual({
      atOnce: false,
      served: { aim: null, launches: true },
    });
  });

  it("launches at the aim as it lifts past its zone", () => {
    const steering = fingerHeld();
    steering.pointerMove(moved(finger(10), 0, -30));

    steering.pointerUp(moved(finger(10), -30, -30));

    expect(served(steering)).toEqual({ aim: -45, launches: true });
  });

  it("calls the aim off as it lifts back within its zone", () => {
    const steering = fingerHeld();
    steering.pointerMove(moved(finger(10), 0, -30));

    steering.pointerUp(moved(finger(10), 0, -3));

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it.each([
    ["upward, which launches at its aim", 10, -30, { aim: 18, launches: true }],
    ["sideways, which steers", 30, 0, CALLED_OFF],
  ] as const)(
    "takes a lift out of its zone with no move before it as a drag %s",
    (_, across, down, frameAfter) => {
      const steering = fingerHeld();

      steering.pointerUp(moved(finger(10), across, down));

      expect(served(steering)).toEqual(frameAfter);
    },
  );

  it("calls the aim off as the browser takes its touch away", () => {
    const steering = fingerHeld();
    steering.pointerMove(moved(finger(10), 0, -30));

    steering.pointerUp(moved(finger(10, { wasCanceled: true }), 0, -30));

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("calls the aim off at a second finger's press, the first then steering nothing and launching nothing", () => {
    const steering = fingerHeld();
    steering.pointerMove(moved(finger(10), 0, -30));

    steering.pointerDown(finger(5, { id: 2 }), "drag", SERVE);
    steering.pointerMove(moved(finger(10), 20, -30));
    const steer = { ...frame(steering) };
    steering.pointerUp(moved(finger(10), 20, -30));

    expect({ steer, served: served(steering) }).toEqual({
      steer: {
        to: null,
        by: 0,
        push: 0,
        aim: null,
        showsGuide: false,
        turnEnded: false,
      },
      served: CALLED_OFF,
    });
  });

  it("shows the guide once held long enough, though it holds no aim yet", () => {
    const steering = fingerHeld();
    frame(steering, SERVE, GUIDE_DELAY_MS / 2);

    expect(frame(steering, SERVE, GUIDE_DELAY_MS / 2)).toMatchObject({
      aim: null,
      showsGuide: true,
    });
  });

  it("is let go of once no press may aim, steering nothing more", () => {
    const steering = fingerHeld();
    frame(steering, NO_SERVE);

    steering.pointerMove(finger(14));
    const { by } = frame(steering, NO_SERVE);
    steering.pointerUp(finger(14));

    expect({ by, served: served(steering) }).toEqual({
      by: 0,
      served: CALLED_OFF,
    });
  });
});

describe("Steering's taps", () => {
  it("launch, a finger pressed briefly that barely moved", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);

    const tapped = steering.pointerUp(finger(10, { upTime: 1000 + TAP_MS }));

    expect(tapped).toBe(true);
  });

  it("aren't a finger held longer", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);

    const tapped = steering.pointerUp(
      finger(10, { upTime: 1000 + TAP_MS + 1 }),
    );

    expect(tapped).toBe(false);
  });

  it("aren't a finger that moved farther, though it came back", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);
    steering.pointerMove(finger(12));

    expect(steering.pointerUp(finger(10))).toBe(false);
  });

  it("aren't a finger let go farther off than a tap moves", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);
    const moved = { x: toCanvasX(metricsAt(), 10) + TAP_CSS_PX + 1 };

    expect(steering.pointerUp(finger(10, moved))).toBe(false);
  });

  it("launch, a finger pressed briefly after one that dragged", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);
    steering.pointerMove(finger(14));
    steering.pointerUp(finger(14));
    steering.pointerDown(finger(14, { id: 2 }), "drag", NO_SERVE);

    expect(steering.pointerUp(finger(14, { id: 2 }))).toBe(true);
  });

  it("aren't a touch the browser took away", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);

    expect(steering.pointerUp(finger(10, { wasCanceled: true }))).toBe(false);
  });

  it("aren't a finger pressed as the steering let go", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);

    steering.letGo();

    expect(steering.pointerUp(finger(10))).toBe(false);
  });

  it("measure how far a finger moved in CSS pixels, whatever the pixel ratio", () => {
    // At a pixel ratio of 2, a unit is 18 device pixels, and a tap may move
    // 16 of them.
    const metrics = metricsAt(2);
    const steering = new Steering(metrics);
    steering.pointerDown(finger(10, {}, metrics), "drag", NO_SERVE);
    const moved = { x: toCanvasX(metrics, 10) + TAP_CSS_PX * 2 };

    expect(steering.pointerUp(finger(10, moved, metrics))).toBe(true);
  });

  it("aren't the let-go of a second finger", () => {
    const steering = new Steering(metricsAt());
    steering.pointerDown(finger(10), "drag", NO_SERVE);

    expect(steering.pointerUp(finger(10, { id: 2 }))).toBe(false);
  });
});

describe("Steering", () => {
  it("forgets the keys held and the finger pressed as it lets go", () => {
    const steering = new Steering(metricsAt());
    steering.keyDown(key("ArrowLeft"), NO_SERVE);
    steering.pointerDown(finger(20), "drag", NO_SERVE);
    steering.pointerMove(finger(23));

    steering.letGo();

    expect({
      steer: { ...frame(steering, NO_SERVE) },
      tapped: steering.pointerUp(finger(20)),
    }).toEqual({
      steer: {
        to: null,
        by: 0,
        push: 0,
        aim: null,
        showsGuide: false,
        turnEnded: false,
      },
      tapped: false,
    });
  });

  it("calls the aim off as it lets go, launching nothing after", () => {
    const steering = mouseHeld();

    steering.letGo();
    steering.pointerUp(mouse(10));

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("launches nothing let go of as it lets go", () => {
    const steering = keyHeld();
    steering.keyUp("Space");

    steering.letGo();

    expect(served(steering)).toEqual(CALLED_OFF);
  });

  it("reads places by where the field now lies", () => {
    const steering = new Steering(metricsAt());
    const moved = metricsAt(2);
    steering.measure(moved);

    steering.pointerMove({ ...mouse(0), x: toCanvasX(moved, 8) });

    expect(frame(steering).to).toBe(8);
  });

  it("writes each frame's steering into the same object", () => {
    const steering = new Steering(metricsAt());

    expect(frame(steering)).toBe(frame(steering));
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
