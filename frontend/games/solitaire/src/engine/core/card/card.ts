/** Represents a card in the game. */
export interface Card {
  /**
   * Identifies this one card, uniquely across the whole game.
   *
   * Distinct from {@link faceKey} because a game may deal more than one deck:
   * two-deck Spider holds two Queens of Hearts, which are the same card to look
   * at and two different cards to move.
   */
  readonly id: string;

  /**
   * Identifies the artwork for this card's face. Cards that look alike share
   * one, so the render layer resolves a texture through this rather than
   * through {@link id}.
   */
  readonly faceKey: string;

  /** Whether the card is face up. */
  faceUp: boolean;
}
