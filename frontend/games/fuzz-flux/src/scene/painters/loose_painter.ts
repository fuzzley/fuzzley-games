import { itemAt } from "@fz/core/records";
import { type Playing, Turns } from "@fz/core/turns";
import { type GameObjects, type Scene, TintModes } from "phaser";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { FRAMES } from "../../view/art/frame_names";
import { type Fluff, type TuftFlight, tuftAt } from "../../view/effects/tufts";
import { FEEL } from "../../view/timeline/feel";
import { ATLAS } from "../atlas";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
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

/** The color an image untinted shows its frame in. */
const UNTINTED = 0xffffff;

/**
 * Draws what flies loose of the board at the frame's moment: each loose
 * sprite of the play's timeline that shows, a sprite that is no piece on
 * the board, and each tuft of the fluff the moves spawn. A loose frame, as
 * a brick's cushion knocked off or a cage's bar, and a tuft are each an
 * image of one pool as large as the design's budget of loose bits on the
 * board at once, which the timeline's limits hold them to together; a
 * piece's copy, as a wisp's in flight, is a sprite of a pool of a copy a
 * square, raised over them all.
 *
 * A tuft flies from its moment on the scene's clock, each played in turn,
 * the oldest taken for the newest once every one flies, so one still
 * flying as the next play starts flies on. Every third of a fluff's tufts
 * is in the frizzball's color, its kind's tuft filled with it.
 */
export class LoosePainter implements Painter {
  /** An image for each loose bit that may show at once, frame or tuft. */
  readonly bits: readonly GameObjects.Image[];
  /** A sprite for each piece's copy that may show at once. */
  readonly copies: readonly PieceSprite[];
  /** Each tuft that may fly at once. */
  readonly tufts: Turns<Tuft>;
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

  /** Makes every loose bit and copy, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.bits = Array.from({ length: FEEL.mostLooseBits }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.square).setVisible(false),
    );
    layer.add([...this.bits]);
    this.copies = Array.from(
      { length: MOST_SQUARES },
      () => new PieceSprite(scene, layer),
    );
    this.tufts = new Turns(FEEL.mostLooseBits, () => ({
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
      fluff: null,
      index: 0,
    }));
  }

  /** Throws each fluff whose moment comes in the frame, draws every loose sprite and tuft showing at the frame's moment, and hides the bits and copies left over. */
  draw(context: Readonly<PaintContext>): void {
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
      const image = this.bits[bits++];
      if (image === undefined) continue;
      if (image.frame.name !== drawn.frame) image.setFrame(drawn.frame);
      fillIn(image, null);
      placeSprite(image, sampled, context);
    }
    bits = this.drawTufts(bits, context);
    for (let index = bits; index < this.drawnBits; index++) {
      this.bits[index]?.setVisible(false);
    }
    for (let index = copies; index < this.drawnCopies; index++) {
      this.copies[index]?.hide();
    }
    this.drawnBits = Math.min(bits, this.bits.length);
    this.drawnCopies = Math.min(copies, this.copies.length);
  }

  /** Sets each tuft of each fluff of the play's timeline whose moment comes in the frame flying. */
  private throwFluff({ play, clock }: Readonly<PaintContext>): void {
    const { effects } = play.timeline;
    for (let index = 0; index < effects.length; index++) {
      const effect = itemAt(effects, index);
      if (effect.what !== "fluff" || !clock.starts(effect.atMs)) continue;
      const at = clock.nowOf(effect.atMs);
      for (let tuft = 0; tuft < effect.count; tuft++) {
        const flying = this.tufts.play(effect.at.x, effect.at.y, at);
        flying.fluff = effect;
        flying.index = tuft;
      }
    }
  }

  /** Draws every tuft flying at the frame's moment into the bits from the first one given, and returns the first one it leaves. */
  private drawTufts(from: number, context: Readonly<PaintContext>): number {
    const { play, clock, palette } = context;
    const { flight } = this;
    const all = this.tufts.all;
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
      const image = this.bits[bits++];
      if (image === undefined) break;
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
