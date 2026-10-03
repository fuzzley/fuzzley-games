import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
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
  public readonly foundation: CardPile<PlayingCard>;
  /** The fans or columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Which of the pair is being played. */
  public readonly variant: BlackHoleVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = BlackHoleVariant.BLACK_HOLE,
  }: BlackHoleOptions = {}) {
    super({
      zones: blackHoleZoneSpecs(variant),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      autoMoveRoles: [BlackHoleRole.FOUNDATION],
      winsWhenAllCardsIn: BlackHoleRole.FOUNDATION,
    });

    this.variant = variant;
    this.foundation = this.requirePile(FOUNDATION_PILE_ID);
    this.tableaus = this.pilesOfRole(BlackHoleRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealBlackHoleLayout(this.variant, deck, this.foundation, this.tableaus);
  }
}
