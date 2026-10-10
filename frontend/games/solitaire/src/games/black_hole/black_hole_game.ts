import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/game/dealt_table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealBlackHoleLayout } from "./black_hole_deal";
import {
  BlackHoleRole,
  BlackHoleVariant,
  FOUNDATION_PILE_ID,
  blackHoleZoneSpecs,
} from "./black_hole_zones";

/** Configures Black Hole or All in a Row. */
export interface BlackHoleOptions extends DeckOptions {
  /** Which of the pair to play. */
  readonly variant?: BlackHoleVariant;
}

/**
 * Plays Black Hole or All in a Row: open fans cleared onto one foundation, a
 * rank up or down at a time round the corner, with no stock at all.
 */
export class BlackHoleGame extends DealtTableGame {
  /** The single foundation. */
  public readonly foundation: ReadonlyCardPile<PlayingCard>;
  /** The fans or columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Which of the pair is being played. */
  public readonly variant: BlackHoleVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = BlackHoleVariant.BLACK_HOLE,
  }: BlackHoleOptions = {}) {
    super({
      zones: blackHoleZoneSpecs(variant),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      autoMoveRoles: [BlackHoleRole.FOUNDATION],
      winsWhenAllCardsIn: BlackHoleRole.FOUNDATION,
    });

    this.variant = variant;
    this.foundation = this.requirePile(FOUNDATION_PILE_ID);
    this.tableaus = this.pilesOfRole(BlackHoleRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealBlackHoleLayout(this.variant, deal, this.foundation, this.tableaus);
  }
}
