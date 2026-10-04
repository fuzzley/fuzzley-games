import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Tabletop } from "./tabletop";

/**
 * Lays a shuffled deck out on the table as a game begins: hands out the cards
 * in deal order and places them through the tabletop, outside the history.
 *
 * Dealing puts cards straight onto piles, so it bypasses the placement rules
 * entirely; a deal has to honour a pile's capacity itself.
 */
export class Deal {
  /**
   * Creates a deal of `cards`, which it drains from the end, so the last card
   * is dealt first.
   */
  constructor(
    private readonly cards: PlayingCard[],
    private readonly tabletop: Tabletop,
  ) {}

  /** How many cards are left to deal. */
  get remaining(): number {
    return this.cards.length;
  }

  /** The cards left to deal, the next one last. */
  get undealt(): readonly PlayingCard[] {
    return this.cards;
  }

  /** Returns the card that would be dealt next, without taking it. */
  peek(): PlayingCard | undefined {
    return this.cards.at(-1);
  }

  /** Takes the next card off the deck, or undefined once it has run out. */
  draw(): PlayingCard | undefined {
    return this.cards.pop();
  }

  /** Takes every card left, the next one last, leaving the deck empty. */
  drawAll(): PlayingCard[] {
    return this.cards.splice(0);
  }

  /** Puts a card on a pile, showing the side given. */
  place(
    card: PlayingCard,
    pile: ReadonlyCardPile<PlayingCard>,
    faceUp: boolean,
  ): void {
    this.tabletop.place(card, pile, faceUp);
  }

  /**
   * Deals the next card onto a pile and returns it, or undefined once the deck
   * has run out.
   */
  dealTo(
    pile: ReadonlyCardPile<PlayingCard>,
    faceUp: boolean,
  ): PlayingCard | undefined {
    const card = this.draw();
    if (card) this.place(card, pile, faceUp);
    return card;
  }

  /**
   * Deals one card onto each pile in turn, as far as the deck reaches, and
   * returns whether it reached them all.
   */
  dealEach(
    piles: readonly ReadonlyCardPile<PlayingCard>[],
    faceUp: boolean,
  ): boolean {
    return piles.every((pile) => this.dealTo(pile, faceUp) !== undefined);
  }

  /** Deals every card left onto one pile. */
  dealRest(pile: ReadonlyCardPile<PlayingCard>, faceUp: boolean): void {
    while (this.dealTo(pile, faceUp));
  }

  /**
   * Takes out every card matching `predicate` and returns them in the order
   * the deal would have reached them.
   *
   * For a deal that places some cards before the rest, such as Aces that start
   * on the foundations.
   */
  pull(predicate: (card: PlayingCard) => boolean): PlayingCard[] {
    const pulled: PlayingCard[] = [];
    for (let index = this.cards.length - 1; index >= 0; index--) {
      const card = this.cards[index];
      if (card && predicate(card)) {
        pulled.push(card);
        this.cards.splice(index, 1);
      }
    }
    return pulled;
  }

  /**
   * Takes out the first card matching `predicate` that the deal would reach,
   * and returns it, or undefined when no card matches.
   */
  pullFirst(
    predicate: (card: PlayingCard) => boolean,
  ): PlayingCard | undefined {
    for (let index = this.cards.length - 1; index >= 0; index--) {
      const card = this.cards[index];
      if (card && predicate(card)) {
        this.cards.splice(index, 1);
        return card;
      }
    }
    return undefined;
  }

  /** Puts cards back on top of the deck, the first given to be dealt first. */
  putBack(cards: readonly PlayingCard[]): void {
    this.cards.push(...[...cards].reverse());
  }

  /** Puts a card at the bottom of the deck, to be dealt last. */
  putUnder(card: PlayingCard): void {
    this.cards.unshift(card);
  }
}
