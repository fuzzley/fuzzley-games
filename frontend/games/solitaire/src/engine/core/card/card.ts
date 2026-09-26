/** Represents a card in the game. */
export interface Card {
  /**
   * Identifies this one card, uniquely across the whole game.
   *
   * Distinct from {@link faceKey} because a game may deal more than one deck:
   * two-deck Spider holds two Queens of Hearts, which look the same but move
   * separately.
   */
  readonly id: string;

  /** Identifies the artwork for this card's face, shared by lookalike cards. */
  readonly faceKey: string;

  /** Whether the card is face up. */
  faceUp: boolean;
}
