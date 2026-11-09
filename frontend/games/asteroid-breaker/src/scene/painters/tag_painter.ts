import { recordOf } from "@fz/core/records";
import { strokeShareArc } from "@fz/phaser/scene";
import { lineWidth } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import type { EffectKind } from "../../rules/catalog/pickups";
import { EFFECT_KINDS } from "../../rules/rocks/pickups";
import type { Moving } from "../../rules/torus";
import { tagFrame } from "../../view/art/art";
import { toCanvas } from "../../view/field/field_metrics";
import { TAG_RADIUS, tagX, tagY, timeLeft } from "../../view/field/tags";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws a tag for each effect in play, in a row at the field's bottom left:
 * its pickup's symbol, in a ring that empties as its time runs out.
 */
export class TagPainter implements Painter {
  /** A tag for each kind of effect, made once. */
  readonly images: Readonly<Record<EffectKind, GameObjects.Image>>;
  /** The rings, drawn again each frame. */
  readonly rings: GameObjects.Graphics;

  /** Where a tag is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.rings = scene.add.graphics();
    this.images = recordOf(EFFECT_KINDS, () =>
      scene.add.image(0, 0, ATLAS, tagFrame("spread")).setVisible(false),
    );
    layer.add([this.rings, ...Object.values(this.images)]);
  }

  /** Draws the tags of the effects in play, in a row in the order of their kinds. */
  draw({ field, metrics, palette, zoom }: Readonly<PaintContext>): void {
    this.rings.clear();
    const radius = TAG_RADIUS * metrics.unit;
    const width = lineWidth(metrics);
    const tagsY = tagY(field.torus.height);
    let shown = 0;
    for (const kind of EFFECT_KINDS) {
      const image = this.images[kind];
      const effect = field.effects[kind];
      // The rules keep only an effect that lasts in play, each with a tag.
      const id = effect.pickup;
      image.setVisible(id !== null);
      if (id === null) continue;
      const frame = tagFrame(id);
      if (image.frame.name !== frame) image.setFrame(frame);
      const { x, y } = toCanvas(metrics, tagX(shown), tagsY, this.at);
      image.setPosition(x, y).setScale(zoom);
      this.rings
        .lineStyle(width, palette.line)
        .strokeCircle(x, y, radius)
        .lineStyle(width, palette.accent);
      strokeShareArc(this.rings, x, y, radius, timeLeft(effect, field.steps));
      shown += 1;
    }
  }
}
