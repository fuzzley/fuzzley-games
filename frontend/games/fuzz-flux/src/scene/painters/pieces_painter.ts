import { itemAt } from "@fz/core/records";
import type { GameObjects, Scene } from "phaser";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import type { GridShown } from "../../view/run_state";
import type { Place } from "../../view/timeline/timeline";
import type { PaintContext, Painter } from "./painter";
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
 * again, under it, which hides each until it reaches the board.
 */
export class PiecesPainter implements Painter {
  /** The sprites of the pieces on the board. */
  readonly onBoard: readonly PieceSprite[];
  /** The sprites of the pieces falling in from past the board's edge. */
  readonly fallingIn: readonly PieceSprite[];
  private readonly board: Pool;
  private readonly falling: Pool;

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
  }

  /** Draws each piece shown at the frame's moment, a piece whose track starts past the board's edge among those falling in, and hides the sprites left over. */
  draw(context: Readonly<PaintContext>): void {
    const { board, falling } = this;
    const { play, frame } = context;
    const tracks = play.timeline.pieces;
    let onBoard = 0;
    let fallingIn = 0;
    for (let index = 0; index < tracks.length; index++) {
      const sampled = itemAt(frame.pieces, index);
      if (!sampled.shown || sampled.drawn === null) continue;
      if (startsPastEdge(itemAt(tracks, index).look, play.grid)) {
        falling.sprites[fallingIn++]?.paint(sampled, sampled.drawn, context);
      } else {
        board.sprites[onBoard++]?.paint(sampled, sampled.drawn, context);
      }
    }
    hideFrom(board, onBoard);
    hideFrom(falling, fallingIn);
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
