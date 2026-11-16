import type { GameObjects, Scene } from "phaser";
import { type Moving, type Torus, copyOffsets } from "../../rules/torus";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { type Stepped, wrappedBetween } from "../../view/field/frame";
import { ATLAS } from "../atlas";
import { sendToBack } from "../layer_order";

/**
 * The most times a thing is drawn: once, once past each edge it reaches across,
 * and once at the corner.
 */
const MOST_COPIES = 4;

/** The tint that leaves a frame in its own colors. */
const UNTINTED = 0xffffff;

/**
 * Draws a thing on the field from images made once: once, or, where it
 * reaches past an edge, once more on the field's far side of that edge,
 * and at the corner where it reaches past two, so it slides out at one edge
 * as it slides in at the other.
 *
 * A copy lies in its layer only while it shows, so Phaser's render passes
 * over none that hides; the scene keeps each layer in the order its images
 * were made (`keepJoinOrder()`), so one that shows again takes its place.
 * Its frame, tint, turn, scale and opacity are the thing's, set on the
 * copies that show, and taken up by a copy as it shows, its frame anew,
 * as a bake while it lay out of its layer needs.
 */
export class Copies {
  /** Its images: where it is, past the edge across, past the edge down, and past both. */
  readonly images: readonly GameObjects.Image[];

  /** Where it is drawn on the field, between two steps, written each frame. */
  private readonly drawn: Moving = { x: 0, y: 0 };
  /** How far its copies past the edges are from it on the field, written each frame. */
  private readonly offsets: Moving = { x: 0, y: 0 };
  /** Where each copy is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** Whether each copy shows, by its place in `images`. */
  private readonly shown = Array.from({ length: MOST_COPIES }, () => false);
  /** How many of its copies show. */
  private showing = 0;
  /** The frame its copies show, set on those that show and on each as it shows. */
  private frame: string;
  /** The color its copies are tinted in, set so. */
  private tint = UNTINTED;
  /** How far its copies are turned, in radians, set so. */
  private rotation = 0;
  /** How far its copies are scaled across, set so. */
  private scaleX = 1;
  /** How far its copies are scaled down, set so. */
  private scaleY = 1;
  /** How opaque its copies are, set so. */
  private alpha = 1;

  /**
   * Makes its images in a layer, each showing a frame of an atlas, the
   * field's unless it says another, hidden; it throws for a layer whose
   * scene keeps no order of its children (`keepJoinOrder()`).
   */
  constructor(
    scene: Scene,
    private readonly layer: GameObjects.Layer,
    frame: string,
    texture = ATLAS,
  ) {
    this.frame = frame;
    this.images = Array.from({ length: MOST_COPIES }, () =>
      scene.add.image(0, 0, texture, frame).setVisible(false),
    );
    // Each joins its layer once, taking its place in it, and leaves it
    // until it shows.
    layer.add([...this.images]);
    layer.remove([...this.images]);
    if (this.images[0]?.depth === 0) {
      throw new Error(
        "The layer of the copies keeps no order they can return to (keepJoinOrder()).",
      );
    }
  }

  /**
   * Shows it at a place on the field, in field units, and again past each
   * edge it reaches across, its reach less than half the field's side.
   */
  show(
    x: number,
    y: number,
    reach: number,
    metrics: FieldMetrics,
    torus: Torus,
  ): void {
    const { x: across, y: down } = copyOffsets(
      x,
      y,
      reach,
      torus,
      this.offsets,
    );
    this.showCopy(0, x, y, metrics, true);
    this.showCopy(1, x + across, y, metrics, across !== 0);
    this.showCopy(2, x, y + down, metrics, down !== 0);
    this.showCopy(3, x + across, y + down, metrics, across !== 0 && down !== 0);
  }

  /**
   * Shows it once at a place on the field, or off it, in field units, and
   * none of its copies, as a thing that crosses rather than wraps is shown.
   */
  showOnce(x: number, y: number, metrics: FieldMetrics): void {
    this.showCopy(0, x, y, metrics, true);
    for (let i = 1; i < MOST_COPIES; i++) this.hideCopy(i);
  }

  /**
   * Shows a thing that wraps `alpha` of the way from its last place to its
   * next, the shortest way across the wrap, as {@link show} shows it at a
   * place.
   */
  showBetween(
    thing: Stepped,
    alpha: number,
    reach: number,
    metrics: FieldMetrics,
    torus: Torus,
  ): void {
    const { x, y } = wrappedBetween(thing, alpha, torus, this.drawn);
    this.show(x, y, reach, metrics, torus);
  }

  /**
   * Draws its copies under all else its layer holds, and under what was
   * sent there before, as each shows.
   */
  sendToBack(): void {
    sendToBack(this.layer, this.images);
  }

  /** Hides every copy. */
  hide(): void {
    if (this.showing === 0) return;
    for (let i = 0; i < MOST_COPIES; i++) this.hideCopy(i);
  }

  /** Shows a frame of the atlas in each copy that shows, taking it up only if it changed. */
  setFrame(frame: string): void {
    if (frame === this.frame) return;
    this.frame = frame;
    for (let i = 0; i < MOST_COPIES; i++) {
      if (this.shown[i]) this.images[i]?.setFrame(frame);
    }
  }

  /** Turns each copy that shows to an angle, in radians. */
  setRotation(angle: number): void {
    if (angle === this.rotation) return;
    this.rotation = angle;
    for (let i = 0; i < MOST_COPIES; i++) {
      if (this.shown[i]) this.images[i]?.setRotation(angle);
    }
  }

  /** Scales each copy that shows, across and down. */
  setScale(across: number, down = across): void {
    if (across === this.scaleX && down === this.scaleY) return;
    this.scaleX = across;
    this.scaleY = down;
    for (let i = 0; i < MOST_COPIES; i++) {
      if (this.shown[i]) this.images[i]?.setScale(across, down);
    }
  }

  /** Tints each copy that shows in a color, which its frame's white takes. */
  setTint(color: number): void {
    if (color === this.tint) return;
    this.tint = color;
    for (let i = 0; i < MOST_COPIES; i++) {
      if (this.shown[i]) this.images[i]?.setTint(color);
    }
  }

  /** Sets how opaque each copy that shows is. */
  setAlpha(alpha: number): void {
    if (alpha === this.alpha) return;
    this.alpha = alpha;
    for (let i = 0; i < MOST_COPIES; i++) {
      if (this.shown[i]) this.images[i]?.setAlpha(alpha);
    }
  }

  /** Shows one copy at a place on the field, or hides it. */
  private showCopy(
    index: number,
    x: number,
    y: number,
    metrics: FieldMetrics,
    shown: boolean,
  ): void {
    const image = this.images[index];
    if (!image) return;
    if (!shown) {
      this.hideCopy(index);
      return;
    }
    if (!this.shown[index]) {
      this.shown[index] = true;
      this.showing += 1;
      image
        .setFrame(this.frame)
        .setTint(this.tint)
        .setRotation(this.rotation)
        .setScale(this.scaleX, this.scaleY)
        .setAlpha(this.alpha)
        .setVisible(true);
      this.layer.add(image);
    }
    toCanvas(metrics, x, y, this.at);
    image.setPosition(this.at.x, this.at.y);
  }

  /** Hides one copy, taking it out of its layer, if it shows. */
  private hideCopy(index: number): void {
    const image = this.images[index];
    if (!image || !this.shown[index]) return;
    this.shown[index] = false;
    this.showing -= 1;
    image.setVisible(false);
    this.layer.remove(image);
  }
}
