import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
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
  public readonly tableaus: readonly CardPile<PlayingCard>[];
  /** The four reserve cards. */
  public readonly reserves: readonly CardPile<PlayingCard>[];
  /** Where the pairs go. */
  public readonly discard: CardPile<PlayingCard>;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: nestorZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A double press pairs a card with the first partner showing.
      autoMoveRoles: [NestorRole.TABLEAU, NestorRole.RESERVE],
      winsWhenAllCardsIn: NestorRole.DISCARD,
    });

    this.tableaus = this.pilesOfRole(NestorRole.TABLEAU);
    this.reserves = this.pilesOfRole(NestorRole.RESERVE);
    this.discard = this.requirePile(DISCARD_PILE_ID);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealNestorLayout(deck, this.tableaus, this.reserves);
  }

  /**
   * Sends the pair the move made to the discard.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return discardPairEffects(move, this.discard);
  }
}
