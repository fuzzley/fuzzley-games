import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { BristolGame } from "@/games/bristol/bristol_game";
import { bristolGestures } from "@/games/bristol/bristol_gestures";
import { CARDS_PER_FAN } from "@/games/bristol/bristol_deal";
import { BristolVariant } from "@/games/bristol/bristol_rules";
import { TABLEAU_COUNT } from "@/games/bristol/bristol_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: BristolVariant;
  } = {},
): BristolGame {
  const game = new BristolGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

describe("BristolGame deal", () => {
  let game: BristolGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals eight face-up fans of three", () => {
    const fans = game.tableaus.map(
      (pile) => pile.getCards().filter((card) => card.faceUp).length,
    );

    expect(fans).toEqual(Array<number>(TABLEAU_COUNT).fill(CARDS_PER_FAN));
  });

  it("leaves no King above another card in a fan", () => {
    const raised = game.tableaus.filter((pile) => {
      const cards = pile.getCards();
      const firstOther = cards.findIndex((card) => card.rank !== Rank.KING);
      return (
        firstOther !== -1 &&
        cards.slice(firstOther).some((card) => card.rank === Rank.KING)
      );
    });

    expect(raised).toEqual([]);
  });

  it("starts each reserve with one card and leaves 25 in the stock", () => {
    expect([
      ...game.reserves.map((pile) => pile.size),
      game.stock.size,
    ]).toEqual([1, 1, 1, 25]);
  });

  it("starts the foundations empty", () => {
    expect(game.foundations.every((pile) => pile.isEmpty)).toBe(true);
  });

  it("lays the first Ace on a foundation in Belvedere", () => {
    const belvedere = newGame({ variant: BristolVariant.BELVEDERE });

    expect([
      belvedere.foundations[0].topCard?.rank,
      belvedere.stock.size,
    ]).toEqual([Rank.ACE, 24]);
  });
});

describe("BristolGame stock", () => {
  it("deals a card onto each reserve", () => {
    const game = newGame();

    game.deal();

    expect(game.reserves.map((pile) => pile.size)).toEqual([2, 2, 2]);
  });

  it("deals on a press of the stock, which one undo takes back", () => {
    const game = newGame();
    const handle = bristolGestures(game);
    handle({ kind: "activate", cardId: game.stock.topCard!.id });

    game.undo();

    expect(game.stock.size).toBe(25);
  });
});

describe("BristolGame moves", () => {
  let game: BristolGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds a fan down regardless of suit", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.reserves[0]);

    const moved = game.moveCardToPile("card-hearts-8", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("never refills an empty fan", () => {
    relocate(game, "card-hearts-8", game.reserves[0]);

    const moved = game.moveCardToPile("card-hearts-8", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("puts nothing on a reserve", () => {
    relocate(game, "card-hearts-9", game.reserves[0]);
    relocate(game, "card-hearts-8", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-8", game.reserves[0].id);

    expect(moved).toBe(false);
  });

  it("starts a foundation with any Ace and builds it in any suit", () => {
    relocate(game, "card-hearts-ace", game.tableaus[0]);
    relocate(game, "card-clubs-2", game.reserves[1]);
    game.moveCardToPile("card-hearts-ace", game.foundations[2].id);

    const moved = game.moveCardToPile("card-clubs-2", game.foundations[2].id);

    expect(moved).toBe(true);
  });
});

describe("BristolGame win condition", () => {
  it("is won once every card is on a foundation", () => {
    const aces = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);
    const game = newGame({ cardIds: aces });
    emptyBoard(game);
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-hearts-ace", game.foundations[1]);
    relocate(game, "card-diamonds-ace", game.foundations[2]);
    relocate(game, "card-clubs-ace", game.reserves[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", game.foundations[3].id);

    expect(won).toBe(true);
  });
});
