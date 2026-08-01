import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";

/**
 * How many face-up cards every column but the first receives.
 *
 * The five is what makes Yukon Yukon. Klondike shows one card per column and
 * hides the rest behind a stock; Yukon has no stock at all, so it puts five
 * face-up cards on each column instead and asks the player to work with
 * everything they can see.
 */
export const FACE_UP_PER_COLUMN = 5;

/**
 * Deals cards into a Yukon board.
 *
 * The whole deck goes onto the columns: one card on the first, then column i
 * takes i face-down cards under its five face-up ones. That comes to
 * 1 + 6 + 7 + 8 + 9 + 10 + 11 = 52, which is why the family needs no stock and
 * why it deals in exactly this shape.
 */
export class YukonDealer {
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

  /** Registers every card face-down and returns them freshly shuffled. */
  public createShuffledDeck(): PlayingCard[] {
    const deck = this.cardIds.map((cardId) => {
      const card = this.registry.getOrCreate(cardId);
      card.faceUp = false;
      return card;
    });
    shuffle(deck, this.random);
    return deck;
  }

  /**
   * Deals `deck` across the columns in the Yukon shape, consuming it from the
   * top (end).
   *
   * @param deck The cards to deal, which this method drains.
   * @param tableaus The columns to deal onto.
   */
  public dealOpeningLayout(
    deck: PlayingCard[],
    tableaus: readonly CardPile<PlayingCard>[],
  ): void {
    for (let column = 0; column < tableaus.length; column++) {
      // The first column is the exception in both directions: no cards buried
      // under it, and a single card on it rather than five.
      const faceUpCount = column === 0 ? 1 : FACE_UP_PER_COLUMN;

      for (let dealt = 0; dealt < column + faceUpCount; dealt++) {
        const card = deck.pop();
        // A short injected deck simply runs out; the columns already dealt
        // stand as they are rather than the deal failing.
        if (!card) return;
        // The first `column` cards of a column are its buried ones.
        card.faceUp = dealt >= column;
        tableaus[column].addCard(card);
      }
    }
  }
}
