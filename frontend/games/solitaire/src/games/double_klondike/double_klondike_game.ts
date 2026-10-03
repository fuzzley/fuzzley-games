import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DeckSource } from "@/engine/tableau/deck_source";
import { KlondikeFamilyGame } from "@/games/klondike/klondike_family_game";
import {
  ScoringPolicy,
  ScoringRoles,
  StandardScoringPolicy,
} from "@/games/klondike/scoring_policy";
import { DeckOptions } from "@/games/common/deck_options";
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

/** Configures a game of Double Klondike. */
export interface DoubleKlondikeOptions extends DeckOptions {
  /** How moves, flips and recycles score; the standard rules by default. */
  readonly scoring?: ScoringPolicy;
}

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
  constructor({
    cardIds = deckCardIds(DOUBLE_KLONDIKE_TWO_DECKS),
    random = Math.random,
    scoring = new StandardScoringPolicy(DOUBLE_KLONDIKE_SCORING_ROLES),
  }: DoubleKlondikeOptions = {}) {
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
