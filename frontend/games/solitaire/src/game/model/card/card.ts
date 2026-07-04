/** Represents a card in the game. */
export interface Card {
  /** A unique identifier for the card (e.g., "spade-ace"). */
  id: string;
  /** Whether the card is face up. */
  faceUp: boolean;
}
