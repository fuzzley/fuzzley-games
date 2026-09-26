import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns } from "@/games/common/completed_runs";
import { runCollectingEffects } from "@/games/common/move_effects";
import { dealRowFromStock } from "@/games/common/row_deal";
import { dealScorpionLayout } from "./scorpion_deal";
import {
  STOCK_PILE_ID,
  ScorpionRole,
  scorpionZoneSpecs,
} from "./scorpion_zones";

/** How many columns the stock deals onto: the first three, one card each. */
export const STOCK_DEAL_COLUMN_COUNT = 3;

/**
 * Plays Scorpion: Spider's run collecting with Yukon's lifting, where any
 * face-up card lifts with everything on it but lands only on its own suit.
 */
export class ScorpionGame extends DealtTableGame {
  /** The three-card pile that deals itself out in one press. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => scorpionZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [ScorpionRole.TABLEAU],
      winsWhenAllCardsIn: ScorpionRole.FOUNDATION,
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(ScorpionRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(ScorpionRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealScorpionLayout(deck, this.tableaus, this.stock);
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

    this.state.moves++;
    const transfers = dealRowFromStock(
      this.stock,
      this.tableaus.slice(0, STOCK_DEAL_COLUMN_COUNT),
    );

    // A dealt card can complete a run, and can uncover one buried under the
    // column it lands on top of.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    this.recordTransfers("deal", [...transfers, ...collected.transfers], {
      flippedCardIds: collected.flippedCardIds,
    });
    // The engine checks for a win only after a move, and dealing the stock can
    // finish the last run.
    this.checkWinCondition();
    return true;
  }

  // --- What a Scorpion move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return runCollectingEffects(
      move,
      ScorpionRole.TABLEAU,
      this.tableaus,
      this.foundations,
    );
  }
}
