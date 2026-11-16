import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { type Moving, type Torus, copyOffsets } from "../../rules/torus";
import type { WrittenHalo } from "../../view/art/energy";
import { around } from "../../view/art/rocks/space";
import type { BeltPalette } from "../../view/colors/palette";
import {
  BLAST_LIGHT,
  BLAST_LINES,
  type BlastDisc,
  type BlastInks,
  EMBER_LOOK,
  type Ember,
  type EmberShown,
  FLASH_GLOW,
  STILL_RING,
  blastBand,
  blastDiscAt,
  blastFlashed,
  blastInks,
  blastLightShare,
  blastLineAlpha,
  blastRadiusOf,
  blastRingAt,
  blastShows,
  blastSwept,
  emberAt,
  embersOf,
  sweptAlpha,
} from "../../view/effects/blast";
import type { Drawn, FieldEvent } from "../../view/field/frame";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { COPY_SHARES } from "./copy_shares";
import type { HaloPainter } from "./halo_painter";
import type { PaintContext, Painter } from "./painter";
import { fillRound, strokeRound } from "./rounds";

/**
 * How many blasts may show at once: as many as a wave sets off in a chain
 * within a blast's time, each 90 ms after the last, as a ring of eight
 * volatile rocks does, and more.
 */
export const MOST_BLASTS = 12;

/**
 * How far past its reach a blast draws, in field units: its ring's soft
 * outside, at its widest as it starts, and its farthest embers.
 */
const OUTSIDE = 2;

/** Describes a blast showing: where it went off, its rock's radius, its reach, its embers, and whether it flashed. */
interface Blast extends Playing {
  radius: number;
  reach: number;
  embers: readonly Ember[];
  flashed: boolean;
}

/**
 * Draws each volatile rock's blast, and each set piece's vent, as the
 * view's `blast.ts` says, on both
 * sides of an edge it reaches across: where motion is welcome, the ground
 * its ring has swept faintly lit, its ring's soft outside in two bands, its
 * middle in the rock's ink and its hot inner edge, its flash's disc and
 * glow, through the halo painter, which draws before it each frame, and its
 * embers; and its light, which lights the rocks near it through their
 * normal maps, and another past the edge it lies nearest, should its light
 * reach across it. A blast handed no flash, as the field flashed too
 * lately, shows neither its flash nor its light. Where motion isn't
 * welcome, it shows one still ring at its reach for its time. Its rounds
 * are filled as polygons, and its rings as bands, through `rounds.ts`.
 */
export class BlastPainter implements Painter {
  /** Every blast showing, drawn again each frame. */
  readonly graphics: GameObjects.Graphics;
  /** The light the newest blast that flashed lights the rocks near it with, hidden between blasts. */
  readonly light: GameObjects.Light;
  /** The light it lights the rocks past the edge it lies nearest with, hidden unless its light reaches across it. */
  readonly beyond: GameObjects.Light;

  private readonly blasts = new Turns<Blast>(MOST_BLASTS, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    radius: 0,
    reach: 0,
    embers: [],
    flashed: false,
  }));
  /** The palette the inks were last mixed for, or null before the first frame. */
  private inked: BeltPalette | null = null;
  /** The colors the blasts are drawn in, in that palette. */
  private inks: BlastInks | null = null;
  /** How far a blast's copies past the edges are from it on the field, written each frame. */
  private readonly offsets: Moving = { x: 0, y: 0 };
  /** Where a copy's middle is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** An ember as it flies, written for each. */
  private readonly ember: EmberShown = {
    head: 0,
    tail: 0,
    size: 0,
    alpha: 0,
    tone: 0,
  };
  /** A flash's disc, written for each. */
  private readonly disc: BlastDisc = { reach: 0, alpha: 0 };
  /** Where a flash glows on the field, written for each. */
  private readonly glowAt: Drawn = { x: 0, y: 0, angle: 0 };
  /** A flash's glow, written for each. */
  private readonly glow: WrittenHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };

  /** Makes the blasts' drawing in a layer and their two lights, and reserves the halo painter's image for a flash's glow. */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly halos: HaloPainter,
  ) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
    this.light = scene.lights.addLight(0, 0, 1, 0xffffff, 0);
    this.light.setVisible(false);
    this.beyond = scene.lights.addLight(0, 0, 1, 0xffffff, 0);
    this.beyond.setVisible(false);
    // Only a blast that flashed glows, and the field's flashes are kept
    // further apart than a flash glows, so one glow shows at a time.
    halos.reserve(1);
  }

  /**
   * Sets a blast off where a volatile rock went off, out to its reach, its
   * embers the shape its serial picks, with its flash and light or without,
   * or where a set piece vented, from a small rock's heart.
   *
   * @throws {RangeError} For an event that names no rock's size.
   */
  blast(event: Readonly<FieldEvent>, flashed: boolean, now: number): void {
    const radius = blastRadiusOf(event);
    const blast = this.blasts.play(event.x, event.y, now);
    blast.radius = radius;
    blast.reach = event.reach;
    blast.embers = embersOf(event.serial);
    blast.flashed = flashed;
  }

  /** Draws each blast showing at the scene's time, and lights the rocks near the newest that flashed. */
  draw(context: Readonly<PaintContext>): void {
    const { palette, now, motion } = context;
    const inks = this.inksFor(palette);
    this.graphics.clear();
    let lit: Blast | null = null;
    for (const blast of this.blasts.all) {
      const since = now - blast.at;
      if (!blastShows(since)) continue;
      this.drawCopies(blast, since, inks, context);
      if (motion && blast.flashed) {
        this.glowFlash(blast, since, inks, context);
        if (lit === null || blast.at > lit.at) lit = blast;
      }
    }
    this.lightUp(lit, context);
  }

  /** Puts every blast out, and its lights, as a new field starts. */
  start(): void {
    for (const blast of this.blasts.all) blast.at = -Infinity;
    this.light.setVisible(false);
    this.beyond.setVisible(false);
  }

  /** Returns the colors the blasts are drawn in, mixed again, and the lights colored, only for a new palette. */
  private inksFor(palette: BeltPalette): BlastInks {
    if (this.inks === null || palette !== this.inked) {
      this.inked = palette;
      this.inks = blastInks(palette);
      this.light.setColor(this.inks.soft);
      this.beyond.setColor(this.inks.soft);
    }
    return this.inks;
  }

  /**
   * Draws a blast a time after it went off, moving or still as motion is
   * welcome or not, on both sides of an edge it reaches across: as far as
   * its soft outside or its embers reach, or its still ring.
   */
  private drawCopies(
    blast: Readonly<Blast>,
    since: number,
    inks: BlastInks,
    { field, metrics, motion, palette }: Readonly<PaintContext>,
  ): void {
    const reach = blast.reach + (motion ? OUTSIDE : STILL_RING.width);
    const { x: across, y: down } = copyOffsets(
      blast.x,
      blast.y,
      reach,
      field.torus,
      this.offsets,
    );
    for (const [acrossShare, downShare] of COPY_SHARES) {
      if (acrossShare === 1 && across === 0) continue;
      if (downShare === 1 && down === 0) continue;
      toCanvas(
        metrics,
        blast.x + acrossShare * across,
        blast.y + downShare * down,
        this.at,
      );
      if (motion) this.drawMoving(blast, since, inks, metrics, palette.mode);
      else this.drawStill(blast, inks, metrics);
    }
  }

  /** Draws a blast's still ring at its reach about the copy's middle. */
  private drawStill(
    blast: Readonly<Blast>,
    inks: BlastInks,
    { unit, pixelRatio }: FieldMetrics,
  ): void {
    const { x, y } = this.at;
    this.graphics.fillStyle(inks.ink, STILL_RING.alpha);
    strokeRound(
      this.graphics,
      x,
      y,
      blast.reach * unit,
      Math.max(STILL_RING.least, STILL_RING.width * unit),
      pixelRatio,
    );
  }

  /**
   * Draws a blast a time after it went off about the copy's middle: the
   * ground its ring has swept, the ring's lines, its flash's disc, and its
   * embers.
   */
  private drawMoving(
    blast: Readonly<Blast>,
    since: number,
    inks: BlastInks,
    { unit, pixelRatio }: FieldMetrics,
    mode: BeltPalette["mode"],
  ): void {
    const { graphics } = this;
    const { x, y } = this.at;
    const swept = blastSwept(since);
    if (swept < 1) {
      const ring = blastRingAt(since, blast.radius, blast.reach) * unit;
      const band = blastBand(swept) * unit;
      graphics.fillStyle(inks.ink, sweptAlpha(swept));
      fillRound(graphics, x, y, ring, pixelRatio);
      for (const line of BLAST_LINES) {
        graphics.fillStyle(inks[line.tone], blastLineAlpha(line, swept, mode));
        strokeRound(
          graphics,
          x,
          y,
          Math.max(0, ring + line.out * band),
          Math.max(1, line.width * band),
          pixelRatio,
        );
      }
    }
    const disc = blast.flashed ? blastDiscAt(since, this.disc) : null;
    if (disc !== null) {
      graphics.fillStyle(inks.hot, disc.alpha);
      fillRound(graphics, x, y, disc.reach * blast.radius * unit, pixelRatio);
    }
    for (const ember of blast.embers) {
      const shown = emberAt(
        ember,
        since,
        blast.radius,
        blast.reach,
        this.ember,
      );
      if (shown === null) continue;
      const cos = Math.cos(ember.angle);
      const sin = Math.sin(ember.angle);
      const headX = x + cos * shown.head * unit;
      const headY = y + sin * shown.head * unit;
      graphics
        .lineStyle(
          Math.max(EMBER_LOOK.leastStreak, EMBER_LOOK.streak * unit),
          inks.ember,
          EMBER_LOOK.streakAlpha * shown.alpha,
        )
        .lineBetween(
          x + cos * shown.tail * unit,
          y + sin * shown.tail * unit,
          headX,
          headY,
        )
        .fillStyle(around(inks.emberHeads, shown.tone), shown.alpha);
      fillRound(
        graphics,
        headX,
        headY,
        Math.max(EMBER_LOOK.leastHead, shown.size * unit),
        pixelRatio,
      );
    }
  }

  /** Glows a blast's flash, round, in its soft light, through the halo painter, fading as the flash does. */
  private glowFlash(
    blast: Readonly<Blast>,
    since: number,
    inks: BlastInks,
    context: Readonly<PaintContext>,
  ): void {
    const flashed = blastFlashed(since);
    if (flashed >= 1) return;
    const { glow, glowAt } = this;
    glow.along = FLASH_GLOW * blast.radius;
    glow.across = glow.along;
    glow.strength = 1 - flashed;
    glowAt.x = blast.x;
    glowAt.y = blast.y;
    this.halos.glow(glow, inks.soft, glowAt, context);
  }

  /**
   * Lights the rocks near a blast with its soft light, as far as a little
   * past its reach, fading as its ring sweeps out, and those past the edge
   * it lies nearest should its light reach across it, or puts the lights
   * out for none. Its copies past another edge, in a corner, go unlit, as
   * the scene's lights are few.
   */
  private lightUp(
    blast: Readonly<Blast> | null,
    { field, metrics, now }: Readonly<PaintContext>,
  ): void {
    const share =
      blast === null ? 0 : blastLightShare(blastSwept(now - blast.at));
    if (blast === null || share <= 0) {
      this.light.setVisible(false);
      this.beyond.setVisible(false);
      return;
    }
    this.lightAt(this.light, blast, blast.x, blast.y, share, metrics);
    const { torus } = field;
    const { x: across, y: down } = copyOffsets(
      blast.x,
      blast.y,
      BLAST_LIGHT.reach * blast.reach,
      torus,
      this.offsets,
    );
    if (across === 0 && down === 0) {
      this.beyond.setVisible(false);
      return;
    }
    const isAcross =
      down === 0 || (across !== 0 && isNearerSides(blast, torus));
    this.lightAt(
      this.beyond,
      blast,
      isAcross ? blast.x + across : blast.x,
      isAcross ? blast.y : blast.y + down,
      share,
      metrics,
    );
  }

  /** Stands one of a blast's lights at a place on the field, lighting as far as a little past its reach, as strongly as its share says. */
  private lightAt(
    light: GameObjects.Light,
    blast: Readonly<Blast>,
    x: number,
    y: number,
    share: number,
    metrics: FieldMetrics,
  ): void {
    const at = toCanvas(metrics, x, y, this.at);
    const reach = blast.reach * metrics.unit;
    light.x = at.x;
    light.y = at.y;
    light.z = BLAST_LIGHT.height * reach;
    light.radius = BLAST_LIGHT.reach * reach;
    light.intensity = BLAST_LIGHT.strength * share;
    light.setVisible(true);
  }
}

/** Returns whether a place on a field lies nearer its sides than its top and its bottom. */
export function isNearerSides(
  { x, y }: Readonly<Moving>,
  { width, height }: Readonly<Torus>,
): boolean {
  return Math.min(x, width - x) <= Math.min(y, height - y);
}
