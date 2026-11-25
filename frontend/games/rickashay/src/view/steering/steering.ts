// How Rickashay's player aims a shot, a frame at a time: every wall game's
// aiming, by the keys, the mouse and fingers, the wheel and the bar's
// nudges, which a shot is only an aim of, let fly as a press lets go, at
// Space or by the bar's Release; and what the game's other keys ask of it.

import {
  type PointerAiming,
  type PointerRelease,
  STRAIGHT_UP,
} from "@fz/brick-wall/view/aim_settings";
import {
  type AimFrame,
  Aiming,
  type KeyPress,
  type Nudge,
  type PointerView,
} from "@fz/brick-wall/view/aiming";
import type { FieldMetrics } from "@fz/brick-wall/view/field_metrics";
import { type ShortcutModifiers, isShortcut } from "@fz/core/keys";
import type { Viewport } from "@fz/phaser/layout";
import { type FieldCommand, commandOfKey } from "./controls";

/** Describes a key pressed as the steering reads it, as a `KeyboardEvent` has it, with Ctrl, Alt and Meta. */
export type SteerKeyPress = KeyPress & ShortcutModifiers;

/** Describes what the player's hands ask of a frame, which the game reads as it aims and flies a round. */
export interface Steer extends AimFrame {
  /**
   * Whether the keys or a Nudge in the bar turned the aim this frame, which
   * the announcer says; the wheel's nudges go unsaid, as a pointer's aim
   * does.
   */
  keyed: boolean;
}

/**
 * Turns the player's keys, mouse and fingers, the wheel and the bar's
 * buttons into the shot being aimed, a frame at a time, as every wall
 * game's `Aiming` does, pointed and held and let fly as a press lets go
 * unless the settings say otherwise: a shot is an aim and nothing else, so
 * nothing builds as a press is held.
 *
 * It answers each other key with what the key asks of the game, once a
 * press, so the scene hands every key to it and passes on the answer. */
export class Steering {
  /** Turns the aim. */
  private readonly aiming: Aiming;
  /** Whether a Nudge in the bar turned the aim since the last frame. */
  private nudged = false;
  // Written again each frame, so steering makes nothing.
  private readonly frame: Steer = {
    aim: STRAIGHT_UP,
    release: false,
    keyed: false,
    touch: false,
    touchX: 0,
    touchY: 0,
  };

  /** Starts with the aim straight up, pointed and held, on a field laid out on a canvas. */
  constructor(metrics: FieldMetrics, canvas: Viewport) {
    this.aiming = new Aiming(metrics, canvas);
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
   * Takes how a pointer's press lets the shot fly from its next letting go
   * on: as it lets go, or only by the bar's Release, its letting go leaving
   * the aim where it is.
   */
  releaseBy(release: PointerRelease): void {
    this.aiming.releaseBy(release);
  }

  /**
   * Takes a key pressed, and returns what it asks of the game, once a press,
   * or null: for a key that turns the aim, Left and Right or A and D a
   * degree, a quarter with Shift, or that lets the shot fly, Space, which
   * the steering takes; for a key held with Ctrl, Alt or Meta, which it
   * leaves to the browser; and for one that asks nothing.
   */
  keyDown(press: SteerKeyPress): FieldCommand | null {
    if (isShortcut(press) || this.aiming.keyDown(press) || press.repeat) {
      return null;
    }
    return commandOfKey(press.code);
  }

  /** Takes a pointer pressed, which starts a shot or calls one off, as `Aiming` says. */
  pointerDown(pointer: PointerView): void {
    this.aiming.pointerDown(pointer);
  }

  /** Takes a pointer moved, which aims, pressed or, for the mouse pointing, unpressed, as `Aiming` says. */
  pointerMove(pointer: PointerView): void {
    this.aiming.pointerMove(pointer);
  }

  /**
   * Takes a pointer let go, over the canvas or anywhere past it, which lets
   * the shot fly, calls it off, or, where a button is to fly it, leaves the
   * aim as it is, as `Aiming` says.
   */
  pointerUp(pointer: PointerView): void {
    this.aiming.pointerUp(pointer);
  }

  /**
   * Takes the mouse's wheel turned, which nudges the aim: left as it turns
   * away from the player, right as it turns toward them.
   */
  wheel(deltaY: number): void {
    this.aiming.wheel(deltaY);
  }

  /** Turns the aim an aim, a quarter of a degree, as a nudge's button in the bar does. */
  nudge(toward: Nudge): void {
    this.aiming.nudge(toward);
    this.nudged = true;
  }

  /** Lets the shot fly at the aim, as the bar's Release does. */
  release(): void {
    this.aiming.release();
  }

  /**
   * Calls the shot being made off: the pointer pressed is let go of without
   * flying, as a lost one is or as the player looks away, so no press
   * sticks.
   */
  callOff(): void {
    this.aiming.callOff();
  }

  /**
   * Returns the steering for a frame, the fuzzball waiting at a place
   * across the floor, as `Aiming` reads it, keyed for a Nudge in the bar
   * too, and starts the next frame's afresh; the object returned is the
   * same each frame.
   */
  read(from: number): Readonly<Steer> {
    const aimed = this.aiming.read(from);
    const { frame } = this;
    frame.aim = aimed.aim;
    frame.release = aimed.release;
    frame.keyed = aimed.keyed || this.nudged;
    frame.touch = aimed.touch;
    frame.touchX = aimed.touchX;
    frame.touchY = aimed.touchY;
    this.nudged = false;
    return frame;
  }
}
