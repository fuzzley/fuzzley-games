import { CardRegistry } from "@/engine/core/card/card_registry";
import {
  DeckCardId,
  PlayingCard,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";

/** Supplies the cards a game deals from, turned to the side it deals them. */
export class DeckSource {
  /**
   * Creates a deck of the given cards, drawn from the shared registry.
   *
   * @param cardIds The card identities to deal from. A partial set is a short
   *   deck, which every game is expected to survive.
   * @param random Returns a number in [0, 1) for shuffling.
   * @param dealsFaceUp Whether a freshly dealt card shows its face.
   */
  constructor(
    public readonly registry: CardRegistry,
    private readonly cardIds: ReadonlyArray<DeckCardId>,
    private readonly random: () => number = Math.random,
    private readonly dealsFaceUp = false,
  ) {}

  /** How many distinct cards this deck deals. */
  get size(): number {
    return this.cardIds.length;
  }

  /**
   * Registers every card and returns a fresh array of them in deck order, each
   * turned to the side this deck deals.
   */
  register(): PlayingCard[] {
    return this.reset(this.cardIds.map((id) => this.registry.getOrCreate(id)));
  }

  /** Registers every card and returns them freshly shuffled. */
  createShuffledDeck(): PlayingCard[] {
    return shuffle(this.register(), this.random);
  }

  /** Turns the given cards back to the side this deck deals, in place. */
  reset(cards: PlayingCard[]): PlayingCard[] {
    for (const card of cards) {
      card.faceUp = this.dealsFaceUp;
    }
    return cards;
  }

  /**
   * Returns the registered card for one identity, or undefined for a card this
   * deck does not deal.
   *
   * Only meaningful once {@link register} has run.
   */
  find(cardId: DeckCardId): PlayingCard | undefined {
    return this.registry.get(playingCardInstanceId(cardId));
  }
}
