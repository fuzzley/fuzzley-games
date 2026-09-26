import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { dealRowFromStock } from "@/games/common/row_deal";
import { dealEasthavenLayout } from "./easthaven_deal";
import {
  EasthavenRole,
  STOCK_PILE_ID,
  easthavenZoneSpecs,
} from "./easthaven_zones";

/**
 * Plays Easthaven: Klondike's columns and foundations with a stock that deals a
 * card onto every column.
 */
export class EasthavenGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => easthavenZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Foundations only: sending a stack to whichever column is declared
      // first is never what was meant.
      autoMoveRoles: [EasthavenRole.FOUNDATION],
      winsWhenAllCardsIn: EasthavenRole.FOUNDATION,
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(EasthavenRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(EasthavenRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealEasthavenLayout(deck, this.tableaus, this.stock);
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may only when no column is empty.
   *
   * Spider's rule, kept deliberately, although with Kings-only columns it can
   * leave a player with neither a move nor a deal.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty && this.tableaus.every((pile) => !pile.isEmpty);
  }

  /**
   * Deals one card face up onto each column as far as the stock reaches, as
   * one undoable action, and returns whether the stock could deal.
   *
   * Unlike Spider's deal, no win check follows: a dealt card never lands on a
   * foundation.
   */
  public dealRow(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.commitAction("deal", dealRowFromStock(this.stock, this.tableaus));
    return true;
  }

  // --- What an Easthaven move does beyond moving its cards ---

  /**
   * Turns over the card the move exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return flipOnlyEffects(move, EasthavenRole.TABLEAU);
  }
}
