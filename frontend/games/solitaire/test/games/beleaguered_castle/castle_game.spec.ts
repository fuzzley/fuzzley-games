import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { ALL_SUITS, Rank, Suit } from "@/engine/core/card/playing_card";
import { CastleGame } from "@/games/beleaguered_castle/castle_game";
import { CastleVariant } from "@/games/beleaguered_castle/castle_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: CastleVariant;
  } = {},
): CastleGame {
  const game = new CastleGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

describe("CastleGame deal", () => {
  it("lays the Aces on the foundations and deals eight rows of six", () => {
    const game = newGame();

    expect([
      game.foundations.map((pile) => pile.topCard?.suit),
      game.rows.map((pile) => pile.size),
    ]).toEqual([ALL_SUITS, Array<number>(8).fill(6)]);
  });

  it("deals the Aces into the rows in Streets and Alleys", () => {
    const game = newGame({ variant: CastleVariant.STREETS_AND_ALLEYS });

    expect([
      game.foundations.every((pile) => pile.isEmpty),
      game.rows.map((pile) => pile.size),
    ]).toEqual([true, [7, 7, 7, 7, 6, 6, 6, 6]]);
  });

  it("sends a card home while dealing Citadel", () => {
    const hearts = ALL_PLAYING_CARD_IDS.filter(
      (card) =>
        card.suit === Suit.HEART &&
        [Rank.ACE, Rank.TWO, Rank.THREE].includes(card.rank),
    );
    const game = newGame({ cardIds: hearts, variant: CastleVariant.CITADEL });

    const heartsHome = game.foundations[ALL_SUITS.indexOf(Suit.HEART)];

    expect(heartsHome?.getCards().map((card) => card.rank)).toContain(Rank.TWO);
  });

  it("deals Fortress into ten rows, two of six and eight of five", () => {
    const game = newGame({ variant: CastleVariant.FORTRESS });

    expect(game.rows.map((pile) => pile.size)).toEqual([
      6, 6, 5, 5, 5, 5, 5, 5, 5, 5,
    ]);
  });
});

describe("CastleGame rows", () => {
  let game: CastleGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds down regardless of suit", () => {
    relocate(game, "card-hearts-9", game.rows[0]);
    relocate(game, "card-hearts-8", game.rows[5]);

    const moved = game.moveCardToPile("card-hearts-8", game.rows[0].id);

    expect(moved).toBe(true);
  });

  it("moves only the last card of a row", () => {
    relocate(game, "card-hearts-9", game.rows[1]);
    relocate(game, "card-spades-2", game.rows[1]);
    relocate(game, "card-clubs-10", game.rows[2]);

    const moved = game.moveCardToPile("card-hearts-9", game.rows[2].id);

    expect(moved).toBe(false);
  });

  it("fills an empty row with any card", () => {
    relocate(game, "card-hearts-9", game.rows[1]);

    const moved = game.moveCardToPile("card-hearts-9", game.rows[6].id);

    expect(moved).toBe(true);
  });

  it("builds up in suit in Fortress", () => {
    const fortress = newGame({ variant: CastleVariant.FORTRESS });
    emptyBoard(fortress);
    relocate(fortress, "card-hearts-9", fortress.rows[0]);
    relocate(fortress, "card-hearts-10", fortress.rows[1]);

    const moved = fortress.moveCardToPile(
      "card-hearts-10",
      fortress.rows[0].id,
    );

    expect(moved).toBe(true);
  });

  it("refuses another suit in Fortress", () => {
    const fortress = newGame({ variant: CastleVariant.FORTRESS });
    emptyBoard(fortress);
    relocate(fortress, "card-hearts-9", fortress.rows[0]);
    relocate(fortress, "card-clubs-8", fortress.rows[2]);

    const moved = fortress.moveCardToPile("card-clubs-8", fortress.rows[0].id);

    expect(moved).toBe(false);
  });
});

describe("CastleGame win condition", () => {
  it("is won once every card is on a foundation", () => {
    const aces = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);
    const game = newGame({ cardIds: aces });
    relocate(game, "card-clubs-ace", game.rows[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.autoMoveCard("card-clubs-ace");

    expect(won).toBe(true);
  });
});
