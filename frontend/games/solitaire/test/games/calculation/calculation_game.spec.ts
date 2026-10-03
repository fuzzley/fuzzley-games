import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { CalculationGame } from "@/games/calculation/calculation_game";
import { calculationGestures } from "@/games/calculation/calculation_gestures";
import { CalculationVariant } from "@/games/calculation/calculation_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: CalculationVariant;
  } = {},
): CalculationGame {
  const game = new CalculationGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

/** Plays the given cards from the hand onto a foundation, one after another. */
function buildFrom(
  game: CalculationGame,
  foundation: number,
  cardIds: readonly string[],
): boolean[] {
  return cardIds.map((cardId) => {
    relocate(game, cardId, game.hand);
    return game.moveCardToPile(cardId, game.foundations[foundation].id);
  });
}

describe("CalculationGame deal", () => {
  it("starts the foundations with an Ace, a Two, a Three and a Four", () => {
    const game = newGame();

    const ranks = game.foundations.map((pile) => pile.topCard?.rank);

    expect(ranks).toEqual([Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR]);
  });

  it("leaves the other 48 cards face down in the stock", () => {
    const game = newGame();

    const faceDown = game.stock.getCards().filter((card) => !card.faceUp);

    expect(faceDown.length).toBe(48);
  });

  it("starts no foundation in Sir Tommy", () => {
    const game = newGame({ variant: CalculationVariant.SIR_TOMMY });

    expect([game.stock.size, ...game.foundations.map((p) => p.size)]).toEqual([
      52, 0, 0, 0, 0,
    ]);
  });
});

describe("CalculationGame stock and hand", () => {
  let game: CalculationGame;

  beforeEach(() => {
    game = newGame();
  });

  it("turns a card into the hand", () => {
    const top = game.stock.topCard;

    game.drawCard();

    expect(game.hand.topCard).toBe(top);
  });

  it("will not turn another card until the hand is placed", () => {
    game.drawCard();

    expect(game.drawCard()).toBe(false);
  });

  it("parks the hand on any waste pile", () => {
    game.drawCard();
    const card = game.hand.topCard!;

    const moved = game.moveCardToPile(card.id, game.wastes[2].id);

    expect(moved).toBe(true);
  });

  it("refuses to move a waste card to another waste pile", () => {
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.wastes[0]);

    const moved = game.moveCardToPile("card-hearts-9", game.wastes[1].id);

    expect(moved).toBe(false);
  });

  it("draws on a press of the stock", () => {
    const handle = calculationGestures(game);

    handle({ kind: "activate", cardId: game.stock.topCard!.id });

    expect(game.hand.size).toBe(1);
  });
});

describe("CalculationGame foundations", () => {
  let game: CalculationGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-spades-2", game.foundations[1]);
    relocate(game, "card-spades-3", game.foundations[2]);
    relocate(game, "card-spades-4", game.foundations[3]);
  });

  it("builds the first foundation up in ones, in any suit", () => {
    const moved = buildFrom(game, 0, ["card-hearts-2", "card-clubs-3"]);

    expect(moved).toEqual([true, true]);
  });

  it("builds the second foundation in twos, past the King to the Ace", () => {
    const sequence = ["4", "6", "8", "10", "queen", "ace", "3"].map(
      (rank) => `card-hearts-${rank}`,
    );

    const moved = buildFrom(game, 1, sequence);

    expect(moved.every(Boolean)).toBe(true);
  });

  it("refuses the next card in ones on the foundation counting in fours", () => {
    const moved = buildFrom(game, 3, ["card-hearts-5"]);

    expect(moved).toEqual([false]);
  });

  it("closes a foundation at its King", () => {
    const sequence = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];
    buildFrom(
      game,
      0,
      sequence.map((rank) => `card-hearts-${rank}`),
    );
    buildFrom(game, 0, ["card-hearts-jack", "card-hearts-queen"]);
    buildFrom(game, 0, ["card-hearts-king"]);

    const moved = buildFrom(game, 0, ["card-clubs-ace"]);

    expect([game.foundations[0].size, moved]).toEqual([13, [false]]);
  });

  it("sends a waste card to a foundation on a double press", () => {
    relocate(game, "card-hearts-2", game.wastes[0]);

    game.autoMoveCard("card-hearts-2");

    expect(game.foundations[0].topCard?.id).toBe("card-hearts-2");
  });
});

describe("CalculationGame in Sir Tommy", () => {
  let game: CalculationGame;

  beforeEach(() => {
    game = newGame({ variant: CalculationVariant.SIR_TOMMY });
    emptyBoard(game);
  });

  it("starts any foundation with any Ace", () => {
    const moved = buildFrom(game, 3, ["card-hearts-ace"]);

    expect(moved).toEqual([true]);
  });

  it("refuses anything but an Ace on an empty foundation", () => {
    const moved = buildFrom(game, 0, ["card-hearts-2"]);

    expect(moved).toEqual([false]);
  });

  it("builds up in ones regardless of suit", () => {
    const moved = buildFrom(game, 0, [
      "card-hearts-ace",
      "card-clubs-2",
      "card-spades-3",
    ]);

    expect(moved).toEqual([true, true, true]);
  });
});

describe("CalculationGame win condition", () => {
  it("is won once every card is on a foundation", () => {
    const aces = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);
    const game = newGame({
      variant: CalculationVariant.SIR_TOMMY,
      cardIds: aces,
    });
    emptyBoard(game);
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-hearts-ace", game.foundations[1]);
    relocate(game, "card-diamonds-ace", game.foundations[2]);
    let won = false;
    game.on("game-won", () => (won = true));

    buildFrom(game, 3, ["card-clubs-ace"]);

    expect(won).toBe(true);
  });
});
