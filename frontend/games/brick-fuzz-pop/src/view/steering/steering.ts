import { HeldKeys } from "@fz/core/keys";
import { clamp } from "@fz/core/math";
import type { Viewport } from "@fz/phaser/layout";
import type { Aim, Charge } from "../../rules/shot";
import {
  AIM_COUNT,
  AIMS_PER_DEGREE,
  FIRST_AIM_DEGREES,
  FIRST_X,
  MOST_CHARGE,
  RADIUS,
} from "../../rules/tuning";
import { type FieldMetrics, type Place, toField } from "../field/field_metrics";
import {
  BY_POINTER,
  type PointerAiming,
  type PointerAimings,
  STRAIGHT_UP,
} from "./aiming";
import { type SteerKey, commandOfKey, heldKeyOf, steerKeyOf } from "./controls";

// The scene takes these with the steering; the shell takes them from
// `aiming.ts` alone, so its chunk carries no `Steering`.
export { BY_POINTER, type PointerAimings, STRAIGHT_UP };

/**
 * How far a pull back runs before it aims or charges, in field units; a
 * press let go within it calls the shot off.
 */
export const DEAD_ZONE = 0.5;

/** How much further a pull back runs past the dead zone for each notch of charge, in field units. */
export const PULL_NOTCH = 0.9;

/**
 * How long a pointed press is held for each notch of charge, in
 * milliseconds: up to the most, back down to none, and round again.
 */
export const HOLD_NOTCH_MS = 250;

/**
 * How near a side of the canvas a finger's press is left alone, in CSS
 * pixels, so the browser's swipe from the screen's edge keeps it.
 */
export const EDGE_CSS_PX = 16;

/**
 * How many fingers the scene follows at once, as it adds pointers for: one
 * aiming, and a second, whose press calls the shot off.
 */
export const MOST_FINGERS = 2;

/** The charges in order, the count of notches each comes to. */
const CHARGES = [0, 1, 2, 3, 4, 5] as const satisfies readonly Charge[];

/** The mouse's main button, the one that presses. */
const MAIN_BUTTON = 0;

/** The mouse's right button, whose press calls a charge off. */
const RIGHT_BUTTON = 2;

/** How much under a whole notch a pull back may fall and still count as it. */
const WHOLE = 1e-9;

/** Describes a pointer as the steering reads it, as Phaser's pointer has it. */
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

/** Describes what the player's hands ask of a frame, which the game reads as it aims and flies a round. */
export interface Steer {
  /** The aim the guide shows, or a shot let fly flies along. */
  aim: Aim;
  /** The charge the meter shows, or a shot let fly carries. */
  charge: Charge;
  /** Whether the shot was let fly this frame, at the aim and the charge. */
  release: boolean;
  /** Whether fast-forward is held. */
  fast: boolean;
  /** Whether the keys turned the aim or changed the charge this frame, which the announcer says. */
  keyed: boolean;
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
 * Returns the charge a press held for some milliseconds has come to: a
 * notch each {@link HOLD_NOTCH_MS}, up to the most, back down to none, and
 * round again.
 */
export function chargeAfter(heldMs: number): Charge {
  const notches = Math.floor(heldMs / HOLD_NOTCH_MS) % (2 * MOST_CHARGE);
  return chargeOf(MOST_CHARGE - Math.abs(MOST_CHARGE - notches));
}

/** Returns the charge a whole count of notches comes to, none at none or fewer and the most at as many or more. */
function chargeOf(notches: number): Charge {
  for (const charge of CHARGES) {
    if (charge >= notches) return charge;
  }
  return MOST_CHARGE;
}

/**
 * Turns the player's keys, mouse and fingers into the shot being aimed, a
 * frame at a time: the aim, the charge, the shot let fly, and fast-forward
 * held.
 *
 * Each kind of pointer aims its own way ({@link PointerAimings}). Pulled
 * back, a press anywhere on the canvas aims opposite the drag, charging a
 * notch each {@link PULL_NOTCH} past the {@link DEAD_ZONE}. Pointed, the
 * aim follows the pointer, a mouse's even unpressed and as the fuzzball
 * waits somewhere new, and a press held charges a notch each
 * {@link HOLD_NOTCH_MS} of the frames' time. Either flies as it is let go,
 * wherever that is, at the aim and the charge its last move and the last
 * frame showed. Only the mouse's main button presses, and its
 * right button calls a charge off; a second press while one is held, a
 * touch the browser takes away, or a pointer lost ({@link callOff}) calls
 * the shot off, and never lets it fly.
 *
 * The scene reads it every frame, follows {@link MOST_FINGERS}, hands a
 * pointer let go past the canvas to {@link pointerUp}, and calls
 * {@link letGo} as the player looks away. A charge may build, and a shot be
 * let fly, at any time: the round reads a shot let fly only while it aims,
 * and a charge built meanwhile waits for the next shot.
 */
export class Steering {
  /** The keys held: fast-forward, F. */
  private readonly keys = new HeldKeys(heldKeyOf);
  private aimings: PointerAimings = BY_POINTER;
  private aim: Aim = STRAIGHT_UP;
  private charge: Charge = 0;
  /** Where the fuzzball waits across the floor, which a pointer aims from. */
  private from = FIRST_X;
  /** The pointer pressed, by its id, or null: one at a time aims. */
  private pressed: number | null = null;
  /** How the pointer pressed aims. */
  private way: PointerAiming = BY_POINTER.finger;
  /** Where the pointer was pressed, in device pixels. */
  private pressX = 0;
  private pressY = 0;
  /** Whether a pull back has left its dead zone at its last move, so it flies if let go. */
  private armed = false;
  /** Whether the mouse pointed the aim last, so it aims again as the fuzzball waits somewhere new. */
  private pointed = false;
  /** How long a pointed press has been held, counted by the frames, for the meter. */
  private heldMs = 0;
  /** Whether the keys changed the aim or the charge since the last frame. */
  private keyed = false;
  /** Whether a shot was let fly since the last frame, and at what. */
  private released = false;
  private releasedAim: Aim = STRAIGHT_UP;
  private releasedCharge: Charge = 0;
  /** Where a pointer last pointed on the field, written again at each move, so moving makes nothing. */
  private readonly place: Place = { x: 0, y: 0 };
  // Written again each frame, so steering makes nothing.
  private readonly steer: Steer = {
    aim: STRAIGHT_UP,
    charge: 0,
    release: false,
    fast: false,
    keyed: false,
  };

  /** Starts with the aim straight up and no charge, on a field laid out on a canvas. */
  constructor(
    private metrics: FieldMetrics,
    private canvas: Viewport,
  ) {}

  /** Takes where the field now lies, and the canvas it lies on. */
  measure(metrics: FieldMetrics, canvas: Viewport): void {
    this.metrics = metrics;
    this.canvas = canvas;
  }

  /**
   * Takes how each kind of pointer aims from its next press on; a mouse
   * that no longer points stops aiming at its place.
   */
  aimWith(aimings: PointerAimings): void {
    this.aimings = aimings;
    if (aimings.mouse !== "pointAndHold") this.pointed = false;
  }

  /**
   * Takes a key pressed, and returns whether the steering took it, so the
   * scene asks nothing more of it: a key that turns the aim, changes the
   * charge or lets the shot fly, a held key, and the key that pauses while
   * a charge builds, a flight's included, which calls it off instead.
   */
  keyDown(press: KeyPress): boolean {
    const key = steerKeyOf(press.code);
    if (key !== null) {
      this.steerBy(key, press);
      return true;
    }
    if (heldKeyOf(press.code) !== null) {
      this.keys.press(press.code);
      return true;
    }
    if (commandOfKey(press.code) === "pause" && this.isBuilding()) {
      this.callOff();
      return true;
    }
    return false;
  }

  /** Takes a key let go, by `event.code`. */
  keyUp(code: string): void {
    this.keys.release(code);
  }

  /**
   * Takes a pointer pressed: the mouse's main button or a finger, away from
   * the canvas's sides, starts a shot, and the mouse's right button or a
   * second press calls one off. A finger that points aims at once; a mouse
   * that points has aimed as it moved, and keeps a nudge since.
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
    this.way = pointer.wasTouch ? this.aimings.finger : this.aimings.mouse;
    this.pressX = pointer.x;
    this.pressY = pointer.y;
    this.charge = 0;
    if (this.way === "pointAndHold" && pointer.wasTouch) this.pointAt(pointer);
  }

  /**
   * Takes a pointer moved: the one pressed aims its way, and a mouse that
   * points aims unpressed too.
   */
  pointerMove(pointer: PointerView): void {
    if (this.pressed === null) {
      if (!pointer.wasTouch && this.aimings.mouse === "pointAndHold") {
        this.pointAt(pointer);
      }
      return;
    }
    if (pointer.id !== this.pressed) return;
    if (this.way === "pointAndHold") this.pointAt(pointer);
    else this.pullTo(pointer);
  }

  /**
   * Takes a pointer let go, over the canvas or anywhere past it: the one
   * pressed lets the shot fly as the guide and the meter last showed it,
   * since a mouse's moves past the canvas reach no one, unless the browser
   * took its touch away or a pull back's last move left it within its dead
   * zone, which call it off.
   */
  pointerUp(pointer: PointerView): void {
    if (pointer.id !== this.pressed) return;
    if (!pointer.wasTouch && pointer.button !== MAIN_BUTTON) return;
    if (pointer.wasCanceled) {
      this.callOff();
      return;
    }
    if (this.way === "pullBack" && !this.armed) {
      this.callOff();
      return;
    }
    this.release();
  }

  /**
   * Takes the mouse's wheel turned, which turns the aim an aim, a quarter of
   * a degree: left as it turns away from the player, right as it turns
   * toward them.
   */
  wheel(deltaY: number): void {
    if (deltaY !== 0) this.turn(-Math.sign(deltaY));
  }

  /**
   * Calls the shot being made off: the pointer pressed is let go of without
   * flying, as a lost one is, and the charge drops to none.
   */
  callOff(): void {
    this.pressed = null;
    this.armed = false;
    this.heldMs = 0;
    this.charge = 0;
  }

  /** Forgets every key held and calls the shot off, as the player looks away, so none sticks. */
  letGo(): void {
    this.keys.letGo();
    this.callOff();
  }

  /**
   * Returns the steering for a frame of some milliseconds, the fuzzball
   * waiting at a place across the floor, and starts the next frame's
   * afresh; the object returned is the same each frame.
   */
  read(deltaMs: number, from: number): Readonly<Steer> {
    this.from = from;
    if (this.pointed) this.aimAtPlace();
    if (this.pressed !== null && this.way === "pointAndHold") {
      this.heldMs += deltaMs;
      this.charge = chargeAfter(this.heldMs);
    }
    const { steer } = this;
    steer.release = this.released;
    steer.aim = this.released ? this.releasedAim : this.aim;
    steer.charge = this.released ? this.releasedCharge : this.charge;
    steer.fast = this.keys.isHeld("fast");
    steer.keyed = this.keyed;
    this.released = false;
    this.keyed = false;
    return steer;
  }

  /** Takes a key that turns the aim, changes the charge or lets the shot fly, a repeat letting nothing fly. */
  private steerBy(key: SteerKey, press: KeyPress): void {
    if (key === "release") {
      if (!press.repeat) this.release();
      return;
    }
    switch (key) {
      case "left":
        this.turn(press.shiftKey ? 1 : AIMS_PER_DEGREE);
        break;
      case "right":
        this.turn(press.shiftKey ? -1 : -AIMS_PER_DEGREE);
        break;
      case "up":
        this.charge = chargeOf(this.charge + 1);
        break;
      case "down":
        this.charge = chargeOf(this.charge - 1);
        break;
    }
    this.keyed = true;
  }

  /** Turns the aim some aims, left for more, held between the first and the last. */
  private turn(by: number): void {
    this.aim = clamp(this.aim + by, 0, AIM_COUNT - 1);
    this.pointed = false;
  }

  /** Lets the shot fly at the aim and the charge, the first let fly since the last frame counting, and starts the next with none. */
  private release(): void {
    if (!this.released) {
      this.released = true;
      this.releasedAim = this.aim;
      this.releasedCharge = this.charge;
    }
    this.callOff();
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

  /** Aims and charges a pull back from where it was pressed to a pointer, opposite the drag. */
  private pullTo(pointer: PointerView): void {
    const across = (this.pressX - pointer.x) / this.metrics.unit;
    const up = (pointer.y - this.pressY) / this.metrics.unit;
    const length = Math.hypot(across, up);
    this.armed = length >= DEAD_ZONE;
    if (!this.armed) {
      this.charge = 0;
      return;
    }
    this.aim = aimToward(across, up);
    this.pointed = false;
    this.charge = chargeOf(
      Math.floor((length - DEAD_ZONE) / PULL_NOTCH + WHOLE),
    );
  }

  /** Returns whether a charge builds: a pointer pressed, or a charge the keys chose. */
  private isBuilding(): boolean {
    return this.pressed !== null || this.charge > 0;
  }

  /** Returns whether a place across the canvas is within {@link EDGE_CSS_PX} of either side. */
  private isNearSide(x: number): boolean {
    const edge = EDGE_CSS_PX * this.canvas.pixelRatio;
    return x < edge || x > this.canvas.width - edge;
  }
}
