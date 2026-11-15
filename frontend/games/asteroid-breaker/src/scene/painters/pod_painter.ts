import type { GameObjects, Scene } from "phaser";
import { isGuarded, rechargeShare, thrustOf } from "../../rules/ship/ship";
import type { Pilot } from "../../rules/ship/pilots";
import type { Moving } from "../../rules/torus";
import {
  createFaceMoments,
  easeLean,
  faceOf,
  hearFace,
  liftOf,
  lookOf,
  pushOf,
  watchFace,
} from "../../view/art/faces";
import {
  SPARK_HALO_ALPHA,
  eyesFrame,
  eyesShift,
  furFrame,
  isSparking,
  leanStep,
  sparkCore,
  sparksFrames,
} from "../../view/art/pilot_art";
import {
  ENGINES_BEHIND,
  FLAME_REACH,
  POD_ALPHAS,
  POD_FRAMES,
  POD_REACH,
  STREAKS_REACH,
  flameFlickerAt,
  flameFrame,
  flameShare,
  gaugeFrame,
  rimFlashAlpha,
  rimFlashScale,
} from "../../view/art/pod_art";
import { blinkShown } from "../../view/effects/flourish";
import type { FieldEvent } from "../../view/field/frame";
import { ROCK_ATLAS } from "../atlas";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the pod in play, each part on both sides of an edge it reaches
 * across: its hull, lit, turned as it heads, its flame behind its engines
 * as long as its thrust, and its streaks in a dash; and, upright about its
 * middle, its canopy's glass, its pilot in its ink, its fur lifted by
 * static and leaning from a push, its face and look as the field shows
 * them (`faceOf()`), the rim, filling as the dash recharges and flashing
 * once as it comes charged, the glint, the Shield's shell over its wash,
 * and the guard's dashed ring, blinking, while nothing can touch it.
 */
export class PodPainter implements Painter {
  readonly streaks: Copies;
  readonly flame: Copies;
  readonly wash: Copies;
  readonly hull: Copies;
  readonly glass: Copies;
  readonly fur: Copies;
  readonly sparkHalos: Copies;
  readonly sparkCores: Copies;
  readonly eyes: Copies;
  readonly rim: Copies;
  readonly flash: Copies;
  readonly glint: Copies;
  readonly shield: Copies;
  readonly guard: Copies;

  /** Every part, back to front. */
  private readonly parts: readonly Copies[];
  /** The parts turned the way the pilot's fur leans: the fur and static's sparks. */
  private readonly furred: readonly Copies[];
  /** When what the pilot's face answers last happened on the field. */
  private readonly moments = createFaceMoments();
  /** The push on the pilot's fur, and its lean, eased toward it, written each frame. */
  private readonly push: Moving = { x: 0, y: 0 };
  private readonly lean: Moving = { x: 0, y: 0 };
  /** The way the pilot looks, and how far its eyes move for it, written each frame. */
  private readonly look: Moving = { x: 0, y: 0 };
  private readonly shift: Moving = { x: 0, y: 0 };
  /** The scene's time as the pod was last drawn, or null before it first is. */
  private drawnAt: number | null = null;
  /** Whether the dash was charged as the pod was last drawn. */
  private charged = true;
  /** The scene's time the dash last came charged at, which the rim flashes from. */
  private chargedAt = -Infinity;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.streaks = new Copies(scene, layer, POD_FRAMES.streaks);
    this.streaks.setAlpha(POD_ALPHAS.streaks);
    this.flame = new Copies(scene, layer, flameFrame(0));
    this.wash = new Copies(scene, layer, POD_FRAMES.wash);
    this.hull = new Copies(scene, layer, POD_FRAMES.hull, ROCK_ATLAS);
    for (const image of this.hull.images) image.setLighting(true);
    this.glass = new Copies(scene, layer, POD_FRAMES.glass);
    this.fur = new Copies(scene, layer, furFrame(0, 0));
    this.sparkHalos = new Copies(scene, layer, sparksFrames(0).halo);
    this.sparkHalos.setAlpha(SPARK_HALO_ALPHA);
    this.sparkCores = new Copies(scene, layer, sparksFrames(0).core);
    this.eyes = new Copies(scene, layer, eyesFrame("pod", "rest"));
    this.rim = new Copies(scene, layer, POD_FRAMES.rim);
    this.flash = new Copies(scene, layer, POD_FRAMES.flash);
    this.glint = new Copies(scene, layer, POD_FRAMES.glint);
    this.shield = new Copies(scene, layer, POD_FRAMES.shield);
    this.guard = new Copies(scene, layer, POD_FRAMES.guard);
    this.furred = [this.fur, this.sparkHalos, this.sparkCores];
    this.parts = [
      this.streaks,
      this.flame,
      this.wash,
      this.hull,
      this.glass,
      this.fur,
      this.sparkHalos,
      this.sparkCores,
      this.eyes,
      this.rim,
      this.flash,
      this.glint,
      this.shield,
      this.guard,
    ];
  }

  /**
   * Notes what an event means for the pilot's face, as the scene plays it,
   * at the field's step as it now stands, whether or not motion is welcome.
   */
  hear(event: Readonly<FieldEvent>, steps: number): void {
    hearFace(this.moments, event, steps);
  }

  /** Forgets the last field's moments, lean and charge, as a new field starts. */
  start(): void {
    Object.assign(this.moments, createFaceMoments());
    this.lean.x = 0;
    this.lean.y = 0;
    this.charged = true;
    this.chargedAt = -Infinity;
  }

  /**
   * Draws the pod between its last place and turn and its next, or nothing
   * between one pod and the next.
   */
  draw(context: Readonly<PaintContext>): void {
    const { field, shipDrawn, palette, zoom, now } = context;
    const { ship } = field;
    const { pilot } = field.crew;
    const elapsed = now - (this.drawnAt ?? now);
    this.drawnAt = now;
    if (!ship || !shipDrawn || pilot === null) {
      for (const part of this.parts) part.hide();
      // The next pod comes charged, its pilot's fur at rest.
      this.charged = true;
      this.lean.x = 0;
      this.lean.y = 0;
      return;
    }
    watchFace(this.moments, field);
    const { angle } = shipDrawn;
    // A cleared wave stands still, its pod's flame out and its dash over.
    const { cleared } = field;
    for (const part of this.parts) part.setScale(zoom);
    this.showIf(
      this.streaks,
      ship.dashSteps > 0 && !cleared,
      context,
      STREAKS_REACH,
    );
    this.streaks.setRotation(angle);
    this.drawFlame(context, cleared ? 0 : thrustOf(ship));
    this.wash.setAlpha(POD_ALPHAS.wash[palette.mode]);
    this.showIf(this.wash, field.shielded, context);
    this.hull.setRotation(angle);
    this.showIf(this.hull, true, context);
    this.showIf(this.glass, true, context);
    this.drawPilot(context, pilot, elapsed);
    this.drawRim(context, rechargeShare(ship));
    this.glint.setAlpha(POD_ALPHAS.glint[palette.mode]);
    this.showIf(this.glint, true, context);
    this.showIf(this.shield, field.shielded, context);
    this.guard.setAlpha(blinkShown(now / 1000) ? 1 : POD_ALPHAS.guardBetween);
    this.showIf(this.guard, isGuarded(ship), context);
  }

  /**
   * Draws the pilot upright in the canopy, in its ink: its fur lifted by
   * static and leaning from the push on it, eased over the time since the
   * last frame, in milliseconds, turned the way it leans; static's sparks
   * about it on end; and its eyes at the face the field shows, moved the
   * way it looks.
   */
  private drawPilot(
    context: Readonly<PaintContext>,
    pilot: Pilot,
    elapsed: number,
  ): void {
    const { field, shipDrawn, metrics, palette, motion } = context;
    if (!shipDrawn) return;
    const { x, y, angle } = shipDrawn;
    const ink = palette.pilots[pilot] ?? palette.accent;
    pushOf(field, angle, this.push);
    easeLean(this.lean, this.push, elapsed, motion);
    const push = Math.hypot(this.lean.x, this.lean.y);
    const turned =
      leanStep(push) > 0 ? Math.atan2(this.lean.y, this.lean.x) : 0;
    const lift = liftOf(field);
    const sparks = sparksFrames(push);
    const sparking = isSparking(lift);
    this.fur.setFrame(furFrame(lift, push));
    this.fur.setTint(ink);
    this.sparkHalos.setFrame(sparks.halo);
    this.sparkHalos.setTint(ink);
    this.sparkCores.setFrame(sparks.core);
    this.sparkCores.setTint(sparkCore(ink, palette));
    for (const part of this.furred) part.setRotation(turned);
    this.showIf(this.fur, true, context);
    this.showIf(this.sparkHalos, sparking, context);
    this.showIf(this.sparkCores, sparking, context);
    this.eyes.setFrame(eyesFrame("pod", faceOf(field, this.moments, motion)));
    eyesShift(lookOf(field, angle, this.look), "pod", this.shift);
    this.eyes.show(
      x + this.shift.x,
      y + this.shift.y,
      POD_REACH,
      metrics,
      field.torus,
    );
  }

  /** Shows a part about the pod's middle, on both sides of an edge it reaches across, or hides it. */
  private showIf(
    part: Copies,
    shown: boolean,
    { field, shipDrawn, metrics }: Readonly<PaintContext>,
    reach = POD_REACH,
  ): void {
    if (!shown || !shipDrawn) {
      part.hide();
      return;
    }
    part.show(shipDrawn.x, shipDrawn.y, reach, metrics, field.torus);
  }

  /** Draws the flame behind the engines as long as the thrust, flickering, or hides it with no thrust. */
  private drawFlame(
    { field, shipDrawn, metrics, zoom, motion }: Readonly<PaintContext>,
    thrust: number,
  ): void {
    if (thrust <= 0 || !shipDrawn) {
      this.flame.hide();
      return;
    }
    const { x, y, angle } = shipDrawn;
    this.flame.setFrame(flameFrame(flameFlickerAt(field.steps, motion)));
    this.flame.setRotation(angle);
    this.flame.setScale(zoom * flameShare(thrust), zoom);
    this.flame.show(
      x - Math.cos(angle) * ENGINES_BEHIND,
      y - Math.sin(angle) * ENGINES_BEHIND,
      FLAME_REACH,
      metrics,
      field.torus,
    );
  }

  /**
   * Draws the rim: its gauge while the dash recharges, filling clockwise
   * from the top, then the rim charged, flashing once as it comes charged,
   * the flash fading in the scene's time, as a flourish does, so one under
   * way as the wave is cleared still fades.
   */
  private drawRim(
    { field, shipDrawn, metrics, zoom, now, motion }: Readonly<PaintContext>,
    share: number,
  ): void {
    if (!shipDrawn) return;
    const charged = share >= 1;
    if (charged && !this.charged) this.chargedAt = now;
    this.charged = charged;
    const { x, y } = shipDrawn;
    this.rim.setFrame(charged ? POD_FRAMES.rim : gaugeFrame(share));
    this.rim.show(x, y, POD_REACH, metrics, field.torus);
    const since = now - this.chargedAt;
    const alpha = rimFlashAlpha(since);
    if (alpha <= 0) {
      this.flash.hide();
      return;
    }
    this.flash.setAlpha(alpha);
    this.flash.setScale(zoom * rimFlashScale(since, motion));
    this.flash.show(x, y, POD_REACH, metrics, field.torus);
  }
}
