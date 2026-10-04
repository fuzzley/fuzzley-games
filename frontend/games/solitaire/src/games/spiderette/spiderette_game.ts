import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { runCollectingEffects } from "@/games/common/move_effects";
import { dealRowCollectingRuns } from "@/games/common/row_deal";
import { DeckOptions } from "@/games/common/deck_options";
import { dealSpideretteLayout } from "./spiderette_deal";
import {
  DEFAULT_SPIDERETTE_VARIANT,
  SpideretteVariant,
} from "./spiderette_rules";
import {
  SpideretteRole,
  STOCK_PILE_ID,
  spideretteZoneSpecs,
} from "./spiderette_zones";
import { ActionKind } from "@/games/common/action_kinds";

/** Configures a game of Spiderette or Will o' the Wisp. */
export interface SpideretteOptions extends DeckOptions {
  /** Which of the two openings to deal. */
  readonly variant?: SpideretteVariant;
}

/**
 * Plays Spiderette or Will o' the Wisp: Spider's rules on one deck and seven
 * columns.
 */
export class SpideretteGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private readonly variant: SpideretteVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = DEFAULT_SPIDERETTE_VARIANT,
  }: SpideretteOptions = {}) {
    super({
      zones: spideretteZoneSpecs(),
      deck: { cardIds, random },
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [SpideretteRole.TABLEAU],
      winsWhenAllCardsIn: SpideretteRole.FOUNDATION,
    });

    this.variant = variant;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(SpideretteRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SpideretteRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealSpideretteLayout(deal, this.tableaus, this.stock, this.variant);
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may whenever it still holds cards.
   *
   * Unlike Spider, an empty column does not stop a deal: the last row is always
   * short, so that rule could strand it.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty;
  }

  /**
   * Deals one card face up onto each column as far as the stock reaches, as
   * one undoable action, and returns whether the stock could deal.
   */
  public dealRow(): boolean {
    if (!this.canDeal) {
      return false;
    }

    const dealt = dealRowCollectingRuns(
      this.tabletop,
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

  // --- What a Spiderette move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return runCollectingEffects(
      this.tabletop,
      move,
      SpideretteRole.TABLEAU,
      this.tableaus,
      this.foundations,
    );
  }
}
