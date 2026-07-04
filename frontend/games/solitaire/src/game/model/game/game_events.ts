/**
 * Event map defining payloads for solitaire game events.
 */
export type GameEvents = {
  /** Emitted when a card or stack of cards has successfully moved between piles. */
  "card-moved": {
    /** The ID of the primary card that was moved. */
    cardId: string;
    /** The ID of the pile the card was moved from. */
    fromPileId: string;
    /** The ID of the pile the card was moved to. */
    toPileId: string;
  };

  /** Emitted when a card changes its flip status (face up or face down). */
  "card-flipped": {
    /** The ID of the card that was flipped. */
    cardId: string;
    /** True if the card is now face up; false if face down. */
    faceUp: boolean;
  };

  /** Emitted when the empty stock pile is refilled by recycling the waste pile. */
  "stock-recycled": undefined;

  /** Emitted when all cards have been successfully moved to the foundation piles. */
  "game-won": undefined;

  /** Emitted when the game's reactive metrics (score, moves, etc.) change. */
  "state-changed": {
    score: number;
    moves: number;
    drawCount: 1 | 3;
    cardBackStyle: "card-back-blue" | "card-back-red";
  };

  /** Emitted when the user selects a new card back style. */
  "card-back-changed": {
    cardBackStyle: "card-back-blue" | "card-back-red";
  };
};
