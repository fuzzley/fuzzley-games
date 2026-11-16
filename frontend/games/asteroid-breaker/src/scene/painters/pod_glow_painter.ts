import type { GameObjects, Scene } from "phaser";
import { type Moving, copyOffsets } from "../../rules/torus";
import { type Energy, type WrittenHalo, energyOf } from "../../view/art/energy";
import type { BeltPalette } from "../../view/colors/palette";
import {
  POD_FLASH,
  type PodFlash,
  ZAP_GLOW,
  ZAP_LIGHT,
  podFlashAt,
  podFlashTone,
  zapShare,
} from "../../view/effects/pod_glow";
import type { Drawn } from "../../view/field/frame";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { isNearerSides } from "./blast_painter";
import { COPY_SHARES } from "./copy_shares";
import type { HaloPainter } from "./halo_painter";
import type { PaintContext, Painter } from "./painter";
import { fillRound } from "./rounds";

/** Holds the tones the pod lights up in: the accent's energy, and the flash's tone. */
interface Tones {
  readonly energy: Energy;
  readonly flash: number;
}

/**
 * Draws the pod lighting up about where it is drawn, under it, as one of
 * the crew is knocked loose or it zaps.
 *
 * A knock's flash is a disc growing and fading fast, on both sides of an
 * edge it reaches across, with its glow; a zap's is its glow where the
 * arcs leave the hull, with its light, one of the scene's, which lights
 * the rocks about the pod through their normal maps, and another past the
 * edge the pod lies nearest, should the light reach across it. Each glow
 * is shown through the halo painter. The flourish player plays the flash
 * only as the field may flash, and the zap's light too.
 */
export class PodGlowPainter implements Painter {
  /** The flash's disc, drawn again each frame. */
  readonly graphics: GameObjects.Graphics;
  /** The zap's light, hidden but while a zap that lit it lasts. */
  readonly light: GameObjects.Light;
  /** The zap's light past the edge the pod lies nearest, hidden unless its light reaches across it. */
  readonly beyond: GameObjects.Light;

  /** When one was last knocked loose, in the scene's time, or −Infinity. */
  private flashedAt = -Infinity;
  /** When the pod last zapped, in the scene's time, or −Infinity. */
  private zappedAt = -Infinity;
  /** Whether the last zap lights the rocks, as the field may flash. */
  private zapLit = false;
  /** The flash as it shows, written each frame it does. */
  private readonly flashShown: PodFlash = { radius: 0, alpha: 0, glow: 0 };
  /** A glow's halo, written before each is shown. */
  private readonly glow: WrittenHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };
  /** How far the disc's copies past the edges are from it on the field, written each frame. */
  private readonly offsets: Moving = { x: 0, y: 0 };
  /** Where a copy's middle, or the light, is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** The palette the tones were last taken for, or null before. */
  private toned: BeltPalette | null = null;
  /** The accent's energy and the flash's tone in that palette. */
  private tones: Tones | null = null;

  /** Makes the disc's drawing in a layer and the zap's light, and reserves the halo painter's images for the two glows. */
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
    halos.reserve(2);
  }

  /** Flashes the pod, as one is knocked loose. */
  flash(now: number): void {
    this.flashedAt = now;
  }

  /** Glows at the pod as it zaps, lighting the rocks about it if the field may flash. */
  zap(lit: boolean, now: number): void {
    this.zappedAt = now;
    this.zapLit = lit;
  }

  /** Puts the flash, the glow and the light out, as a new field starts. */
  start(): void {
    this.flashedAt = -Infinity;
    this.zappedAt = -Infinity;
    this.graphics.clear();
    this.light.setVisible(false);
    this.beyond.setVisible(false);
  }

  /** Draws the flash and the zap's glow and light about the pod as it is drawn, or nothing with no pod. */
  draw(context: Readonly<PaintContext>): void {
    this.graphics.clear();
    this.light.setVisible(false);
    this.beyond.setVisible(false);
    const { shipDrawn, palette } = context;
    if (shipDrawn === null) return;
    const tones = this.tonesFor(palette);
    this.drawFlash(shipDrawn, tones, context);
    this.drawZap(shipDrawn, tones.energy, context);
  }

  /** Draws the flash's disc on both sides of an edge it reaches across, and its glow, while it lasts. */
  private drawFlash(
    ship: Readonly<Drawn>,
    { energy, flash }: Tones,
    context: Readonly<PaintContext>,
  ): void {
    const { field, metrics, now } = context;
    const shown = podFlashAt(now - this.flashedAt, this.flashShown);
    if (shown === null) return;
    const { graphics } = this;
    const { unit, pixelRatio } = metrics;
    const { x: across, y: down } = copyOffsets(
      ship.x,
      ship.y,
      shown.radius,
      field.torus,
      this.offsets,
    );
    for (const [acrossShare, downShare] of COPY_SHARES) {
      if (acrossShare === 1 && across === 0) continue;
      if (downShare === 1 && down === 0) continue;
      const at = toCanvas(
        metrics,
        ship.x + acrossShare * across,
        ship.y + downShare * down,
        this.at,
      );
      graphics.fillStyle(flash, shown.alpha);
      fillRound(graphics, at.x, at.y, shown.radius * unit, pixelRatio);
    }
    this.glowAbout(ship, POD_FLASH.glow, shown.glow, energy.halo, context);
  }

  /**
   * Glows at the pod while a zap lasts, and lights the rocks about it if
   * the zap may, and those past the edge the pod lies nearest should its
   * light reach across it. Its copies past another edge, in a corner, go
   * unlit, as the scene's lights are few.
   */
  private drawZap(
    ship: Readonly<Drawn>,
    energy: Energy,
    context: Readonly<PaintContext>,
  ): void {
    const { field, metrics, now } = context;
    const share = zapShare(now - this.zappedAt);
    if (share === 0) return;
    this.glowAbout(
      ship,
      ZAP_GLOW.reach,
      ZAP_GLOW.strength * share,
      context.palette.accent,
      context,
    );
    if (!this.zapLit) return;
    this.lightAt(this.light, ship.x, ship.y, share, energy, metrics);
    const { x: across, y: down } = copyOffsets(
      ship.x,
      ship.y,
      ZAP_LIGHT.reach,
      field.torus,
      this.offsets,
    );
    if (across === 0 && down === 0) return;
    const isAcross =
      down === 0 || (across !== 0 && isNearerSides(ship, field.torus));
    this.lightAt(
      this.beyond,
      isAcross ? ship.x + across : ship.x,
      isAcross ? ship.y : ship.y + down,
      share,
      energy,
      metrics,
    );
  }

  /** Stands one of the zap's lights at a place on the field, as strongly as its share says. */
  private lightAt(
    light: GameObjects.Light,
    x: number,
    y: number,
    share: number,
    energy: Energy,
    metrics: FieldMetrics,
  ): void {
    const at = toCanvas(metrics, x, y, this.at);
    light.x = at.x;
    light.y = at.y;
    light.z = ZAP_LIGHT.height * metrics.unit;
    light.radius = ZAP_LIGHT.reach * metrics.unit;
    light.intensity = ZAP_LIGHT.strength * share;
    light.setColor(energy.body);
    light.setVisible(true);
  }

  /** Shows a round glow about the pod, of a reach, at a strength, in a color, through the halo painter. */
  private glowAbout(
    ship: Readonly<Drawn>,
    reach: number,
    strength: number,
    color: number,
    context: Readonly<PaintContext>,
  ): void {
    const { glow } = this;
    glow.along = reach;
    glow.across = reach;
    glow.strength = strength;
    this.halos.glow(glow, color, ship, context);
  }

  /** Returns the accent's energy and the flash's tone in a palette, taken again only for a new palette. */
  private tonesFor(palette: BeltPalette): Tones {
    if (this.tones === null || palette !== this.toned) {
      this.toned = palette;
      this.tones = {
        energy: energyOf(palette.accent, palette),
        flash: podFlashTone(palette),
      };
    }
    return this.tones;
  }
}
