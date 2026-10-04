import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { runCollectingEffects } from "@/games/common/move_effects";
import { dealRowCollectingRuns } from "@/games/common/row_deal";
import { DeckOptions } from "@/games/common/deck_options";
import { dealScorpionLayout } from "./scorpion_deal";
import {
  DEFAULT_SCORPION_VARIANT,
  scorpionHiddenColumnCount,
} from "./scorpion_rules";
import {
  STOCK_PILE_ID,
  ScorpionRole,
  ScorpionVariant,
  scorpionZoneSpecs,
} from "./scorpion_zones";
import { ActionKind } from "@/games/common/action_kinds";

/** How many columns the stock deals onto: the first three, one card each. */
export const STOCK_DEAL_COLUMN_COUNT = 3;

/** Configures a game of the Scorpion family. */
export interface ScorpionOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: ScorpionVariant;
}

/**
 * Plays Scorpion, Wasp or Scorpion II: Spider's run collecting with Yukon's
 * lifting, where any face-up card lifts with everything on it but lands only
 * on its own suit.
 */
export class ScorpionGame extends DealtTableGame {
  /** The three-card pile that deals itself out in one press. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Which of the family is being played. */
  public readonly variant: ScorpionVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = DEFAULT_SCORPION_VARIANT,
  }: ScorpionOptions = {}) {
    super({
      zones: scorpionZoneSpecs(variant),
      deck: { cardIds, random },
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [ScorpionRole.TABLEAU],
      winsWhenAllCardsIn: ScorpionRole.FOUNDATION,
    });

    this.variant = variant;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(ScorpionRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(ScorpionRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealScorpionLayout(
      deal,
      this.tableaus,
      this.stock,
      scorpionHiddenColumnCount(this.variant),
    );
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may whenever it still holds cards.
   *
   * Unlike Spider, an empty column deliberately does not stop a deal, as
   * Scorpion's rules have it.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty;
  }

  /**
   * Deals the whole stock, one card face up onto each of the first three
   * columns, as one undoable action, and returns whether it could.
   */
  public dealStock(): boolean {
    if (!this.canDeal) {
      return false;
    }

    const dealt = dealRowCollectingRuns(
      this.tabletop,
      this.stock,
      this.tableaus.slice(0, STOCK_DEAL_COLUMN_COUNT),
      this.tableaus,
      this.foundations,
    );
    this.commitAction(ActionKind.DEAL, dealt.transfers, {
      flippedCardIds: dealt.flippedCardIds,
    });
    return true;
  }

  // --- What a Scorpion move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return runCollectingEffects(
      this.tabletop,
      move,
      ScorpionRole.TABLEAU,
      this.tableaus,
      this.foundations,
    );
  }
}
