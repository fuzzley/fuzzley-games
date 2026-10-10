import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/game/dealt_table_game";

import { ActionKind } from "@/games/common/action_kinds";
import { DeckOptions } from "@/games/common/deck_options";
import { recycleMarker } from "@/games/common/zone_presets";
import {
  dealMontanaFamilyLayout,
  redealArrangement,
  rowsOf,
} from "./montana_deal";
import {
  DEFAULT_MAX_REDEALS,
  DEFAULT_MONTANA_VARIANT,
  MaxRedeals,
  MontanaRole,
  isMontanaSolved,
  montanaColumnCount,
  montanaDeck,
  montanaFirstRank,
  settledPrefixLength,
} from "./montana_rules";
import {
  MontanaVariant,
  REDEAL_PILE_ID,
  montanaZoneSpecs,
} from "./montana_zones";

/** Configures a game of the Montana family. */
export interface MontanaOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: MontanaVariant;
  /** How many redeals the game allows: three makes Montana Addiction. */
  readonly maxRedeals?: MaxRedeals;
}

/**
 * Plays Montana, also called Gaps, or Blue Moon or Red Moon: cards in a grid
 * of four rows, where each gap takes the card that continues the run to its
 * left.
 */
export class MontanaGame extends DealtTableGame {
  /** The grid positions, row-major. */
  public readonly cells: readonly ReadonlyCardPile<PlayingCard>[];

  /** Which of the family is being played. */
  public readonly variant: MontanaVariant;

  /** How many redeals the game allows. */
  public readonly maxRedeals: MaxRedeals;

  /** The rank every row starts with. */
  private readonly firstRank: Rank;

  private readonly random: () => number;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * Its `random` shuffles redeals as well as the deck.
   */
  constructor({
    variant = DEFAULT_MONTANA_VARIANT,
    cardIds = deckCardIds(montanaDeck(variant)),
    random = Math.random,
    maxRedeals = DEFAULT_MAX_REDEALS,
  }: MontanaOptions = {}) {
    super({
      zones: montanaZoneSpecs(variant, maxRedeals),
      // Dealt face up: the whole position is visible from the first move.
      deck: { cardIds, random, dealsFaceUp: true },
      // A card fits at most one gap, so auto-moving it guesses nothing.
      autoMoveRoles: [MontanaRole.CELL],
      // Deliberately absent: this game is won by arrangement, not by gathering
      // cards into a role. See `isWon`.
    });

    this.random = random;
    this.variant = variant;
    this.maxRedeals = maxRedeals;
    this.firstRank = montanaFirstRank(variant);
    this.cells = this.pilesOfRole(MontanaRole.CELL);
    this.markPile(this.requirePile(REDEAL_PILE_ID), () =>
      recycleMarker({
        usable: this.canRedeal,
        remaining: this.redealsRemaining,
        allowed: this.maxRedeals,
      }),
    );
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealMontanaFamilyLayout(this.variant, deal, this.rows);
  }

  /** The grid as rows, left to right within each. */
  public get rows(): readonly (readonly ReadonlyCardPile<PlayingCard>[])[] {
    return rowsOf(this.cells, montanaColumnCount(this.variant));
  }

  // --- The win ---

  /**
   * Returns whether the grid has come out in order, which is how Montana is
   * won.
   */
  protected override isWon(): boolean {
    return isMontanaSolved(this.rows, this.firstRank);
  }

  // --- The redeal ---

  /** How many redeals the player has left. */
  public get redealsRemaining(): number {
    return Math.max(0, this.maxRedeals - this.timesApplied(ActionKind.REDEAL));
  }

  /**
   * Whether a redeal is available: one must be left, and it must have something
   * to do.
   */
  public get canRedeal(): boolean {
    return this.redealsRemaining > 0 && this.gatherable().length > 0;
  }

  /**
   * Shuffles every card not yet in its final place back out after each row's
   * settled run, as one undoable action, and returns whether it could.
   */
  public redeal(): boolean {
    if (!this.canRedeal) {
      return false;
    }

    const shuffled = this.gatherable();
    shuffle(shuffled, this.random);
    const arrangement = redealArrangement(this.rows, shuffled, this.firstRank);

    // The arrangement runs in reading order, as the cells do.
    const layout = new Map(
      this.cells.map((cell, index) => {
        const card = arrangement[index];
        return [cell, card ? [card] : []];
      }),
    );

    this.commitAction(ActionKind.REDEAL, this.tabletop.rearrange(layout));
    return true;
  }

  /**
   * Returns every card a redeal would pick up: those outside their row's
   * settled run.
   */
  private gatherable(): PlayingCard[] {
    return this.rows.flatMap((row) =>
      row
        .slice(settledPrefixLength(row, this.firstRank))
        .map((cell) => cell.topCard)
        .filter((card): card is PlayingCard => card !== undefined),
    );
  }
}
