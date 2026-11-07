import { recordOf } from "@fz/core/records";
import type { GameObjects, Scene } from "phaser";
import type { EffectKind } from "../../rules/catalog/pickups";
import { EFFECT_KINDS } from "../../rules/rocks/pickups";
import type { Moving } from "../../rules/torus";
import { tagFrame } from "../../view/art/art";
import { lineWidth } from "../../view/art/shapes";
import { toCanvas } from "../../view/field/field_metrics";
import { TAG_RADIUS, tagX, tagY, timeLeft } from "../../view/field/tags";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** Where a ring starts to empty from: its top. */
const RING_TOP = -Math.PI / 2;

/**
 * Draws a tag for each effect in play, in a row at the field's bottom left:
 * its pickup's symbol, in a ring that empties as its time runs out.
 */
export class TagPainter implements Painter {
  /** A tag for each kind of effect, made once. */
  readonly images: Readonly<Record<EffectKind, GameObjects.Image>>;
  /** The rings, drawn again each frame. */
  readonly rings: GameObjects.Graphics;

  /** Where a tag is on the field, written each frame. */
  private readonly place: Moving = { x: 0, y: 0 };
  /** Where it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.rings = scene.add.graphics();
    this.images = recordOf(EFFECT_KINDS, () =>
      scene.add.image(0, 0, ATLAS, tagFrame("spread")).setVisible(false),
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

  /** Draws the tags of the effects in play, in a row in the order of their kinds. */
  draw({ field, metrics, palette, zoom }: Readonly<PaintContext>): void {
    this.rings.clear();
    const radius = TAG_RADIUS * metrics.unit;
    const width = lineWidth(metrics);
    this.place.y = tagY(field.torus.height);
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
      this.place.x = tagX(shown);
      toCanvas(metrics, this.place, this.at);
      const { x, y } = this.at;
      image.setPosition(x, y).setScale(zoom);
      this.rings
        .lineStyle(width, palette.line)
        .strokeCircle(x, y, radius)
        .lineStyle(width, palette.accent)
        .beginPath()
        .arc(
          x,
          y,
          radius,
          RING_TOP,
          RING_TOP + 2 * Math.PI * timeLeft(effect, field.steps),
        )
        .strokePath();
      shown += 1;
    }
  }
}
