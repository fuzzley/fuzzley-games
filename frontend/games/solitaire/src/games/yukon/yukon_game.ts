import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/moves/move";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { DeckOptions } from "@/games/common/deck_options";
import { dealYukonLayout } from "./yukon_deal";
import { YukonRole, YukonVariant, yukonZoneSpecs } from "./yukon_zones";

/** Configures a game of the Yukon family. */
export interface YukonOptions extends DeckOptions {
  /** Which of the family to play. */
  readonly variant?: YukonVariant;
}

/**
 * Plays Yukon, Alaska, Russian Solitaire or Moosehide: one deck on seven columns with no
 * stock, where any face-up card lifts with everything resting on it.
 */
export class YukonGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = YukonVariant.YUKON,
  }: YukonOptions = {}) {
    super({
      zones: yukonZoneSpecs(variant),
      deck: { cardIds, random },
      // Foundations only: sending a stack to whichever column is declared
      // first is never what was meant.
      autoMoveRoles: [YukonRole.FOUNDATION],
      winsWhenAllCardsIn: YukonRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(YukonRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(YukonRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealYukonLayout(deal, this.tableaus);
  }

  // --- What a Yukon move does beyond moving its cards ---

  /**
   * Turns over the card the move exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return flipOnlyEffects(move, YukonRole.TABLEAU);
  }
}
