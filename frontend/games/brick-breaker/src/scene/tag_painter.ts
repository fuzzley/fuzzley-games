import type { GameObjects, Scene } from "phaser";
import { EFFECT_KINDS } from "../rules/capsules";
import { type EffectKind, capsule } from "../rules/catalog/capsules";
import { recordOf } from "../rules/tables";
import { tagFrame } from "../view/art";
import { toCanvasX, toCanvasY } from "../view/field_metrics";
import { between } from "../view/frame";
import { lineWidth } from "../view/shapes";
import {
  TAG_RADIUS,
  TAG_SPACING,
  firstTagX,
  tagY,
  timeLeft,
} from "../view/tags";
import { ATLAS } from "./atlas";
import type { PaintContext, Painter } from "./painter";

/** Where a ring starts to empty from: its top. */
const RING_TOP = -Math.PI / 2;

/**
 * Draws a tag for each effect in play, in a row under the paddle: its
 * capsule's symbol, over a ring that empties as its time runs out.
 */
export class TagPainter implements Painter {
  /** A tag for each kind of effect, made once. */
  readonly images: Readonly<Record<EffectKind, GameObjects.Image>>;
  /** The rings, drawn again each frame. */
  readonly rings: GameObjects.Graphics;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.rings = scene.add.graphics();
    this.images = recordOf(EFFECT_KINDS, () =>
      scene.add.image(0, 0, ATLAS, tagFrame("wide")).setVisible(false),
    );
    layer.add([this.rings, ...Object.values(this.images)]);
  }

  /** Takes up each tag's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const kind of EFFECT_KINDS) {
      const image = this.images[kind];
      image.setFrame(image.frame.name);
    }
  }

  /** Draws the tags of the effects in play, under the paddle between its last place and its next. */
  draw({ field, alpha, metrics, palette }: Readonly<PaintContext>): void {
    this.rings.clear();
    let count = 0;
    for (const kind of EFFECT_KINDS) {
      if (field.effects[kind].capsule !== null) count++;
    }
    const paddleX = between(field.paddle.lastX, field.paddle.x, alpha);
    let x = firstTagX(paddleX, count);
    const y = toCanvasY(metrics, tagY(field.height));
    const radius = TAG_RADIUS * metrics.unit;
    const width = lineWidth(metrics);
    for (const kind of EFFECT_KINDS) {
      const image = this.images[kind];
      const effect = field.effects[kind];
      image.setVisible(effect.capsule !== null);
      if (effect.capsule === null) continue;
      const frame = tagFrame(effect.capsule);
      if (image.frame.name !== frame) image.setFrame(frame);
      const middle = toCanvasX(metrics, x);
      image.setPosition(middle, y);
      this.rings
        .lineStyle(width, palette.wall)
        .strokeCircle(middle, y, radius)
        .lineStyle(width, palette.capsules[capsule(effect.capsule).tone])
        .beginPath()
        .arc(
          middle,
          y,
          radius,
          RING_TOP,
          RING_TOP + 2 * Math.PI * timeLeft(effect, field.steps),
        )
        .strokePath();
      x += TAG_SPACING;
    }
  }
}
