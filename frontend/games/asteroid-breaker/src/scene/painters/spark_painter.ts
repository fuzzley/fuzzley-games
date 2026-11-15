import type { GameObjects, Scene } from "phaser";
import { MOST_SPARKS } from "../../rules/tuning";
import type { WrittenHalo } from "../../view/art/energy";
import {
  SPARK_CUTS,
  SPARK_FRAMES,
  SPARK_TAIL_FRAME,
  type SparkTail,
  isSparkDrawn,
  isSparkShown,
  sparkHalo,
  sparkSizeOf,
  sparkTail,
  sparkTurnOf,
} from "../../view/art/sparks";
import { type Drawn, wrappedBetween } from "../../view/field/frame";
import { Copies } from "./copies";
import type { HaloPainter } from "./halo_painter";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the sparks broken rocks shed, over the pickups, as the view's
 * `sparks.ts` says: each in its slot's size and turn, from images made
 * once, its halo in the accent shown by the halo painter, and, while the
 * ship draws it in, a tail streaking behind it away from the pod; one in
 * its last second shows for the first half of each blink, its halo with
 * it, and each is drawn again past an edge it reaches across.
 */
export class SparkPainter implements Painter {
  /** Each slot's spark, as the field's slots, in its size and turned its way. */
  readonly sparks: readonly Copies[];
  /** Each slot's spark's tail, under the sparks, shown while the ship draws it in. */
  readonly tails: readonly Copies[];

  /** Where the spark being drawn lies on the field, between two steps, written for each. */
  private readonly drawn: Drawn = { x: 0, y: 0, angle: 0 };
  /** The halo of the spark being drawn, written for each. */
  private readonly halo: WrittenHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };
  /** The tail of the spark being drawn, written for each the ship draws in. */
  private readonly tail: SparkTail = { angle: 0, along: 0, across: 0 };

  /**
   * Makes the images of as many sparks as can be out at once, each in its
   * slot's size and turn, each tail under every spark, and reserves a halo
   * for each from the halo painter.
   */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly halos: HaloPainter,
  ) {
    this.tails = Array.from(
      { length: MOST_SPARKS },
      () => new Copies(scene, layer, SPARK_TAIL_FRAME),
    );
    this.sparks = Array.from({ length: MOST_SPARKS }, (_, slot) => {
      const spark = new Copies(scene, layer, SPARK_FRAMES[sparkSizeOf(slot)]);
      spark.setRotation(sparkTurnOf(slot));
      return spark;
    });
    halos.reserve(MOST_SPARKS);
  }

  /** Draws each spark out on the field as the frame has it, with its halo and, as the ship draws it in, its tail, and hides each slot that holds none. */
  draw(context: Readonly<PaintContext>): void {
    const { field, alpha, metrics, palette, zoom, now, shipDrawn } = context;
    const { torus } = field;
    for (let slot = 0; slot < this.sparks.length; slot++) {
      const images = this.sparks[slot];
      const tail = this.tails[slot];
      const spark = field.sparks[slot];
      if (!images || !tail) continue;
      if (!spark?.live || !isSparkShown(spark, field.steps, now / 1000)) {
        images.hide();
        tail.hide();
        continue;
      }
      const size = sparkSizeOf(slot);
      const { x, y } = wrappedBetween(spark, alpha, torus, this.drawn);
      images.setScale(zoom);
      images.show(x, y, SPARK_CUTS[size].reach, metrics, torus);
      this.halos.glow(
        sparkHalo(size, this.halo),
        palette.accent,
        this.drawn,
        context,
      );
      if (!shipDrawn || !isSparkDrawn(field, spark)) {
        tail.hide();
        continue;
      }
      sparkTail(size, this.drawn, shipDrawn, torus, this.tail);
      tail.setRotation(this.tail.angle);
      tail.setScale(zoom * this.tail.along, zoom * this.tail.across);
      tail.show(x, y, this.tail.along, metrics, torus);
    }
  }
}
