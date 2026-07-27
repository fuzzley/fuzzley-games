import type { GameObjects } from "phaser";

/**
 * The scene surface the view applier writes through: a way to find the sprite
 * for a card or a pile background, plus the two scene services it needs.
 *
 * Narrowed to this so the applier does not have to name `BoardScene`, which
 * names the applier in turn. Sprites are addressed by the same ids the model
 * uses, so a lookup can never disagree with the view state it came from.
 */
export interface BoardSprites {
  /** The sprite for the card with the given id, or undefined if unregistered. */
  cardSprite(cardId: string): GameObjects.Sprite | undefined;

  /**
   * The background placeholder sprite for the given pile, or undefined for
   * piles drawn without one (the waste fans over bare table).
   */
  pileBackgroundSprite(pileId: string): GameObjects.Sprite | undefined;

  /** Adds a graphics object to the scene's display list. */
  addGraphics(): GameObjects.Graphics;

  /** Sets whether the given sprite can be dragged. */
  setDraggable(sprite: GameObjects.Sprite, draggable: boolean): void;
}
