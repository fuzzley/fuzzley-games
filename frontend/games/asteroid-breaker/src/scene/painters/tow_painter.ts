import type { GameObjects, Scene } from "phaser";
import type { Pilot } from "../../rules/ship/pilots";
import type { Moving } from "../../rules/torus";
import { MOST_CREW, STRAY_RADIUS } from "../../rules/tuning";
import { FRAMES, STRAY_DROP } from "../../view/art/art";
import {
  BUBBLE_REACH,
  TOW_RADIUS,
  isLooseFrightened,
  looseBlinks,
  looseFaceOf,
  looseLookOf,
  looseRadius,
  towFaceOf,
  towLookOf,
} from "../../view/art/crew";
import { createFaceMoments, hearFace } from "../../view/art/faces";
import { ADRIFT_FRAMES, eyesFrame, eyesShift } from "../../view/art/pilot_art";
import {
  GOLDEN_ANGLE,
  blinkShown,
  bobShare,
} from "../../view/effects/flourish";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { type FieldEvent, wrappedBetween } from "../../view/field/frame";
import {
  type TowLine,
  createTowLine,
  towLineAt,
  towLineWidth,
} from "../../view/field/tow_line";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * Holds the parts of one of the crew in its bubble, each drawn again past
 * an edge it reaches across: the bubble, the pilot, white, which its ink
 * tints, and its eyes.
 */
export interface Bubbled {
  readonly bubble: Copies;
  readonly pilot: Copies;
  readonly eyes: Copies;
  /** All three, back to front. */
  readonly parts: readonly Copies[];
}

/**
 * Describes how one of the crew in its bubble is drawn, written each frame:
 * where, the way it looks, and its pilot, its bubble's size and its frames.
 */
interface Drawing {
  readonly at: Moving;
  readonly look: Moving;
  pilot: Pilot;
  /** Its bubble's radius, in field units. */
  radius: number;
  /** Its fur's frame, and its eyes'. */
  fur: string;
  eyes: string;
}

/**
 * Draws the crew on the field beside the pilot at the controls, under the
 * pod: the line in tow, from the hook at the pod's tail through each who
 * rides in tow, as one chain across the wrap, in the color of the bubbles'
 * rims; each in tow in its bubble, in its ink, its face and look as the
 * view gives them (`towFaceOf()`, `towLookOf()`), from the field's events
 * it hears (`hear()`); and each knocked loose, swelling to a stray's size
 * as it flies off, wide eyed and puffed, then pleading, its eyes on the
 * pod, blinking through its last seconds. Each pilot bobs in its bubble
 * where motion is welcome, and each part is drawn again past an edge it
 * reaches across.
 */
export class TowPainter implements Painter {
  /** The line in tow, drawn again each frame. */
  readonly line: GameObjects.Graphics;
  /** One for each place in the line in tow, the first nearest the pod. */
  readonly inTow: readonly Bubbled[];
  /** One for each slot of the crew knocked loose, as the field's. */
  readonly loose: readonly Bubbled[];

  /** When what the crew answers last happened on the field. */
  private readonly moments = createFaceMoments();
  /** Where the line in tow is drawn, written each frame. */
  private readonly drawnLine: TowLine = createTowLine();
  /** Where a stretch of the line starts and ends on the canvas, written each frame. */
  private readonly from: Moving = { x: 0, y: 0 };
  private readonly to: Moving = { x: 0, y: 0 };
  /** How far a pilot's eyes move the way it looks, written each frame. */
  private readonly shift: Moving = { x: 0, y: 0 };
  private readonly drawing: Drawing = {
    at: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    pilot: 0,
    radius: TOW_RADIUS,
    fur: ADRIFT_FRAMES.fur,
    eyes: eyesFrame("adrift", "rest"),
  };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.line = scene.add.graphics();
    layer.add(this.line);
    this.inTow = Array.from({ length: MOST_CREW - 1 }, () =>
      bubbled(scene, layer),
    );
    this.loose = Array.from({ length: MOST_CREW - 1 }, () =>
      bubbled(scene, layer),
    );
  }

  /**
   * Notes what an event means for the faces of those in tow, as the scene
   * plays it, at the field's step as it now stands, whether or not motion
   * is welcome.
   */
  hear(event: Readonly<FieldEvent>, steps: number): void {
    hearFace(this.moments, event, steps);
  }

  /** Forgets the last field's moments, as a new field starts. */
  start(): void {
    Object.assign(this.moments, createFaceMoments());
  }

  /** Draws the line in tow, each who rides it, and each knocked loose, as the frame has them. */
  draw(context: Readonly<PaintContext>): void {
    this.drawLine(context);
    this.drawInTow(context);
    this.drawLoose(context);
  }

  /** Draws the line in tow, and again past each edge it reaches across, or nothing with no one in tow. */
  private drawLine(context: Readonly<PaintContext>): void {
    const { field, shipDrawn, alpha, metrics, palette } = context;
    const line = towLineAt(field, shipDrawn, alpha, this.drawnLine);
    const graphics = this.line.clear();
    if (line.count < 2) return;
    graphics.lineStyle(towLineWidth(metrics), palette.rim);
    const { x: across, y: down } = line.shift;
    this.strokeLine(line, 0, 0, metrics);
    if (across !== 0) this.strokeLine(line, across, 0, metrics);
    if (down !== 0) this.strokeLine(line, 0, down, metrics);
    if (across !== 0 && down !== 0) {
      this.strokeLine(line, across, down, metrics);
    }
  }

  /** Strokes the line in tow, a stretch at a time, moved by an offset on the field. */
  private strokeLine(
    line: TowLine,
    offsetX: number,
    offsetY: number,
    metrics: FieldMetrics,
  ): void {
    for (let i = 1; i < line.count; i++) {
      const ahead = line.at[i - 1];
      const at = line.at[i];
      if (!ahead || !at) return;
      toCanvas(metrics, ahead.x + offsetX, ahead.y + offsetY, this.from);
      toCanvas(metrics, at.x + offsetX, at.y + offsetY, this.to);
      this.line.lineBetween(this.from.x, this.from.y, this.to.x, this.to.y);
    }
  }

  /** Draws each who rides in tow in its bubble, and hides each place no one rides. */
  private drawInTow(context: Readonly<PaintContext>): void {
    const { field, alpha, motion } = context;
    const { drawing } = this;
    for (let i = 0; i < this.inTow.length; i++) {
      const images = this.inTow[i];
      const pilot = field.crew.tow[i];
      const link = field.tow[i];
      if (!images) continue;
      if (pilot === undefined || !link || !field.ship) {
        hideAll(images);
        continue;
      }
      drawing.pilot = pilot;
      drawing.radius = TOW_RADIUS;
      drawing.fur = ADRIFT_FRAMES.fur;
      const face = towFaceOf(field, i, this.moments, motion);
      drawing.eyes = eyesFrame("adrift", face);
      towLookOf(field, i, drawing.look);
      wrappedBetween(link, alpha, field.torus, drawing.at);
      this.drawBubbled(images, drawing, context);
    }
  }

  /**
   * Draws each knocked loose in its bubble, swelling as it flies off and
   * blinking through its last seconds, and hides each free slot.
   */
  private drawLoose(context: Readonly<PaintContext>): void {
    const { field, alpha, shipDrawn, now, motion } = context;
    const { steps, torus } = field;
    const { drawing } = this;
    for (let i = 0; i < this.loose.length; i++) {
      const images = this.loose[i];
      const loose = field.loose[i];
      if (!images) continue;
      if (
        !loose?.live ||
        (looseBlinks(loose, steps) && !blinkShown(now / 1000))
      ) {
        hideAll(images);
        continue;
      }
      drawing.pilot = loose.pilot;
      drawing.radius = looseRadius(loose, steps);
      drawing.fur = isLooseFrightened(loose, steps)
        ? ADRIFT_FRAMES.puffed
        : ADRIFT_FRAMES.fur;
      drawing.eyes = eyesFrame("adrift", looseFaceOf(loose, steps, motion));
      wrappedBetween(loose, alpha, torus, drawing.at);
      looseLookOf(loose, drawing.at, shipDrawn, torus, drawing.look);
      this.drawBubbled(images, drawing, context);
    }
  }

  /**
   * Draws one of the crew in its bubble as a drawing says, its pilot low in
   * it, bobbing where motion is welcome, each pilot's bob its own, so it
   * bobs on as it is knocked loose or caught again.
   */
  private drawBubbled(
    images: Bubbled,
    drawing: Readonly<Drawing>,
    { field, metrics, palette, zoom, now, motion }: Readonly<PaintContext>,
  ): void {
    const { at } = drawing;
    const { torus } = field;
    const scale = drawing.radius / STRAY_RADIUS;
    const reach = drawing.radius * BUBBLE_REACH;
    const bob = bobShare(now / 1000, drawing.pilot * GOLDEN_ANGLE, motion);
    const sits = at.y + (STRAY_DROP + bob) * drawing.radius;
    eyesShift(drawing.look, "adrift", this.shift);
    images.pilot.setFrame(drawing.fur);
    images.eyes.setFrame(drawing.eyes);
    images.pilot.setTint(palette.pilots[drawing.pilot] ?? palette.accent);
    for (const part of images.parts) part.setScale(zoom * scale);
    images.bubble.show(at.x, at.y, reach, metrics, torus);
    images.pilot.show(at.x, sits, reach, metrics, torus);
    images.eyes.show(
      at.x + this.shift.x * scale,
      sits + this.shift.y * scale,
      reach,
      metrics,
      torus,
    );
  }
}

/** Returns the parts of one of the crew in its bubble, made in a layer, hidden till drawn. */
function bubbled(scene: Scene, layer: GameObjects.Layer): Bubbled {
  const bubble = new Copies(scene, layer, FRAMES.bubble);
  const pilot = new Copies(scene, layer, ADRIFT_FRAMES.fur);
  const eyes = new Copies(scene, layer, eyesFrame("adrift", "rest"));
  return { bubble, pilot, eyes, parts: [bubble, pilot, eyes] };
}

/** Hides every part of one of the crew in its bubble. */
function hideAll(images: Bubbled): void {
  for (const part of images.parts) part.hide();
}
