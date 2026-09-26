import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { dealYukonLayout } from "./yukon_deal";
import { YukonRole, YukonVariant, yukonZoneSpecs } from "./yukon_zones";

/**
 * Plays Yukon, Alaska or Russian Solitaire: one deck on seven columns with no
 * stock, where any face-up card lifts with everything resting on it.
 */
export class YukonGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * @param variant Which of the three games to play, passed in because the
   *   zones are built from it during `super`, before this class's fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: YukonVariant = YukonVariant.YUKON,
  ) {
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
