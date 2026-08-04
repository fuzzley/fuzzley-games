import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { dealSeahavenLayout } from "./seahaven_deal";
import { SeahavenRole, seahavenZoneSpecs } from "./seahaven_zones";

/**
 * A game of Seahaven Towers.
 *
 * Ten columns of five, four cells with two of them already spent by the deal,
 * and columns that build down in a single suit and open only to a King.
 *
 * The hardest of the cell games here, and the arithmetic says why. Eight Off
 * softens its strict same-suit build with eight cells; FreeCell softens its four
 * cells with an alternating-colour build and empty columns that take anything.
 * Seahaven takes the strict half of each: four cells, one suit, Kings-only
 * columns — so a supermove almost never carries more than three or four cards,
 * and the two cells the deal leaves free are the whole of the opening slack.
 *
 * None of that is written here. It is declared by the zones and the placement
 * rules; what is left in this class is a board and a deal. There is no score and
 * nothing is ever turned over, so a move has no effects beyond relocating its
 * cards and this class overrides nothing but the deal.
 */
export class SeahavenGame extends DealtTableGame {
  /** The four single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The ten columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => seahavenZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A foundation is always best and a cell is the last resort, since
      // parking a card there is precisely what a player is trying to avoid —
      // and with only four cells, more so here than anywhere else.
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
