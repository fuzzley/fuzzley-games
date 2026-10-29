import type { Steer } from "../rules/paddle";
import type { HeldKey } from "./controls";
import { type FieldMetrics, toFieldX } from "./field_metrics";

/** Says how a finger steers the paddle: by dragging it from anywhere, or by the paddle following it. */
export type TouchSteering = "drag" | "follow";

/** How long a press of a finger may last to be a tap, in milliseconds. */
export const TAP_MS = 250;

/** How far a finger may move while pressed to be a tap, in CSS pixels. */
export const TAP_CSS_PX = 8;

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
  /** When it was last pressed, in milliseconds. */
  readonly downTime: number;
  /** When it was last let go, in milliseconds. */
  readonly upTime: number;
}

/**
 * Turns the player's keys, mouse and fingers into the paddle's steering for
 * each frame: the keys held, as a push; the mouse, as a place to go; a
 * finger, as a drag or a place, as the setting says; and a tap, as a launch.
 *
 * A place is asked only on a frame the pointer moved, so the paddle, once a
 * key has pushed it, stays where the keys left it until the pointer moves
 * again.
 */
export class Steering {
  private metrics: FieldMetrics;
  private left = false;
  private right = false;
  /** The way of the key held last, which wins while both are held. */
  private lastPush: -1 | 1 = 1;
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
  // Written again each frame, so steering makes nothing.
  private readonly steer: Steer = { to: null, by: 0, push: 0 };

  constructor(metrics: FieldMetrics) {
    this.metrics = metrics;
  }

  /** Takes where the field now lies on the canvas. */
  measure(metrics: FieldMetrics): void {
    this.metrics = metrics;
  }

  /** Takes a key pressed that pushes the paddle. */
  press(key: HeldKey): void {
    if (key === "left") {
      this.left = true;
      this.lastPush = -1;
    } else {
      this.right = true;
      this.lastPush = 1;
    }
  }

  /** Takes a key let go that pushed the paddle. */
  release(key: HeldKey): void {
    if (key === "left") this.left = false;
    else this.right = false;
  }

  /**
   * Takes a pointer pressed, and returns whether it launches: a mouse's
   * press does at once, and a finger's may as a tap, once it is let go.
   */
  pointerDown(pointer: PointerView, touch: TouchSteering): boolean {
    if (!pointer.wasTouch) {
      this.toX = pointer.x;
      return true;
    }
    if (this.finger !== null) return false;
    this.finger = pointer.id;
    this.dragging = touch === "drag";
    this.fromX = pointer.x;
    this.fromY = pointer.y;
    this.lastX = pointer.x;
    this.farthest = 0;
    if (!this.dragging) this.toX = pointer.x;
    return false;
  }

  /**
   * Takes a pointer moved: a mouse, or a finger the paddle follows, asks for
   * the place it is, and a dragging finger moves the paddle as far as it
   * moves.
   */
  pointerMove(pointer: PointerView): void {
    if (!pointer.wasTouch) {
      this.toX = pointer.x;
      return;
    }
    if (pointer.id !== this.finger) return;
    this.reach(pointer);
    if (this.dragging) {
      this.byPx += pointer.x - this.lastX;
      this.lastX = pointer.x;
    } else {
      this.toX = pointer.x;
    }
  }

  /**
   * Takes a pointer let go, and returns whether it was a tap, which
   * launches: a finger pressed briefly that barely moved.
   */
  pointerUp(pointer: PointerView): boolean {
    if (!pointer.wasTouch || pointer.id !== this.finger) return false;
    this.finger = null;
    this.reach(pointer);
    return (
      pointer.upTime - pointer.downTime <= TAP_MS &&
      this.farthest <= TAP_CSS_PX * this.metrics.pixelRatio
    );
  }

  /** Forgets every key held and the finger pressed, as the game pauses, so none sticks. */
  letGo(): void {
    this.left = false;
    this.right = false;
    this.finger = null;
    this.toX = null;
    this.byPx = 0;
  }

  /**
   * Returns the steering for a frame, in field units, and starts the next
   * frame's afresh; the object returned is the same each frame.
   */
  read(): Readonly<Steer> {
    this.steer.push = this.push();
    this.steer.to = this.toX === null ? null : toFieldX(this.metrics, this.toX);
    this.steer.by = this.byPx / this.metrics.unit;
    this.toX = null;
    this.byPx = 0;
    return this.steer;
  }

  /** Returns the way the keys held push the paddle. */
  private push(): -1 | 0 | 1 {
    if (this.left && this.right) return this.lastPush;
    if (this.left) return -1;
    return this.right ? 1 : 0;
  }

  /** Notes how far the finger has been from where it was pressed. */
  private reach(pointer: PointerView): void {
    const apart = Math.hypot(pointer.x - this.fromX, pointer.y - this.fromY);
    this.farthest = Math.max(this.farthest, apart);
  }
}
