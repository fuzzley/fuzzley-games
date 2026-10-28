import type { GameObjects, Scene } from "phaser";
import { type BoardMetrics, centerX, centerY } from "../view/board_metrics";
import type { StepEffects } from "../view/effects";
import {
  CRUMBS,
  CRUMBS_MS,
  FADE_MS,
  SHAKE_INTENSITY,
  SHAKE_MS,
} from "../view/timing";
import { CRUMB_TEXTURE } from "./textures";

/** How fast crumbs fly, in squares a second. */
const CRUMB_SPEED = 3;

/**
 * Plays a step's flourishes: crumbs scattered where an apple was eaten, the
 * board shaken at a crash, and the snake's fade, which the snake painter
 * reads.
 */
export class EffectsPainter {
  readonly crumbs: GameObjects.Particles.ParticleEmitter;
  /** How far the crashed snake has faded, from 0 to 1. */
  fade = 0;
  /** A square's side, which the crumbs fly by. */
  private square = 1;

  constructor(
    private readonly scene: Scene,
    layer: GameObjects.Layer,
  ) {
    this.crumbs = scene.add.particles(0, 0, CRUMB_TEXTURE, {
      emitting: false,
      lifespan: CRUMBS_MS,
      speed: {
        onEmit: () => this.square * CRUMB_SPEED * (0.5 + Math.random()),
      },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
    });
    layer.add(this.crumbs);
  }

  /** Takes the size of the board the crumbs fly over. */
  layout(metrics: BoardMetrics): void {
    this.square = metrics.square;
  }

  /** Takes up the crumb's texture again, once it has been baked again. */
  refresh(): void {
    this.crumbs.setTexture(CRUMB_TEXTURE);
  }

  /**
   * Plays what a step calls for, but its pop and its sound: the fade over
   * time where the player welcomes motion.
   */
  play(effects: StepEffects, metrics: BoardMetrics, motion: boolean): void {
    if (effects.crumbs) {
      this.crumbs.explode(
        CRUMBS,
        centerX(metrics, effects.crumbs),
        centerY(metrics, effects.crumbs),
      );
    }
    if (effects.shake) this.scene.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY);
    if (effects.fade) this.startFade(motion);
  }

  /**
   * Stops the shake and the crumbs, and brings the snake's color back, for a
   * new run; the scene kills the fade's tween with every other.
   */
  reset(): void {
    this.scene.cameras.main.resetFX();
    this.crumbs.killAll();
    this.fade = 0;
  }

  /** Fades the snake, over time where there is motion, else at once. */
  private startFade(motion: boolean): void {
    if (!motion) {
      this.fade = 1;
      return;
    }
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: FADE_MS,
      onUpdate: (tween) => {
        this.fade = tween.getValue() ?? 1;
      },
    });
  }
}
