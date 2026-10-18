import { Subscribe } from "@/engine/core/common/event_emitter";
import { CardDeckId } from "../deck/card_deck";
import { BoardArrangement } from "../layout/board_arrangement";

/** Describes how far a board has got with drawing the deck it was asked for. */
export type CardDeckStatus =
  /** Being fetched, with nothing on the table changed yet. */
  | { readonly kind: "loading"; readonly deckId: CardDeckId }
  /** On the table, drawing every card and placeholder. */
  | { readonly kind: "drawn"; readonly deckId: CardDeckId }
  /**
   * Could not be fetched, so the board keeps drawing the deck it last reported
   * as `drawn`.
   */
  | { readonly kind: "unavailable"; readonly deckId: CardDeckId };

/**
 * Supplies the player's choices about how the table looks, which are the same
 * whatever the game.
 */
export interface TablePresentation {
  /** Returns the artwork key for the back of a card. */
  cardBackKey(): string;

  /** Returns the deck the cards are drawn from. */
  cardDeckId(): CardDeckId;

  /**
   * Returns where the piles go on an upright phone, and which hand the board
   * is laid out for.
   */
  boardArrangement(): BoardArrangement;

  /** Follows the table colour. */
  readonly onBackgroundColor: Subscribe<string>;

  /**
   * Follows the deck.
   *
   * A subscription, unlike {@link cardBackKey}, because a new deck has to be
   * loaded before it can be drawn.
   */
  readonly onCardDeck: Subscribe<CardDeckId>;

  /** Reports which deck the board is actually drawing, whenever it changes. */
  reportCardDeckStatus(status: CardDeckStatus): void;
}

/** The board colour used before a player has chosen one. */
export const DEFAULT_BACKGROUND_COLOR = "#0f4d0e";
