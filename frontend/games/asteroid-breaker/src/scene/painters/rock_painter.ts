import type { GameObjects, Scene } from "phaser";
import { ROCK_RADIUS } from "../../rules/tuning";
import { flashAlpha, flashDue, shareDone } from "../../view/effects/flourish";
import { betweenOnAxis } from "../../view/field/frame";
import { rockFrame, takenFrame } from "../../view/art/rock_art";
import { FLASH_MS } from "../../view/effects/timing";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/** How far past its radius a rock's frame reaches, its outline and its turn's corners, in field units. */
const RIM = 0.5;

/** A frame any rock's images show till one is drawn: the smallest stone's first outline. */
const FIRST_FRAME = rockFrame({ kind: "stone", size: "small", outline: 0 });

/**
 * Draws the rocks: for each slot of the field's, its body in its outline,
 * turned as far as it has turned, and over it the hits it has taken, each
 * on both sides of an edge it reaches across; and a held hit's flash over
 * its rock, no sooner after the last than is safe.
 */
export class RockPainter implements Painter {
  /** Each slot's body. */
  readonly bodies: Copies[] = [];
  /** Each slot's hits taken, over its body. */
  readonly taken: Copies[] = [];
  /** A held hit's flash: its rock's body, filled light, over it. */
  readonly flash: Copies;

  /** The slot of the rock that last flashed, and when, in the scene's time. */
  private readonly flashed = { slot: -1, at: -Infinity };

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
    flashes: GameObjects.Layer,
  ) {
    this.flash = new Copies(scene, flashes, FIRST_FRAME);
  }

  /**
   * Makes the images a field of so many slots needs, those it lacks, as a
   * new field is shown, so none is made in a frame of play.
   */
  fit(slots: number): void {
    while (this.bodies.length < slots) {
      this.bodies.push(new Copies(this.scene, this.layer, FIRST_FRAME));
      this.taken.push(new Copies(this.scene, this.layer, FIRST_FRAME));
    }
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const body of this.bodies) body.refresh();
    for (const taken of this.taken) taken.refresh();
    this.flash.refresh();
  }

  /** Flashes the rock in a slot that held a hit, unless the field flashed too lately. */
  flashSlot(slot: number, now: number): void {
    if (!flashDue(this.flashed.at, now)) return;
    this.flashed.slot = slot;
    this.flashed.at = now;
  }

  /** Stops a flash, as a new field starts. */
  reset(): void {
    this.flashed.slot = -1;
    this.flashed.at = -Infinity;
  }

  /** Draws each whole rock between its last place and its next, and hides each slot that holds none. */
  draw({
    field,
    alpha,
    metrics,
    palette,
    zoom,
    now,
  }: Readonly<PaintContext>): void {
    const { torus } = field;
    const flashed = shareDone(this.flashed.at, now, FLASH_MS);
    this.flash.hide();
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      const taken = this.taken[i];
      const rock = field.rocks[i];
      if (!body || !taken) continue;
      if (!rock?.live) {
        body.hide();
        taken.hide();
        continue;
      }
      const x = betweenOnAxis(rock.lastX, rock.x, alpha, torus.width);
      const y = betweenOnAxis(rock.lastY, rock.y, alpha, torus.height);
      const reach = ROCK_RADIUS[rock.size] + RIM;
      const frame = rockFrame(rock);
      body.setFrame(frame);
      body.setRotation(rock.angle);
      body.setScale(zoom);
      body.show(x, y, reach, metrics, torus);
      if (i === this.flashed.slot && flashed < 1) {
        this.flash.setFrame(frame);
        this.flash.setTintFill(palette.glint);
        this.flash.setRotation(rock.angle);
        this.flash.setScale(zoom);
        this.flash.setAlpha(flashAlpha(flashed));
        this.flash.show(x, y, reach, metrics, torus);
      }
      const hits = takenFrame(rock);
      if (hits === null) {
        taken.hide();
        continue;
      }
      taken.setFrame(hits);
      taken.setRotation(rock.angle);
      taken.setScale(zoom);
      taken.show(x, y, reach, metrics, torus);
    }
  }
}
