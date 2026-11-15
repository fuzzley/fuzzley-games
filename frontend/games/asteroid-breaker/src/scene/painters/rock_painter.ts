import { shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { type Moving, across, wrap } from "../../rules/torus";
import { ROCK_RADIUS } from "../../rules/tuning";
import { ROCK_REACH, rockFrame } from "../../view/art/rock_art";
import { STRUCK_LIGHT } from "../../view/colors/rock_light";
import { flashAlpha } from "../../view/effects/flourish";
import { FLASH_MS } from "../../view/effects/timing";
import { toCanvas } from "../../view/field/field_metrics";
import { type FieldView, wrappedBetween } from "../../view/field/frame";
import { ROCK_ATLAS } from "../atlas";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/** A frame any rock's images show till one is drawn: the smallest stone's first outline. */
const FIRST_FRAME = rockFrame({ kind: "stone", size: "small", outline: 0 });

/**
 * Draws the rocks, lit by the field's light through their normal map: for
 * each slot of the field's, its body in its outline, with the cracks of the
 * hits it has taken and held, turned as far as it has turned, on both sides
 * of an edge it reaches across; and a held hit's flash, a light at its
 * rock's edge toward the ship that lights the faces struck.
 */
export class RockPainter implements Painter {
  /**
   * A held hit's flash, hidden between flashes: a light at its rock's
   * struck edge, and one where that edge shows past the field's own, for
   * a rock across it.
   */
  readonly flashes: readonly [GameObjects.Light, GameObjects.Light];

  /** Each slot's body, made as a field of more slots starts. */
  private readonly bodiesMade: Copies[] = [];
  /** The slot of the rock that last flashed, and when, in the scene's time. */
  private readonly flashed = { slot: -1, at: -Infinity };
  /** Where the flashing rock is drawn on the field, and then on the canvas, written each frame. */
  private readonly struck: Moving = { x: 0, y: 0 };

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {
    const flash = (): GameObjects.Light =>
      scene.lights.addLight(0, 0, 1, 0xffffff, 0).setVisible(false);
    this.flashes = [flash(), flash()];
  }

  /** Each slot's body. */
  get bodies(): readonly Copies[] {
    return this.bodiesMade;
  }

  /**
   * Stops a flash, and makes the images a new field's slots need, those it
   * lacks, so none is made in a frame of play.
   */
  start(field: FieldView): void {
    this.flashed.slot = -1;
    this.flashed.at = -Infinity;
    while (this.bodiesMade.length < field.rocks.length) {
      const body = new Copies(this.scene, this.layer, FIRST_FRAME, ROCK_ATLAS);
      for (const image of body.images) image.setLighting(true);
      this.bodiesMade.push(body);
    }
  }

  /**
   * Flashes the rock in a slot that held a hit; the scene's
   * `FlourishPlayer` keeps the field's flashes apart.
   */
  flashSlot(slot: number, now: number): void {
    this.flashed.slot = slot;
    this.flashed.at = now;
  }

  /**
   * Draws each whole rock between its last place and its next, and hides each
   * slot that holds none.
   */
  draw(context: Readonly<PaintContext>): void {
    const { field, alpha, metrics, zoom } = context;
    const { torus } = field;
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      const rock = field.rocks[i];
      if (!body) continue;
      if (!rock?.live) {
        body.hide();
        continue;
      }
      body.setFrame(rockFrame(rock));
      body.setRotation(rock.angle);
      body.setScale(zoom);
      body.showBetween(rock, alpha, ROCK_REACH[rock.size], metrics, torus);
    }
    this.light(context);
  }

  /**
   * Lights the struck faces of the rock that flashed, from its edge toward
   * the ship, or toward the field's light between one ship and the next,
   * fading as the flash does; or puts the light out.
   */
  private light({
    field,
    alpha,
    metrics,
    palette,
    shipDrawn,
    now,
  }: Readonly<PaintContext>): void {
    const done = shareDone(this.flashed.at, now, FLASH_MS);
    const rock = field.rocks[this.flashed.slot];
    const [flash, beyond] = this.flashes;
    if (done >= 1 || !rock?.live) {
      flash.setVisible(false);
      beyond.setVisible(false);
      return;
    }
    const { torus } = field;
    const at = wrappedBetween(rock, alpha, torus, this.struck);
    const toward = shipDrawn
      ? {
          x: across(at.x, shipDrawn.x, torus.width),
          y: across(at.y, shipDrawn.y, torus.height),
        }
      : palette.rockLight.way;
    const length = Math.hypot(toward.x, toward.y) || 1;
    const radius = ROCK_RADIUS[rock.size];
    const edgeX = at.x + (toward.x / length) * radius;
    const edgeY = at.y + (toward.y / length) * radius;
    const wrappedX = wrap(edgeX, torus.width);
    const wrappedY = wrap(edgeY, torus.height);
    const pixels = radius * metrics.unit;
    const strike = (light: GameObjects.Light, x: number, y: number): void => {
      const { x: canvasX, y: canvasY } = toCanvas(metrics, x, y, this.struck);
      light.x = canvasX;
      light.y = canvasY;
      light.z = STRUCK_LIGHT.height * pixels;
      light.radius = STRUCK_LIGHT.reach * pixels;
      light.intensity = STRUCK_LIGHT.strength * flashAlpha(done);
      light.setColor(palette.glint);
      light.setVisible(true);
    };
    strike(flash, edgeX, edgeY);
    // A light just past the field's edge still lights the copy it stands
    // by; the copy past the other edge needs one of its own.
    if (wrappedX === edgeX && wrappedY === edgeY) beyond.setVisible(false);
    else strike(beyond, wrappedX, wrappedY);
  }
}
