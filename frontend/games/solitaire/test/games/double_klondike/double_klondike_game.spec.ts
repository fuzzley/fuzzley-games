import { describe, it, expect, beforeEach } from "vitest";
import { deckCardIds } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { ScoringPolicy } from "@/games/klondike/scoring_policy";
import { DoubleKlondikeGame } from "@/games/double_klondike/double_klondike_game";
import { DOUBLE_KLONDIKE_TWO_DECKS } from "@/games/double_klondike/double_klondike_deal";
import { DoubleKlondikeRole } from "@/games/double_klondike/double_klondike_rules";
import {
  BOARD_COLUMN_COUNT,
  FOUNDATION_COUNT,
  TABLEAU_COLUMN_OFFSET,
  TABLEAU_COUNT,
} from "@/games/double_klondike/double_klondike_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** Both decks' Aces: eight cards, so a win is eight moves rather than 104. */
const ACES_ONLY = deckCardIds(DOUBLE_KLONDIKE_TWO_DECKS).filter(
  (card) => card.rank === Rank.ACE,
);

/** The eight Ace ids, deck one suffixed as the registry names them. */
const ACE_IDS = [
  "card-spades-ace",
  "card-hearts-ace",
  "card-diamonds-ace",
  "card-clubs-ace",
  "card-spades-ace#1",
  "card-hearts-ace#1",
  "card-diamonds-ace#1",
  "card-clubs-ace#1",
];

function newGame(
  cardIds = deckCardIds(DOUBLE_KLONDIKE_TWO_DECKS),
): DoubleKlondikeGame {
  const game = new DoubleKlondikeGame(cardIds, sequenceRandom(SHUFFLE_VALUES));
  game.startNewGame();
  return game;
}

describe("DoubleKlondikeGame deal", () => {
  let game: DoubleKlondikeGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals the staircase out to nine columns", () => {
    expect(game.tableaus.map((pile) => pile.size)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("puts the remaining fifty-nine on the stock", () => {
    expect(game.stock.size).toBe(59);
  });

  it("shows only the top card of each column", () => {
    const faceUpCounts = game.tableaus.map(
      (pile) => pile.getCards().filter((card) => card.faceUp).length,
    );

    expect(faceUpCounts).toEqual(Array(TABLEAU_COUNT).fill(1));
  });

  it("puts all 104 distinct cards of two decks on the board", () => {
    const dealt = new Set(
      game.piles.flatMap((pile) => pile.getCards().map((card) => card.id)),
    );

    expect(dealt.size).toBe(104);
  });

  it("lays out nine columns and eight foundations", () => {
    expect([game.tableaus.length, game.foundations.length]).toEqual([
      TABLEAU_COUNT,
      FOUNDATION_COUNT,
    ]);
  });

  it("widens the board past its tableau to seat the top row", () => {
    expect([BOARD_COLUMN_COUNT, TABLEAU_COLUMN_OFFSET]).toEqual([11, 1]);
  });
});

/*
 * This game shares Klondike's ScoringPolicy, which used to decide what a move
 * was worth by comparing role *strings* against Klondike's own — so renaming a
 * role here left every move scoring zero without breaking the build, and the
 * vocabulary had to be pinned down to compensate.
 *
 * The policy is now told which roles are which, so the two games no longer have
 * to agree on spellings and there is nothing to pin. What is worth asserting is
 * the property that pinning stood in for: that this game's own roles score.
 */
describe("DoubleKlondikeGame scoring vocabulary", () => {
  it("scores by its own roles rather than by matching Klondike's spelling", () => {
    const scoring = new ScoringPolicy({
      waste: DoubleKlondikeRole.WASTE,
      tableau: DoubleKlondikeRole.TABLEAU,
      foundation: DoubleKlondikeRole.FOUNDATION,
    });

    const toFoundation = scoring.moveScore(
      DoubleKlondikeRole.TABLEAU,
      DoubleKlondikeRole.FOUNDATION,
    );

    expect(toFoundation).toBeGreaterThan(0);
  });
});

describe("DoubleKlondikeGame column rules", () => {
  let game: DoubleKlondikeGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts the next card down in the other colour", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-8", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses the same colour", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-clubs-8", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("lets a King start an empty column", () => {
    relocate(game, "card-spades-king", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-king", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("lets the second deck's King start one too", () => {
    relocate(game, "card-spades-king#1", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-king#1", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses anything but a King into an empty column", () => {
    relocate(game, "card-spades-queen", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-queen", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("carries a broken run, which Klondike's lax grab rule allows", () => {
    relocate(game, "card-spades-king", game.tableaus[0]);
    relocate(game, "card-hearts-2", game.tableaus[0]);

    expect(game.moveCardToPile("card-spades-king", game.tableaus[1].id)).toBe(
      true,
    );
  });
});

describe("DoubleKlondikeGame stock", () => {
  it("draws three cards onto the waste", () => {
    const game = newGame();

    game.drawCardsFromStock();

    expect([game.stock.size, game.waste.size]).toEqual([56, 3]);
  });

  it("recycles the waste once the stock is spent", () => {
    const game = newGame();
    while (!game.stock.isEmpty) {
      game.drawCardsFromStock();
    }

    game.drawCardsFromStock();

    expect([game.stock.size, game.waste.size]).toEqual([59, 0]);
  });

  it("turns the recycled cards back face down", () => {
    const game = newGame();
    while (!game.stock.isEmpty) {
      game.drawCardsFromStock();
    }

    game.drawCardsFromStock();

    expect(game.stock.getCards().every((card) => !card.faceUp)).toBe(true);
  });

  it("does nothing when both the stock and the waste are empty", () => {
    const game = newGame();
    emptyBoard(game);

    game.drawCardsFromStock();

    expect(game.state.moves).toBe(0);
  });

  it("takes a draw back in one undo", () => {
    const game = newGame();
    game.drawCardsFromStock();

    game.undo();

    expect([game.stock.size, game.waste.size]).toEqual([59, 0]);
  });
});

describe("DoubleKlondikeGame scoring", () => {
  let game: DoubleKlondikeGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("awards ten for a card reaching a foundation", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);

    game.autoMoveCard("card-spades-ace");

    expect(game.state.score).toBe(10);
  });

  it("awards five for a waste card played onto a column", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.waste);

    game.moveCardToPile("card-hearts-8", game.tableaus[0].id);

    expect(game.state.score).toBe(5);
  });

  it("awards the flip bonus on top of the move that exposed the card", () => {
    relocate(game, "card-clubs-4", game.tableaus[0], false);
    relocate(game, "card-spades-ace", game.tableaus[0]);

    game.autoMoveCard("card-spades-ace");

    // Ten for the foundation, five for turning the card underneath over.
    expect(game.state.score).toBe(15);
  });

  it("takes the score back with the move on undo", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);
    game.autoMoveCard("card-spades-ace");

    game.undo();

    expect(game.state.score).toBe(0);
  });
});

describe("DoubleKlondikeGame win condition", () => {
  it("is won once every card in play reaches a foundation", () => {
    const game = newGame(ACES_ONLY);
    emptyBoard(game);
    ACE_IDS.slice(0, 7).forEach((cardId, index) =>
      relocate(game, cardId, game.foundations[index]),
    );
    relocate(game, ACE_IDS[7], game.tableaus[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile(ACE_IDS[7], game.foundations[7].id);

    expect(won).toBe(true);
  });
});
