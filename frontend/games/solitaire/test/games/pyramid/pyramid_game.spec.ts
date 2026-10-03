import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { PyramidGame } from "@/games/pyramid/pyramid_game";
import { pyramidGestures } from "@/games/pyramid/pyramid_gestures";
import { PyramidGoal } from "@/games/pyramid/pyramid_rules";
import { pyramidPileId } from "@/games/pyramid/pyramid_zones";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    goal?: PyramidGoal;
    passes?: 1 | 3;
  } = {},
): PyramidGame {
  const game = new PyramidGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

/** Returns the place at a row and index of the pyramid. */
function place(game: PyramidGame, row: number, index: number) {
  return game.getPileById(pyramidPileId(row, index))!;
}

describe("PyramidGame deal", () => {
  it("deals twenty-eight face-up cards into the pyramid", () => {
    const game = newGame();

    const faceUp = game.places.filter((pile) => pile.topCard?.faceUp).length;

    expect([game.places.length, faceUp]).toEqual([28, 28]);
  });

  it("leaves 24 cards face down in the stock", () => {
    const game = newGame();

    expect(game.stock.getCards().filter((card) => !card.faceUp).length).toBe(
      24,
    );
  });
});

describe("PyramidGame pairing", () => {
  let game: PyramidGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("discards two free cards that total thirteen", () => {
    relocate(game, "card-hearts-queen", place(game, 6, 0));
    relocate(game, "card-clubs-ace", place(game, 6, 1));

    game.moveCardToPile("card-clubs-ace", place(game, 6, 0).id);

    expect(game.discard.size).toBe(2);
  });

  it("refuses two cards that do not total thirteen", () => {
    relocate(game, "card-hearts-queen", place(game, 6, 0));
    relocate(game, "card-clubs-2", place(game, 6, 1));

    const moved = game.moveCardToPile("card-clubs-2", place(game, 6, 0).id);

    expect(moved).toBe(false);
  });

  it("will not lift a card while a card lies over it", () => {
    relocate(game, "card-hearts-queen", place(game, 5, 0));
    relocate(game, "card-spades-5", place(game, 6, 1));
    relocate(game, "card-clubs-ace", place(game, 6, 2));

    const moved = game.moveCardToPile(
      "card-hearts-queen",
      place(game, 6, 2).id,
    );

    expect(moved).toBe(false);
  });

  it("will not pair onto a card while a card lies over it", () => {
    relocate(game, "card-hearts-queen", place(game, 5, 0));
    relocate(game, "card-spades-5", place(game, 6, 0));
    relocate(game, "card-clubs-ace", game.hand);

    const moved = game.moveCardToPile("card-clubs-ace", place(game, 5, 0).id);

    expect(moved).toBe(false);
  });

  it("frees a card once both cards over it are gone", () => {
    relocate(game, "card-hearts-queen", place(game, 5, 0));
    relocate(game, "card-clubs-ace", game.hand);

    const moved = game.moveCardToPile("card-clubs-ace", place(game, 5, 0).id);

    expect(moved).toBe(true);
  });

  it("pairs the hand with the waste's top card", () => {
    relocate(game, "card-hearts-10", game.waste);
    relocate(game, "card-clubs-3", game.hand);

    game.moveCardToPile("card-clubs-3", game.waste.id);

    expect([game.discard.size, game.waste.size]).toEqual([2, 0]);
  });

  it("sends a free King to the discard on its own on a double press", () => {
    relocate(game, "card-hearts-king", place(game, 6, 3));

    game.autoMoveCard("card-hearts-king");

    expect(game.discard.topCard?.id).toBe("card-hearts-king");
  });

  it("puts both cards of a pair back in one undo", () => {
    relocate(game, "card-hearts-queen", place(game, 6, 0));
    relocate(game, "card-clubs-ace", place(game, 6, 1));
    game.moveCardToPile("card-clubs-ace", place(game, 6, 0).id);

    game.undo();

    expect([
      place(game, 6, 0).topCard?.id,
      place(game, 6, 1).topCard?.id,
    ]).toEqual(["card-hearts-queen", "card-clubs-ace"]);
  });
});

describe("PyramidGame stock", () => {
  it("turns a card into the hand, moving the last one to the waste", () => {
    const game = newGame();
    game.drawCardsFromStock();
    const first = game.hand.topCard;

    game.drawCardsFromStock();

    expect([game.waste.topCard, game.hand.size]).toEqual([first, 1]);
  });

  it("takes a draw back in one undo", () => {
    const game = newGame();
    game.drawCardsFromStock();
    game.drawCardsFromStock();

    game.undo();

    expect([game.waste.size, game.hand.size, game.stock.size]).toEqual([
      0, 1, 23,
    ]);
  });

  it("goes through the stock once by default", () => {
    const game = newGame();
    emptyBoard(game);
    relocate(game, "card-hearts-2", game.waste);

    game.drawCardsFromStock();

    expect([game.stock.size, game.pileBackgroundKey(game.stock)]).toEqual([
      0,
      CLOSED_STOCK_PLACEHOLDER,
    ]);
  });

  it("turns the waste and hand back over with three passes", () => {
    const game = newGame({ passes: 3 });
    emptyBoard(game);
    relocate(game, "card-hearts-2", game.waste);
    relocate(game, "card-hearts-3", game.hand);
    const handle = pyramidGestures(game);

    handle({ kind: "activate-pile", pileId: game.stock.id });

    expect([game.stock.size, game.pileBackgroundKey(game.stock)]).toEqual([
      2,
      recyclePipsPlaceholder(1, 2),
    ]);
  });
});

describe("PyramidGame win condition", () => {
  /** The Queen and Ace of clubs and hearts: two pairs. */
  const TWO_PAIRS = ALL_PLAYING_CARD_IDS.filter(
    (card) =>
      (card.rank === Rank.QUEEN || card.rank === Rank.ACE) &&
      (card.suit === Suit.CLUB || card.suit === Suit.HEART),
  );

  /** Lays out a board one pair from an empty pyramid, with a pair left over. */
  function onePairLeft(goal: PyramidGoal): PyramidGame {
    const game = newGame({ cardIds: TWO_PAIRS, goal });
    emptyBoard(game);
    relocate(game, "card-hearts-queen", place(game, 6, 0));
    relocate(game, "card-clubs-ace", place(game, 6, 1));
    relocate(game, "card-clubs-queen", game.stock, false);
    relocate(game, "card-hearts-ace", game.stock, false);
    return game;
  }

  it("is not won while cards remain in the stock", () => {
    const game = onePairLeft(PyramidGoal.ALL_CARDS);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", place(game, 6, 0).id);

    expect(won).toBe(false);
  });

  it("is won by clearing the pyramid under Pyramid Only", () => {
    const game = onePairLeft(PyramidGoal.PYRAMID_ONLY);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", place(game, 6, 0).id);

    expect(won).toBe(true);
  });

  it("is won once every card is discarded", () => {
    const game = onePairLeft(PyramidGoal.ALL_CARDS);
    relocate(game, "card-clubs-queen", game.discard);
    relocate(game, "card-hearts-ace", game.discard);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", place(game, 6, 0).id);

    expect(won).toBe(true);
  });
});
