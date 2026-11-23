import { ATLAS } from "@fz/brick-wall/scene/atlas";
import type {
  FieldMetrics,
  FieldShape,
} from "@fz/brick-wall/view/field_metrics";
import { shareDone } from "@fz/core/math";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import { FRAMES } from "../../view/art/frames";
import { kickHeight } from "../../view/effects/flourish";
import { KICK_MS } from "../../view/effects/timing";
import { bandSprings } from "../../view/field/springs";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the floor bounces a flight holds: a spring in the floor's band for
 * each a fuzzball can hold, side by side at its right end, as the view lays
 * them out, lit from the left as many as the round's fuzzball holds, the
 * rest unlit. A spring kicks as its floor bounce is spent, squashing and
 * springing back on its foot.
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
  /** A spring's side, in device pixels, as they were last laid out. */
  private size = 0;
  /** The spring that last kicked, from the left, while it kicks, or −1, and when it started, in the scene's time. */
  private readonly kicked = { spring: -1, at: Number.NEGATIVE_INFINITY };

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {}

  /** A spring for each floor bounce a fuzzball may hold, from the left: those past the rules' count hide. */
  get springs(): readonly GameObjects.Image[] {
    return this.made;
  }

  /** Kicks a spring, from the left, as its floor bounce is spent, from a time. */
  kick(spring: number, now: number): void {
    this.settle();
    this.kicked.spring = spring;
    this.kicked.at = now;
  }

  /**
   * Draws the springs as the frame has them, again only where the layout,
   * the scale, the rules' count of them or the floor bounces held changed,
   * and a spring that kicks through its kick.
   */
  draw({
    view,
    metrics,
    shape,
    baked,
    rules,
    now,
  }: Readonly<PaintContext>): void {
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
    if (laidOut || view.held !== drawn.held) {
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
    if (this.kicked.spring >= 0) this.drawKick(now);
  }

  /** Squashes the spring that kicks as far as its kick has it, on its foot, and settles it once its kick is over. */
  private drawKick(now: number): void {
    const done = shareDone(this.kicked.at, now, KICK_MS);
    if (done >= 1) {
      this.settle();
      return;
    }
    const { size } = this;
    this.made[this.kicked.spring]?.setDisplaySize(
      size,
      size * kickHeight(done),
    );
  }

  /** Stands the spring that kicks at its height again, and has none kick. */
  private settle(): void {
    const { size } = this;
    this.made[this.kicked.spring]?.setDisplaySize(size, size);
    this.kicked.spring = -1;
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
    this.size = size;
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
