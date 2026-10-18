import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { GrandfathersClockGame } from "@/games/grandfathers_clock/grandfathers_clock_game";
import { CARDS_PER_COLUMN } from "@/games/grandfathers_clock/grandfathers_clock_deal";
import { DIAL } from "@/games/grandfathers_clock/grandfathers_clock_rules";
import { TABLEAU_COUNT } from "@/games/grandfathers_clock/grandfathers_clock_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): GrandfathersClockGame {
  const game = new GrandfathersClockGame({
    cardIds,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

describe("the dial", () => {
  it("holds every card exactly once between its twelve foundations", () => {
    const total = DIAL.reduce((sum, position) => sum + position.capacity, 0);

    expect(total).toBe(52);
  });

  it("starts with the Two at five o'clock and the King at four", () => {
    const byHour = new Map(DIAL.map((position) => [position.hour, position]));

    expect([byHour.get(5)?.start.rank, byHour.get(4)?.start.rank]).toEqual([
      Rank.TWO,
      Rank.KING,
    ]);
  });
});

describe("GrandfathersClockGame deal", () => {
  let game: GrandfathersClockGame;

  beforeEach(() => {
    game = newGame();
  });

  it("lays each hour's starting card on its foundation", () => {
    const started = DIAL.map(({ hour }) => game.foundationAt(hour).topCard);

    expect(started.map((card) => [card?.suit, card?.rank])).toEqual(
      DIAL.map(({ start }) => [start.suit, start.rank]),
    );
  });

  it("deals the other forty into eight columns of five", () => {
    expect(game.tableaus.map((pile) => pile.size)).toEqual(
      Array<number>(TABLEAU_COUNT).fill(CARDS_PER_COLUMN),
    );
  });
});

describe("GrandfathersClockGame foundations", () => {
  let game: GrandfathersClockGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds up in suit from the starting card", () => {
    relocate(game, "card-spades-2", game.foundationAt(5));
    relocate(game, "card-spades-3", game.tableaus[0]);

    const moved = game.moveCardToPile("card-spades-3", game.foundationAt(5).id);

    expect(moved).toBe(true);
  });

  it("turns the corner from King to Ace", () => {
    relocate(game, "card-diamonds-king", game.foundationAt(4));
    relocate(game, "card-diamonds-ace", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-diamonds-ace",
      game.foundationAt(4).id,
    );

    expect(moved).toBe(true);
  });

  it("closes a foundation once it reaches its hour", () => {
    for (const rank of ["2", "3", "4", "5"]) {
      relocate(game, `card-spades-${rank}`, game.foundationAt(5));
    }
    relocate(game, "card-spades-6", game.tableaus[0]);

    const moved = game.moveCardToPile("card-spades-6", game.foundationAt(5).id);

    expect(moved).toBe(false);
  });

  it("sends a card to the one foundation that takes it on a double press", () => {
    relocate(game, "card-spades-6", game.foundationAt(9));
    relocate(game, "card-spades-2", game.foundationAt(5));
    relocate(game, "card-spades-7", game.tableaus[0]);

    game.autoMoveCard("card-spades-7");

    expect(game.foundationAt(9).topCard?.id).toBe("card-spades-7");
  });
});

describe("GrandfathersClockGame columns", () => {
  let game: GrandfathersClockGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds down regardless of suit", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("fills a space with any card", () => {
    relocate(game, "card-clubs-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.tableaus[0].id);

    expect(moved).toBe(true);
  });
});

describe("GrandfathersClockGame win condition", () => {
  it("is won once every card is on the dial", () => {
    const game = newGame(
      ALL_PLAYING_CARD_IDS.filter(
        (card) =>
          (card.suit === Suit.SPADE && card.rank === Rank.THREE) ||
          DIAL.some(
            ({ start }) => start.suit === card.suit && start.rank === card.rank,
          ),
      ),
    );
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-3", game.foundationAt(5).id);

    expect(won).toBe(true);
  });
});
