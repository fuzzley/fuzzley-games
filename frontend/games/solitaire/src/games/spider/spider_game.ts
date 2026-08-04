import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import {
  collectCompletedRuns,
  flipExposedTop,
} from "@/games/common/completed_runs";
import { dealRowFromStock } from "@/games/common/row_deal";
import { SPIDER_TWO_DECKS, dealSpiderLayout } from "./spider_deal";
import { SpiderRole, STOCK_PILE_ID, spiderZoneSpecs } from "./spider_zones";

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
export class SpiderGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The eight piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * @param cardIds The card identities to deal from. Defaults to two full
   *   decks; a one-suit set makes the easy variant.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = deckCardIds(SPIDER_TWO_DECKS),
    random: () => number = Math.random,
  ) {
    super({
      zones: () => spiderZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [SpiderRole.TABLEAU],
      winsWhenAllCardsIn: SpiderRole.FOUNDATION,
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(SpiderRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SpiderRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealSpiderLayout(deck, this.tableaus, this.stock);
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
    const transfers = dealRowFromStock(this.stock, this.tableaus);

    // A dealt card can complete a run, and more than one column at a time.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    this.recordTransfers("deal", [...transfers, ...collected.transfers], {
      flippedCardIds: collected.flippedCardIds,
    });
    // Dealing a row can finish the last run, so the win is checked here as well
    // as after a move: this is an action the player took that the engine's own
    // move path never sees.
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
}
