import { type GameObjects, type Scene, TintModes } from "phaser";
import { type Moving, type Torus, copyOffsets } from "../../rules/torus";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { type Stepped, wrappedBetween } from "../../view/field/frame";
import { ATLAS } from "../atlas";

/**
 * The most times a thing is drawn: once, once past each edge it reaches across,
 * and once at the corner.
 */
const MOST_COPIES = 4;

/**
 * Draws a thing on the field from images made once: once, or, where it
 * reaches past an edge, once more on the field's far side of that edge,
 * and at the corner where it reaches past two, so it slides out at one edge
 * as it slides in at the other.
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

  constructor(scene: Scene, layer: GameObjects.Layer, frame: string) {
    this.images = Array.from({ length: MOST_COPIES }, () =>
      scene.add.image(0, 0, ATLAS, frame).setVisible(false),
    );
    layer.add([...this.images]);
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

  /** Hides every copy. */
  hide(): void {
    for (const image of this.images) image.setVisible(false);
  }

  /** Shows a frame of the atlas in each copy, taking it up only if it changed. */
  setFrame(frame: string): void {
    for (const image of this.images) {
      if (image.frame.name !== frame) image.setFrame(frame);
    }
  }

  /** Takes up each copy's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(image.frame.name);
  }

  /** Turns each copy to an angle, in radians. */
  setRotation(angle: number): void {
    for (const image of this.images) image.setRotation(angle);
  }

  /** Scales each copy, across and down. */
  setScale(across: number, down = across): void {
    for (const image of this.images) image.setScale(across, down);
  }

  /** Tints each copy in a color, which its frame's white takes. */
  setTint(color: number): void {
    for (const image of this.images) image.setTint(color);
  }

  /** Fills each copy in a color, keeping its frame's shape. */
  setTintFill(color: number): void {
    for (const image of this.images) {
      image.setTint(color).setTintMode(TintModes.FILL);
    }
  }

  /** Sets how opaque each copy is. */
  setAlpha(alpha: number): void {
    for (const image of this.images) image.setAlpha(alpha);
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
    toCanvas(metrics, x, y, this.at);
    image.setVisible(shown).setPosition(this.at.x, this.at.y);
  }
}
