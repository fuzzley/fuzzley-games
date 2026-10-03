import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { DeckOptions } from "@/games/common/deck_options";
import { dealPenguinLayout } from "./penguin_deal";
import { PenguinRole, penguinZoneSpecs } from "./penguin_zones";

/**
 * Plays Penguin: seven open columns built down in suit round the corner, seven
 * cells, and foundations that start on the rank of the first card dealt.
 */
export class PenguinGame extends DealtTableGame {
  /** The seven cells of the flipper. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four foundations. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: penguinZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      autoMoveRoles: [
        PenguinRole.FOUNDATION,
        PenguinRole.TABLEAU,
        PenguinRole.CELL,
      ],
      winsWhenAllCardsIn: PenguinRole.FOUNDATION,
    });

    this.cells = this.pilesOfRole(PenguinRole.CELL);
    this.foundations = this.pilesOfRole(PenguinRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(PenguinRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealPenguinLayout(deck, this.foundations, this.tableaus);
  }
}
