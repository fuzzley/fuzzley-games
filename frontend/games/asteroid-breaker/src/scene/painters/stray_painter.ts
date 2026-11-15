import { lerp, shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import type { Pilot } from "../../rules/ship/pilots";
import type { Moving } from "../../rules/torus";
import { STRAY_RADIUS } from "../../rules/tuning";
import { FRAMES, STRAY_DROP } from "../../view/art/art";
import { adriftFaceOf } from "../../view/art/faces";
import {
  ADRIFT_FRAMES,
  BAIL_OUT_RADIUS,
  eyesFrame,
  eyesShift,
  lookingFrom,
} from "../../view/art/pilot_art";
import {
  BAIL_OUT_SPEED,
  bailOutShown,
  bobShare,
} from "../../view/effects/flourish";
import { BAIL_OUT_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** Holds the images of a pilot in its bubble: the bubble, the pilot, white, which its ink tints, and its eyes. */
interface Bubbled {
  readonly bubble: GameObjects.Image;
  readonly pilot: GameObjects.Image;
  readonly eyes: GameObjects.Image;
  /** All three, back to front. */
  readonly parts: readonly GameObjects.Image[];
}

/** How much smaller a pilot bailing out is drawn than a stray adrift, its bubble a bubble in tow's. */
export const BAIL_OUT_SCALE = BAIL_OUT_RADIUS / STRAY_RADIUS;

/**
 * Describes the frames a pilot in its bubble is drawn in, its fur's and its
 * eyes', and how large, as a share of a stray adrift's.
 */
interface Drawing {
  fur: string;
  eyes: string;
  scale: number;
}

/** How a pilot bailing out is drawn: wide eyed, its fur stood out in a fright, in a bubble in tow's size. */
const BAILING: Readonly<Drawing> = {
  fur: ADRIFT_FRAMES.puffed,
  eyes: eyesFrame("adrift", "eep"),
  scale: BAIL_OUT_SCALE,
};

/**
 * Describes a lost pod's pilot bailing out: when, from where, the way it
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
 * Draws the pilots in their bubbles: the stray adrift, pleading, its eyes on
 * the pod, blinking now and then by the field's steps where motion is
 * welcome; and a lost pod's pilot bailing out in a smaller bubble, wide
 * eyed and its fur stood out, looking back as it floats off, and blinking
 * as it goes. Each bobs in its bubble where motion is welcome.
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
  /** The way a pilot looks, and how far its eyes move for it, written each frame. */
  private readonly look: Moving = { x: 0, y: 0 };
  private readonly shift: Moving = { x: 0, y: 0 };
  /** How the stray adrift is drawn, its eyes' frame written each frame. */
  private readonly adriftDrawn: Drawing = {
    fur: ADRIFT_FRAMES.fur,
    eyes: eyesFrame("adrift", "plead"),
    scale: 1,
  };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.adrift = bubbled(scene, layer);
    this.bailing = bubbled(scene, layer);
  }

  /**
   * Floats a lost pod's pilot off in its bubble, from where the pod was lost,
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

  /** Draws the stray adrift, pleading, its eyes on the pod, or nothing while none is. */
  private drawAdrift(context: Readonly<PaintContext>): void {
    const { field, alpha, shipDrawn, motion } = context;
    const stray = field.strays.adrift;
    for (const part of this.adrift.parts) part.setVisible(stray.live);
    if (!stray.live) return;
    const x = lerp(stray.lastX, stray.x, alpha);
    const y = lerp(stray.lastY, stray.y, alpha);
    lookingFrom(x, y, shipDrawn, stray.heading, this.look);
    const face = adriftFaceOf(field.steps, stray.pilot, motion);
    this.adriftDrawn.eyes = eyesFrame("adrift", face);
    this.drawPilot(this.adrift, x, y, stray.pilot, context, this.adriftDrawn);
  }

  /**
   * Draws a pilot bailing out, floating off and looking back at where its
   * pod was lost, steadily and then blinking, or nothing once it is gone.
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
    // It looks back at where its pod was lost.
    lookingFrom(x, y, null, bailOut.way + Math.PI, this.look);
    this.drawPilot(this.bailing, x, y, bailOut.pilot, context, BAILING);
  }

  /**
   * Draws a pilot in its bubble at a place on the field, in its ink, its eyes
   * the way it looks, bobbing where motion is welcome, in its frames, a
   * share of a stray's size.
   */
  private drawPilot(
    images: Bubbled,
    x: number,
    y: number,
    pilot: Pilot,
    { metrics, palette, zoom, now, motion }: Readonly<PaintContext>,
    drawn: Readonly<Drawing>,
  ): void {
    const { scale } = drawn;
    // The pilot sits a little low in its bubble, and bobs about there.
    const radius = STRAY_RADIUS * scale;
    const sits = y + (STRAY_DROP + bobShare(now / 1000, 0, motion)) * radius;
    eyesShift(this.look, "adrift", this.shift);
    if (images.pilot.frame.name !== drawn.fur) images.pilot.setFrame(drawn.fur);
    if (images.eyes.frame.name !== drawn.eyes) images.eyes.setFrame(drawn.eyes);
    images.pilot.setTint(palette.pilots[pilot] ?? palette.accent);
    this.put(images.bubble, x, y, metrics).setScale(zoom * scale);
    this.put(images.pilot, x, sits, metrics).setScale(zoom * scale);
    this.put(
      images.eyes,
      x + this.shift.x * scale,
      sits + this.shift.y * scale,
      metrics,
    ).setScale(zoom * scale);
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
  const pilot = image(ADRIFT_FRAMES.fur);
  const eyes = image(eyesFrame("adrift", "plead"));
  const parts = [bubble, pilot, eyes];
  layer.add(parts);
  return { bubble, pilot, eyes, parts };
}
