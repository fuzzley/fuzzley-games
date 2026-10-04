import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealEightOffLayout } from "./eight_off_deal";
import { EightOffRole, eightOffZoneSpecs } from "./eight_off_zones";

/**
 * Plays Eight Off: FreeCell with eight cells, same-suit builds and Kings-only
 * empty columns.
 */
export class EightOffGame extends DealtTableGame {
  /** The eight single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The eight columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: eightOffZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // A foundation is always best and a cell is the last resort, since
      // parking a card there is precisely what a player is trying to avoid.
      autoMoveRoles: [
        EightOffRole.FOUNDATION,
        EightOffRole.TABLEAU,
        EightOffRole.CELL,
      ],
      winsWhenAllCardsIn: EightOffRole.FOUNDATION,
    });

    this.cells = this.pilesOfRole(EightOffRole.CELL);
    this.foundations = this.pilesOfRole(EightOffRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(EightOffRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealEightOffLayout(deal, this.tableaus, this.cells);
  }
}
