import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealGrandfathersClockLayout } from "./grandfathers_clock_deal";
import {
  ClockRole,
  grandfathersClockZoneSpecs,
  hourPileId,
} from "./grandfathers_clock_zones";

/**
 * Plays Grandfather's Clock: twelve foundations laid round a dial, each built
 * up in suit to its hour, fed from eight open columns.
 */
export class GrandfathersClockGame extends DealtTableGame {
  /** The eight columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: grandfathersClockZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // A card fits at most one foundation, so auto-moving it guesses nothing.
      autoMoveRoles: [ClockRole.FOUNDATION],
      winsWhenAllCardsIn: ClockRole.FOUNDATION,
    });

    this.tableaus = this.pilesOfRole(ClockRole.TABLEAU);
  }

  /** Returns the foundation standing at an hour, one to twelve. */
  public foundationAt(hour: number): ReadonlyCardPile<PlayingCard> {
    return this.requirePile(hourPileId(hour));
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealGrandfathersClockLayout(
      deal,
      (hour) => this.foundationAt(hour),
      this.tableaus,
    );
  }
}
