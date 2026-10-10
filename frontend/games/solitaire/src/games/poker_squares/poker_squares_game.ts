import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import { MoveEffects } from "@/engine/tableau/moves/move";
import { DeckOptions } from "@/games/common/deck_options";
import { drawToWaste } from "@/games/common/stock_pile";
import {
  DEFAULT_POKER_SQUARES_SCORING,
  PokerSquaresScoring,
  scoreGrid,
  winningScore,
} from "./poker_squares_rules";
import {
  GRID_SIZE,
  HAND_PILE_ID,
  PokerSquaresRole,
  STOCK_PILE_ID,
  pokerSquaresZoneSpecs,
} from "./poker_squares_zones";

/** Configures a game of Poker Squares. */
export interface PokerSquaresOptions extends DeckOptions {
  /** Which scoring the lines are counted by. */
  readonly scoring?: PokerSquaresScoring;
}

/**
 * Plays Poker Squares: twenty-five cards placed one at a time in a five-by-five
 * grid, where they stay, each row and column scored as a poker hand.
 */
export class PokerSquaresGame extends DealtTableGame {
  /** The face-down cards still to come. */
  public readonly stock: ReadonlyCardPile<PlayingCard>;
  /** The card to place next. */
  public readonly hand: ReadonlyCardPile<PlayingCard>;
  /** The grid's squares, row by row. */
  public readonly squares: readonly ReadonlyCardPile<PlayingCard>[];

  /** Which scoring the lines are counted by. */
  public readonly scoring: PokerSquaresScoring;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    scoring = DEFAULT_POKER_SQUARES_SCORING,
  }: PokerSquaresOptions = {}) {
    super({
      zones: pokerSquaresZoneSpecs(),
      deck: { cardIds, random },
      // Where each card goes is the whole game, so nothing is placed for the
      // player.
      autoMoveRoles: [],
      // Deliberately absent: the game is won by score. See `isWon`.
    });

    this.scoring = scoring;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.hand = this.requirePile(HAND_PILE_ID);
    this.squares = this.pilesOfRole(PokerSquaresRole.CELL);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    deal.dealRest(this.stock, false);
    const first = this.stock.topCard;
    if (first) deal.place(first, this.hand, true);
  }

  /** The grid's rows and then its columns, each as the cards in it. */
  public get lines(): PlayingCard[][] {
    const at = (row: number, column: number) =>
      this.squares[row * GRID_SIZE + column]?.topCard;
    const line = (cell: (index: number) => PlayingCard | undefined) =>
      Array.from({ length: GRID_SIZE }, (_, index) => cell(index)).filter(
        (card): card is PlayingCard => card !== undefined,
      );
    return Array.from({ length: GRID_SIZE }, (_, n) => [
      line((index) => at(n, index)),
      line((index) => at(index, n)),
    ]).flat();
  }

  /**
   * Turns up the next card into the hand, and scores the grid afresh.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(): MoveEffects {
    return {
      scoreDelta: scoreGrid(this.lines, this.scoring) - this.state.score,
      flippedCardIds: [],
      followUpTransfers: drawToWaste(this.tabletop, this.stock, this.hand, 1),
    };
  }

  /**
   * Returns whether the grid is full and has scored enough to win.
   *
   * @inheritDoc
   */
  protected override isWon(): boolean {
    return (
      this.squares.every((square) => !square.isEmpty) &&
      this.state.score >= winningScore(this.scoring)
    );
  }
}
