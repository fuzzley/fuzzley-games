import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealFreeCellAlmostWin, dealFreeCellLayout } from "./freecell_deal";
import { freeCellBuriesAcesAndTwos } from "./freecell_rules";
import {
  FreeCellRole,
  FreeCellVariant,
  freeCellZoneSpecs,
} from "./freecell_zones";

/** Configures a game of FreeCell, Baker's Game or Challenge FreeCell. */
export interface FreeCellOptions extends DeckOptions {
  /** The column rules to play by. */
  readonly variant?: FreeCellVariant;
  /** Whether to deal a nearly finished board, for verification. */
  readonly almostWin?: boolean;
}

/**
 * Plays FreeCell, Baker's Game or Challenge FreeCell: eight open columns, four
 * cells, no stock.
 */
export class FreeCellGame extends DealtTableGame {
  /** The four single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The eight columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Whether to deal a nearly finished board, for verification. */
  public readonly almostWin: boolean;

  /** The column rules being played by. */
  public readonly variant: FreeCellVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = FreeCellVariant.FREECELL,
    almostWin = false,
  }: FreeCellOptions = {}) {
    super({
      zones: freeCellZoneSpecs(variant),
      // Dealt face up: FreeCell hides nothing.
      deck: { cardIds, random, dealsFaceUp: true },
      // A foundation is always best; a cell is a last resort, since parking a
      // card there is what a player is trying to avoid.
      autoMoveRoles: [
        FreeCellRole.FOUNDATION,
        FreeCellRole.TABLEAU,
        FreeCellRole.CELL,
      ],
      winsWhenAllCardsIn: FreeCellRole.FOUNDATION,
    });

    this.almostWin = almostWin;
    this.variant = variant;
    this.cells = this.pilesOfRole(FreeCellRole.CELL);
    this.foundations = this.pilesOfRole(FreeCellRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(FreeCellRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    if (this.almostWin) {
      dealFreeCellAlmostWin(deal, this.foundations, this.tableaus);
    } else {
      dealFreeCellLayout(
        deal,
        this.tableaus,
        freeCellBuriesAcesAndTwos(this.variant),
      );
    }
  }
}
