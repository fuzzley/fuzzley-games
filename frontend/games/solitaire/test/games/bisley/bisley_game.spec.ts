import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { ALL_SUITS, Rank, Suit } from "@/engine/core/card/playing_card";
import { BisleyGame } from "@/games/bisley/bisley_game";
import {
  LONG_COLUMN_SIZE,
  SHORT_COLUMN_COUNT,
  SHORT_COLUMN_SIZE,
} from "@/games/bisley/bisley_deal";
import { TABLEAU_COUNT } from "@/games/bisley/bisley_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): BisleyGame {
  const game = new BisleyGame({
    cardIds,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

describe("BisleyGame deal", () => {
  let game: BisleyGame;

  beforeEach(() => {
    game = newGame();
  });

  it("lays each Ace on the foundation of its suit", () => {
    const aces = game.aceFoundations.map((pile) => pile.topCard?.suit);

    expect(aces).toEqual(ALL_SUITS);
  });

  it("deals three to the columns under the Aces and four to the rest", () => {
    const sizes = game.tableaus.map((pile) => pile.size);

    expect(sizes).toEqual([
      ...Array<number>(SHORT_COLUMN_COUNT).fill(SHORT_COLUMN_SIZE),
      ...Array<number>(TABLEAU_COUNT - SHORT_COLUMN_COUNT).fill(
        LONG_COLUMN_SIZE,
      ),
    ]);
  });

  it("deals no Ace to a column", () => {
    const aces = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => card.rank === Rank.ACE);

    expect(aces).toEqual([]);
  });

  it("leaves the King foundations empty", () => {
    const sizes = game.kingFoundations.map((pile) => pile.size);

    expect(sizes).toEqual([0, 0, 0, 0]);
  });
});

describe("BisleyGame column rules", () => {
  let game: BisleyGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts a card one rank lower in suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-8", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("accepts a card one rank higher in suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-10", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-10", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("refuses an adjacent card of another suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("refuses every card into an empty column", () => {
    relocate(game, "card-spades-king", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-king", game.tableaus[0].id);

    expect(moved).toBe(false);
  });
});

describe("BisleyGame foundations", () => {
  let game: BisleyGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds an Ace foundation up in suit", () => {
    relocate(game, "card-hearts-ace", game.aceFoundations[1]);
    relocate(game, "card-hearts-2", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-hearts-2",
      game.aceFoundations[1].id,
    );

    expect(moved).toBe(true);
  });

  it("starts a King foundation with its own suit's King", () => {
    relocate(game, "card-hearts-king", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-hearts-king",
      game.kingFoundations[1].id,
    );

    expect(moved).toBe(true);
  });

  it("refuses another suit's King on a King foundation", () => {
    relocate(game, "card-spades-king", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-spades-king",
      game.kingFoundations[1].id,
    );

    expect(moved).toBe(false);
  });

  it("builds a King foundation down in suit", () => {
    relocate(game, "card-hearts-king", game.kingFoundations[1]);
    relocate(game, "card-hearts-queen", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-hearts-queen",
      game.kingFoundations[1].id,
    );

    expect(moved).toBe(true);
  });

  it("refuses another suit's Ace on an emptied Ace foundation", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-spades-ace",
      game.aceFoundations[1].id,
    );

    expect(moved).toBe(false);
  });

  it("sends a free King to its foundation on a double press", () => {
    relocate(game, "card-clubs-king", game.tableaus[0]);

    game.autoMoveCard("card-clubs-king");

    expect(game.kingFoundations[3].topCard?.id).toBe("card-clubs-king");
  });
});

describe("BisleyGame win condition", () => {
  /** Clubs alone: a suit whose two foundations can meet at the Seven. */
  const CLUBS = ALL_PLAYING_CARD_IDS.filter((card) => card.suit === Suit.CLUB);

  /** Splits the clubs between their two foundations, leaving the Seven out. */
  function clubsAllButSeven(): BisleyGame {
    const game = newGame(CLUBS);
    emptyBoard(game);
    for (const rank of ["ace", "2", "3", "4", "5", "6"]) {
      relocate(game, `card-clubs-${rank}`, game.aceFoundations[3]);
    }
    for (const rank of ["king", "queen", "jack", "10", "9", "8"]) {
      relocate(game, `card-clubs-${rank}`, game.kingFoundations[3]);
    }
    relocate(game, "card-clubs-7", game.tableaus[0]);
    return game;
  }

  it("is won once a suit's two foundations meet", () => {
    const game = clubsAllButSeven();
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-7", game.kingFoundations[3].id);

    expect(won).toBe(true);
  });

  it("is not won while a card remains on the tableau", () => {
    const game = clubsAllButSeven();
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-6", game.tableaus[0].id);

    expect(won).toBe(false);
  });
});
