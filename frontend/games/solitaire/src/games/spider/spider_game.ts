import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";
import {
  MoveEffects,
  ResolvedMove,
  TableGame,
} from "@/engine/tableau/table_game";
import {
  collectCompletedRuns,
  flipExposedTop,
} from "@/games/common/completed_runs";
import { SPIDER_TWO_DECKS, SpiderDealer } from "./spider_deal";
import { SpiderRole, STOCK_PILE_ID, spiderZoneSpecs } from "./spider_zones";

/** Lifecycle events a Spider game emits. */
export type SpiderEvents = {
  /** Emitted when all eight runs have been completed. */
  "game-won": undefined;
  /** Emitted when the game is restarted or a new game is dealt. */
  "game-reset": undefined;
};

/**
 * A game of Spider.
 *
 * Two decks, ten columns, and a stock that deals a card to every column at
 * once rather than turning cards into a waste. Columns build down by rank
 * regardless of suit, but only a same-suit run can be lifted — which is what
 * makes it hard.
 *
 * A completed King-to-Ace run leaves the board as soon as the move that
 * finished it lands. That is not a move the player made, and it is not a
 * separate action either: one undo takes both back, which is why an applied
 * move records a list of transfers rather than a single from-and-to.
 */
export class SpiderGame extends TableGame<SpiderEvents> {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The eight piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private initialDeck: PlayingCard[] = [];
  private readonly dealer: SpiderDealer;

  /**
   * @param cardIds The card identities to deal from. Defaults to two full
   *   decks; a one-suit set makes the easy variant.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = deckCardIds(SPIDER_TWO_DECKS),
    random: () => number = Math.random,
  ) {
    const registry = new CardRegistry();
    super({
      zones: () => spiderZoneSpecs(),
      registry,
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [SpiderRole.TABLEAU],
    });

    this.dealer = new SpiderDealer(registry, cardIds, random);
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(SpiderRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SpiderRole.TABLEAU);
  }

  /** Shuffles the decks and deals a fresh board. */
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
    this.state.score = 0;
    this.state.moves = 0;
    this.clearHistory();
    this.resetPiles();
    this.dealer.dealOpeningLayout(createDeck(), this.tableaus, this.stock);
    this.emit("game-reset", undefined);
  }

  private reuseInitialDeck(): PlayingCard[] {
    if (this.initialDeck.length === 0) {
      this.initialDeck = [...this.dealer.createShuffledDeck()];
    }
    return this.initialDeck.map((card) => {
      card.faceUp = false;
      return card;
    });
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may only when no column is empty.
   *
   * The rule exists because a card dealt onto an empty column is unrecoverable:
   * an empty column is the most valuable thing on a Spider board.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty && this.tableaus.every((t) => !t.isEmpty);
  }

  /**
   * Deals one card face up onto every column.
   *
   * Ten cards to ten different piles, as one action: the transfers are recorded
   * together so a single undo takes the whole row back.
   */
  public dealRow(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.state.moves++;
    const transfers: CardTransfer[] = [];
    for (const tableau of this.tableaus) {
      const card = this.stock.topCard;
      if (!card) break;
      this.stock.removeCard(card);
      card.faceUp = true;
      tableau.addCard(card);
      transfers.push({
        cardIds: [card.id],
        fromPileId: this.stock.id,
        toPileId: tableau.id,
        faceUpBefore: false,
      });
    }

    // A dealt card can complete a run, and more than one column at a time.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    this.recordTransfers("deal", [...transfers, ...collected.transfers], {
      flippedCardIds: collected.flippedCardIds,
    });
    this.checkWinCondition();
    return true;
  }

  // --- What a Spider move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const flipped =
      move.sourcePile.role === SpiderRole.TABLEAU
        ? flipExposedTop(move.sourcePile)
        : undefined;
    // Collected after the flip, because taking a run off can expose another
    // card, and every card this move turned over has to be recorded together
    // for undo to turn them all back down.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    return {
      scoreDelta: 0,
      flippedCardIds: [
        ...(flipped ? [flipped.id] : []),
        ...collected.flippedCardIds,
      ],
      followUpTransfers: collected.transfers,
    };
  }

  /** @inheritDoc */
  protected override afterMove(): void {
    this.checkWinCondition();
  }

  private checkWinCondition(): void {
    const collected = this.foundations.reduce(
      (total, pile) => total + pile.size,
      0,
    );
    if (this.cardsInPlay > 0 && collected === this.cardsInPlay) {
      this.emit("game-won", undefined);
    }
  }
}
