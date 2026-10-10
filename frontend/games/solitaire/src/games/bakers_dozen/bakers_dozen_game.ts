import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/game/dealt_table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealBakersDozenLayout } from "./bakers_dozen_deal";
import { BakersDozenRole, bakersDozenZoneSpecs } from "./bakers_dozen_zones";

/**
 * Plays Baker's Dozen: thirteen open columns of four, played one card at a
 * time, whose emptied columns stay empty.
 */
export class BakersDozenGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The thirteen columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: bakersDozenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // Foundations only: which column a card goes to is the player's whole
      // decision.
      autoMoveRoles: [BakersDozenRole.FOUNDATION],
      winsWhenAllCardsIn: BakersDozenRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(BakersDozenRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(BakersDozenRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealBakersDozenLayout(deal, this.tableaus);
  }
}
