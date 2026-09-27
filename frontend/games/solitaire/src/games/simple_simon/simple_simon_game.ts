import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns } from "@/games/common/completed_runs";
import { DeckOptions } from "@/games/common/deck_options";
import { dealSimpleSimonLayout } from "./simple_simon_deal";
import { SimpleSimonRole, simpleSimonZoneSpecs } from "./simple_simon_zones";

/**
 * Plays Simple Simon: Spider's rules on one deck, dealt face up across ten
 * columns with no stock.
 */
export class SimpleSimonGame extends DealtTableGame {
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: simpleSimonZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [SimpleSimonRole.TABLEAU],
      winsWhenAllCardsIn: SimpleSimonRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(SimpleSimonRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SimpleSimonRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealSimpleSimonLayout(deck, this.tableaus);
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
