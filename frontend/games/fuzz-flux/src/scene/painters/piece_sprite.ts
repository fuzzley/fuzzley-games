import type { GameObjects, Scene } from "phaser";
import type { Piece } from "../../rules/catalog/pieces";
import { FRAMES } from "../../view/art/frame_names";
import { type ImageLook, PieceLook } from "../../view/art/piece_look";
import type { Breath } from "../../view/idle/breaths";
import type { Sampled } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import {
  type PaintContext,
  acrossOf,
  downOf,
  shownScale,
  tintIn,
} from "./painter";

/**
 * How much deeper each of a piece's images draws than the one behind it,
 * its glow last: a layer sorts by depth alone, keeping those as deep in
 * the order its list holds them, which changes as their depths do, so
 * images of one depth would not stay in the order they were made. Far
 * less than the depth between two rows.
 */
const IMAGE_DEPTH = 1 / 4096;

/** Where a piece's glow draws among its images: over all the rest. */
const GLOW_PLACE = 5;

/** How a piece stirs that stirs not at all. */
const STILL: Readonly<Breath> = { scale: 1, turn: 0, behindTurn: 0 };

/**
 * Draws a piece as a move's timeline samples it, as the view's
 * `PieceLook` works it out, from images made once, back to front: what it
 * wears behind it, its body, a second body over it, its eyes, and what it
 * wears over them; its bodies stir as the view's breath has them, between
 * moves and through them, and what it wears behind them turns as the
 * breath has it, and nothing else does.
 */
export class PieceSprite {
  /** What the piece wears behind its body. */
  readonly behind: GameObjects.Image;
  /** Its body, under any other. */
  readonly body: GameObjects.Image;
  /** The body fading in over the other, as the piece's look changes. */
  readonly second: GameObjects.Image;
  /** Its eyes, in their face. */
  readonly eyes: GameObjects.Image;
  /** What the piece wears over its body and eyes. */
  readonly over: GameObjects.Image;
  /** Every image, back to front. */
  readonly images: readonly GameObjects.Image[];
  /** How the piece is drawn, worked out again each frame. */
  private readonly look = new PieceLook();
  /** Where the piece stands on the canvas, in device pixels and radians, its images' depth, and how it stirs, written each frame. */
  private readonly pose = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    depth: 0,
    breath: STILL,
  };

  /** Makes the piece's images, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    const image = (): GameObjects.Image =>
      scene.add.image(0, 0, ATLAS, FRAMES.square).setVisible(false);
    this.behind = image();
    this.body = image();
    this.second = image();
    this.eyes = image();
    this.over = image();
    this.images = [this.behind, this.body, this.second, this.eyes, this.over];
    layer.add([...this.images]);
  }

  /** Draws a piece as it is sampled at the frame's moment, on the board as it is laid out, stirring as given. */
  paint(
    sampled: Readonly<Sampled>,
    piece: Piece,
    context: Readonly<PaintContext>,
    breath: Readonly<Breath> = STILL,
  ): void {
    const { metrics } = context;
    const { pose } = this;
    const look = this.look.of(sampled, piece);
    const scale = shownScale(context);
    pose.x = acrossOf(metrics, sampled.x + sampled.leanX);
    pose.y = downOf(metrics, sampled.y + sampled.leanY);
    pose.scaleX = scale * sampled.scaleX;
    pose.scaleY = scale * sampled.scaleY;
    pose.rotation = sampled.rotation;
    pose.depth = look.depth;
    pose.breath = breath;
    this.show(this.behind, look.behind, 0, 1, breath.behindTurn);
    const bodyScale = breath.scale * look.bodyScale;
    this.show(this.body, look.body, 1, bodyScale, breath.turn);
    this.show(this.second, look.second, 2, bodyScale, breath.turn);
    if (this.show(this.eyes, look.eyes, 3, 1, 0)) {
      this.eyes
        .setPosition(
          pose.x + look.eyesX * metrics.square,
          pose.y + look.eyesY * metrics.square,
        )
        .setScale(pose.scaleX * look.eyesScale, pose.scaleY * look.eyesScale);
    }
    this.show(this.over, look.over, 4, 1, 0);
  }

  /** Shows an image as the piece's glow where the frame drawn last lights it, its body lit over all its images in the effects' white, and returns whether it does. */
  dressGlow(
    image: GameObjects.Image,
    { palette }: Readonly<PaintContext>,
  ): boolean {
    const { glow } = this.look;
    if (glow.frame === null || glow.alpha <= 0) return false;
    tintIn(image, palette.flare);
    const { scale, turn } = this.pose.breath;
    return this.show(
      image,
      glow,
      GLOW_PLACE,
      scale * this.look.bodyScale,
      turn,
    );
  }

  /** Hides every image of the piece. */
  hide(): void {
    for (const image of this.images) image.setVisible(false);
  }

  /** Shows one of the piece's images where the piece stands, as the look has it, at its place among the piece's images, scaled and turned further as it stirs, and returns whether it shows. */
  private show(
    image: GameObjects.Image,
    shown: Readonly<ImageLook>,
    place: number,
    scale: number,
    turn: number,
  ): boolean {
    if (shown.frame === null || shown.alpha <= 0) {
      image.setVisible(false);
      return false;
    }
    const { pose } = this;
    const depth = pose.depth + place * IMAGE_DEPTH;
    if (image.frame.name !== shown.frame) image.setFrame(shown.frame);
    if (image.depth !== depth) image.setDepth(depth);
    image
      .setPosition(pose.x, pose.y)
      .setScale(pose.scaleX * scale, pose.scaleY * scale)
      .setRotation(pose.rotation + turn)
      .setAlpha(shown.alpha)
      .setVisible(true);
    return true;
  }
}
