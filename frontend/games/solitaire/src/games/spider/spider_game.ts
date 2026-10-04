import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { runCollectingEffects } from "@/games/common/move_effects";
import { dealRowCollectingRuns } from "@/games/common/row_deal";
import { DeckOptions } from "@/games/common/deck_options";
import { SPIDER_TWO_DECKS, dealSpiderLayout } from "./spider_deal";
import { SpiderRole, STOCK_PILE_ID, spiderZoneSpecs } from "./spider_zones";
import { ActionKind } from "@/games/common/action_kinds";

/**
 * Plays Spider: two decks on ten columns, a stock that deals a card to every
 * column, and completed runs that leave the board by themselves.
 */
export class SpiderGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The eight piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * Its `cardIds` chooses the suits, such as a one-suit set for the easy
   * variant.
   */
  constructor({
    cardIds = deckCardIds(SPIDER_TWO_DECKS),
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: spiderZoneSpecs(),
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

  /** Whether the stock may deal, which it may only when no column is empty. */
  public get canDeal(): boolean {
    return !this.stock.isEmpty && this.tableaus.every((t) => !t.isEmpty);
  }

  /**
   * Deals one card face up onto every column as one undoable action, and
   * returns whether the stock could deal.
   */
  public dealRow(): boolean {
    if (!this.canDeal) {
      return false;
    }

    const dealt = dealRowCollectingRuns(
      this.stock,
      this.tableaus,
      this.tableaus,
      this.foundations,
    );
    this.commitAction(ActionKind.DEAL, dealt.transfers, {
      flippedCardIds: dealt.flippedCardIds,
    });
    return true;
  }

  // --- What a Spider move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return runCollectingEffects(
      move,
      SpiderRole.TABLEAU,
      this.tableaus,
      this.foundations,
    );
  }
}
