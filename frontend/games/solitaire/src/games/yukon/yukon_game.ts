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
 * A game of Yukon, Alaska or Russian Solitaire.
 *
 * One deck across seven columns, no stock and no waste, and the family's
 * defining liberty: any face-up card may be lifted with everything resting on
 * it, ordered or not. That is what makes a board dealt entirely face up
 * winnable — a column is dismantled from the middle rather than from the top.
 *
 * The three games are one class because they differ in exactly one rule, which
 * their zones declare. Nothing below this line knows which is being played.
 *
 * Like FreeCell, there is no score: the Yukon family is played against the
 * deal, so a move earns nothing and turning a card over earns nothing either.
 */
export class YukonGame extends DealtTableGame {
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param variant Which of the three games to play. A constructor parameter
   *   rather than a field because the zones are built from it during `super`,
   *   before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: YukonVariant = YukonVariant.YUKON,
  ) {
    super({
      zones: () => yukonZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // A foundation and nothing else. A column would take the card too, but
      // auto-moving to one means flinging a stack of unknown size at whichever
      // column happens to be declared first, which is never what was meant.
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
   * The only effect a move has. There is no score to change, so no delta to
   * report and no flip bonus to award — a turned card is its own reward here.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return flipOnlyEffects(move, YukonRole.TABLEAU);
  }
}
