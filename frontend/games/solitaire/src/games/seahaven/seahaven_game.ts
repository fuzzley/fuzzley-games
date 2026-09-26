import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { dealSeahavenLayout } from "./seahaven_deal";
import { SeahavenRole, seahavenZoneSpecs } from "./seahaven_zones";

/**
 * Plays Seahaven Towers: ten columns of five, four cells with two filled by
 * the deal, and same-suit columns that open only to a King.
 */
export class SeahavenGame extends DealtTableGame {
  /** The four single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => seahavenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A foundation is always best and a cell is the last resort, since
      // parking a card there is precisely what a player is trying to avoid.
      autoMoveRoles: [
        SeahavenRole.FOUNDATION,
        SeahavenRole.TABLEAU,
        SeahavenRole.CELL,
      ],
      winsWhenAllCardsIn: SeahavenRole.FOUNDATION,
    });

    this.cells = this.pilesOfRole(SeahavenRole.CELL);
    this.foundations = this.pilesOfRole(SeahavenRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(SeahavenRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealSeahavenLayout(deck, this.tableaus, this.cells);
  }
}
