import { CardRegistry } from "@/engine/core/card/card_registry";
import {
  DeckCardId,
  PlayingCard,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";

/**
 * The cards a game deals from, and the state they arrive in.
 *
 * Every game had its own copy of this: register each identity against the
 * shared registry, turn it to the side the game deals, shuffle. The only thing
 * they disagreed about was that side — Klondike buries its deal face down,
 * FreeCell shows the whole board — so that is the one thing this takes as a
 * parameter and the rest is written once.
 *
 * Holds the {@link CardRegistry} rather than being handed one alongside it, so
 * the cards a game deals and the cards it can look up by id cannot come from
 * two different places.
 */
export class DeckSource {
  /**
   * @param registry The shared registry supplying persistent card instances.
   * @param cardIds The card identities to deal from. A partial set is a short
   *   deck, which every game is expected to survive.
   * @param random Source of shuffle randomness in [0, 1). Injectable so a deal
   *   can be made deterministic in tests.
   * @param dealsFaceUp Which side a freshly dealt card shows. False buries the
   *   deal; true is for the games with no hidden information at all.
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
   * Registers every card and returns them in deck order, each turned to the
   * side this deck deals.
   *
   * A fresh array every call, so a caller may shuffle or drain it without
   * disturbing the registry it came from.
   */
  register(): PlayingCard[] {
    return this.reset(this.cardIds.map((id) => this.registry.getOrCreate(id)));
  }

  /** Registers every card and returns them freshly shuffled. */
  createShuffledDeck(): PlayingCard[] {
    return shuffle(this.register(), this.random);
  }

  /**
   * Turns the given cards back to the side this deck deals, in place.
   *
   * What a restart needs: the previous deal left some of these face up, and the
   * deal about to happen decides for itself which ones show.
   */
  reset(cards: PlayingCard[]): PlayingCard[] {
    for (const card of cards) {
      card.faceUp = this.dealsFaceUp;
    }
    return cards;
  }

  /**
   * The registered card for one identity, or undefined for a card this deck
   * does not deal.
   *
   * For a deal that places named cards rather than whatever comes off the top:
   * an almost-win board asks for each suit's King by name, and a short deck
   * simply does not have one to give. Answers from the registry, so it is only
   * meaningful once {@link register} has run.
   */
  find(cardId: DeckCardId): PlayingCard | undefined {
    return this.registry.get(playingCardInstanceId(cardId));
  }
}
