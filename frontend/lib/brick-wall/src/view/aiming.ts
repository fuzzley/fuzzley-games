// How a wall game's player aims a shot: the keys, the mouse's wheel, a
// nudge, and the mouse and fingers, pointed and held or pulled back, each
// shot let fly as its press lets go or by a button, or called off.

import { clamp } from "@fz/core/math";
import type { Viewport } from "@fz/phaser/layout";
import {
  AIMS_PER_DEGREE,
  AIM_COUNT,
  type Aim,
  FIRST_AIM_DEGREES,
} from "../rules/aims";
import { FIRST_X, RADIUS } from "../rules/field";
import {
  type PointerAiming,
  type PointerRelease,
  STRAIGHT_UP,
} from "./aim_settings";
import { type FieldMetrics, type Place, toField } from "./field_metrics";

/** Names a way a nudge turns the aim: left, counter-clockwise, or right. */
export type Nudge = "left" | "right";

/** Names what a key does to the shot being aimed: turns the aim left or right, or lets the shot fly. */
export type AimKey = "left" | "right" | "release";

/**
 * How far a pull back runs before it aims, in field units; a press let go
 * within it calls the shot off.
 */
export const DEAD_ZONE = 0.5;

/**
 * How near a side of the canvas a finger's press is left alone, in CSS
 * pixels, so the browser's swipe from the screen's edge keeps it.
 */
export const EDGE_CSS_PX = 16;

/**
 * How many fingers a scene follows at once, as it adds pointers for: one
 * aiming, and a second, whose press calls the shot off.
 */
export const MOST_FINGERS = 2;

/** The mouse's main button, the one that presses. */
const MAIN_BUTTON = 0;

/** The mouse's right button, whose press calls a shot off. */
const RIGHT_BUTTON = 2;

/**
 * What each key does to the shot, by `event.code`, the key's place on the
 * keyboard rather than its letter, so A and D steer on a QWERTY keyboard
 * where Q and D do on an AZERTY one.
 */
const AIM_KEYS: Readonly<Record<string, AimKey>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "release",
};

/** Describes a pointer as the aiming reads it, as Phaser's pointer has it. */
export interface PointerView {
  /** Tells pointers apart: the mouse has one, and each finger its own. */
  readonly id: number;
  /** Where it is across the canvas, in device pixels. */
  readonly x: number;
  /** Where it is down the canvas, in device pixels. */
  readonly y: number;
  /** Whether it is a finger, rather than a mouse. */
  readonly wasTouch: boolean;
  /** The mouse button last pressed or let go: 0 is the main one, 2 the right. */
  readonly button: number;
  /** Whether the browser took its touch away, as a gesture of its own began. */
  readonly wasCanceled: boolean;
}

/** Describes a key pressed, as a `KeyboardEvent` has it. */
export interface KeyPress {
  /** The key's place on the keyboard (`event.code`). */
  readonly code: string;
  readonly shiftKey: boolean;
  /** Whether it is a held key's repeat. */
  readonly repeat: boolean;
}

/** Describes the shot being aimed in a frame, which a game reads as it aims a round. */
export interface AimFrame {
  /** The aim the guide shows, or a shot let fly flies along. */
  aim: Aim;
  /** Whether the shot was let fly this frame, at the aim. */
  release: boolean;
  /** Whether the keys turned the aim this frame, which a game may say. */
  keyed: boolean;
  /**
   * Whether a finger aims the shot, where its hand may cover what is drawn
   * under it: one that points from its press, or that pulls back once past
   * its dead zone, until it lets go or the shot is called off. The mouse
   * and the keys never do.
   */
  touch: boolean;
  /** Where the finger that aims is across the canvas, in device pixels, read only while {@link touch} says one does. */
  touchX: number;
  /** Where the finger that aims is down the canvas, in device pixels, read only while {@link touch} says one does. */
  touchY: number;
}

/**
 * Hears what a pointer's press does to the shot, so a game can lay what it
 * builds as a press is held, such as a charge, over the aim.
 */
export interface PressWatcher {
  /** Hears a pointer's press start a shot. */
  pressed(): void;
  /** Hears a pull back move: how far it runs past its dead zone, in field units, or null within it. */
  pulled(beyond: number | null): void;
  /** Hears the shot let fly, the first since the last frame, which the frame says. */
  released(): void;
  /** Hears the shot being made end, let fly or called off. */
  ended(): void;
}

/** Hears nothing, for a game that lays nothing over the aim. */
const DEAF: PressWatcher = {
  pressed: () => undefined,
  pulled: () => undefined,
  released: () => undefined,
  ended: () => undefined,
};

/** Returns what a key does to the shot being aimed, or null for one that does nothing to it. */
export function aimKeyOf(code: string): AimKey | null {
  return AIM_KEYS[code] ?? null;
}

/**
 * Returns the aim nearest a heading given across the field and up it, held
 * between the first and the last: a heading under the floor's line takes
 * the aim on its side.
 */
export function aimToward(across: number, up: number): Aim {
  let degrees = (Math.atan2(up, across) * 180) / Math.PI;
  if (degrees < -90) degrees += 360;
  return clamp(
    Math.round((degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE),
    0,
    AIM_COUNT - 1,
  );
}

/**
 * Turns the player's keys, mouse and fingers into the shot being aimed, a
 * frame at a time: the aim, and the shot let fly.
 *
 * The keys turn the aim a degree, or an aim, a quarter of one, with Shift,
 * and Space lets it fly; the wheel and a nudge turn it an aim. The mouse
 * and fingers aim the way the settings choose ({@link PointerAiming}).
 * Pointed, the aim follows the pointer, a finger's from its press and a
 * mouse's even unpressed and as the fuzzball waits somewhere new. Pulled
 * back, a press anywhere on the canvas aims opposite the drag, once past
 * the {@link DEAD_ZONE}. A press flies as it is let go, wherever that is, at
 * the aim its last move showed; or, where the settings let only a button
 * fly it ({@link PointerRelease}), its letting go leaves the aim where it
 * is, and a mouse's moves leave it there too until the mouse presses again
 * or the shot flies. Each frame says where a finger that aims is, from its
 * press or once past the dead zone till it lets go. Only the mouse's main
 * button presses, and its right button calls a shot off; a second press
 * while one is held, a touch the browser takes away, a pull back let go
 * within its dead zone, or a pointer lost ({@link callOff}) calls the shot
 * off, and never lets it fly. A finger's press near the canvas's sides is
 * left to the browser.
 *
 * The scene reads it every frame, follows {@link MOST_FINGERS}, hands a
 * pointer let go past the canvas to {@link pointerUp}, and calls
 * {@link callOff} as the player looks away. A shot may be let fly at any
 * time: the round reads a shot let fly only while it aims. A game that
 * builds something as a press is held hears the press through its
 * {@link PressWatcher}.
 */
export class Aiming {
  /** How the mouse and fingers aim from their next press on. */
  private nextWay: PointerAiming = "pointAndHold";
  /** How a pointer's press lets the shot fly. */
  private letFly: PointerRelease = "onLetGo";
  private aim: Aim = STRAIGHT_UP;
  /** Where the fuzzball waits across the floor, which a pointer aims from. */
  private from = FIRST_X;
  /** The pointer pressed, by its id, or null: one at a time aims. */
  private pressed: number | null = null;
  /** How the pointer pressed aims. */
  private way: PointerAiming = "pointAndHold";
  /** Where the pointer was pressed, in device pixels. */
  private pressX = 0;
  private pressY = 0;
  /** Whether a pull back has left its dead zone at its last move, so it flies if let go. */
  private armed = false;
  /** Whether the mouse pointed the aim last, so it aims again as the fuzzball waits somewhere new. */
  private pointed = false;
  /** Whether the mouse's press let go of an aim a button flies, which its moves leave alone till it presses again. */
  private holding = false;
  /** Whether the keys changed the aim since the last frame. */
  private keyed = false;
  /** Whether the pointer pressed is a finger that aims, pointed or pulled past its dead zone, which the frame says. */
  private touching = false;
  /** Where the finger pressed was at its press or its last move, in device pixels. */
  private touchX = 0;
  private touchY = 0;
  /** Whether a shot was let fly since the last frame, and at what. */
  private released = false;
  private releasedAim: Aim = STRAIGHT_UP;
  /** Where a pointer last pointed on the field, written again at each move, so moving makes nothing. */
  private readonly place: Place = { x: 0, y: 0 };
  // Written again each frame, so aiming makes nothing.
  private readonly frame: AimFrame = {
    aim: STRAIGHT_UP,
    release: false,
    keyed: false,
    touch: false,
    touchX: 0,
    touchY: 0,
  };

  /** Starts with the aim straight up, on a field laid out on a canvas, its presses heard by a watcher. */
  constructor(
    private metrics: FieldMetrics,
    private canvas: Viewport,
    private readonly watcher: PressWatcher = DEAF,
  ) {}

  /**
   * The way the pointer pressed aims, or null while none is pressed: from
   * its press until it lets go or the shot is called off.
   */
  get pressedWay(): PointerAiming | null {
    return this.pressed === null ? null : this.way;
  }

  /** Takes where the field now lies, and the canvas it lies on. */
  measure(metrics: FieldMetrics, canvas: Viewport): void {
    this.metrics = metrics;
    this.canvas = canvas;
  }

  /**
   * Takes how the mouse and fingers aim from their next press on; a mouse
   * that no longer points stops aiming at its place.
   */
  aimWith(aiming: PointerAiming): void {
    this.nextWay = aiming;
    if (aiming !== "pointAndHold") this.pointed = false;
  }

  /**
   * Takes how a pointer's press lets the shot fly from its next letting go
   * on; a mouse whose aim a button was to fly follows again once its press
   * flies it.
   */
  releaseBy(release: PointerRelease): void {
    this.letFly = release;
    if (release === "onLetGo") this.holding = false;
  }

  /**
   * Takes a key pressed, and returns whether the aiming took it, so the
   * scene asks nothing more of it: a key that turns the aim or lets the
   * shot fly.
   */
  keyDown(press: KeyPress): boolean {
    const key = aimKeyOf(press.code);
    switch (key) {
      case null:
        return false;
      case "release":
        if (!press.repeat) this.release();
        return true;
      case "left":
        this.turn(press.shiftKey ? 1 : AIMS_PER_DEGREE);
        break;
      case "right":
        this.turn(press.shiftKey ? -1 : -AIMS_PER_DEGREE);
        break;
    }
    this.keyed = true;
    return true;
  }

  /**
   * Takes a pointer pressed: the mouse's main button or a finger, away from
   * the canvas's sides, starts a shot, and the mouse's right button or a
   * second press calls one off. A finger that points aims at once, and the
   * frame says where it is; a mouse that points has aimed as it moved, and
   * keeps a nudge since.
   */
  pointerDown(pointer: PointerView): void {
    if (!pointer.wasTouch && pointer.button !== MAIN_BUTTON) {
      if (pointer.button === RIGHT_BUTTON) this.callOff();
      return;
    }
    if (pointer.wasTouch && this.isNearSide(pointer.x)) return;
    if (this.pressed !== null) {
      this.callOff();
      return;
    }
    this.pressed = pointer.id;
    this.way = this.nextWay;
    this.pressX = pointer.x;
    this.pressY = pointer.y;
    this.holding = false;
    this.watcher.pressed();
    if (!pointer.wasTouch) return;
    if (this.way === "pointAndHold") this.pointAt(pointer);
    this.touchAt(pointer);
  }

  /**
   * Takes a pointer moved: the one pressed aims its way, a finger the frame
   * saying where it is once it aims, and a mouse that points aims unpressed
   * too, but while a button is to fly the aim its press left.
   */
  pointerMove(pointer: PointerView): void {
    if (this.pressed === null) {
      if (
        !pointer.wasTouch &&
        this.nextWay === "pointAndHold" &&
        !this.holding
      ) {
        this.pointAt(pointer);
      }
      return;
    }
    if (pointer.id !== this.pressed) return;
    if (this.way === "pointAndHold") this.pointAt(pointer);
    else this.pullTo(pointer);
    if (pointer.wasTouch) this.touchAt(pointer);
  }

  /**
   * Takes a pointer let go, over the canvas or anywhere past it: the one
   * pressed lets the shot fly as the guide last showed it, since a mouse's
   * moves past the canvas reach no one, unless the browser took its touch
   * away or a pull back's last move left it within its dead zone, which call
   * it off; where a button is to fly the shot, it leaves the aim as it is.
   */
  pointerUp(pointer: PointerView): void {
    if (pointer.id !== this.pressed) return;
    if (!pointer.wasTouch && pointer.button !== MAIN_BUTTON) return;
    if (pointer.wasCanceled || (this.way === "pullBack" && !this.armed)) {
      this.callOff();
      return;
    }
    if (this.letFly === "onLetGo") {
      this.release();
      return;
    }
    this.letGo();
    this.pointed = false;
    this.holding = !pointer.wasTouch;
  }

  /**
   * Takes the mouse's wheel turned, which nudges the aim: left as it turns
   * away from the player, right as it turns toward them.
   */
  wheel(deltaY: number): void {
    if (deltaY !== 0) this.nudge(deltaY < 0 ? "left" : "right");
  }

  /** Turns the aim an aim, a quarter of a degree, held between the first and the last, as a nudge's button does. */
  nudge(toward: Nudge): void {
    this.turn(toward === "left" ? 1 : -1);
  }

  /**
   * Lets the shot fly at the aim, as Space or a game's button does, the
   * first let fly since the last frame counting, and starts the next shot
   * with no press.
   */
  release(): void {
    if (!this.released) {
      this.released = true;
      this.releasedAim = this.aim;
      this.watcher.released();
    }
    this.holding = false;
    this.callOff();
  }

  /**
   * Calls the shot being made off: the pointer pressed is let go of without
   * flying, as a lost one is or as the player looks away, so no press
   * sticks. An aim the mouse's press left for a button to fly stays, its
   * moves still leaving it alone until it presses again.
   */
  callOff(): void {
    this.letGo();
    this.watcher.ended();
  }

  /**
   * Returns the aiming for a frame, the fuzzball waiting at a place across
   * the floor, and starts the next frame's afresh; the object returned is
   * the same each frame.
   */
  read(from: number): Readonly<AimFrame> {
    this.from = from;
    if (this.pointed) this.aimAtPlace();
    const { frame } = this;
    frame.release = this.released;
    frame.aim = this.released ? this.releasedAim : this.aim;
    frame.keyed = this.keyed;
    frame.touch = this.touching;
    frame.touchX = this.touchX;
    frame.touchY = this.touchY;
    this.released = false;
    this.keyed = false;
    return frame;
  }

  /** Lets go of the pointer pressed, if any. */
  private letGo(): void {
    this.pressed = null;
    this.armed = false;
    this.touching = false;
  }

  /** Turns the aim some aims, left for more, held between the first and the last. */
  private turn(by: number): void {
    this.aim = clamp(this.aim + by, 0, AIM_COUNT - 1);
    this.pointed = false;
  }

  /** Aims from the fuzzball at a pointer, unless the pointer is on the fuzzball itself. */
  private pointAt(pointer: PointerView): void {
    toField(this.metrics, pointer.x, pointer.y, this.place);
    this.pointed = !pointer.wasTouch;
    this.aimAtPlace();
  }

  /** Aims from the fuzzball at the place last pointed at, unless it is on the fuzzball itself. */
  private aimAtPlace(): void {
    const across = this.place.x - this.from;
    const up = this.place.y - RADIUS;
    if (Math.hypot(across, up) < RADIUS) return;
    this.aim = aimToward(across, up);
  }

  /**
   * Keeps where the finger pressed is, which aims once it points, or once it
   * pulls back past its dead zone, and goes on aiming though the drag comes
   * back within it, till it lets go or the shot is called off.
   */
  private touchAt(pointer: PointerView): void {
    this.touchX = pointer.x;
    this.touchY = pointer.y;
    if (this.way === "pointAndHold" || this.armed) this.touching = true;
  }

  /** Aims a pull back from where it was pressed to a pointer, opposite the drag, once past its dead zone. */
  private pullTo(pointer: PointerView): void {
    const across = (this.pressX - pointer.x) / this.metrics.unit;
    const up = (pointer.y - this.pressY) / this.metrics.unit;
    const length = Math.hypot(across, up);
    this.armed = length >= DEAD_ZONE;
    if (!this.armed) {
      this.watcher.pulled(null);
      return;
    }
    this.aim = aimToward(across, up);
    this.pointed = false;
    this.watcher.pulled(length - DEAD_ZONE);
  }

  /** Returns whether a place across the canvas is within {@link EDGE_CSS_PX} of either side. */
  private isNearSide(x: number): boolean {
    const edge = EDGE_CSS_PX * this.canvas.pixelRatio;
    return x < edge || x > this.canvas.width - edge;
  }
}
