import { CardPile } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { Visual } from "../visual";

/**
 * Visual representation of a Waste card pile.
 */
export class WastePileVisual extends Visual<CardPile<PlayingCard>> {
  constructor(cardPile: CardPile<PlayingCard> = new CardPile<PlayingCard>()) {
    super(cardPile);
  }
}
