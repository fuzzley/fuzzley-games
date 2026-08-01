import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";

/**
 * How many cards each column is dealt.
 *
 * Six across eight columns is forty-eight, and the four the standard deck has
 * left over are exactly what the opening cells hold.
 */
export const CARDS_PER_COLUMN = 6;

/**
 * Deals cards into an Eight Off board.
 *
 * Every card goes down face up, so there is nothing to turn over later and no
 * bonus for doing so — the player can see the whole position from the first
 * move, and the game is entirely one of planning.
 */
export class EightOffDealer {
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

  /**
   * Deals `deck` six to a column, then puts whatever is left over one to a cell.
   *
   * Short decks are dealt round-robin rather than column-by-column, so a deck
   * too small to fill the tableau still spreads across every column instead of
   * loading the first few and leaving the rest bare.
   *
   * @param deck The cards to deal, which this method drains.
   * @param tableaus The columns to deal onto.
   * @param cells The cells the leftover cards go into.
   */
  public dealOpeningLayout(
    deck: PlayingCard[],
    tableaus: readonly CardPile<PlayingCard>[],
    cells: readonly CardPile<PlayingCard>[],
  ): void {
    if (tableaus.length === 0) return;

    const toColumns = Math.min(deck.length, tableaus.length * CARDS_PER_COLUMN);
    for (let dealt = 0; dealt < toColumns; dealt++) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = true;
      tableaus[dealt % tableaus.length].addCard(card);
    }

    // One card per cell, and no more: a cell's capacity is declared on its zone
    // and enforced by the move rules, but CardPile.addCard takes whatever it is
    // given. Dealing straight into a pile bypasses the rules, so the limit has
    // to be honoured here as well as declared there.
    for (const cell of cells) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = true;
      cell.addCard(card);
    }
  }
}
