import type { GameObjects } from "phaser";

import { CardArtScale } from "../layout/card_metrics";

/**
 * Gives the view applier the sprites and scene services it writes through.
 *
 * Narrowed so the applier need not import `BoardScene`, which imports it.
 */
export interface PhaserSprites {
  /**
   * The density of the atlas the cards, their shadows and the placeholders are
   * drawn from, which turns a layout scale into a sprite scale.
   */
  readonly cardArtScale: CardArtScale;

  /** Returns the sprite for a card, or undefined if it has none. */
  cardSprite(cardId: string): GameObjects.Sprite | undefined;

  /** Returns the sprite of a card's shadow, or undefined if it has none. */
  cardShadowSprite(cardId: string): GameObjects.Sprite | undefined;

  /** Returns a pile's placeholder sprite, or undefined if it has none. */
  pileBackgroundSprite(pileId: string): GameObjects.Sprite | undefined;

  /** Adds a graphics object to the scene's display list. */
  addGraphics(): GameObjects.Graphics;

  /** Sets whether the given sprite can be dragged. */
  setDraggable(sprite: GameObjects.Sprite, draggable: boolean): void;
}
