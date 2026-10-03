import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
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
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: grandfathersClockZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A card fits at most one foundation, so auto-moving it guesses nothing.
      autoMoveRoles: [ClockRole.FOUNDATION],
      winsWhenAllCardsIn: ClockRole.FOUNDATION,
    });

    this.tableaus = this.pilesOfRole(ClockRole.TABLEAU);
  }

  /** Returns the foundation standing at an hour, one to twelve. */
  public foundationAt(hour: number): CardPile<PlayingCard> {
    return this.requirePile(hourPileId(hour));
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealGrandfathersClockLayout(
      deck,
      (hour) => this.foundationAt(hour),
      this.tableaus,
    );
  }
}
