import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { discardPairEffects } from "@/games/common/pair_removal";
import { dealNestorLayout } from "./nestor_deal";
import { DISCARD_PILE_ID, NestorRole, nestorZoneSpecs } from "./nestor_zones";

/**
 * Plays Nestor: eight open columns and a four-card reserve, cleared by
 * pairing cards of the same rank.
 */
export class NestorGame extends DealtTableGame {
  /** The eight columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];
  /** The four reserve cards. */
  public readonly reserves: readonly ReadonlyCardPile<PlayingCard>[];
  /** Where the pairs go. */
  public readonly discard: ReadonlyCardPile<PlayingCard>;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: nestorZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // A double press pairs a card with the first partner showing.
      autoMoveRoles: [NestorRole.TABLEAU, NestorRole.RESERVE],
      winsWhenAllCardsIn: NestorRole.DISCARD,
    });

    this.tableaus = this.pilesOfRole(NestorRole.TABLEAU);
    this.reserves = this.pilesOfRole(NestorRole.RESERVE);
    this.discard = this.requirePile(DISCARD_PILE_ID);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealNestorLayout(deal, this.tableaus, this.reserves);
  }

  /**
   * Sends the pair the move made to the discard.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return discardPairEffects(this.tabletop, move, this.discard);
  }
}
