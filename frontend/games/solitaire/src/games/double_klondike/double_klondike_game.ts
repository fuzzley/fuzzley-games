import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DeckSource } from "@/engine/tableau/deck_source";
import { KlondikeFamilyGame } from "@/games/klondike/klondike_family_game";
import { ScoringPolicy, ScoringRoles } from "@/games/klondike/scoring_policy";
import {
  DOUBLE_KLONDIKE_TWO_DECKS,
  dealDoubleKlondikeLayout,
} from "./double_klondike_deal";
import {
  DoubleKlondikeRole,
  doubleKlondikeZoneSpecs,
} from "./double_klondike_zones";

/** Which of this game's roles the shared scoring policy treats as what. */
const DOUBLE_KLONDIKE_SCORING_ROLES: ScoringRoles = {
  waste: DoubleKlondikeRole.WASTE,
  tableau: DoubleKlondikeRole.TABLEAU,
  foundation: DoubleKlondikeRole.FOUNDATION,
};

/** How many cards a draw turns over. */
export const DRAW_COUNT = 3;

/**
 * Plays Double Klondike: Klondike dealt from two decks onto nine columns and
 * eight foundations, with the waste recycled as often as the player likes.
 */
export class DoubleKlondikeGame extends KlondikeFamilyGame {
  /** The eight foundation piles, two per suit. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The nine columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = deckCardIds(DOUBLE_KLONDIKE_TWO_DECKS),
    random: () => number = Math.random,
    scoring: ScoringPolicy = new ScoringPolicy(DOUBLE_KLONDIKE_SCORING_ROLES),
  ) {
    super({
      zones: doubleKlondikeZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // A foundation is always preferred over a column.
      autoMoveRoles: [
        DoubleKlondikeRole.FOUNDATION,
        DoubleKlondikeRole.TABLEAU,
      ],
      winsWhenAllCardsIn: DoubleKlondikeRole.FOUNDATION,
      drawCount: DRAW_COUNT,
      scoring,
      columnRole: DoubleKlondikeRole.TABLEAU,
    });

    this.foundations = this.pilesOfRole(DoubleKlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(DoubleKlondikeRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealLayout(deck: PlayingCard[]): void {
    dealDoubleKlondikeLayout(deck, this.tableaus, this.stock);
  }
}
