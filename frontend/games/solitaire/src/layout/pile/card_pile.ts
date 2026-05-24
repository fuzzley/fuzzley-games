import { Card } from "../../card/card";

/** Represents a pile of cards on the board. */
export interface CardPile {
  /** Returns a readonly list of cards. */
  getCards(): ReadonlyArray<Card>;

  /** Adds a card to the pile. */
  addCard(card: Card): void;

  /** Removes a card from the pile. */
  removeCard(card: Card): void;
}
