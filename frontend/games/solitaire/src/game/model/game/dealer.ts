import { CardRegistry } from "../card/card_registry";
import { CardPile } from "../card/card_pile";
import { Deck } from "../card/deck";
import {
  ALL_PLAYING_CARD_IDS,
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  PlayingCardId,
  playingCardIdToString,
  Rank,
} from "../card/playing_card";

/**
 * The card ranks loaded onto the foundations by an almost-win deal: everything
 * below the King, so a single move per suit finishes the game.
 */
const BELOW_KING: readonly Rank[] = ALL_RANKS.filter(
  (rank) => rank !== Rank.KING,
);

/**
 * Deals cards into piles for a Klondike game.
 *
 * Owns deck creation, shuffling, and the two opening layouts (a normal random
 * deal and the debug almost-win deal), keeping that responsibility out of
 * {@link SolitaireGame}. All cards it deals come from the shared
 * {@link CardRegistry}, so instances are reused across deals.
 */
export class Dealer {
  /**
   * @param registry The shared registry supplying persistent card instances.
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; a partial set exercises short-deck handling.
   * @param random Source of shuffle randomness in [0, 1). Injectable so a deal
   *   can be made deterministic in tests.
   */
  constructor(
    private readonly registry: CardRegistry,
    private readonly cardIds: ReadonlyArray<PlayingCardId> = ALL_PLAYING_CARD_IDS,
    private readonly random: () => number = Math.random,
  ) {}

  /** Registers every card face-down and returns them as a freshly shuffled deck. */
  public createShuffledDeck(): PlayingCard[] {
    const deck = new Deck<PlayingCard>();
    for (const card of this.registerAllFaceDown()) {
      deck.addCard(card);
    }
    deck.shuffle(this.random);
    return [...deck.getCards()];
  }

  /**
   * Deals `deck` into the standard opening layout: tableau column i receives
   * i + 1 cards with only its top card face-up, and every remaining card goes
   * face-down onto the stock. Consumes `deck` from the top (end).
   *
   * @param deck The cards to deal, which this method drains.
   * @param tableaus The tableau piles to deal onto.
   * @param stock The stock pile to fill with the remainder.
   */
  public dealOpeningLayout(
    deck: PlayingCard[],
    tableaus: readonly CardPile<PlayingCard>[],
    stock: CardPile<PlayingCard>,
  ): void {
    for (let tableauIndex = 0; tableauIndex < tableaus.length; tableauIndex++) {
      for (let cardIndex = 0; cardIndex <= tableauIndex; cardIndex++) {
        const card = deck.pop();
        if (card) {
          card.faceUp = cardIndex === tableauIndex;
          tableaus[tableauIndex].addCard(card);
        }
      }
    }
    while (deck.length > 0) {
      const card = deck.pop();
      if (card) {
        card.faceUp = false;
        stock.addCard(card);
      }
    }
  }

  /**
   * Deals an almost-won board for verification: Ace through Queen of each suit
   * are loaded face-up onto the foundations, and the four Kings are placed
   * face-up on the first four tableaus, leaving the stock and waste empty.
   *
   * @param foundations The foundation piles to fill.
   * @param tableaus The tableau piles to seed with Kings.
   */
  public dealAlmostWin(
    foundations: readonly CardPile<PlayingCard>[],
    tableaus: readonly CardPile<PlayingCard>[],
  ): void {
    this.registerAllFaceDown();

    // Foundations and tableaus are both seeded in suit order, so each suit's
    // King waits on the tableau in the same position as its own foundation.
    ALL_SUITS.forEach((suit, suitIndex) => {
      for (const rank of BELOW_KING) {
        this.placeFaceUp({ suit, rank }, foundations[suitIndex]);
      }
      this.placeFaceUp({ suit, rank: Rank.KING }, tableaus[suitIndex]);
    });
  }

  /** Registers every configured card, resets it face-down, and returns them. */
  private registerAllFaceDown(): PlayingCard[] {
    return this.cardIds.map((cardId) => {
      const card = this.registry.getOrCreate(cardId);
      card.faceUp = false;
      return card;
    });
  }

  /**
   * Turns the identified card face up and adds it to `pile`, if that card is
   * part of the configured deck. Cards outside the deck are skipped, so an
   * almost-win deal from a partial deck simply places fewer cards.
   */
  private placeFaceUp(
    cardId: PlayingCardId,
    pile: CardPile<PlayingCard>,
  ): void {
    const card = this.registry.get(playingCardIdToString(cardId));
    if (card) {
      card.faceUp = true;
      pile.addCard(card);
    }
  }
}
