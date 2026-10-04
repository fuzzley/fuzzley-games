import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealCastleLayout } from "./castle_deal";
import {
  CastleVariantRules,
  DEFAULT_CASTLE_VARIANT,
  castleRules,
} from "./castle_rules";
import { CastleRole, CastleVariant, castleZoneSpecs } from "./castle_zones";

/** Configures a game of the Beleaguered Castle family. */
export interface CastleOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: CastleVariant;
}

/**
 * Plays Beleaguered Castle or one of its family: rows fanned sideways in two
 * wings either side of a column of foundations, every card in view, moved one
 * at a time.
 */
export class CastleGame extends DealtTableGame {
  /** The four suit foundations, top to bottom. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The rows, the left wing's from the top, then the right wing's. */
  public readonly rows: readonly ReadonlyCardPile<PlayingCard>[];

  /** Which of the family is being played. */
  public readonly variant: CastleVariant;

  private readonly rules: CastleVariantRules;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = DEFAULT_CASTLE_VARIANT,
  }: CastleOptions = {}) {
    super({
      zones: castleZoneSpecs(variant),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // Foundations only: which row a card goes to is the player's decision.
      autoMoveRoles: [CastleRole.FOUNDATION],
      winsWhenAllCardsIn: CastleRole.FOUNDATION,
    });

    this.variant = variant;
    this.rules = castleRules(variant);
    this.foundations = this.pilesOfRole(CastleRole.FOUNDATION);
    this.rows = this.pilesOfRole(CastleRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealCastleLayout(this.rules, deal, this.foundations, this.rows);
  }
}
