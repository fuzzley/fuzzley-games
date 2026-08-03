import { CardDeckId } from "./card_deck";

/**
 * Subscribes to a value the board follows, returning a function that stops
 * following it.
 *
 * A plain callback rather than an observable because the render tier may not
 * name a reactive library: whatever publishes the value adapts to this.
 */
export type Subscribe<T> = (listener: (value: T) => void) => () => void;

/**
 * What a board has to say about the deck it was asked to draw.
 *
 * Choosing a deck is the one table setting that cannot simply be obeyed: it is
 * a couple of megabytes of texture, which has to arrive before anything can be
 * drawn from it and may not arrive at all. So the board answers, and whoever
 * offered the choice can say the deck is on its way rather than leaving the
 * player looking at cards that have not changed.
 */
export type CardDeckStatus =
  /** Being fetched. Nothing on the table has changed yet. */
  | { readonly kind: "loading"; readonly deckId: CardDeckId }
  /** On the table. Every card and placeholder is drawn from it. */
  | { readonly kind: "drawn"; readonly deckId: CardDeckId }
  /**
   * Could not be fetched. The board is still drawing whichever deck it last
   * reported as `drawn`: a texture that never arrived would draw every card as
   * a blank rectangle, which is worse than the deck being left.
   */
  | { readonly kind: "unavailable"; readonly deckId: CardDeckId };

/**
 * The player's choices about how the table looks.
 *
 * Deliberately not part of any game. Which card back and which felt colour a
 * player prefers is the same preference whether they are playing Klondike,
 * FreeCell or Spider, so it is supplied to a board rather than owned by one.
 */
export interface TablePresentation {
  /** The artwork key for the back of a card. */
  cardBackKey(): string;

  /** The deck the cards are drawn from. */
  cardDeckId(): CardDeckId;

  /** Follows the table colour. */
  readonly onBackgroundColor: Subscribe<string>;

  /**
   * Follows the deck.
   *
   * A subscription rather than a read like {@link cardBackKey}, because a deck
   * is a texture: swapping one in means having it loaded first, so the board
   * has to be told when the choice changes rather than noticing on the next
   * frame.
   */
  readonly onCardDeck: Subscribe<CardDeckId>;

  /**
   * Told which deck the board is actually drawing, whenever that changes.
   *
   * The answer to {@link onCardDeck}, and the only setting that has one: a
   * chosen felt colour is the felt colour, but a chosen deck is a request that
   * takes time and can fail. Without this the drawer would go on showing a deck
   * the board never managed to draw.
   */
  reportCardDeckStatus(status: CardDeckStatus): void;
}

/** The board colour used before a player has chosen one. */
export const DEFAULT_BACKGROUND_COLOR = "#0f4d0e";
