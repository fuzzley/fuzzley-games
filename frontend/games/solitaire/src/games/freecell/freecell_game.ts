import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { dealFreeCellAlmostWin, dealFreeCellLayout } from "./freecell_deal";
import {
  FreeCellRole,
  FreeCellVariant,
  freeCellZoneSpecs,
} from "./freecell_zones";

/**
 * A game of FreeCell.
 *
 * Notable mostly for what it does not have. There is no stock, so nothing draws
 * and nothing recycles. Every card is dealt face up, so nothing is ever turned
 * over and there is no bonus for doing so. There is no score at all — FreeCell
 * is played against the deal, not for points.
 *
 * What is left is a board and the rules its zones declare, which is the measure
 * of how much {@link DealtTableGame} carries on its own. Even the win condition
 * is declared rather than coded.
 *
 * Also plays Baker's Game, which differs only in what its columns build by. It
 * gets its own catalog entry but not its own class: a separate module would
 * duplicate six files in order to change two rules.
 */
export class FreeCellGame extends DealtTableGame {
  /** The four single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The eight columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Whether to deal a nearly finished board, for verification. */
  public almostWin = false;

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param variant The column rules to play by. A constructor parameter rather
   *   than a field because the zones closure is built from it during `super`,
   *   before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: FreeCellVariant = FreeCellVariant.FREECELL,
  ) {
    super({
      zones: () => freeCellZoneSpecs(variant),
      // Dealt face up: FreeCell has no hidden information at all.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A foundation is always best; a cell is a last resort, since parking a
      // card there is what a player is trying to avoid.
      autoMoveRoles: [
        FreeCellRole.FOUNDATION,
        FreeCellRole.TABLEAU,
        FreeCellRole.CELL,
      ],
      winsWhenAllCardsIn: FreeCellRole.FOUNDATION,
    });

    this.cells = this.pilesOfRole(FreeCellRole.CELL);
    this.foundations = this.pilesOfRole(FreeCellRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(FreeCellRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    if (this.almostWin) {
      dealFreeCellAlmostWin(this.deck, this.foundations, this.tableaus);
    } else {
      dealFreeCellLayout(deck, this.tableaus);
    }
  }
}
