import type { GameObjects, Scene } from "phaser";
import { thrustOf } from "../../rules/ship/ship";
import { type Moving, wrap } from "../../rules/torus";
import { FLOURISH, FRAMES } from "../../view/art/art";
import {
  ENGINES,
  PUFF,
  puffAlpha,
  puffColors,
  puffRadius,
} from "../../view/art/pod_art";
import type { BeltPalette } from "../../view/colors/palette";
import { exhaustDue } from "../../view/effects/flourish";
import { EXHAUST_MS } from "../../view/effects/timing";
import { toCanvas } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * How many puffs of exhaust may stream at once, more than the flame
 * streams over a puff's life.
 */
export const MOST_EXHAUST = 20;

/**
 * Streams the exhaust behind the pod's engines while it thrusts, a puff from
 * each in turn, as many as the thrust is strong, for the steps the field
 * takes, so none streams while it stands still: each drifting back,
 * swelling and fading from the flame's hot middle through its body to the
 * field's muted text. Each puff is made once, and it streams only where
 * motion is welcome.
 */
export class ExhaustPainter implements Painter {
  /** Streams the puffs off the engines. */
  readonly specks: GameObjects.Particles.ParticleEmitter;

  /** The field's unit and zoom as last drawn at, which the puffs fly and are sized by. */
  private unit = 0;
  private zoom = 1;
  /** The way the puffs stream, in degrees, straight back from the engines. */
  private angle = 0;
  /** The part of a puff due but not yet streamed, carried to the next frame. */
  private carried = 0;
  /** How many puffs have streamed, which says the engine the next streams from. */
  private streamed = 0;
  /** The field's steps as it was last drawn, or null before a field is first drawn. */
  private stepsDrawn: number | null = null;
  /** The palette the puffs were last colored in. */
  private colored: BeltPalette | null = null;
  /** Where a puff is let go on the canvas, written as each streams. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.specks = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.puff,
      emitting: false,
      maxAliveParticles: MOST_EXHAUST,
      lifespan: EXHAUST_MS,
      alpha: {
        onEmit: () => puffAlpha(0),
        onUpdate: (_particle, _key, share) => puffAlpha(share),
      },
      angle: () => this.angle + (Math.random() * 2 - 1) * PUFF.spread,
      speed: () => (this.unit * PUFF.drift * 1000) / EXHAUST_MS,
      scale: {
        onEmit: () => this.puffScale(0),
        onUpdate: (_particle, _key, share) => this.puffScale(share),
      },
    });
    this.specks.reserve(MOST_EXHAUST);
    layer.add(this.specks);
  }

  /**
   * Streams the puffs due for the steps the field took since it was last
   * drawn behind the engines, wrapped onto the field.
   */
  draw({
    field,
    shipDrawn,
    metrics,
    palette,
    zoom,
    motion,
  }: Readonly<PaintContext>): void {
    this.unit = metrics.unit;
    this.zoom = zoom;
    if (palette !== this.colored) {
      this.colored = palette;
      // `particleColor`'s setter changes only the op's current color, never
      // its list, so the colors are loaded as a config loads them.
      this.specks.ops.color.loadConfig({ color: [...puffColors(palette)] });
    }
    // The exhaust follows the field's steps, which stop as it pauses or is
    // cleared, though the scene's time runs on.
    const stepped = field.steps - (this.stepsDrawn ?? field.steps);
    this.stepsDrawn = field.steps;
    const { ship, torus } = field;
    const thrust = ship ? thrustOf(ship) : 0;
    const due = exhaustDue(this.carried, thrust, stepped, motion);
    const streaming = Math.floor(due);
    this.carried = due - streaming;
    if (!shipDrawn || streaming <= 0) return;
    const { x, y, angle } = shipDrawn;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.angle = (angle * 180) / Math.PI + 180;
    for (let i = 0; i < streaming; i++) {
      const engine = ENGINES[this.streamed % ENGINES.length];
      this.streamed += 1;
      if (!engine) continue;
      const back = engine.at.x - PUFF.behind;
      toCanvas(
        metrics,
        wrap(x + cos * back - sin * engine.at.y, torus.width),
        wrap(y + sin * back + cos * engine.at.y, torus.height),
        this.at,
      );
      this.specks.emitParticleAt(this.at.x, this.at.y, 1);
    }
  }

  /** Stops every puff, as a new field starts. */
  start(): void {
    this.specks.killAll();
    this.carried = 0;
    this.stepsDrawn = null;
  }

  /** Returns how large a puff is drawn a share through its life, over the puff it is drawn from, at the field's zoom. */
  private puffScale(share: number): number {
    return (this.zoom * puffRadius(share)) / FLOURISH.puff;
  }
}
