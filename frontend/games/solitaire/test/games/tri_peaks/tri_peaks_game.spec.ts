import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { TriPeaksGame } from "@/games/tri_peaks/tri_peaks_game";
import { triPeaksGestures } from "@/games/tri_peaks/tri_peaks_gestures";
import { PEAK_PLACES, peakPileId } from "@/games/tri_peaks/tri_peaks_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): TriPeaksGame {
  const game = new TriPeaksGame({
    cardIds,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

/** Returns the place at a row and index of the peaks. */
function place(game: TriPeaksGame, row: number, index: number) {
  return game.getPileById(peakPileId(row, index))!;
}

describe("the peaks", () => {
  it("have three tips over rows of six and nine and a base of ten", () => {
    const rows = [0, 1, 2, 3].map(
      (row) => PEAK_PLACES.filter((p) => p.row === row).length,
    );

    expect(rows).toEqual([3, 6, 9, 10]);
  });

  it("cover a tip with the two cards beneath it", () => {
    const [tip] = PEAK_PLACES;

    expect(tip?.coveredBy).toEqual([peakPileId(1, 0), peakPileId(1, 1)]);
  });
});

describe("TriPeaksGame deal", () => {
  let game: TriPeaksGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals the base face up and the rows above it face down", () => {
    const faceUpByRow = [0, 1, 2, 3].map((row) =>
      PEAK_PLACES.filter((p) => p.row === row).every(
        (p) => place(game, p.row, p.index).topCard?.faceUp,
      ),
    );

    expect(faceUpByRow).toEqual([false, false, false, true]);
  });

  it("starts the waste and leaves 23 cards in the stock", () => {
    expect([game.waste.size, game.stock.size]).toEqual([1, 23]);
  });
});

describe("TriPeaksGame play", () => {
  let game: TriPeaksGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
    relocate(game, "card-spades-7", game.waste);
  });

  it("plays an uncovered card a rank up or down in any suit", () => {
    relocate(game, "card-hearts-8", place(game, 3, 0));

    const moved = game.moveCardToPile("card-hearts-8", game.waste.id);

    expect(moved).toBe(true);
  });

  it("puts an Ace on a King", () => {
    relocate(game, "card-spades-king", game.waste);
    relocate(game, "card-hearts-ace", place(game, 3, 0));

    const moved = game.moveCardToPile("card-hearts-ace", game.waste.id);

    expect(moved).toBe(true);
  });

  it("will not play a covered card", () => {
    relocate(game, "card-hearts-8", place(game, 2, 0));
    relocate(game, "card-clubs-2", place(game, 3, 1));

    const moved = game.moveCardToPile("card-hearts-8", game.waste.id);

    expect(moved).toBe(false);
  });

  it("turns a card up once nothing covers it", () => {
    relocate(game, "card-hearts-5", place(game, 2, 0), false);
    relocate(game, "card-hearts-8", place(game, 3, 1));

    game.moveCardToPile("card-hearts-8", game.waste.id);

    expect(place(game, 2, 0).topCard?.faceUp).toBe(true);
  });

  it("turns it back down when the move is taken back", () => {
    relocate(game, "card-hearts-5", place(game, 2, 0), false);
    relocate(game, "card-hearts-8", place(game, 3, 1));
    game.moveCardToPile("card-hearts-8", game.waste.id);

    game.undo();

    expect(place(game, 2, 0).topCard?.faceUp).toBe(false);
  });

  it("plays a card on a single press", () => {
    relocate(game, "card-hearts-8", place(game, 3, 4));
    const handle = triPeaksGestures(game);

    handle({ kind: "activate", cardId: "card-hearts-8" });

    expect(game.waste.topCard?.id).toBe("card-hearts-8");
  });

  it("turns the stock on a single press", () => {
    relocate(game, "card-clubs-2", game.stock, false);
    const handle = triPeaksGestures(game);

    handle({ kind: "activate", cardId: "card-clubs-2" });

    expect(game.waste.topCard?.id).toBe("card-clubs-2");
  });
});

describe("TriPeaksGame win condition", () => {
  it("is won once the peaks are clear, with cards left in the stock", () => {
    const spades = ALL_PLAYING_CARD_IDS.filter(
      (card) =>
        card.suit === Suit.SPADE &&
        [Rank.SEVEN, Rank.EIGHT, Rank.TWO].includes(card.rank),
    );
    const game = newGame(spades);
    emptyBoard(game);
    relocate(game, "card-spades-7", game.waste);
    relocate(game, "card-spades-2", game.stock, false);
    relocate(game, "card-spades-8", place(game, 3, 0));
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-8", game.waste.id);

    expect(won).toBe(true);
  });
});
