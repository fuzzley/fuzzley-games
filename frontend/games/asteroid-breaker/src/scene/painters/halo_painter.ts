import { lerp } from "@fz/core/math";
import { softDisc } from "@fz/phaser/scene";
import type { GameObjects, Scene } from "phaser";
import { type Moving, wrap } from "../../rules/torus";
import { thrustOf } from "../../rules/ship/ship";
import {
  type Halo,
  MOST_ROCK_HALOS,
  SHOTS,
  type WrittenHalo,
  flameHalo,
  haloAlpha,
  rockHalos,
} from "../../view/art/energy";
import { ENGINES } from "../../view/art/pod_art";
import {
  CHEVRON_HALOS,
  COMET_HALOS,
  pickupLook,
  restingLook,
} from "../../view/art/things";
import {
  type Drawn,
  type FieldView,
  wrappedBetween,
} from "../../view/field/frame";
import { chevronLit, tailShare, warningAt } from "../../view/field/warning";
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
 * Tints, turns, scales and fades images of the soft disc as a halo shows,
 * in a color, pointing a way, in radians, at the field's scale and as
 * strongly as the palette lets it.
 */
export function dressHalo(
  copies: Copies,
  halo: Readonly<Halo>,
  color: number,
  way: number,
  context: Readonly<Pick<PaintContext, "metrics" | "palette">>,
): void {
  const scale = (2 * context.metrics.unit) / HALO_DISC.size;
  copies.setTint(color);
  copies.setRotation(way);
  copies.setScale(halo.along * scale, halo.across * scale);
  copies.setAlpha(haloAlpha(halo.strength, context.palette));
}

/**
 * Draws a soft halo under each thing on the field that gives off light, in
 * its own color, under plain alpha, from images of one soft disc made
 * once, each turned, scaled and faded as the view's halo says, on both sides
 * of an edge it reaches across: a crystal's gems' and a volatile rock's
 * core's, turning with their rock, each shot's, in the accent, along its
 * travel, each pickup's, breathing with its orb, and the pod's flame's, as
 * long as its thrust; and once, for the field's camera to cut off, each
 * comet's and its warning's lit chevron's.
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
  /** How the pickup whose halo is shown shows, written for each. */
  private readonly look = restingLook();
  /** The halo of the pickup being shown, written for each. */
  private readonly orbHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };
  /** The halo of the pod's flame behind the engine being shown, written for each. */
  private readonly engineHalo: WrittenHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };
  /** The halo of the comet's tail being shown, as strong as its tail shows, written for each. */
  private readonly tailHalo = { ...COMET_HALOS.tail };
  /** Where the middle of the halo being shown lies on the field, written for each. */
  private readonly middle: Moving = { x: 0, y: 0 };

  /** Paints the soft disc its halos show, once, which is painted again after a lost context. */
  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {
    softDisc(scene, HALO_DISC.key, HALO_DISC.size);
  }

  /**
   * Makes images of the soft disc in another layer, for a painter that
   * shows a glow there rather than under what it lights, dressed as a halo
   * by {@link dressHalo}.
   */
  discIn(layer: GameObjects.Layer): Copies {
    return new Copies(this.scene, layer, WHOLE, HALO_DISC.key);
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
   * all its rocks, shots, pickups, comets and the pod's flame could give
   * off at once and those reserved, so none is made in a frame of play.
   */
  start(field: FieldView): void {
    const wanted =
      field.rocks.length * MOST_ROCK_HALOS +
      field.shots.slots.length +
      field.pickups.length +
      2 * field.comets.slots.length +
      ENGINES.length +
      this.reserved;
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
    for (const shot of field.shots.slots) {
      if (shot.lifeSteps === 0) continue;
      wrappedBetween(shot, alpha, field.torus, this.drawn);
      this.drawn.angle = Math.atan2(shot.vy, shot.vx);
      // A shot's energy's halo is its own color, the accent.
      this.glow(SHOTS[shot.weapon].halo, palette.accent, this.drawn, context);
    }
    this.drawPickups(context);
    this.drawComets(context);
    this.drawFlame(context);
    for (let i = this.shown; i < before; i++) this.halosMade[i]?.hide();
  }

  /**
   * Draws the halo of each pickup floating on the field, in the accent, as
   * wide and as strong as it breathes, as its painter draws its orb, and
   * none for one blinking dim.
   */
  private drawPickups(context: Readonly<PaintContext>): void {
    const { field, alpha, now, motion, palette } = context;
    const seconds = now / 1000;
    for (let slot = 0; slot < field.pickups.length; slot++) {
      const floating = field.pickups[slot];
      if (!floating?.live) continue;
      const look = pickupLook(floating, slot, seconds, motion, this.look);
      if (look.haloStrength === 0) continue;
      this.orbHalo.along = look.haloReach;
      this.orbHalo.across = look.haloReach;
      this.orbHalo.strength = look.haloStrength;
      wrappedBetween(floating, alpha, field.torus, this.drawn);
      this.drawn.angle = 0;
      this.glow(this.orbHalo, palette.accent, this.drawn, context);
    }
  }

  /**
   * Draws the halo of the pod's flame behind each engine, in the flame's
   * color, as long as the thrust makes the flame, while the pod's painter
   * draws it: none with no thrust, no ship or no pilot at its controls, or
   * once the wave is cleared.
   */
  private drawFlame(context: Readonly<PaintContext>): void {
    const { field, shipDrawn, palette } = context;
    const { ship } = field;
    if (!ship || !shipDrawn || field.crew.pilot === null || field.cleared) {
      return;
    }
    const thrust = thrustOf(ship);
    if (thrust <= 0) return;
    for (const engine of ENGINES) {
      flameHalo(engine, thrust, palette, this.engineHalo);
      this.glow(this.engineHalo, palette.flame, shipDrawn, context);
    }
  }

  /**
   * Draws the halos of each comet, in the danger color, once each, for the
   * field's camera to cut off, as a comet crosses rather than wraps: its
   * head's and its tail's as it flies, its tail's as strongly as its tail
   * shows; and while it is warned of, its warning's lit chevron's, none
   * where its chevrons are held still.
   */
  private drawComets(context: Readonly<PaintContext>): void {
    const { field, alpha, motion, palette } = context;
    for (const comet of field.comets.slots) {
      if (!comet.live) continue;
      this.drawn.angle = comet.heading;
      if (comet.warnSteps > 0) {
        const lit = chevronLit(comet, motion);
        if (lit === null) continue;
        warningAt(comet, field.torus, this.drawn);
        this.glowOnce(CHEVRON_HALOS[lit], palette.comet, this.drawn, context);
        continue;
      }
      this.drawn.x = lerp(comet.lastX, comet.x, alpha);
      this.drawn.y = lerp(comet.lastY, comet.y, alpha);
      this.glowOnce(COMET_HALOS.head, palette.comet, this.drawn, context);
      const share = tailShare(this.drawn, field.torus);
      if (share === 0) continue;
      this.tailHalo.strength = COMET_HALOS.tail.strength * share;
      this.glowOnce(this.tailHalo, palette.comet, this.drawn, context);
    }
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
    dressHalo(copies, halo, color, way, context);
    return copies;
  }
}
