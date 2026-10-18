import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { BlackHoleGame } from "@/games/black_hole/black_hole_game";
import { blackHoleGestures } from "@/games/black_hole/black_hole_gestures";
import { BlackHoleVariant } from "@/games/black_hole/black_hole_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: BlackHoleVariant;
  } = {},
): BlackHoleGame {
  const game = new BlackHoleGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

describe("BlackHoleGame deal", () => {
  it("starts the hole with the Ace of Spades", () => {
    const game = newGame();

    expect(game.foundation.getCards().map((card) => card.id)).toEqual([
      "card-spades-ace",
    ]);
  });

  it("deals the other 51 cards into seventeen fans of three", () => {
    const game = newGame();

    expect(game.tableaus.map((pile) => pile.size)).toEqual(
      Array<number>(17).fill(3),
    );
  });

  it("deals All in a Row into thirteen columns of four, the foundation empty", () => {
    const game = newGame({ variant: BlackHoleVariant.ALL_IN_A_ROW });

    expect([
      game.foundation.size,
      ...game.tableaus.map((pile) => pile.size),
    ]).toEqual([0, ...Array<number>(13).fill(4)]);
  });
});

describe("BlackHoleGame hole", () => {
  let game: BlackHoleGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("takes a card one rank higher in any suit", () => {
    relocate(game, "card-spades-7", game.foundation);
    relocate(game, "card-hearts-8", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-8", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("takes a card one rank lower in any suit", () => {
    relocate(game, "card-spades-7", game.foundation);
    relocate(game, "card-clubs-6", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-6", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("puts a King on an Ace", () => {
    relocate(game, "card-spades-ace", game.foundation);
    relocate(game, "card-hearts-king", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-king", game.foundation.id);

    expect(moved).toBe(true);
  });

  it("refuses a card two ranks away", () => {
    relocate(game, "card-spades-7", game.foundation);
    relocate(game, "card-hearts-9", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-9", game.foundation.id);

    expect(moved).toBe(false);
  });

  it("puts nothing on a fan", () => {
    relocate(game, "card-spades-7", game.tableaus[0]);
    relocate(game, "card-hearts-6", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-6", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("plays a fan's top card on a single press", () => {
    relocate(game, "card-spades-ace", game.foundation);
    relocate(game, "card-hearts-2", game.tableaus[4]);
    const handle = blackHoleGestures(game);

    handle({ kind: "activate", cardId: "card-hearts-2" });

    expect(game.foundation.topCard?.id).toBe("card-hearts-2");
  });

  it("lets any card start All in a Row's foundation", () => {
    const row = newGame({ variant: BlackHoleVariant.ALL_IN_A_ROW });
    emptyBoard(row);
    relocate(row, "card-hearts-9", row.tableaus[0]);

    const moved = row.moveCardToPile("card-hearts-9", row.foundation.id);

    expect(moved).toBe(true);
  });
});

describe("BlackHoleGame win condition", () => {
  it("is won once every card is in the hole", () => {
    const aceAndTwo = ALL_PLAYING_CARD_IDS.filter(
      (card) =>
        card.suit === Suit.SPADE &&
        (card.rank === Rank.ACE || card.rank === Rank.TWO),
    );
    const game = newGame({ cardIds: aceAndTwo });
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-2", game.foundation.id);

    expect(won).toBe(true);
  });
});
