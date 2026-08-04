import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { dealBakersDozenLayout } from "./bakers_dozen_deal";
import { BakersDozenRole, bakersDozenZoneSpecs } from "./bakers_dozen_zones";

/**
 * A game of Baker's Dozen.
 *
 * Thirteen columns of four, every card face up, no stock, and one card moved at
 * a time. Columns build down by rank in any suit, and an emptied column can
 * never be refilled.
 *
 * That last rule is what the game is about, and it runs against the instinct
 * every other solitaire here trains. Elsewhere a cleared column is the most
 * valuable square on the board; here it is a hole that stays a hole. The work is
 * digging low cards out from under high ones using only the tops of twelve other
 * columns as scratch space, and knowing which columns you can afford to spend.
 *
 * As with FreeCell and the Yukon family there is no score: the game is played
 * against the deal, so a move earns nothing. Nothing is ever turned over either,
 * so a move has no effects at all beyond relocating its card — which is why this
 * class overrides nothing but the deal.
 */
export class BakersDozenGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The thirteen columns. */
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
      zones: () => bakersDozenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A foundation and nothing else. A column would often take the card too,
      // but auto-moving to one means picking a column on the player's behalf
      // when which column it goes to is the entire decision.
      autoMoveRoles: [BakersDozenRole.FOUNDATION],
      winsWhenAllCardsIn: BakersDozenRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(BakersDozenRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(BakersDozenRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealBakersDozenLayout(deck, this.tableaus);
  }
}
