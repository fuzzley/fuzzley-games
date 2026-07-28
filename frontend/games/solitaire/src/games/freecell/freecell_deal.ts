import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";

/**
 * Deals cards into a FreeCell board.
 *
 * Simpler than Klondike's dealer in the one way that matters: every card is
 * dealt face up, so there is nothing to turn over later and no bonus for doing
 * so. The columns are filled round-robin, which is what gives the first four
 * seven cards and the last four six.
 */
export class FreeCellDealer {
  /**
   * @param registry The shared registry supplying persistent card instances.
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; a partial set exercises short-deck handling.
   * @param random Source of shuffle randomness in [0, 1). Injectable so a deal
   *   can be made deterministic in tests.
   */
  constructor(
    private readonly registry: CardRegistry,
    private readonly cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    private readonly random: () => number = Math.random,
  ) {}

  /** Registers every card face-up and returns them as a freshly shuffled deck. */
  public createShuffledDeck(): PlayingCard[] {
    const deck = this.cardIds.map((cardId) => {
      const card = this.registry.getOrCreate(cardId);
      card.faceUp = true;
      return card;
    });
    shuffle(deck, this.random);
    return deck;
  }

  /** How many distinct cards this dealer deals. */
  public get deckSize(): number {
    return this.cardIds.length;
  }

  /**
   * Deals `deck` across the columns, one card to each in turn.
   *
   * @param deck The cards to deal, which this method drains.
   * @param tableaus The columns to deal onto.
   */
  public dealOpeningLayout(
    deck: PlayingCard[],
    tableaus: readonly CardPile<PlayingCard>[],
  ): void {
    if (tableaus.length === 0) return;

    let column = 0;
    while (deck.length > 0) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = true;
      tableaus[column].addCard(card);
      column = (column + 1) % tableaus.length;
    }
  }

  /**
   * Deals a board one move from being won: every suit up to its Queen on the
   * foundations, and the four Kings waiting on the first four columns.
   *
   * @param foundations The foundation piles to fill.
   * @param tableaus The columns to seed with Kings.
   */
  public dealAlmostWin(
    foundations: readonly CardPile<PlayingCard>[],
    tableaus: readonly CardPile<PlayingCard>[],
  ): void {
    const cards = this.cardIds.map((cardId) => {
      const card = this.registry.getOrCreate(cardId);
      card.faceUp = true;
      return card;
    });

    const bySuit = new Map<number, PlayingCard[]>();
    for (const card of cards) {
      const suitCards = bySuit.get(card.suit) ?? [];
      suitCards.push(card);
      bySuit.set(card.suit, suitCards);
    }

    let suitIndex = 0;
    for (const suitCards of bySuit.values()) {
      const ordered = [...suitCards].sort((a, b) => a.rank - b.rank);
      const foundation = foundations[suitIndex % foundations.length];
      const tableau = tableaus[suitIndex % tableaus.length];
      for (const card of ordered.slice(0, ordered.length - 1)) {
        foundation.addCard(card);
      }
      const last = ordered[ordered.length - 1];
      if (last) tableau.addCard(last);
      suitIndex++;
    }
  }
}
