import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckOptions } from "@/games/common/deck_options";
import { foundationPileId } from "@/games/common/pile_ids";
import { dealBisleyLayout } from "./bisley_deal";
import {
  BisleyRole,
  bisleyZoneSpecs,
  kingFoundationPileId,
} from "./bisley_zones";

/**
 * Plays Bisley: thirteen open columns built up or down in suit, played onto
 * foundations that climb from each Ace and descend from each King.
 */
export class BisleyGame extends DealtTableGame {
  /** The four foundations the Aces start, one per suit. */
  public readonly aceFoundations: readonly CardPile<PlayingCard>[];
  /** The four foundations a King starts, one per suit. */
  public readonly kingFoundations: readonly CardPile<PlayingCard>[];
  /** The thirteen columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: bisleyZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // Foundations only: which column a card goes to is the player's whole
      // decision.
      autoMoveRoles: [BisleyRole.FOUNDATION],
      winsWhenAllCardsIn: BisleyRole.FOUNDATION,
    });

    this.aceFoundations = [0, 1, 2, 3].map((index) =>
      this.requirePile(foundationPileId(index)),
    );
    this.kingFoundations = [0, 1, 2, 3].map((index) =>
      this.requirePile(kingFoundationPileId(index)),
    );
    this.tableaus = this.pilesOfRole(BisleyRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealBisleyLayout(deal, this.aceFoundations, this.tableaus);
  }
}
