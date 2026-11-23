// How Rickashay's player aims a shot, a frame at a time: every wall game's
// aiming, by the mouse and fingers, the wheel and the bar's nudges, which a
// shot is only an aim of, let fly as a press lets go or by the bar's
// Release.

import type {
  PointerAiming,
  PointerRelease,
} from "@fz/brick-wall/view/aim_settings";
import {
  type AimFrame,
  Aiming,
  type Nudge,
  type PointerView,
} from "@fz/brick-wall/view/aiming";
import type { FieldMetrics } from "@fz/brick-wall/view/field_metrics";
import type { Viewport } from "@fz/phaser/layout";

/**
 * Turns the player's mouse and fingers, the wheel and the bar's buttons
 * into the shot being aimed, a frame at a time, as every wall game's
 * `Aiming` does, pointed and held and let fly as a press lets go unless the
 * settings say otherwise: a shot is an aim and nothing else, so nothing
 * builds as a press is held.
 */
export class Steering {
  /** Turns the aim. */
  private readonly aiming: Aiming;

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
   * across the floor, and starts the next frame's afresh; the object
   * returned is the same each frame.
   */
  read(from: number): Readonly<AimFrame> {
    return this.aiming.read(from);
  }
}
