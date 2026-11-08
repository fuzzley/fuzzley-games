import { lerp, shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import type { Pilot } from "../../rules/ship/pilots";
import type { Moving, Place } from "../../rules/torus";
import { STRAY_RADIUS } from "../../rules/tuning";
import { FRAMES, STRAY_DROP } from "../../view/art/art";
import {
  LOOK,
  PILOT_SIZES,
  eyesFrame,
  lookingFrom,
  pilotFrame,
} from "../../view/art/pilot_art";
import {
  BAIL_OUT_SPEED,
  bailOutShown,
  bobShare,
  eyesOpen,
} from "../../view/effects/flourish";
import { BAIL_OUT_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** Holds the images of a pilot in its bubble: the bubble, the pilot and its eyes. */
interface Bubbled {
  readonly bubble: GameObjects.Image;
  readonly pilot: GameObjects.Image;
  readonly eyes: GameObjects.Image;
  /** All three, back to front. */
  readonly parts: readonly GameObjects.Image[];
}

/**
 * Describes a lost ship's pilot bailing out: when, from where, the way it
 * floats off, in radians, and who.
 */
interface BailOut {
  at: number;
  x: number;
  y: number;
  way: number;
  pilot: Pilot;
}

/**
 * Draws the pilots in their bubbles: the stray adrift, its eyes on the
 * ship, and a lost ship's pilot bailing out, floating off the way it looks
 * and blinking as it goes. Each bobs in its bubble and blinks its eyes
 * where motion is welcome.
 *
 * A stray crosses rather than wraps, and a pilot bailing out floats off,
 * so each is drawn once, and the field's camera cuts it off at an edge.
 */
export class StrayPainter implements Painter {
  readonly adrift: Bubbled;
  readonly bailing: Bubbled;

  private readonly bailingOut: BailOut = {
    at: -Infinity,
    x: 0,
    y: 0,
    way: 0,
    pilot: 0,
  };
  /** Where a part is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** The way a pilot looks, written each frame. */
  private readonly look: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.adrift = bubbled(scene, layer);
    this.bailing = bubbled(scene, layer);
  }

  /**
   * Floats a lost ship's pilot off in its bubble, from where the ship was lost,
   * a way, in radians.
   */
  bailOut(x: number, y: number, pilot: Pilot, way: number, now: number): void {
    const bailOut = this.bailingOut;
    bailOut.at = now;
    bailOut.x = x;
    bailOut.y = y;
    bailOut.way = way;
    bailOut.pilot = pilot;
  }

  /** Stops a pilot bailing out, as a new field starts. */
  start(): void {
    this.bailingOut.at = -Infinity;
  }

  /**
   * Draws the stray adrift between its last place and its next, and a pilot
   * bailing out, or nothing of each while none is.
   */
  draw(context: Readonly<PaintContext>): void {
    this.drawAdrift(context);
    this.drawBailing(context);
  }

  /** Draws the stray adrift, its eyes on the ship, or nothing while none is. */
  private drawAdrift(context: Readonly<PaintContext>): void {
    const { field, alpha, shipDrawn } = context;
    const stray = field.strays.adrift;
    for (const part of this.adrift.parts) part.setVisible(stray.live);
    if (!stray.live) return;
    const x = lerp(stray.lastX, stray.x, alpha);
    const y = lerp(stray.lastY, stray.y, alpha);
    lookingFrom(x, y, shipDrawn, stray.heading, this.look);
    this.drawPilot(this.adrift, x, y, stray.pilot, this.look, context);
  }

  /**
   * Draws a pilot bailing out, floating off the way it looks, steadily and then
   * blinking, or nothing once it is gone.
   */
  private drawBailing(context: Readonly<PaintContext>): void {
    const { now } = context;
    const bailOut = this.bailingOut;
    const done = shareDone(bailOut.at, now, BAIL_OUT_MS);
    const shown = done < 1 && bailOutShown(done, now / 1000);
    for (const part of this.bailing.parts) part.setVisible(shown);
    if (!shown) return;
    const gone = (BAIL_OUT_SPEED * (now - bailOut.at)) / 1000;
    const x = bailOut.x + Math.cos(bailOut.way) * gone;
    const y = bailOut.y + Math.sin(bailOut.way) * gone;
    lookingFrom(x, y, null, bailOut.way, this.look);
    this.drawPilot(this.bailing, x, y, bailOut.pilot, this.look, context);
  }

  /**
   * Draws a pilot in its bubble at a place on the field, in its ink, its eyes
   * the way it looks, bobbing and blinking.
   */
  private drawPilot(
    images: Bubbled,
    x: number,
    y: number,
    pilot: Pilot,
    look: Place,
    { metrics, zoom, now, motion }: Readonly<PaintContext>,
  ): void {
    const seconds = now / 1000;
    // The pilot sits a little low in its bubble, and bobs about there.
    const sits = y + (STRAY_DROP + bobShare(seconds, 0, motion)) * STRAY_RADIUS;
    const size = PILOT_SIZES.adrift;
    const frame = pilotFrame(pilot, "adrift");
    if (images.pilot.frame.name !== frame) images.pilot.setFrame(frame);
    this.put(images.bubble, x, y, metrics).setScale(zoom);
    this.put(images.pilot, x, sits, metrics).setScale(zoom);
    this.put(
      images.eyes,
      x + look.x * LOOK.across * size,
      sits + look.y * LOOK.down * size,
      metrics,
    ).setScale(zoom, zoom * eyesOpen(seconds, pilot, motion));
  }

  /** Puts a part at a place on the field, and returns it. */
  private put(
    part: GameObjects.Image,
    x: number,
    y: number,
    metrics: FieldMetrics,
  ): GameObjects.Image {
    toCanvas(metrics, x, y, this.at);
    return part.setPosition(this.at.x, this.at.y);
  }
}

/** Returns the images of a pilot in its bubble, made in a layer, hidden till drawn. */
function bubbled(scene: Scene, layer: GameObjects.Layer): Bubbled {
  const image = (frame: string): GameObjects.Image =>
    scene.add.image(0, 0, ATLAS, frame).setVisible(false);
  const bubble = image(FRAMES.bubble);
  const pilot = image(pilotFrame(0, "adrift"));
  const eyes = image(eyesFrame("adrift"));
  const parts = [bubble, pilot, eyes];
  layer.add(parts);
  return { bubble, pilot, eyes, parts };
}
