import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { DeckOptions } from "@/games/common/deck_options";
import { dealYukonLayout } from "./yukon_deal";
import { YukonRole, YukonVariant, yukonZoneSpecs } from "./yukon_zones";

/** Configures a game of the Yukon family. */
export interface YukonOptions extends DeckOptions {
  /** Which of the three games to play. */
  readonly variant?: YukonVariant;
}

/**
 * Plays Yukon, Alaska or Russian Solitaire: one deck on seven columns with no
 * stock, where any face-up card lifts with everything resting on it.
 */
export class YukonGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = YukonVariant.YUKON,
  }: YukonOptions = {}) {
    super({
      zones: yukonZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Foundations only: sending a stack to whichever column is declared
      // first is never what was meant.
      autoMoveRoles: [YukonRole.FOUNDATION],
      winsWhenAllCardsIn: YukonRole.FOUNDATION,
    });

    this.foundations = this.pilesOfRole(YukonRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(YukonRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealYukonLayout(deck, this.tableaus);
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
