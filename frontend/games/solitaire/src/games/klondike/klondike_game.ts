import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckOptions } from "@/games/common/deck_options";
import { dealKlondikeAlmostWin, dealKlondikeLayout } from "./klondike_deal";
import { KlondikeFamilyGame } from "./klondike_family_game";
import {
  DEFAULT_DRAW_COUNT,
  DEFAULT_KLONDIKE_VARIANT,
  DrawCount,
  KlondikeVariant,
  klondikeDealsFaceUp,
} from "./klondike_rules";
import { KlondikeRole, klondikeZoneSpecs } from "./klondike_zones";
import { ScoringPolicy, StandardScoringPolicy } from "./scoring_policy";

/** Configures a game of Klondike or one of its variants. */
export interface KlondikeOptions extends DeckOptions {
  /** How moves, flips and recycles score; the standard rules by default. */
  readonly scoring?: ScoringPolicy;
  /** How many cards a draw turns over. */
  readonly drawCount?: DrawCount;
  /** Which of the family to play. */
  readonly variant?: KlondikeVariant;
  /** Whether to deal a nearly finished board, for verification. */
  readonly almostWin?: boolean;
}

/** Plays Klondike or one of its variants. */
export class KlondikeGame extends KlondikeFamilyGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Whether to deal a nearly finished board, for verification. */
  public readonly almostWin: boolean;

  /** Which of the family is being played. */
  public readonly variant: KlondikeVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    scoring = new StandardScoringPolicy(),
    drawCount = DEFAULT_DRAW_COUNT,
    variant = DEFAULT_KLONDIKE_VARIANT,
    almostWin = false,
  }: KlondikeOptions = {}) {
    super({
      zones: klondikeZoneSpecs(drawCount, variant),
      deck: { cardIds, random },
      // A foundation is always preferred over a column.
      autoMoveRoles: [KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU],
      winsWhenAllCardsIn: KlondikeRole.FOUNDATION,
      drawCount,
      scoring,
      columnRole: KlondikeRole.TABLEAU,
    });

    this.variant = variant;
    this.almostWin = almostWin;
    this.foundations = this.pilesOfRole(KlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(KlondikeRole.TABLEAU);
  }

  /**
   * Deals the opening board, or an almost-won one if {@link almostWin} is set.
   *
   * @inheritDoc
   */
  protected override dealBoard(deal: Deal): void {
    if (this.almostWin) {
      dealKlondikeAlmostWin(deal, this.foundations, this.tableaus);
    } else {
      dealKlondikeLayout(
        deal,
        this.tableaus,
        this.stock,
        klondikeDealsFaceUp(this.variant),
      );
    }
  }
}
