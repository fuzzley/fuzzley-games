import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/moves/move";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { dealRowFromStock } from "@/games/common/row_deal";
import { DeckOptions } from "@/games/common/deck_options";
import { dealEasthavenLayout } from "./easthaven_deal";
import {
  EasthavenRole,
  STOCK_PILE_ID,
  easthavenZoneSpecs,
} from "./easthaven_zones";
import { ActionKind } from "@/games/common/action_kinds";

/**
 * Plays Easthaven: Klondike's columns and foundations with a stock that deals a
 * card onto every column.
 */
export class EasthavenGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: ReadonlyCardPile<PlayingCard>;
  /** The four suit foundation piles. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: easthavenZoneSpecs(),
      deck: { cardIds, random },
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
  protected override dealBoard(deal: Deal): void {
    dealEasthavenLayout(deal, this.tableaus, this.stock);
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

    this.commitAction(
      ActionKind.DEAL,
      dealRowFromStock(this.tabletop, this.stock, this.tableaus),
    );
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
