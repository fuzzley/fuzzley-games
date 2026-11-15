import { type Playing, Turns } from "@fz/core/turns";
import type { Point } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import { type Moving, copyOffsets } from "../../rules/torus";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { WrittenHalo } from "../../view/art/energy";
import type { BeltPalette } from "../../view/colors/palette";
import {
  type BoulderGlow,
  type BoulderInks,
  CRACK_LINES,
  type CrackLine,
  THROWN_RING,
  boulderGlowAt,
  boulderInks,
  boulderShows,
  crackFlare,
  crackLineAlpha,
  cracksOf,
  thrownReach,
  thrownShare,
} from "../../view/effects/boulder";
import {
  type Drawn,
  type FieldEvent,
  rockSizeOf,
} from "../../view/field/frame";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { COPY_SHARES } from "./copy_shares";
import type { HaloPainter } from "./halo_painter";
import type { PaintContext, Painter } from "./painter";
import { strokeRound } from "./rounds";

/** How many boulders' breaks may show at once, each with its glow. */
export const MOST_BOULDERS = 3;

/** How far from its middle a boulder's break draws, in its radii: its thrown ring at its widest, with its width. */
const BOULDER_REACH = 2.2;

/** Describes a boulder's break showing: where it broke, its radius, and the cracks it splits along. */
interface Boulder extends Playing {
  radius: number;
  cracks: readonly (readonly Point[])[];
}

/**
 * Draws each boulder's break in its three beats, as the view's `boulder.ts`
 * says, on both sides of an edge it reaches across, on one `Graphics`
 * drawn again each frame, over the break every rock has: its cracks flaring
 * from its middle to its rim while the field holds still, each a soft line
 * in its glow, a line in the core and a hot line down its middle, fading
 * once the field moves on; its glow, through the halo painter, which draws
 * before it each frame; and a ring thrown out from it as its pieces fly.
 * The scene plays it only where motion is welcome.
 */
export class BoulderPainter implements Painter {
  /** Every boulder's break showing, drawn again each frame. */
  readonly graphics: GameObjects.Graphics;

  private readonly boulders = new Turns<Boulder>(MOST_BOULDERS, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    radius: 0,
    cracks: [],
  }));
  /** The palette the inks were last mixed for, or null before the first frame. */
  private inked: BeltPalette | null = null;
  /** The colors the breaks are drawn in, in that palette. */
  private inks: BoulderInks | null = null;
  /** How far a break's copies past the edges are from it on the field, written each frame. */
  private readonly offsets: Moving = { x: 0, y: 0 };
  /** Where a copy's middle is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** A boulder's glow, written for each. */
  private readonly glowShown: BoulderGlow = { reach: 0, strength: 0 };
  /** Where a boulder glows on the field, written for each. */
  private readonly glowAt: Drawn = { x: 0, y: 0, angle: 0 };
  /** A boulder's glow as a halo, written for each. */
  private readonly glow: WrittenHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };

  /** Makes the breaks' drawing in a layer, and reserves the halo painter's images for their glows. */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly halos: HaloPainter,
  ) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
    halos.reserve(MOST_BOULDERS);
  }

  /**
   * Breaks a boulder where it broke, along the cracks its serial picks.
   *
   * @throws {RangeError} For an event that names no rock's size.
   */
  breakBoulder(event: Readonly<FieldEvent>, now: number): void {
    const radius = ROCK_RADIUS[rockSizeOf(event)];
    const boulder = this.boulders.play(event.x, event.y, now);
    boulder.radius = radius;
    boulder.cracks = cracksOf(event.serial);
  }

  /** Draws each boulder's break showing at the scene's time, and its glow. */
  draw(context: Readonly<PaintContext>): void {
    const { palette, now, field, metrics } = context;
    const inks = this.inksFor(palette);
    this.graphics.clear();
    for (const boulder of this.boulders.all) {
      const since = now - boulder.at;
      if (!boulderShows(since)) continue;
      const { x: across, y: down } = copyOffsets(
        boulder.x,
        boulder.y,
        BOULDER_REACH * boulder.radius,
        field.torus,
        this.offsets,
      );
      for (const [acrossShare, downShare] of COPY_SHARES) {
        if (acrossShare === 1 && across === 0) continue;
        if (downShare === 1 && down === 0) continue;
        toCanvas(
          metrics,
          boulder.x + acrossShare * across,
          boulder.y + downShare * down,
          this.at,
        );
        this.drawCopy(boulder, since, inks, metrics);
      }
      this.glowAbout(boulder, since, inks, context);
    }
  }

  /** Puts every boulder's break out, as a new field starts. */
  start(): void {
    for (const boulder of this.boulders.all) boulder.at = -Infinity;
  }

  /** Returns the colors the breaks are drawn in, mixed again only for a new palette. */
  private inksFor(palette: BeltPalette): BoulderInks {
    if (this.inks === null || palette !== this.inked) {
      this.inked = palette;
      this.inks = boulderInks(palette);
    }
    return this.inks;
  }

  /** Draws one of a boulder's break's copies about the copy's middle: its cracks and its thrown ring. */
  private drawCopy(
    boulder: Readonly<Boulder>,
    since: number,
    inks: BoulderInks,
    metrics: FieldMetrics,
  ): void {
    for (const line of CRACK_LINES) {
      const alpha = crackLineAlpha(line, since);
      if (alpha > 0)
        this.strokeCracks(boulder, line, alpha, since, inks, metrics);
    }
    const thrown = thrownShare(since);
    if (thrown === null) return;
    const { x, y } = this.at;
    this.graphics.fillStyle(inks.core, THROWN_RING.alpha * (1 - thrown));
    strokeRound(
      this.graphics,
      x,
      y,
      thrownReach(thrown) * boulder.radius * metrics.unit,
      Math.max(
        THROWN_RING.least,
        THROWN_RING.width * metrics.unit * (1 - thrown),
      ),
      metrics.pixelRatio,
    );
  }

  /** Strokes a boulder's cracks in one of their lines about the copy's middle, each from near its middle as far toward its rim as they have run. */
  private strokeCracks(
    boulder: Readonly<Boulder>,
    { width, least, tone }: CrackLine,
    alpha: number,
    since: number,
    inks: BoulderInks,
    { unit }: FieldMetrics,
  ): void {
    const { at, graphics } = this;
    const radius = boulder.radius * unit;
    const flare = crackFlare(since);
    graphics.lineStyle(Math.max(least, width * radius), inks[tone], alpha);
    for (const crack of boulder.cracks) {
      const [start] = crack;
      if (start === undefined) continue;
      graphics.beginPath();
      let first = true;
      for (const { x, y } of crack) {
        const pointX = at.x + (start.x + (x - start.x) * flare) * radius;
        const pointY = at.y + (start.y + (y - start.y) * flare) * radius;
        if (first) graphics.moveTo(pointX, pointY);
        else graphics.lineTo(pointX, pointY);
        first = false;
      }
      graphics.strokePath();
    }
  }

  /** Glows about a boulder in its glow's color, through the halo painter, as its break has it now. */
  private glowAbout(
    boulder: Readonly<Boulder>,
    since: number,
    inks: BoulderInks,
    context: Readonly<PaintContext>,
  ): void {
    const { reach, strength } = boulderGlowAt(since, this.glowShown);
    if (strength <= 0) return;
    const { glow, glowAt } = this;
    glow.along = reach * boulder.radius;
    glow.across = glow.along;
    glow.strength = strength;
    glowAt.x = boulder.x;
    glowAt.y = boulder.y;
    this.halos.glow(glow, inks.glow, glowAt, context);
  }
}
