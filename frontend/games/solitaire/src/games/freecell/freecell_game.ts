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

/** Plays FreeCell or Baker's Game: eight open columns, four cells, no stock. */
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
   * Creates a game whose piles are empty until the first deal.
   *
   * @param variant The column rules to play by, passed in because the zones are
   *   built from it during `super`, before this class's fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: FreeCellVariant = FreeCellVariant.FREECELL,
  ) {
    super({
      zones: () => freeCellZoneSpecs(variant),
      // Dealt face up: FreeCell hides nothing.
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
