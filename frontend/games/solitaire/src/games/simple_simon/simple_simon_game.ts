import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns } from "@/games/common/completed_runs";
import { DeckOptions } from "@/games/common/deck_options";
import { dealSimpleSimonLayout } from "./simple_simon_deal";
import {
  DEFAULT_SIMPLE_SIMON_VARIANT,
  simpleSimonCardsPerColumn,
  simpleSimonDeck,
} from "./simple_simon_rules";
import {
  SimpleSimonRole,
  SimpleSimonVariant,
  simpleSimonZoneSpecs,
} from "./simple_simon_zones";

/** Configures a game of Simple Simon or Mrs. Mop. */
export interface SimpleSimonOptions extends DeckOptions {
  /** Which board to play on. */
  readonly variant?: SimpleSimonVariant;
}

/**
 * Plays Simple Simon or Mrs. Mop: Spider's rules with every card dealt face up
 * and no stock.
 */
export class SimpleSimonGame extends DealtTableGame {
  /** The piles completed runs go to, one per suit of each deck. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Which board is being played on. */
  public readonly variant: SimpleSimonVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    variant = DEFAULT_SIMPLE_SIMON_VARIANT,
    cardIds = deckCardIds(simpleSimonDeck(variant)),
    random = Math.random,
  }: SimpleSimonOptions = {}) {
    super({
      zones: simpleSimonZoneSpecs(variant),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [SimpleSimonRole.TABLEAU],
      winsWhenAllCardsIn: SimpleSimonRole.FOUNDATION,
    });

    this.variant = variant;
    this.foundations = this.pilesOfRole(SimpleSimonRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SimpleSimonRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealSimpleSimonLayout(
      deck,
      this.tableaus,
      simpleSimonCardsPerColumn(this.variant),
    );
  }

  // --- What a Simple Simon move does beyond moving its cards ---

  /**
   * Sends any run the move completed off to a foundation.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    void move;
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    return {
      scoreDelta: 0,
      flippedCardIds: collected.flippedCardIds,
      followUpTransfers: collected.transfers,
    };
  }
}
