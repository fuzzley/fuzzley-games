import { itemAt } from "@fz/core/records";
import { type Playing, Turns } from "@fz/core/turns";
import { type GameObjects, type Scene, TintModes } from "phaser";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { FRAMES } from "../../view/art/frame_names";
import { type Fluff, type TuftFlight, tuftAt } from "../../view/effects/tufts";
import type { FeelTuning } from "../../view/timeline/feel";
import { ATLAS } from "../atlas";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
  grownTurns,
  placeSprite,
  shownScale,
} from "./painter";
import { PieceSprite } from "./piece_sprite";

/** Describes a tuft of a fluff flying, from its moment on the scene's clock. */
interface Tuft extends Playing {
  /** The fluff it flies from, or null for a tuft that flies no more. */
  fluff: Fluff | null;
  /** Its place among its fluff's tufts. */
  index: number;
}

/** Makes a tuft that flies nowhere. */
function makeTuft(): Tuft {
  return {
    at: Number.NEGATIVE_INFINITY,
    x: 0,
    y: 0,
    fluff: null,
    index: 0,
  };
}

/** The color an image untinted shows its frame in. */
const UNTINTED = 0xffffff;

/**
 * Draws what flies loose of the board at the frame's moment: each loose
 * sprite of the play's timeline that shows, a sprite that is no piece on
 * the board, and each tuft of the fluff the moves spawn. A loose frame, as
 * a brick's cushion knocked off or a cage's bar, and a tuft are each an
 * image of one pool, which shows at most the play's feel's budget of loose
 * bits on the board at once, and which the timeline's limits hold them to
 * together; a piece's copy, as a wisp's in flight, is a sprite of a pool
 * of a copy a square, raised over them all.
 *
 * A tuft flies from its moment on the scene's clock, each played in turn,
 * the oldest taken for the newest once every one flies, so one still
 * flying as the next play starts flies on. Every third of a fluff's tufts
 * is in the frizzball's color, its kind's tuft filled with it.
 *
 * The pools of bits and tufts grow as a play's feel, tuned, lets more show,
 * and never shrink, as a frame shows no more than the play's budget.
 */
export class LoosePainter implements Painter {
  /** An image for each loose bit that may show at once, frame or tuft, by the feel of every play drawn so far. */
  private readonly images: GameObjects.Image[] = [];
  /** A sprite for each piece's copy that may show at once. */
  readonly copies: readonly PieceSprite[];
  /** Each tuft that may fly at once, by the feel of every play drawn so far. */
  private tuftPool: Turns<Tuft>;
  /** Where the tuft being drawn flies, written for each. */
  private readonly flight: TuftFlight = {
    x: 0,
    y: 0,
    rotation: 0,
    length: 1,
    width: 1,
    alpha: 1,
    frizzy: false,
  };
  /** How many loose bits the frame before drew. */
  private drawnBits = 0;
  /** How many pieces' copies the frame before drew. */
  private drawnCopies = 0;

  /** Makes a loose bit and a tuft, hidden, in a layer, for each that may show at once by a feel, the first play's, and every copy. */
  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
    feel: FeelTuning,
  ) {
    this.copies = Array.from(
      { length: MOST_SQUARES },
      () => new PieceSprite(scene, layer),
    );
    this.tuftPool = new Turns(feel.mostLooseBits, makeTuft);
    this.holdFor(feel);
  }

  /** An image for each loose bit that may show at once, frame or tuft, by the feel of every play drawn so far. */
  get bits(): readonly GameObjects.Image[] {
    return this.images;
  }

  /** Throws each fluff whose moment comes in the frame, draws every loose sprite and tuft showing at the frame's moment, as many bits as the play's feel lets show, and hides the bits and copies left over. */
  draw(context: Readonly<PaintContext>): void {
    const most = context.play.feel.mostLooseBits;
    this.holdFor(context.play.feel);
    this.throwFluff(context);
    const tracks = context.play.timeline.sprites;
    const sampledSprites = context.frame.sprites;
    let bits = 0;
    let copies = 0;
    for (let index = 0; index < tracks.length; index++) {
      const sampled = itemAt(sampledSprites, index);
      if (!sampled.shown) continue;
      const { drawn } = itemAt(tracks, index);
      if (drawn.what === "copy") {
        this.copies[copies++]?.paint(sampled, drawn.piece, context);
        continue;
      }
      if (bits >= most) continue;
      const image = itemAt(this.images, bits++);
      if (image.frame.name !== drawn.frame) image.setFrame(drawn.frame);
      fillIn(image, null);
      placeSprite(image, sampled, context);
    }
    bits = this.drawTufts(bits, most, context);
    for (let index = bits; index < this.drawnBits; index++) {
      itemAt(this.images, index).setVisible(false);
    }
    for (let index = copies; index < this.drawnCopies; index++) {
      this.copies[index]?.hide();
    }
    this.drawnBits = bits;
    this.drawnCopies = Math.min(copies, this.copies.length);
  }

  /** Grows the pools of bits and tufts to as many as a feel lets show at once. */
  private holdFor(feel: FeelTuning): void {
    const most = feel.mostLooseBits;
    while (this.images.length < most) {
      const image = this.scene.add.image(0, 0, ATLAS, FRAMES.square);
      this.layer.add(image.setVisible(false));
      this.images.push(image);
    }
    this.tuftPool = grownTurns(this.tuftPool, most, makeTuft);
  }

  /** Sets each tuft of each fluff of the play's timeline whose moment comes in the frame flying. */
  private throwFluff({ play, clock }: Readonly<PaintContext>): void {
    const { effects } = play.timeline;
    for (let index = 0; index < effects.length; index++) {
      const effect = itemAt(effects, index);
      if (effect.what !== "fluff" || !clock.starts(effect.atMs)) continue;
      const at = clock.nowOf(effect.atMs);
      for (let tuft = 0; tuft < effect.count; tuft++) {
        const flying = this.tuftPool.play(effect.at.x, effect.at.y, at);
        flying.fluff = effect;
        flying.index = tuft;
      }
    }
  }

  /** Draws every tuft flying at the frame's moment into the bits from the first one given, short of the most given, and returns the first one it leaves. */
  private drawTufts(
    from: number,
    most: number,
    context: Readonly<PaintContext>,
  ): number {
    const { play, clock, palette } = context;
    const { flight } = this;
    const all = this.tuftPool.all;
    let bits = from;
    for (let index = 0; index < all.length; index++) {
      const tuft = itemAt(all, index);
      if (tuft.fluff === null) continue;
      if (
        !tuftAt(
          tuft.fluff,
          tuft.index,
          clock.nowMs - tuft.at,
          play.feel,
          flight,
        )
      ) {
        tuft.fluff = null;
        continue;
      }
      if (bits >= most) break;
      const image = itemAt(this.images, bits++);
      if (image.frame.name !== tuft.fluff.tuft) image.setFrame(tuft.fluff.tuft);
      fillIn(image, flight.frizzy ? palette.frizzball.body : null);
      placeTuft(image, flight, context);
    }
    return bits;
  }
}

/** Fills an image's frame with a color, or shows it in its own for none, where it shows otherwise. */
function fillIn(image: GameObjects.Image, color: number | null): void {
  if (color === null) {
    if (image.tintMode !== TintModes.MULTIPLY || image.tint !== UNTINTED) {
      image.clearTint();
    }
  } else if (image.tintMode !== TintModes.FILL || image.tint !== color) {
    image.setTint(color).setTintMode(TintModes.FILL);
  }
}

/** Shows a tuft's image where it flies at the frame's moment, raised no further than a loose frame at rest. */
function placeTuft(
  image: GameObjects.Image,
  flight: Readonly<TuftFlight>,
  context: Readonly<PaintContext>,
): void {
  const { metrics } = context;
  const scale = shownScale(context);
  if (image.depth !== 0) image.setDepth(0);
  image
    .setPosition(acrossOf(metrics, flight.x), downOf(metrics, flight.y))
    .setScale(scale * flight.length, scale * flight.width)
    .setRotation(flight.rotation)
    .setAlpha(flight.alpha)
    .setVisible(true);
}
