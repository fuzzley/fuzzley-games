import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { FlowerGardenGame } from "@/games/flower_garden/flower_garden_game";
import { CARDS_PER_BED } from "@/games/flower_garden/flower_garden_deal";
import {
  BED_COUNT,
  BOUQUET_SIZE,
} from "@/games/flower_garden/flower_garden_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): FlowerGardenGame {
  const game = new FlowerGardenGame({
    cardIds,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

describe("FlowerGardenGame deal", () => {
  let game: FlowerGardenGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals six beds of six", () => {
    expect(game.beds.map((pile) => pile.size)).toEqual(
      Array<number>(BED_COUNT).fill(CARDS_PER_BED),
    );
  });

  it("deals one card to each of the sixteen places in the bouquet", () => {
    expect(game.bouquet.map((pile) => pile.size)).toEqual(
      Array<number>(BOUQUET_SIZE).fill(1),
    );
  });
});

describe("FlowerGardenGame moves", () => {
  let game: FlowerGardenGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("plays a bouquet card from the middle of the fan onto a bed", () => {
    relocate(game, "card-hearts-9", game.beds[0]);
    relocate(game, "card-clubs-8", game.bouquet[7]);

    const moved = game.moveCardToPile("card-clubs-8", game.beds[0].id);

    expect(moved).toBe(true);
  });

  it("builds a bed down regardless of suit", () => {
    relocate(game, "card-hearts-9", game.beds[0]);
    relocate(game, "card-hearts-8", game.beds[1]);

    const moved = game.moveCardToPile("card-hearts-8", game.beds[0].id);

    expect(moved).toBe(true);
  });

  it("refuses a card that is not one rank lower", () => {
    relocate(game, "card-hearts-9", game.beds[0]);
    relocate(game, "card-hearts-10", game.bouquet[0]);

    const moved = game.moveCardToPile("card-hearts-10", game.beds[0].id);

    expect(moved).toBe(false);
  });

  it("fills an empty bed with any card", () => {
    relocate(game, "card-hearts-5", game.bouquet[3]);

    const moved = game.moveCardToPile("card-hearts-5", game.beds[2].id);

    expect(moved).toBe(true);
  });

  it("moves one card at a time from a bed", () => {
    relocate(game, "card-hearts-9", game.beds[0]);
    relocate(game, "card-clubs-8", game.beds[0]);
    relocate(game, "card-spades-10", game.beds[1]);

    const moved = game.moveCardToPile("card-hearts-9", game.beds[1].id);

    expect(moved).toBe(false);
  });

  it("puts nothing back into the bouquet", () => {
    relocate(game, "card-hearts-9", game.beds[0]);

    const moved = game.moveCardToPile("card-hearts-9", game.bouquet[0].id);

    expect(moved).toBe(false);
  });

  it("sends a bouquet Ace to a foundation on a double press", () => {
    relocate(game, "card-spades-ace", game.bouquet[12]);

    game.autoMoveCard("card-spades-ace");

    expect(game.foundations.some((pile) => pile.size === 1)).toBe(true);
  });
});

describe("FlowerGardenGame win condition", () => {
  it("is won once every card is on a foundation", () => {
    const aces = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);
    const game = newGame(aces);
    emptyBoard(game);
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-hearts-ace", game.foundations[1]);
    relocate(game, "card-diamonds-ace", game.foundations[2]);
    relocate(game, "card-clubs-ace", game.bouquet[5]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", game.foundations[3].id);

    expect(won).toBe(true);
  });
});
