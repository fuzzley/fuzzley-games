import type { GameObjects } from "phaser";

/**
 * Gives the view applier the sprites and scene services it writes through.
 *
 * Narrowed so the applier need not import `BoardScene`, which imports it.
 */
export interface PhaserSprites {
  /** Returns the sprite for a card, or undefined if it has none. */
  cardSprite(cardId: string): GameObjects.Sprite | undefined;

  /** Returns a pile's placeholder sprite, or undefined if it has none. */
  pileBackgroundSprite(pileId: string): GameObjects.Sprite | undefined;

  /** Adds a graphics object to the scene's display list. */
  addGraphics(): GameObjects.Graphics;

  /** Sets whether the given sprite can be dragged. */
  setDraggable(sprite: GameObjects.Sprite, draggable: boolean): void;
}
