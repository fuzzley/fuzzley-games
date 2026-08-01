import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import {
  MoveEffects,
  ResolvedMove,
  TableGame,
} from "@/engine/tableau/table_game";
import { flipExposedTop } from "@/games/common/completed_runs";
import { YukonDealer } from "./yukon_deal";
import { YukonRole, YukonVariant, yukonZoneSpecs } from "./yukon_zones";

/** Lifecycle events a Yukon game emits. */
export type YukonEvents = {
  /** Emitted when every card has reached a foundation. */
  "game-won": undefined;
  /** Emitted when the game is restarted or a new game is dealt. */
  "game-reset": undefined;
};

/**
 * A game of Yukon, Alaska or Russian Solitaire.
 *
 * One deck across seven columns, no stock and no waste, and the family's
 * defining liberty: any face-up card may be lifted with everything resting on
 * it, ordered or not. That is what makes a board dealt entirely face up
 * winnable — a column is dismantled from the middle rather than from the top.
 *
 * The three games are one class because they differ in exactly one rule, which
 * their zones declare. Nothing below this line knows which is being played.
 *
 * Like FreeCell, there is no score: the Yukon family is played against the
 * deal, so a move earns nothing and turning a card over earns nothing either.
 */
export class YukonGame extends TableGame<YukonEvents> {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private initialDeck: PlayingCard[] = [];
  private readonly dealer: YukonDealer;

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param variant Which of the three games to play. A constructor parameter
   *   rather than a field because the zones are built from it during `super`,
   *   before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: YukonVariant = YukonVariant.YUKON,
  ) {
    const registry = new CardRegistry();
    super({
      zones: () => yukonZoneSpecs(variant),
      registry,
      // A foundation and nothing else. A column would take the card too, but
      // auto-moving to one means flinging a stack of unknown size at whichever
      // column happens to be declared first, which is never what was meant.
      autoMoveRoles: [YukonRole.FOUNDATION],
    });

    this.dealer = new YukonDealer(registry, cardIds, random);
    this.foundations = this.pilesOfRole(YukonRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(YukonRole.TABLEAU);
  }

  /** Shuffles the deck and deals a fresh board. */
  public startNewGame(): void {
    this.beginGame(() => {
      const deck = this.dealer.createShuffledDeck();
      this.initialDeck = [...deck];
      return deck;
    });
  }

  /** Restarts the game using the exact same deal. */
  public restartGame(): void {
    this.beginGame(() => this.reuseInitialDeck());
  }

  private beginGame(createDeck: () => PlayingCard[]): void {
    this.state.moves = 0;
    this.clearHistory();
    this.resetPiles();
    this.dealer.dealOpeningLayout(createDeck(), this.tableaus);
    this.emit("game-reset", undefined);
  }

  private reuseInitialDeck(): PlayingCard[] {
    if (this.initialDeck.length === 0) {
      this.initialDeck = [...this.dealer.createShuffledDeck()];
    }
    // Turned back down, because the dealer decides which cards a deal shows and
    // the previous deal left some of these face up.
    return this.initialDeck.map((card) => {
      card.faceUp = false;
      return card;
    });
  }

  // --- What a Yukon move does beyond moving its cards ---

  /**
   * Turns over the card the move exposed.
   *
   * The only effect a move has. There is no score to change, so no delta to
   * report and no flip bonus to award — a turned card is its own reward here.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const flipped =
      move.sourcePile.role === YukonRole.TABLEAU
        ? flipExposedTop(move.sourcePile)
        : undefined;
    return {
      scoreDelta: 0,
      flippedCardIds: flipped ? [flipped.id] : [],
    };
  }

  /** @inheritDoc */
  protected override afterMove(): void {
    const onFoundations = this.foundations.reduce(
      (total, pile) => total + pile.size,
      0,
    );
    // Counted against the cards actually in play rather than 52, so a short
    // injected deck can still be won.
    if (this.cardsInPlay > 0 && onFoundations === this.cardsInPlay) {
      this.emit("game-won", undefined);
    }
  }
}
