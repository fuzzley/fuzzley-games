import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckSource } from "@/engine/tableau/deck_source";
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
import { ScoringPolicy } from "./scoring_policy";

/** Plays Klondike or one of its variants. */
export class KlondikeGame extends KlondikeFamilyGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Whether to deal a nearly finished board, for verification. */
  public almostWin = false;

  /** Which of the family is being played. */
  public readonly variant: KlondikeVariant;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * @param drawCount How many cards a draw turns over. It and `variant` are
   *   parameters because the zones are built from them during `super`, before
   *   this class's fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    scoring: ScoringPolicy = new ScoringPolicy(),
    drawCount: DrawCount = DEFAULT_DRAW_COUNT,
    variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
  ) {
    super({
      zones: klondikeZoneSpecs(drawCount, variant),
      deck: new DeckSource(new CardRegistry(), cardIds),
      // A foundation is always preferred over a column.
      autoMoveRoles: [KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU],
      winsWhenAllCardsIn: KlondikeRole.FOUNDATION,
      drawCount,
      scoring,
      columnRole: KlondikeRole.TABLEAU,
    });

    this.variant = variant;
    this.foundations = this.pilesOfRole(KlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(KlondikeRole.TABLEAU);
  }

  /**
   * Deals the opening board, or an almost-won one if {@link almostWin} is set.
   *
   * @inheritDoc
   */
  protected override dealLayout(deck: PlayingCard[]): void {
    if (this.almostWin) {
      dealKlondikeAlmostWin(this.deck, this.foundations, this.tableaus);
    } else {
      dealKlondikeLayout(
        deck,
        this.tableaus,
        this.stock,
        klondikeDealsFaceUp(this.variant),
      );
    }
  }
}
