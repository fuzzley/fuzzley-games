import { ATLAS } from "@fz/brick-wall/scene/atlas";
import { type Place, toCanvas } from "@fz/brick-wall/view/field_metrics";
import type { GameObjects, Scene } from "phaser";
import { FRAMES } from "../../view/art/frames";
import { bodyFrameOf, eyesAt, eyesFrameOf } from "../../view/art/fuzzball_art";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the fuzzball, waiting or in the air, at its middle: its body in its
 * look by its flight's rally, or as the hot shot, and its eyes over it,
 * looking the way it flies, up while it waits, and half shut as it drops
 * home, each an image made once.
 */
export class BallPainter implements Painter {
  /** The fuzzball's body. */
  readonly body: GameObjects.Image;
  /** Its eyes, over its body. */
  readonly eyes: GameObjects.Image;
  /** Where the fuzzball's body stands on the canvas, then its eyes on the field and on the canvas, written each frame. */
  private readonly place: Place = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.body = scene.add.image(0, 0, ATLAS, FRAMES.fuzzball(0));
    this.eyes = scene.add.image(0, 0, ATLAS, FRAMES.eyes);
    layer.add([this.body, this.eyes]);
  }

  /** Draws the fuzzball where the view has it, in its look, its eyes where it looks. */
  draw({ view, metrics, baked }: Readonly<PaintContext>): void {
    const { ball } = view;
    const scale = metrics.unit / baked.unit;
    const { body, eyes, place } = this;
    const look = bodyFrameOf(ball);
    if (body.frame.name !== look) body.setFrame(look);
    toCanvas(metrics, ball.x, ball.y, place);
    body.setPosition(place.x, place.y).setScale(scale);
    const shut = eyesFrameOf(ball);
    if (eyes.frame.name !== shut) eyes.setFrame(shut);
    eyesAt(ball, place);
    toCanvas(metrics, place.x, place.y, place);
    eyes.setPosition(place.x, place.y).setScale(scale);
  }
}
