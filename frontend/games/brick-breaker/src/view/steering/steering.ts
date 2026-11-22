import { HeldKeys } from "@fz/core/keys";
import { clamp } from "@fz/core/math";
import { isOneOf } from "@fz/core/records";
import type { Steer } from "../../rules/paddle/paddle";
import { AIM_MOST, KEY_RAMP_MS } from "../../rules/tuning";
import { type FieldMetrics, toFieldX } from "../field/field_metrics";
import type { FieldView } from "../field/frame";
import { type HeldKey, commandOfKey, heldKeyOf } from "./controls";

/** Every way a finger may steer the paddle: by dragging it from anywhere, or by the paddle following it. */
export const TOUCH_STEERINGS = ["drag", "follow"] as const;

/** Says how a finger steers the paddle. */
export type TouchSteering = (typeof TOUCH_STEERINGS)[number];

/** Returns whether a value is a way a finger may steer the paddle. */
export function isTouchSteering(value: unknown): value is TouchSteering {
  return isOneOf(value, TOUCH_STEERINGS);
}

/**
 * How long a press of a finger may last to be a tap, in milliseconds,
 * while no ball waits to be served; one that does launches at any length.
 */
export const TAP_MS = 250;

/** How far a finger may move while pressed to be a tap, in CSS pixels. */
export const TAP_CSS_PX = 8;

/** How fast held keys turn the serve's aim, in degrees a second. */
export const AIM_KEY_SPEED = 60;

/** How fast held keys turn the serve's aim with Shift held, in degrees a second. */
export const AIM_FINE_SPEED = 10;

/**
 * How far a drag goes from its press before it aims, in CSS pixels: within
 * it nothing turns, and a press let go within it launches, unless its drag
 * went out and came back, which calls the aim off.
 */
export const AIM_DEAD_CSS_PX = 12;

/**
 * How near straight up a finger's drag first leaves its press to aim, in
 * degrees either way; one that leaves further over steers the paddle.
 */
export const AIM_UPWARD = 45;

/** How long a press that may aim is held before the guide shows, unless it turns the aim first, in milliseconds. */
export const GUIDE_DELAY_MS = 150;

/**
 * The most of a frame's time a held press counts, in milliseconds: a frame
 * counts all it took down to 10 frames a second, so held keys turn the aim
 * at the same pace on a slow device, but a stall counts no more.
 */
export const LONGEST_FRAME_MS = 100;

/**
 * How many fingers the scene follows at once, as it adds pointers for: one
 * that steers or aims, and a second, whose press calls the aim off.
 */
export const MOST_FINGERS = 2;

/** The mouse's main button, the one that launches. */
const MAIN_BUTTON = 0;

/** Describes a pointer as the steering reads it, as Phaser's pointer has it. */
export interface PointerView {
  /** Tells pointers apart: each finger has its own. */
  readonly id: number;
  /** Where it is across the canvas, in device pixels. */
  readonly x: number;
  /** Where it is down the canvas, in device pixels. */
  readonly y: number;
  /** Whether it is a finger, rather than a mouse. */
  readonly wasTouch: boolean;
  /** The mouse button last pressed or let go: 0 is the main one. */
  readonly button: number;
  /** Whether the browser took its touch away, as a gesture of its own began. */
  readonly wasCanceled: boolean;
  /** When it was last pressed, in milliseconds. */
  readonly downTime: number;
  /** When it was last let go, in milliseconds. */
  readonly upTime: number;
}

/** Describes a key pressed, as a `KeyboardEvent` has it. */
export interface KeyPress {
  /** The key's place on the keyboard (`event.code`). */
  readonly code: string;
  /** Whether it is a held key's repeat. */
  readonly repeat: boolean;
}

/**
 * Says how the player steers a frame: the rules' `Steer`, and whether the
 * serve's guide shows, which only the view reads.
 */
export interface PlayerSteer extends Steer {
  /**
   * Whether the serve's guide shows: once a press holding the serve has
   * been held {@link GUIDE_DELAY_MS} or has turned the aim, while its drag
   * isn't back within its zone. Left out, as by a steer typed as the rules'
   * `Steer`, which the shell hands the play, none does.
   */
  showsGuide?: boolean;
}

/** Names what holds the serve's aim: a launch key, the mouse, or a finger. */
type Holder = "key" | "mouse" | "finger";

/**
 * Returns the aim a quick press serves the ball waiting on the paddle at,
 * the way its eyes look, in whole degrees from straight up, positive to the
 * right, or null where no ball waits to be served.
 */
export function waitingAim(field: FieldView): number | null {
  if (field.state !== "serve") return null;
  for (const ball of field.balls) {
    if (ball.live && ball.held) {
      return wholeDegrees(degreesOf(ball.dx, ball.dy));
    }
  }
  return null;
}

/**
 * Turns the player's keys, mouse and fingers into the paddle's steering and
 * the serve's aim for each frame: the keys held, as a push; the mouse, as a
 * place to go; a finger, as a drag or a place, as the setting says; and a
 * click, a tap or a launch key, as a launch.
 *
 * While a ball waits to be served, a launch key, the mouse's main button or
 * a finger holds the serve instead, and its let-go launches: the next frame
 * writes the aim it let go at, and says it launches ({@link launches}), so
 * the scene hands the launch on once that frame's steering is taken. A key
 * or the mouse holds the aim from its press, where the ball's eyes look,
 * which keeps the paddle still; keys pressed while a launch key is held
 * turn it, and a drag past {@link AIM_DEAD_CSS_PX} aims the way it goes. A
 * finger steers as ever till its drag leaves that zone, and aims only if it
 * left upward. A press let go within the zone launches, unless its drag
 * went out and came back, which calls the aim off, as a second press, the
 * mouse's other buttons, a touch the browser takes away, the pause keys and
 * looking away do, a launch let go of but yet to be handed on among it.
 *
 * A place is asked only on a frame the pointer moved, so the paddle, once a
 * key has pushed it, stays where the keys left it until the pointer moves
 * again.
 */
export class Steering {
  /** The keys held that push the paddle, the last pressed winning while both ways are held, and Shift. */
  private readonly keys = new HeldKeys<HeldKey>(heldKeyOf);
  /** The keys held that turn the aim: only those pressed while a launch key holds it. */
  private readonly turns = new HeldKeys<HeldKey>(heldKeyOf);
  /** The finger pressed, by its id, or null: one at a time steers. */
  private finger: number | null = null;
  private dragging = false;
  private fromX = 0;
  private fromY = 0;
  private lastX = 0;
  /** How far the finger has been from where it was pressed, in device pixels. */
  private farthest = 0;
  /** The place a pointer asked for this frame, in device pixels, or null. */
  private toX: number | null = null;
  /** How far a dragging finger has moved this frame, in device pixels. */
  private byPx = 0;
  /** What holds the serve, or null while nothing does. */
  private holder: Holder | null = null;
  /** The launch key that holds the serve, by `event.code`, whose let-go launches. */
  private holdingKey = "";
  /** Whether the press holding the serve aims it, which a finger's does only once its drag leaves its zone upward. */
  private aiming = false;
  /** The aim held, in degrees, which each frame writes in whole ones. */
  private aim = 0;
  /** How long the serve has been held, by the frames' clock. */
  private heldMs = 0;
  /** Whether the aim has turned since its press: by the keys, or a drag out of its zone. */
  private turned = false;
  /** Whether the drag holding the serve has gone out of its zone. */
  private wentOut = false;
  /** Whether the drag holding the serve is out of its zone, at its last place. */
  private isOut = false;
  /** Which way the keys turned the aim on the last frame. */
  private turnWay: -1 | 0 | 1 = 0;
  /** How far the keys' turn has ramped up to its speed, from 0 to 1. */
  private ramp = 0;
  /** Whether the serve was let go of since the last frame, its launch for the next frame to hand on. */
  private launchPending = false;
  /** The aim the serve let go of launches at, in whole degrees, or null for a finger's that never aimed. */
  private launchAim: number | null = null;
  /** Whether the frame last read launches the serve. */
  private launching = false;
  // Written again each frame, so steering makes nothing.
  private readonly steer: PlayerSteer = {
    to: null,
    by: 0,
    push: 0,
    aim: null,
    showsGuide: false,
  };

  constructor(private metrics: FieldMetrics) {}

  /** Takes where the field now lies on the canvas. */
  measure(metrics: FieldMetrics): void {
    this.metrics = metrics;
  }

  /**
   * Takes a key pressed, the aim a press would start from or null where
   * none may aim, and returns whether the steering took it, so the scene
   * asks nothing more of it: a key held to steer, a held key that repeats
   * included, and a launch key that holds the serve, or calls off an aim a
   * press holds already. The pause keys call the aim off, and are the
   * scene's still.
   */
  keyDown(press: KeyPress, serve: number | null): boolean {
    const held = heldKeyOf(press.code);
    if (held !== null) {
      this.keys.press(press.code);
      if (this.holder === "key" && held !== "fine") {
        this.turns.press(press.code);
      }
      return true;
    }
    const command = commandOfKey(press.code);
    if (command === "pause" || command === "toggle") this.callOff();
    if (command !== "launch" || press.repeat) return false;
    if (this.holder !== null) {
      this.callOff();
      return true;
    }
    if (serve === null) return false;
    this.hold("key", serve);
    this.holdingKey = press.code;
    return true;
  }

  /** Takes a key let go: the launch key that held the serve lets go of it to launch. */
  keyUp(code: string): void {
    this.keys.release(code);
    this.turns.release(code);
    if (this.holder === "key" && code === this.holdingKey) this.letGoToLaunch();
  }

  /**
   * Takes a pointer pressed, and returns whether it launches at once: a
   * press of the mouse's main button does while no ball waits to be served.
   * With one waiting, the main button or a finger holds the serve, and any
   * press while one is held calls its aim off.
   */
  pointerDown(
    pointer: PointerView,
    touch: TouchSteering,
    serve: number | null,
  ): boolean {
    if (this.holder !== null) {
      this.callOff();
      return false;
    }
    if (!pointer.wasTouch) {
      if (pointer.button === MAIN_BUTTON && serve !== null) {
        this.hold("mouse", serve);
        this.pressAt(pointer);
        return false;
      }
      this.toX = pointer.x;
      return pointer.button === MAIN_BUTTON;
    }
    if (this.finger !== null) return false;
    this.finger = pointer.id;
    this.dragging = touch === "drag";
    this.lastX = pointer.x;
    this.farthest = 0;
    this.pressAt(pointer);
    if (!this.dragging) this.toX = pointer.x;
    if (serve !== null) this.hold("finger", serve);
    return false;
  }

  /**
   * Takes a pointer moved: a drag holding the serve aims, a mouse otherwise
   * asks for the place it is, a finger the paddle follows does too, and a
   * dragging finger moves the paddle as far as it moves.
   */
  pointerMove(pointer: PointerView): void {
    if (!pointer.wasTouch) {
      if (this.holder === "mouse") this.dragTo(pointer);
      else this.toX = pointer.x;
      return;
    }
    if (pointer.id !== this.finger) return;
    if (this.holder === "finger" && this.dragTo(pointer) && this.aiming) return;
    this.reach(pointer);
    if (this.dragging) {
      this.byPx += pointer.x - this.lastX;
      this.lastX = pointer.x;
    } else {
      this.toX = pointer.x;
    }
  }

  /**
   * Takes a pointer let go, and returns whether it launches at once: a tap
   * does, a finger pressed briefly that barely moved. A press holding the
   * serve lets go of it to launch instead, unless its drag came back into
   * its zone or the browser took its touch away, which call the aim off.
   */
  pointerUp(pointer: PointerView): boolean {
    if (!pointer.wasTouch) {
      if (this.holder !== "mouse" || pointer.button !== MAIN_BUTTON) {
        return false;
      }
      this.dragTo(pointer);
      this.letGoOfServe();
      return false;
    }
    if (pointer.id !== this.finger) return false;
    this.finger = null;
    if (this.holder === "finger") {
      if (pointer.wasCanceled) {
        this.callOff();
        return false;
      }
      if (this.dragTo(pointer)) {
        this.letGoOfServe();
        return false;
      }
    }
    this.reach(pointer);
    return (
      !pointer.wasCanceled &&
      pointer.upTime - pointer.downTime <= TAP_MS &&
      this.farthest <= TAP_CSS_PX * this.metrics.pixelRatio
    );
  }

  /**
   * Calls the aim off: the press holding the serve, and a finger's with it,
   * is let go of without launching, as is a serve let go of whose launch
   * the next frame has yet to hand on, and the ball goes on waiting. Safe to
   * repeat.
   */
  callOff(): void {
    if (this.holder === "finger") this.finger = null;
    this.release();
    this.launchPending = false;
  }

  /**
   * Forgets every key held and the finger pressed, and calls the aim off,
   * as the player looks away, so none sticks.
   */
  letGo(): void {
    this.callOff();
    this.keys.letGo();
    this.finger = null;
    this.toX = null;
    this.byPx = 0;
  }

  /**
   * Returns the steering for a frame that took some milliseconds, in field
   * units, as a press may aim or not, and starts the next frame's afresh;
   * the object returned is the same each frame.
   *
   * Where none may aim now, a press holding the serve is called off, and
   * one let go of launches nothing. One held counts the frame's time, up to
   * {@link LONGEST_FRAME_MS}, and the keys turn its aim by it. A frame
   * after a let-go writes the aim it let go at.
   */
  read(deltaMs: number, serve: number | null): Readonly<PlayerSteer> {
    if (serve === null) this.callOff();
    this.launching = this.launchPending;
    this.launchPending = false;
    if (this.holder !== null) {
      const frameMs = clamp(deltaMs, 0, LONGEST_FRAME_MS);
      this.heldMs += frameMs;
      if (this.holder === "key") this.turnBy(frameMs);
    }
    const { steer } = this;
    steer.push = this.keys.axis("left", "right");
    steer.to = this.toX === null ? null : toFieldX(this.metrics, this.toX);
    steer.by = this.byPx / this.metrics.unit;
    steer.aim = this.launching ? this.launchAim : this.heldAim();
    steer.showsGuide =
      this.holder !== null &&
      (this.turned || this.heldMs >= GUIDE_DELAY_MS) &&
      (this.isOut || !this.wentOut);
    this.toX = null;
    this.byPx = 0;
    return steer;
  }

  /**
   * Returns whether the frame last read launches the serve, let go of since
   * the frame before at the aim it wrote: the scene hands the launch on once
   * it has handed that frame's steering on, so the rules serve at it.
   */
  launches(): boolean {
    return this.launching;
  }

  /** Returns the aim held, in whole degrees, or null while no press aims. */
  private heldAim(): number | null {
    return this.aiming ? wholeDegrees(this.aim) : null;
  }

  /** Lets go of the serve to launch at the aim held, if any, at the next frame. */
  private letGoToLaunch(): void {
    this.launchAim = this.heldAim();
    this.callOff();
    this.launchPending = true;
  }

  /** Lets go of the serve, its aim and all it turned, leaving the finger pressed as it is. */
  private release(): void {
    this.holder = null;
    this.aiming = false;
    this.heldMs = 0;
    this.turned = false;
    this.wentOut = false;
    this.isOut = false;
    this.turnWay = 0;
    this.ramp = 0;
    this.turns.letGo();
  }

  /** Holds the serve by a press, its aim where it would start, nothing turned yet. */
  private hold(holder: Holder, serve: number): void {
    this.release();
    this.holder = holder;
    this.aiming = holder !== "finger";
    this.aim = serve;
  }

  /** Notes where a pointer was pressed. */
  private pressAt(pointer: PointerView): void {
    this.fromX = pointer.x;
    this.fromY = pointer.y;
  }

  /**
   * Takes the drag holding the serve to a place: past its zone, a finger
   * yet to aim aims if it went upward, and steers on with nothing held if
   * not, and one that aims takes the way from its press, held within
   * {@link AIM_MOST}; within it, nothing turns. Returns whether the drag
   * holds the serve still.
   */
  private dragTo(pointer: PointerView): boolean {
    const across = pointer.x - this.fromX;
    const down = pointer.y - this.fromY;
    this.isOut =
      Math.hypot(across, down) > AIM_DEAD_CSS_PX * this.metrics.pixelRatio;
    if (!this.isOut) return true;
    const degrees = degreesOf(across, down);
    if (!this.aiming) {
      if (Math.abs(degrees) > AIM_UPWARD) {
        this.release();
        return false;
      }
      this.aiming = true;
    }
    this.wentOut = true;
    this.turned = true;
    this.aim = clamp(degrees, -AIM_MOST, AIM_MOST);
    return true;
  }

  /** Lets go of the serve where its drag last was: to launch, unless the drag came back into its zone, which calls the aim off. */
  private letGoOfServe(): void {
    if (this.isOut || !this.wentOut) this.letGoToLaunch();
    else this.callOff();
  }

  /** Turns the aim by the keys held for a frame's time, ramping up to their speed, Shift's the slower. */
  private turnBy(frameMs: number): void {
    const way = this.turns.axis("left", "right");
    if (way !== this.turnWay) this.ramp = 0;
    this.turnWay = way;
    if (way === 0) return;
    this.turned = true;
    this.ramp = Math.min(1, this.ramp + frameMs / KEY_RAMP_MS);
    const speed = this.keys.isHeld("fine") ? AIM_FINE_SPEED : AIM_KEY_SPEED;
    this.aim = clamp(
      this.aim + (way * this.ramp * speed * frameMs) / 1000,
      -AIM_MOST,
      AIM_MOST,
    );
  }

  /** Notes how far the finger has been from where it was pressed. */
  private reach(pointer: PointerView): void {
    const apart = Math.hypot(pointer.x - this.fromX, pointer.y - this.fromY);
    this.farthest = Math.max(this.farthest, apart);
  }
}

/**
 * Returns the angle of a way across and down, in degrees from straight up,
 * positive to the right: between -180 and 180.
 */
function degreesOf(across: number, down: number): number {
  return (Math.atan2(across, -down) * 180) / Math.PI;
}

/** Returns an angle in whole degrees, a nought never negative. */
function wholeDegrees(degrees: number): number {
  // Math.round() rounds -0.4 to -0, which a spoken aim or a spec would trip on.
  return Math.round(degrees) + 0;
}
