import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns } from "@/games/common/completed_runs";
import { dealSimpleSimonLayout } from "./simple_simon_deal";
import { SimpleSimonRole, simpleSimonZoneSpecs } from "./simple_simon_zones";

/**
 * A game of Simple Simon.
 *
 * One deck across ten columns, no stock, and every card face up from the deal.
 * Columns build down by rank in any suit, but only a same-suit run can be
 * lifted, and a completed King-to-Ace run leaves the board for a foundation as
 * soon as the move that finished it lands.
 *
 * Spider's rules on a board with nothing hidden and nothing held back. That
 * sounds gentler than Spider and mostly is, but it changes what the game asks
 * of a player rather than merely lowering the difficulty: there is no stock to
 * bail out a dead position and no face-down card whose turning might rescue one,
 * so a board that has been played into a corner stays there. Every deal is
 * winnable or not from the first move, and finding out which is the game.
 *
 * There is no score, as there is none in FreeCell or the Yukon family: the game
 * is played against the deal, so a move earns nothing.
 */
export class SimpleSimonGame extends DealtTableGame {
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => simpleSimonZoneSpecs(),
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
   * Nothing is ever turned over — there are no face-down cards to expose — so
   * unlike Spider and Scorpion this reports no flips of its own. The collected
   * runs still report theirs, which will always be empty for the same reason;
   * passing them through rather than dropping them keeps the two games' effects
   * the same shape, and costs nothing.
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
