import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { ZoneSpec } from "../zone";

/**
 * The read-only face of a table game that drawing it requires.
 *
 * Narrowed to exactly this so the view builder cannot reach for a particular
 * game's vocabulary — there is no `stock` here, and no `foundations`. Any
 * `TableGame` satisfies it structurally, and so does a stub, which is what
 * makes the builder testable without a game at all.
 */
export interface TableView {
  /** Every pile on the board, bottom of the draw order first. */
  readonly piles: readonly CardPile<PlayingCard>[];

  /** Every pile a dragged stack may be dropped onto. */
  readonly dropTargetPiles: readonly CardPile<PlayingCard>[];

  /** The zone describing a pile, or undefined for an unknown id. */
  zoneFor(pileId: string): ZoneSpec | undefined;

  /** The card with the given id, or undefined. */
  getCardById(cardId: string): PlayingCard | undefined;

  /** The pile with the given id, or undefined. */
  getPileById(pileId: string): CardPile<PlayingCard> | undefined;

  /** The pile currently holding the given card, or undefined. */
  getPileContainingCard(cardId: string): CardPile<PlayingCard> | undefined;

  /** Whether the card can be picked up out of the pile holding it. */
  isCardInteractableInPile(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean;

  /** Whether the card can be dragged out of the pile holding it. */
  isCardDraggableInPile(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean;

  /** Whether the card, with its stack, may legally move to the given pile. */
  canMoveCardToPile(cardId: string, targetPileId: string): boolean;
}

/** The look of the cards, which is a player's choice rather than a rule. */
export interface TablePresentation {
  /** The artwork key for the back of a card. */
  readonly cardBackKey: string;
}
