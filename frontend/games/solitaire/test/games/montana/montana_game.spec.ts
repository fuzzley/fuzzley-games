import { describe, it, expect, beforeEach } from "vitest";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { deckCardIds } from "@/engine/core/card/deck";
import { MAX_REDEALS, MontanaGame } from "@/games/montana/montana_game";
import { MONTANA_DECK, GAP_COUNT } from "@/games/montana/montana_deal";
import {
  CARDS_PER_ROW,
  COLUMN_COUNT,
  ROW_COUNT,
} from "@/games/montana/montana_rules";
import { REDEAL_PILE_ID } from "@/games/montana/montana_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

const SUIT_NAMES: Record<Suit, string> = {
  [Suit.SPADE]: "spades",
  [Suit.HEART]: "hearts",
  [Suit.DIAMOND]: "diamonds",
  [Suit.CLUB]: "clubs",
};

const RANK_NAMES: Record<number, string> = {
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "10",
  [Rank.JACK]: "jack",
  [Rank.QUEEN]: "queen",
  [Rank.KING]: "king",
};

/** The card id for a suit and rank, as the single-deck registry names it. */
function cardId(suit: Suit, rank: Rank): string {
  return `card-${SUIT_NAMES[suit]}-${RANK_NAMES[rank]}`;
}

/** Every rank a Montana row holds, Two up to King. */
const ROW_RANKS = [
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
];

function newGame(): MontanaGame {
  const game = new MontanaGame(
    deckCardIds(MONTANA_DECK),
    sequenceRandom(SHUFFLE_VALUES),
  );
  game.startNewGame();
  return game;
}

/** The cell at a row and column of the grid. */
function cell(game: MontanaGame, row: number, column: number) {
  return game.cells[row * COLUMN_COUNT + column];
}

/**
 * Lays every row out in order except the last card of the last row, which is
 * left in the final cell of its row instead — one move from solved.
 */
function oneMoveFromSolved(game: MontanaGame): PlayingCard {
  emptyBoard(game);
  const suits = [Suit.SPADE, Suit.HEART, Suit.DIAMOND, Suit.CLUB];
  suits.forEach((suit, row) => {
    ROW_RANKS.forEach((rank, column) => {
      // The last row's King is held back so a single move finishes the game.
      if (row === ROW_COUNT - 1 && rank === Rank.KING) return;
      relocate(game, cardId(suit, rank), cell(game, row, column));
    });
  });
  // Park the missing King out at the end of its row, where nothing follows it.
  return relocate(
    game,
    cardId(Suit.CLUB, Rank.KING),
    cell(game, ROW_COUNT - 1, COLUMN_COUNT - 1),
  );
}

describe("MontanaGame deal", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
  });

  it("lays out a grid of four rows by thirteen", () => {
    expect(game.cells.length).toBe(ROW_COUNT * COLUMN_COUNT);
  });

  it("plays with forty-eight cards, the deck without its Aces", () => {
    expect(game.cardsInPlay).toBe(48);
  });

  it("puts every card it has on the board", () => {
    const placed = game.cells.reduce((total, pile) => total + pile.size, 0);

    expect(placed).toBe(48);
  });

  it("leaves exactly four gaps", () => {
    const gaps = game.cells.filter((pile) => pile.isEmpty);

    expect(gaps.length).toBe(GAP_COUNT);
  });

  it("deals no Ace, since the Aces are what the gaps stand in for", () => {
    const aces = game.cells
      .flatMap((pile) => pile.getCards())
      .filter((card) => card.rank === Rank.ACE);

    expect(aces).toEqual([]);
  });

  it("deals every card face up", () => {
    const hidden = game.cells
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);

    expect(hidden).toEqual([]);
  });

  it("holds at most one card in any cell", () => {
    const overfull = game.cells.filter((pile) => pile.size > 1);

    expect(overfull).toEqual([]);
  });
});

describe("MontanaGame gap rules", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts the next card up in the same suit as the cell to the left", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.SIX), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.SIX), cell(game, 0, 1).id),
    ).toBe(true);
  });

  it("refuses the right rank in the wrong suit", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.HEART, Rank.SIX), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.HEART, Rank.SIX), cell(game, 0, 1).id),
    ).toBe(false);
  });

  it("refuses the right suit at the wrong rank", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.SEVEN), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.SEVEN), cell(game, 0, 1).id),
    ).toBe(false);
  });

  it("accepts any Two into the leftmost column", () => {
    relocate(game, cardId(Suit.HEART, Rank.TWO), cell(game, 2, 7));

    expect(
      game.moveCardToPile(cardId(Suit.HEART, Rank.TWO), cell(game, 0, 0).id),
    ).toBe(true);
  });

  it("refuses anything but a Two into the leftmost column", () => {
    relocate(game, cardId(Suit.HEART, Rank.THREE), cell(game, 2, 7));

    expect(
      game.moveCardToPile(cardId(Suit.HEART, Rank.THREE), cell(game, 0, 0).id),
    ).toBe(false);
  });

  /*
   * The dead gap, and the thing a player spends the game avoiding: nothing
   * follows a King, so the cell beyond one can never be filled again.
   */
  it("refuses every card into the gap beyond a King", () => {
    relocate(game, cardId(Suit.SPADE, Rank.KING), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 1).id),
    ).toBe(false);
  });

  it("refuses every card into a gap whose left neighbour is itself a gap", () => {
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 5).id),
    ).toBe(false);
  });

  it("refuses a card onto an occupied cell", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.CLUB, Rank.NINE), cell(game, 0, 1));
    relocate(game, cardId(Suit.SPADE, Rank.SIX), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.SIX), cell(game, 0, 1).id),
    ).toBe(false);
  });
});

describe("MontanaGame win condition", () => {
  it("is won when every row reads Two through King in one suit", () => {
    const game = newGame();
    const king = oneMoveFromSolved(game);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile(king.id, cell(game, ROW_COUNT - 1, 11).id);

    expect(won).toBe(true);
  });

  it("is not won while a row is still out of order", () => {
    const game = newGame();
    oneMoveFromSolved(game);
    let won = false;
    game.on("game-won", () => (won = true));

    // A legal move that does not finish the grid: the King goes nowhere useful.
    game.moveCardToPile(
      cardId(Suit.CLUB, Rank.KING),
      cell(game, ROW_COUNT - 1, 12).id,
    );

    expect(won).toBe(false);
  });
});

describe("MontanaGame redeal", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
  });

  it("offers two redeals on a fresh deal", () => {
    expect(game.redealsRemaining).toBe(MAX_REDEALS);
  });

  it("spends one when used", () => {
    game.redeal();

    expect(game.redealsRemaining).toBe(MAX_REDEALS - 1);
  });

  it("refuses once they are spent", () => {
    for (let used = 0; used < MAX_REDEALS; used++) {
      game.redeal();
    }

    expect(game.redeal()).toBe(false);
  });

  it("keeps every card on the board", () => {
    game.redeal();

    const placed = game.cells.reduce((total, pile) => total + pile.size, 0);
    expect(placed).toBe(48);
  });

  it("still leaves one gap per row", () => {
    game.redeal();

    const gaps = game.cells.filter((pile) => pile.isEmpty);
    expect(gaps.length).toBe(GAP_COUNT);
  });

  it("holds at most one card in any cell afterwards", () => {
    game.redeal();

    expect(game.cells.filter((pile) => pile.size > 1)).toEqual([]);
  });

  /*
   * The point of a redeal: what is already in order stays put, so progress is
   * never thrown away.
   */
  it("leaves a settled run where it is", () => {
    emptyBoard(game);
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.THREE), cell(game, 0, 1));
    relocate(game, cardId(Suit.HEART, Rank.NINE), cell(game, 0, 3));

    game.redeal();

    expect([
      cell(game, 0, 0).topCard?.id,
      cell(game, 0, 1).topCard?.id,
    ]).toEqual([cardId(Suit.SPADE, Rank.TWO), cardId(Suit.SPADE, Rank.THREE)]);
  });

  it("opens the row's gap immediately after its settled run", () => {
    emptyBoard(game);
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.THREE), cell(game, 0, 1));
    relocate(game, cardId(Suit.HEART, Rank.NINE), cell(game, 0, 3));

    game.redeal();

    expect(cell(game, 0, 2).isEmpty).toBe(true);
  });

  it("refuses when there is nothing out of place to gather", () => {
    oneMoveFromSolved(game);
    game.moveCardToPile(
      cardId(Suit.CLUB, Rank.KING),
      cell(game, ROW_COUNT - 1, 11).id,
    );

    expect(game.canRedeal).toBe(false);
  });

  it("takes a whole redeal back in one undo", () => {
    const before = game.cells.map((pile) => pile.topCard?.id ?? null);
    game.redeal();

    game.undo();

    expect(game.cells.map((pile) => pile.topCard?.id ?? null)).toEqual(before);
  });

  it("gives the spent redeal back on undo", () => {
    game.redeal();

    game.undo();

    expect(game.redealsRemaining).toBe(MAX_REDEALS);
  });
});

describe("the Montana board", () => {
  it("declares a redeal marker that is never a destination", () => {
    const game = newGame();

    expect(game.getPileById(REDEAL_PILE_ID)?.isEmpty).toBe(true);
  });

  it("counts a solved row as twelve cards against thirteen cells", () => {
    expect([CARDS_PER_ROW, COLUMN_COUNT]).toEqual([12, 13]);
  });
});
