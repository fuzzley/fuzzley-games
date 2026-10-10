import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealFlowerGardenLayout } from "./flower_garden_deal";
import { FlowerGardenRole, flowerGardenZoneSpecs } from "./flower_garden_zones";

/**
 * Plays Flower Garden: six open beds built down in any suit, and a bouquet of
 * sixteen cards that are all free to play.
 */
export class FlowerGardenGame extends DealtTableGame {
  /** The four suit foundations. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The six beds. */
  public readonly beds: readonly ReadonlyCardPile<PlayingCard>[];
  /** The bouquet, one pile per card. */
  public readonly bouquet: readonly ReadonlyCardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: flowerGardenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // Foundations only: which bed a card goes to is the player's decision.
      autoMoveRoles: [FlowerGardenRole.FOUNDATION],
      winsWhenAllCardsIn: FlowerGardenRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(FlowerGardenRole.FOUNDATION);
    this.beds = this.pilesOfRole(FlowerGardenRole.BED);
    this.bouquet = this.pilesOfRole(FlowerGardenRole.BOUQUET);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealFlowerGardenLayout(deal, this.beds, this.bouquet);
  }
}
