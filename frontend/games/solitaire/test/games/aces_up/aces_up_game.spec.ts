import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { AcesUpGame } from "@/games/aces_up/aces_up_game";
import { AcesUpSpaces } from "@/games/aces_up/aces_up_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    spaces?: AcesUpSpaces;
  } = {},
): AcesUpGame {
  const game = new AcesUpGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

describe("AcesUpGame deal", () => {
  let game: AcesUpGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals one face-up card to each column", () => {
    const tops = game.tableaus.map((pile) => [pile.size, pile.topCard?.faceUp]);

    expect(tops).toEqual(Array(4).fill([1, true]));
  });

  it("leaves the other 48 cards face down in the stock", () => {
    const faceDown = game.stock.getCards().filter((card) => !card.faceUp);

    expect(faceDown.length).toBe(48);
  });
});

describe("AcesUpGame stock", () => {
  it("deals a card onto every column", () => {
    const game = newGame();

    game.deal();

    expect(game.tableaus.map((pile) => pile.size)).toEqual([2, 2, 2, 2]);
  });

  it("deals all four cards as one move, which one undo takes back", () => {
    const game = newGame();
    game.deal();

    game.undo();

    expect([game.stock.size, game.state.moves]).toEqual([48, 0]);
  });

  it("refuses to deal once the stock is empty", () => {
    const game = newGame();
    emptyBoard(game);

    expect(game.deal()).toBe(false);
  });
});

describe("AcesUpGame discard", () => {
  let game: AcesUpGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("takes a card while a higher card of its suit shows", () => {
    relocate(game, "card-hearts-5", game.tableaus[0]);
    relocate(game, "card-hearts-9", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-5", game.discard.id);

    expect(moved).toBe(true);
  });

  it("takes a King while the Ace of its suit shows, since Aces rank high", () => {
    relocate(game, "card-hearts-king", game.tableaus[0]);
    relocate(game, "card-hearts-ace", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-king", game.discard.id);

    expect(moved).toBe(true);
  });

  it("never takes an Ace", () => {
    relocate(game, "card-hearts-ace", game.tableaus[0]);
    relocate(game, "card-hearts-king", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-ace", game.discard.id);

    expect(moved).toBe(false);
  });

  it("refuses a card no higher card of its suit outranks", () => {
    relocate(game, "card-hearts-5", game.tableaus[0]);
    relocate(game, "card-spades-9", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-5", game.discard.id);

    expect(moved).toBe(false);
  });

  it("ignores a higher card buried in a column", () => {
    relocate(game, "card-hearts-9", game.tableaus[1]);
    relocate(game, "card-clubs-2", game.tableaus[1]);
    relocate(game, "card-hearts-5", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-5", game.discard.id);

    expect(moved).toBe(false);
  });

  it("discards on a double press", () => {
    relocate(game, "card-hearts-5", game.tableaus[0]);
    relocate(game, "card-hearts-9", game.tableaus[1]);

    game.autoMoveCard("card-hearts-5");

    expect(game.discard.topCard?.id).toBe("card-hearts-5");
  });
});

describe("AcesUpGame spaces", () => {
  it("lets any card fill a space", () => {
    const game = newGame();
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[1]);
    relocate(game, "card-clubs-2", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-2", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("refuses a card onto an occupied column", () => {
    const game = newGame();
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("lets only an Ace fill a space under Aces Only", () => {
    const game = newGame({ spaces: AcesUpSpaces.ACES_ONLY });
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[1]);
    relocate(game, "card-clubs-2", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-2", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("moves an Ace into a space under Aces Only", () => {
    const game = newGame({ spaces: AcesUpSpaces.ACES_ONLY });
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[1]);
    relocate(game, "card-clubs-ace", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-ace", game.tableaus[0].id);

    expect(moved).toBe(true);
  });
});

describe("AcesUpGame win condition", () => {
  /** The Aces and Twos of hearts and spades: two cards to discard. */
  const SMALL_DECK = ALL_PLAYING_CARD_IDS.filter(
    (card) =>
      (card.rank === Rank.ACE || card.rank === Rank.TWO) &&
      (card.suit === Suit.HEART || card.suit === Suit.SPADE),
  );

  /** Lays out a board where one discard is left before the win. */
  function oneDiscardFromWinning(): AcesUpGame {
    const game = newGame({ cardIds: SMALL_DECK });
    emptyBoard(game);
    relocate(game, "card-hearts-ace", game.tableaus[0]);
    relocate(game, "card-spades-ace", game.tableaus[1]);
    relocate(game, "card-hearts-2", game.discard);
    relocate(game, "card-spades-2", game.tableaus[2]);
    return game;
  }

  it("is won once only the Aces are left", () => {
    const game = oneDiscardFromWinning();
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-2", game.discard.id);

    expect(won).toBe(true);
  });

  it("is not won while the stock still holds cards", () => {
    const game = oneDiscardFromWinning();
    relocate(game, "card-hearts-2", game.stock, false);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-2", game.discard.id);

    expect(won).toBe(false);
  });
});
