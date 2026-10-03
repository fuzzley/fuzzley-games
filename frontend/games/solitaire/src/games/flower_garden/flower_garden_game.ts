import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { DeckOptions } from "@/games/common/deck_options";
import { dealFlowerGardenLayout } from "./flower_garden_deal";
import { FlowerGardenRole, flowerGardenZoneSpecs } from "./flower_garden_zones";

/**
 * Plays Flower Garden: six open beds built down in any suit, and a bouquet of
 * sixteen cards that are all free to play.
 */
export class FlowerGardenGame extends DealtTableGame {
  /** The four suit foundations. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The six beds. */
  public readonly beds: readonly CardPile<PlayingCard>[];
  /** The bouquet, one pile per card. */
  public readonly bouquet: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: flowerGardenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // Foundations only: which bed a card goes to is the player's decision.
      autoMoveRoles: [FlowerGardenRole.FOUNDATION],
      winsWhenAllCardsIn: FlowerGardenRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(FlowerGardenRole.FOUNDATION);
    this.beds = this.pilesOfRole(FlowerGardenRole.BED);
    this.bouquet = this.pilesOfRole(FlowerGardenRole.BOUQUET);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealFlowerGardenLayout(deck, this.beds, this.bouquet);
  }
}
