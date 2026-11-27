import { itemAt } from "@fz/core/records";
import { type GameObjects, type Scene, TintModes } from "phaser";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { FRAMES } from "../../view/art/frame_names";
import { DIM_DEPTH } from "../../view/art/piece_look";
import { blinkAt } from "../../view/idle/blinks";
import { type Breath, breathAt } from "../../view/idle/breaths";
import type { GridShown } from "../../view/run_state";
import type { Place } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import { PAST_CANVAS, type PaintContext, type Painter } from "./painter";
import { PieceSprite } from "./piece_sprite";

/** Describes a pool of pieces' sprites, and how many of them the frame before drew. */
interface Pool {
  readonly sprites: readonly PieceSprite[];
  drawn: number;
}

/**
 * Draws each piece of the play's timeline that shows at the frame's
 * moment, from two pools made once: those on the board, as many as its
 * squares, over the rim; and those falling in from past its edge, as many
 * again, under it, which hides each until it reaches the board. Among
 * those on the board it draws the glow of the first that glows, the one a
 * frame shows, as the timeline's limits keep a glow a gap from the last,
 * a gap longer than any glow; and the board's dimming, in the page's
 * color, at its depth among them.
 */
export class PiecesPainter implements Painter {
  /** The sprites of the pieces on the board. */
  readonly onBoard: readonly PieceSprite[];
  /** The sprites of the pieces falling in from past the board's edge. */
  readonly fallingIn: readonly PieceSprite[];
  /** The glow lighting a piece. */
  readonly glow: GameObjects.Image;
  /** The board's dimming, over all the canvas. */
  readonly dim: GameObjects.Rectangle;
  private readonly board: Pool;
  private readonly falling: Pool;
  /** How the body of the piece being drawn stirs, written for each. */
  private readonly breath: Breath = { scale: 1, turn: 0 };

  /** Makes every piece's sprite, hidden, those on the board in one layer and those falling in in another. */
  constructor(
    scene: Scene,
    layers: {
      readonly pieces: GameObjects.Layer;
      readonly falling: GameObjects.Layer;
    },
  ) {
    this.onBoard = spritesIn(scene, layers.pieces);
    this.fallingIn = spritesIn(scene, layers.falling);
    this.board = { sprites: this.onBoard, drawn: 0 };
    this.falling = { sprites: this.fallingIn, drawn: 0 };
    this.glow = scene.add
      .image(0, 0, ATLAS, FRAMES.square)
      .setTintMode(TintModes.FILL)
      .setVisible(false);
    this.dim = scene.add
      .rectangle(0, 0, 2 * PAST_CANVAS, 2 * PAST_CANVAS)
      .setDepth(DIM_DEPTH)
      .setVisible(false);
    layers.pieces.add([this.glow, this.dim]);
  }

  /**
   * Draws each piece shown at the frame's moment, a piece whose track
   * starts past the board's edge among those falling in, blinking and
   * stirring on the scene's clock as the view has it between moves and
   * through them, and its glow and the board's dimming, and hides what is
   * left over.
   */
  draw(context: Readonly<PaintContext>): void {
    const { board, falling, breath } = this;
    const { play, frame, clock } = context;
    const tracks = play.timeline.pieces;
    let onBoard = 0;
    let fallingIn = 0;
    let glowing = false;
    for (let index = 0; index < tracks.length; index++) {
      const sampled = itemAt(frame.pieces, index);
      const piece = sampled.drawn;
      if (!sampled.shown || piece === null) continue;
      blinkAt(play.feel, clock.nowMs, sampled);
      breathAt(piece, play.feel, clock.nowMs, breath);
      if (startsPastEdge(itemAt(tracks, index).look, play.grid)) {
        falling.sprites[fallingIn++]?.paint(sampled, piece, context, breath);
        continue;
      }
      const sprite = board.sprites[onBoard++];
      sprite?.paint(sampled, piece, context, breath);
      glowing ||= sprite?.dressGlow(this.glow, context) ?? false;
    }
    hideFrom(board, onBoard);
    hideFrom(falling, fallingIn);
    if (!glowing) this.glow.setVisible(false);
    this.dimTo(frame.board.dim, context.palette.page);
  }

  /** Dims the board as far as the frame has it, in the page's color, or shows no dimming for none. */
  private dimTo(dim: number, page: number): void {
    const { dim: shown } = this;
    if (dim <= 0) {
      shown.setVisible(false);
      return;
    }
    shown.setFillStyle(page).setAlpha(dim).setVisible(true);
  }
}

/** Returns a sprite for each square a board may have, in a layer. */
function spritesIn(
  scene: Scene,
  layer: GameObjects.Layer,
): readonly PieceSprite[] {
  return Array.from(
    { length: MOST_SQUARES },
    () => new PieceSprite(scene, layer),
  );
}

/** Returns whether a place lies past a board's edge, as a piece falling in starts. */
function startsPastEdge({ x, y }: Place, grid: GridShown): boolean {
  return x < 0 || y < 0 || x > grid.width - 1 || y > grid.height - 1;
}

/** Hides the sprites of a pool the frame before drew from the first the frame leaves, and keeps how many it drew. */
function hideFrom(pool: Pool, drawn: number): void {
  for (let index = drawn; index < pool.drawn; index++) {
    pool.sprites[index]?.hide();
  }
  pool.drawn = Math.min(drawn, pool.sprites.length);
}
