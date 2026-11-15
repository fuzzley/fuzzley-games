import { softDisc } from "@fz/phaser/scene";
import type { GameObjects, Scene } from "phaser";
import { type Moving, wrap } from "../../rules/torus";
import {
  type Halo,
  MOST_ROCK_HALOS,
  haloAlpha,
  rockHalos,
} from "../../view/art/energy";
import {
  type Drawn,
  type FieldView,
  wrappedBetween,
} from "../../view/field/frame";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * The soft disc every halo is an image of: its texture's key, and how many
 * pixels across it is painted, enough to stay soft scaled up to the
 * largest halo on the largest field.
 */
export const HALO_DISC = { key: "belt-halo", size: 128 } as const;

/** The frame of a canvas texture that shows all of it. */
const WHOLE = "__BASE";

/**
 * Draws a soft halo under each thing on the field that gives off light, in
 * its own color, under plain alpha, from images of one soft disc made
 * once, each turned, scaled and faded as the view's halo says, on both sides
 * of an edge it reaches across: a crystal's gems' and a volatile rock's
 * core's, turning with their rock.
 *
 * Another painter shows a halo of its own through {@link glow}, or
 * {@link glowOnce} for a thing that crosses rather than wraps, each frame
 * after this one draws, having reserved the images it needs before the
 * field starts ({@link reserve}).
 */
export class HaloPainter implements Painter {
  /** Each halo's images, made as a field of more slots starts. */
  private readonly halosMade: Copies[] = [];
  /** How many halos other painters show at most, which each new field makes room for. */
  private reserved = 0;
  /** How many halos are shown since this painter last drew, its own and others'. */
  private shown = 0;
  /** Where a thing is drawn on the field, between two steps, and how far it is turned, written each frame. */
  private readonly drawn: Drawn = { x: 0, y: 0, angle: 0 };
  /** Where the middle of the halo being shown lies on the field, written for each. */
  private readonly middle: Moving = { x: 0, y: 0 };

  /** Paints the soft disc its halos show, once, which is painted again after a lost context. */
  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {
    softDisc(scene, HALO_DISC.key, HALO_DISC.size);
  }

  /** Each halo's images, in the order they are shown each frame. */
  get halos(): readonly Copies[] {
    return this.halosMade;
  }

  /**
   * Makes room for more halos another painter shows each frame, which every
   * field from the next to start makes images for.
   */
  reserve(count: number): void {
    this.reserved += count;
  }

  /**
   * Makes the images a new field's halos need, those it lacks, as many as
   * all its rocks could give off at once and those reserved, so none is made
   * in a frame of play.
   */
  start(field: FieldView): void {
    const wanted = field.rocks.length * MOST_ROCK_HALOS + this.reserved;
    while (this.halosMade.length < wanted) {
      this.halosMade.push(
        new Copies(this.scene, this.layer, WHOLE, HALO_DISC.key),
      );
    }
  }

  /**
   * Draws the halo of each thing on the field that gives off light, and
   * hides each halo shown last frame that no longer is, of this painter's
   * or another's.
   */
  draw(context: Readonly<PaintContext>): void {
    const before = this.shown;
    this.shown = 0;
    const { field, alpha, palette } = context;
    for (const rock of field.rocks) {
      if (!rock.live) continue;
      const halos = rockHalos(rock);
      if (halos.length === 0) continue;
      wrappedBetween(rock, alpha, field.torus, this.drawn);
      this.drawn.angle = rock.angle;
      for (const halo of halos) {
        this.glow(halo, palette.rockGlows[halo.tone], this.drawn, context);
      }
    }
    for (let i = this.shown; i < before; i++) this.halosMade[i]?.hide();
  }

  /**
   * Shows a halo in a color about a thing where it is drawn on the field,
   * in field units, turned the way it points, on both sides of an edge the
   * halo reaches across.
   *
   * It shows nothing past the images made, which a painter that shows its
   * own reserves.
   */
  glow(
    halo: Readonly<Halo>,
    color: number,
    at: Readonly<Drawn>,
    context: Readonly<Pick<PaintContext, "field" | "metrics" | "palette">>,
  ): void {
    const copies = this.nextHalo(halo, color, at, context);
    if (!copies) return;
    const { torus } = context.field;
    copies.show(
      wrap(this.middle.x, torus.width),
      wrap(this.middle.y, torus.height),
      Math.max(halo.along, halo.across),
      context.metrics,
      torus,
    );
  }

  /**
   * Shows a halo in a color about a thing that crosses the field rather
   * than wraps, as a comet does, once, where it lies, on the field or off
   * it, as {@link glow} shows one, for the field's camera to cut off.
   */
  glowOnce(
    halo: Readonly<Halo>,
    color: number,
    at: Readonly<Drawn>,
    context: Readonly<Pick<PaintContext, "metrics" | "palette">>,
  ): void {
    const copies = this.nextHalo(halo, color, at, context);
    copies?.showOnce(this.middle.x, this.middle.y, context.metrics);
  }

  /**
   * Takes the next halo's images, if any are left, tinted, turned, scaled
   * and faded as a halo about a thing at a place shows, and writes where
   * its middle lies on the field.
   */
  private nextHalo(
    halo: Readonly<Halo>,
    color: number,
    at: Readonly<Drawn>,
    context: Readonly<Pick<PaintContext, "metrics" | "palette">>,
  ): Copies | undefined {
    const copies = this.halosMade[this.shown];
    if (!copies) return undefined;
    this.shown += 1;
    const way = at.angle + halo.turn;
    this.middle.x = at.x + Math.cos(way) * halo.ahead;
    this.middle.y = at.y + Math.sin(way) * halo.ahead;
    const scale = (2 * context.metrics.unit) / HALO_DISC.size;
    copies.setTint(color);
    copies.setRotation(way);
    copies.setScale(halo.along * scale, halo.across * scale);
    copies.setAlpha(haloAlpha(halo.strength, context.palette));
    return copies;
  }
}
