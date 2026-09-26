import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { dealBakersDozenLayout } from "./bakers_dozen_deal";
import { BakersDozenRole, bakersDozenZoneSpecs } from "./bakers_dozen_zones";

/**
 * Plays Baker's Dozen: thirteen open columns of four, played one card at a
 * time, whose emptied columns stay empty.
 */
export class BakersDozenGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The thirteen columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: bakersDozenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // Foundations only: which column a card goes to is the player's whole
      // decision.
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
