import { ATLAS } from "@fz/brick-wall/scene/atlas";
import type {
  FieldMetrics,
  FieldShape,
} from "@fz/brick-wall/view/field_metrics";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import { FRAMES } from "../../view/art/frames";
import { bandSprings } from "../../view/field/springs";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the floor bounces a flight holds: a spring in the floor's band for
 * each a fuzzball can hold, side by side at its right end, as the view lays
 * them out, lit from the left as many as the round's fuzzball holds, the
 * rest unlit.
 *
 * Its springs are made as the field is first laid out, and again only for
 * rules retuned to hold more than it has, so a frame makes none.
 */
export class SpringsPainter implements Painter {
  /** The springs made so far, one for each floor bounce a fuzzball may hold. */
  private readonly made: GameObjects.Image[] = [];
  /** The layout, the scale, the count of springs and the floor bounces held they were last drawn for, so a frame where none changed sets nothing. */
  private readonly drawn: {
    metrics: FieldMetrics | null;
    shape: FieldShape | null;
    baked: ArtScale | null;
    count: number;
    held: number;
  } = { metrics: null, shape: null, baked: null, count: 0, held: -1 };

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {}

  /** A spring for each floor bounce a fuzzball may hold, from the left: those past the rules' count hide. */
  get springs(): readonly GameObjects.Image[] {
    return this.made;
  }

  /** Draws the springs as the frame has them, again only where the layout, the scale, the rules' count of them or the floor bounces held changed. */
  draw({ view, metrics, shape, baked, rules }: Readonly<PaintContext>): void {
    const { drawn } = this;
    const count = rules.mostBounces;
    const laidOut =
      metrics !== drawn.metrics ||
      shape !== drawn.shape ||
      baked !== drawn.baked ||
      count !== drawn.count;
    if (laidOut) {
      drawn.metrics = metrics;
      drawn.shape = shape;
      drawn.baked = baked;
      drawn.count = count;
      this.layOut(metrics, shape, count);
    }
    if (!laidOut && view.held === drawn.held) return;
    drawn.held = view.held;
    const { made } = this;
    for (let at = 0; at < made.length; at++) {
      const spring = made[at];
      const frame = at < view.held ? FRAMES.bounceOn : FRAMES.bounceOff;
      if (spring !== undefined && spring.frame.name !== frame) {
        spring.setFrame(frame);
      }
    }
  }

  /**
   * Stands a spring at each place the view lays one in the band, its foot's
   * middle on the spring's square's, as large as the square, making those
   * it lacks, and hides the rest.
   */
  private layOut(
    metrics: FieldMetrics,
    shape: FieldShape,
    count: number,
  ): void {
    const { size, corners } = bandSprings(metrics, shape, {
      mostBounces: count,
    });
    while (this.made.length < count) {
      const spring = this.scene.add
        .image(0, 0, ATLAS, FRAMES.bounceOff)
        .setOrigin(0.5, 1);
      this.made.push(spring);
      this.layer.add(spring);
    }
    this.made.forEach((spring, at) => {
      const corner = corners[at];
      if (corner === undefined || size === 0) {
        spring.setVisible(false);
        return;
      }
      spring
        .setDisplaySize(size, size)
        .setPosition(corner.x + size / 2, corner.y + size)
        .setVisible(true);
    });
  }
}
