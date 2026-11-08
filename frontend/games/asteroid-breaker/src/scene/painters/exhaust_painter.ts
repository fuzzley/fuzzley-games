import type { GameObjects, Scene } from "phaser";
import { thrustOf } from "../../rules/ship/ship";
import { type Moving, wrap } from "../../rules/torus";
import { FRAMES } from "../../view/art/art";
import { flameTip } from "../../view/art/ship_art";
import { exhaustDue } from "../../view/effects/flourish";
import { EXHAUST_MS } from "../../view/effects/timing";
import { toCanvas } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * How many specks of exhaust may stream at once, more than the flame
 * streams over a speck's life.
 */
export const MOST_EXHAUST = 16;

/** How fast a speck of exhaust streams back from the flame, in field units a second. */
const EXHAUST_SPEED = 6;

/** How far either side of straight back a speck of exhaust may stream, in degrees. */
const EXHAUST_SPREAD = 18;

/** How large a speck of exhaust is, a share of the puff it is drawn from. */
const EXHAUST_SIZE = 0.4;

/**
 * Streams the exhaust off the flame's tip while the ship thrusts, as many
 * specks as the thrust is strong, for the steps the field takes, so none
 * streams while it stands still. Each speck is made once, and it streams
 * only where motion is welcome.
 */
export class ExhaustPainter implements Painter {
  /** Streams the specks off the flame. */
  readonly specks: GameObjects.Particles.ParticleEmitter;

  /** The field's unit and zoom as last drawn at, which the specks fly and are sized by. */
  private unit = 0;
  private zoom = 1;
  /** The way the specks stream, in degrees, straight back from the flame. */
  private angle = 0;
  /** The part of a speck due but not yet streamed, carried to the next frame. */
  private carried = 0;
  /** The field's steps as it was last drawn, or null before a field is first drawn. */
  private stepsDrawn: number | null = null;
  /** Where the flame's tip is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.specks = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.puff,
      emitting: false,
      maxAliveParticles: MOST_EXHAUST,
      lifespan: EXHAUST_MS,
      alpha: { start: 0.8, end: 0 },
      angle: () => this.angle + (Math.random() * 2 - 1) * EXHAUST_SPREAD,
      speed: () => this.unit * EXHAUST_SPEED,
      scale: () => this.zoom * EXHAUST_SIZE,
    });
    this.specks.reserve(MOST_EXHAUST);
    layer.add(this.specks);
  }

  /**
   * Streams off the flame's tip, wrapped onto the field, the specks due for
   * the steps the field took since it was last drawn.
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
    // The exhaust follows the field's steps, which stop as it pauses or is
    // cleared, though the scene's time runs on.
    const stepped = field.steps - (this.stepsDrawn ?? field.steps);
    this.stepsDrawn = field.steps;
    const { ship, torus } = field;
    const thrust = ship ? thrustOf(ship) : 0;
    const due = exhaustDue(this.carried, thrust, stepped, motion);
    const streamed = Math.floor(due);
    this.carried = due - streamed;
    if (!shipDrawn || streamed <= 0) return;
    const { x, y, angle } = shipDrawn;
    const behind = flameTip(thrust);
    toCanvas(
      metrics,
      wrap(x - Math.cos(angle) * behind, torus.width),
      wrap(y - Math.sin(angle) * behind, torus.height),
      this.at,
    );
    this.angle = (angle * 180) / Math.PI + 180;
    this.specks
      .setParticleTint(palette.flame)
      .emitParticleAt(this.at.x, this.at.y, streamed);
  }

  /** Stops every speck, as a new field starts. */
  start(): void {
    this.specks.killAll();
    this.carried = 0;
    this.stepsDrawn = null;
  }
}
