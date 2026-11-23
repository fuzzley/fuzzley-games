import {
  type PointerAiming,
  STRAIGHT_UP,
} from "@fz/brick-wall/view/aim_settings";
import {
  type AimFrame,
  Aiming,
  type KeyPress,
  type PointerView,
} from "@fz/brick-wall/view/aiming";
import type { FieldMetrics } from "@fz/brick-wall/view/field_metrics";
import { clamp } from "@fz/core/math";
import type { Viewport } from "@fz/phaser/layout";
import type { Charge } from "../../rules/shot";
import { MOST_CHARGE } from "../../rules/tuning";
import { commandOfKey, steerKeyOf } from "./controls";

/** How much further a pull back runs past the dead zone for each notch of charge, in field units. */
export const PULL_NOTCH = 0.9;

/**
 * How long a pointed press is held for each notch of charge, in
 * milliseconds: up to the most, back down to none, and round again.
 */
export const HOLD_NOTCH_MS = 250;

/**
 * The most of a frame's time a pointed press counts as held, in
 * milliseconds.
 *
 * A frame counts all it took down to 10 frames a second, so a press charges
 * at the same pace on a slow device, but a stall counts no more.
 */
export const LONGEST_FRAME_MS = 100;

/** The charges in order, the count of notches each comes to. */
const CHARGES = [0, 1, 2, 3, 4, 5] as const satisfies readonly Charge[];

/** How much under a whole notch a pull back may fall and still count as it. */
const WHOLE = 1e-9;

/** Describes what the player's hands ask of a frame, which the game reads as it aims and flies a round. */
export interface Steer extends AimFrame {
  /** The charge the meter shows, or a shot let fly carries. */
  charge: Charge;
  /** Whether the shot was let fly this frame, at the aim and the charge. */
  release: boolean;
  /**
   * Whether the keys turned the aim or changed the charge this frame,
   * Escape calling a charge off among them, which the announcer says.
   */
  keyed: boolean;
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
 * frame at a time: the aim, as every wall game's `Aiming` turns it, and the
 * charge laid over it, and the shot let fly at both.
 *
 * A press held pointed charges a notch each {@link HOLD_NOTCH_MS} by the
 * frames' clock, whether it moves or not, and one pulled back a notch each
 * {@link PULL_NOTCH} past the `DEAD_ZONE`; Up and Down change the charge a
 * notch; and a shot flies at the charge the last frame showed. A press
 * starts its charge afresh, and a shot let fly or called off drops it to
 * none, as Escape does while a charge builds, which it takes from the
 * pause. A charge may build, and a shot be let fly, at any time: the round
 * reads a shot let fly only while it aims, and a charge built meanwhile
 * waits for the next shot.
 */
export class Steering {
  /** Turns the aim, and says how a press is held. */
  private readonly aiming: Aiming;
  private charge: Charge = 0;
  /** How long a pointed press has been held, counted by the frames' clock, for the meter. */
  private heldMs = 0;
  /** When the last frame was read, by the frames' clock, or null before the first. */
  private lastFrameAt: number | null = null;
  /** Whether the keys changed the charge since the last frame. */
  private keyed = false;
  /** The charge the shot let fly since the last frame carries. */
  private releasedCharge: Charge = 0;
  // Written again each frame, so steering makes nothing.
  private readonly steer: Steer = {
    aim: STRAIGHT_UP,
    charge: 0,
    release: false,
    keyed: false,
    touch: false,
    touchX: 0,
    touchY: 0,
  };

  /** Starts with the aim straight up and no charge, on a field laid out on a canvas. */
  constructor(metrics: FieldMetrics, canvas: Viewport) {
    this.aiming = new Aiming(metrics, canvas, {
      pressed: () => {
        this.charge = 0;
      },
      pulled: (beyond) => {
        this.charge =
          beyond === null
            ? 0
            : chargeOf(Math.floor(beyond / PULL_NOTCH + WHOLE));
      },
      released: () => {
        this.releasedCharge = this.charge;
      },
      ended: () => {
        this.heldMs = 0;
        this.charge = 0;
      },
    });
  }

  /** Takes where the field now lies, and the canvas it lies on. */
  measure(metrics: FieldMetrics, canvas: Viewport): void {
    this.aiming.measure(metrics, canvas);
  }

  /**
   * Takes how the mouse and fingers aim from their next press on; a mouse
   * that no longer points stops aiming at its place.
   */
  aimWith(aiming: PointerAiming): void {
    this.aiming.aimWith(aiming);
  }

  /**
   * Takes a key pressed, and returns whether the steering took it, so the
   * scene asks nothing more of it: a key that turns the aim, changes the
   * charge or lets the shot fly, and the key that pauses while a charge
   * builds, a flight's included, which calls it off instead and has the
   * frame say so, as a key that changes the charge does.
   */
  keyDown(press: KeyPress): boolean {
    if (this.aiming.keyDown(press)) return true;
    const key = steerKeyOf(press.code);
    if (key === "up" || key === "down") {
      this.charge = chargeOf(this.charge + (key === "up" ? 1 : -1));
      this.keyed = true;
      return true;
    }
    if (commandOfKey(press.code) === "pause" && this.isBuilding()) {
      this.aiming.callOff();
      this.keyed = true;
      return true;
    }
    return false;
  }

  /** Takes a pointer pressed, which starts a shot with no charge, or calls one off, as `Aiming` says. */
  pointerDown(pointer: PointerView): void {
    this.aiming.pointerDown(pointer);
  }

  /** Takes a pointer moved, which aims, and charges a pull back, as `Aiming` says. */
  pointerMove(pointer: PointerView): void {
    this.aiming.pointerMove(pointer);
  }

  /** Takes a pointer let go, over the canvas or anywhere past it, which lets the shot fly or calls it off, as `Aiming` says. */
  pointerUp(pointer: PointerView): void {
    this.aiming.pointerUp(pointer);
  }

  /** Takes the mouse's wheel turned, which turns the aim an aim, as `Aiming` says. */
  wheel(deltaY: number): void {
    this.aiming.wheel(deltaY);
  }

  /**
   * Calls the shot being made off: the pointer pressed is let go of without
   * flying, as a lost one is or as the player looks away, so no press
   * sticks, and the charge drops to none.
   */
  callOff(): void {
    this.aiming.callOff();
  }

  /**
   * Returns the steering for a frame at a moment on the frames' clock, the
   * time Phaser hands a scene's `update()` rather than its delta, the
   * fuzzball waiting at a place across the floor, and starts the next
   * frame's afresh; the object returned is the same each frame.
   *
   * A pointed press counts as held the time since the last frame, between
   * none and {@link LONGEST_FRAME_MS}, and none on the first.
   */
  read(now: number, from: number): Readonly<Steer> {
    const frameMs =
      this.lastFrameAt === null
        ? 0
        : clamp(now - this.lastFrameAt, 0, LONGEST_FRAME_MS);
    this.lastFrameAt = now;
    if (this.aiming.pressedWay === "pointAndHold") {
      this.heldMs += frameMs;
      this.charge = chargeAfter(this.heldMs);
    }
    const aimed = this.aiming.read(from);
    const { steer } = this;
    steer.aim = aimed.aim;
    steer.release = aimed.release;
    steer.charge = aimed.release ? this.releasedCharge : this.charge;
    steer.keyed = aimed.keyed || this.keyed;
    steer.touch = aimed.touch;
    steer.touchX = aimed.touchX;
    steer.touchY = aimed.touchY;
    this.keyed = false;
    return steer;
  }

  /** Returns whether a charge builds: a pointer pressed, or a charge the keys chose. */
  private isBuilding(): boolean {
    return this.aiming.pressedWay !== null || this.charge > 0;
  }
}
