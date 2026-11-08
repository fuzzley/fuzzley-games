import { shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { ROCK_REACH, rockFrame, takenFrame } from "../../view/art/rock_art";
import { flashAlpha, flashDue } from "../../view/effects/flourish";
import { FLASH_MS } from "../../view/effects/timing";
import type { FieldView } from "../../view/field/frame";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/** A frame any rock's images show till one is drawn: the smallest stone's first outline. */
const FIRST_FRAME = rockFrame({ kind: "stone", size: "small", outline: 0 });

/**
 * Draws the rocks: for each slot of the field's, its body in its outline,
 * turned as far as it has turned, and over it the hits it has taken, each
 * on both sides of an edge it reaches across; and a held hit's flash over
 * its rock, no sooner after the last than is safe.
 */
export class RockPainter implements Painter {
  /** A held hit's flash: its rock's body, filled light, over it. */
  readonly flash: Copies;

  /** Each slot's body, made as a field of more slots starts. */
  private readonly bodiesMade: Copies[] = [];
  /** Each slot's hits taken, as many as its bodies. */
  private readonly takenMade: Copies[] = [];
  /** The slot of the rock that last flashed, and when, in the scene's time. */
  private readonly flashed = { slot: -1, at: -Infinity };

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
    flashes: GameObjects.Layer,
  ) {
    this.flash = new Copies(scene, flashes, FIRST_FRAME);
  }

  /** Each slot's body. */
  get bodies(): readonly Copies[] {
    return this.bodiesMade;
  }

  /** Each slot's hits taken, over its body. */
  get taken(): readonly Copies[] {
    return this.takenMade;
  }

  /**
   * Stops a flash, and makes the images a new field's slots need, those it
   * lacks, so none is made in a frame of play.
   */
  start(field: FieldView): void {
    this.flashed.slot = -1;
    this.flashed.at = -Infinity;
    while (this.bodiesMade.length < field.rocks.length) {
      this.bodiesMade.push(new Copies(this.scene, this.layer, FIRST_FRAME));
      this.takenMade.push(new Copies(this.scene, this.layer, FIRST_FRAME));
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

  /**
   * Draws each whole rock between its last place and its next, and hides each
   * slot that holds none.
   */
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
      const reach = ROCK_REACH[rock.size];
      const frame = rockFrame(rock);
      body.setFrame(frame);
      body.setRotation(rock.angle);
      body.setScale(zoom);
      body.showBetween(rock, alpha, reach, metrics, torus);
      if (i === this.flashed.slot && flashed < 1) {
        this.flash.setFrame(frame);
        this.flash.setTintFill(palette.glint);
        this.flash.setRotation(rock.angle);
        this.flash.setScale(zoom);
        this.flash.setAlpha(flashAlpha(flashed));
        this.flash.showBetween(rock, alpha, reach, metrics, torus);
      }
      const hits = takenFrame(rock);
      if (hits === null) {
        taken.hide();
        continue;
      }
      taken.setFrame(hits);
      taken.setRotation(rock.angle);
      taken.setScale(zoom);
      taken.showBetween(rock, alpha, reach, metrics, torus);
    }
  }
}
