import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { dealEightOffLayout } from "./eight_off_deal";
import { EightOffRole, eightOffZoneSpecs } from "./eight_off_zones";

/**
 * A game of Eight Off.
 *
 * FreeCell's shape with three rules changed: twice as many cells, columns that
 * build down in suit rather than in alternating colours, and empty columns that
 * take only a King. The first makes it easier, the second and third make it
 * harder, and between them almost every deal is winnable with care.
 *
 * None of that is written here. It is declared by the zones and the placement
 * rules; what is left in this class is a board and a deal — which, as with
 * FreeCell, is the measure of how much {@link DealtTableGame} carries on its
 * own. Even the win condition is declared rather than coded.
 */
export class EightOffGame extends DealtTableGame {
  /** The eight single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The eight columns. */
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
      zones: () => eightOffZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
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
  protected override dealBoard(deck: PlayingCard[]): void {
    dealEightOffLayout(deck, this.tableaus, this.cells);
  }
}
