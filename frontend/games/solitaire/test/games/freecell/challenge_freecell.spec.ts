import { describe, it, expect } from "vitest";
import { Rank } from "@/engine/core/card/playing_card";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { FreeCellVariant } from "@/games/freecell/freecell_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed randomness sequence, so every deal in this file is the same deal. */
const SHUFFLE_SEQUENCE = [0.17, 0.83, 0.42, 0.06, 0.91, 0.55, 0.28, 0.74];

/** Returns a dealt game playing by the given rule set. */
function dealtGame(variant: FreeCellVariant): FreeCellGame {
  const game = new FreeCellGame({
    random: sequenceRandom(SHUFFLE_SEQUENCE),
    variant,
  });
  game.startNewGame();
  return game;
}

/** Returns the rank of the bottom card of every column. */
function bottomRanks(game: FreeCellGame): Rank[] {
  return game.tableaus.map((tableau) => tableau.getCards()[0].rank);
}

/** Returns how many Aces and Twos sit anywhere above a column's bottom card. */
function buriedHigherUp(game: FreeCellGame): number {
  return game.tableaus
    .flatMap((tableau) => tableau.getCards().slice(1))
    .filter((card) => card.rank === Rank.ACE || card.rank === Rank.TWO).length;
}

describe("the Challenge FreeCell deal", () => {
  it("puts an Ace or a Two at the bottom of every column", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);

    const lowest = bottomRanks(game).every(
      (rank) => rank === Rank.ACE || rank === Rank.TWO,
    );
    expect(lowest).toBe(true);
  });

  it("puts all four Aces and all four Twos there", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);

    expect(buriedHigherUp(game)).toBe(0);
  });

  it("keeps FreeCell's shape: seven cards in the first four columns, six after", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);

    expect(game.tableaus.map((tableau) => tableau.size)).toEqual([
      7, 7, 7, 7, 6, 6, 6, 6,
    ]);
  });

  it("deals every card face up", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);

    const hidden = game.tableaus
      .flatMap((tableau) => tableau.getCards())
      .filter((card) => !card.faceUp);
    expect(hidden).toEqual([]);
  });

  it("replays the same deal on a restart", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);
    const before = game.tableaus.map((tableau) =>
      tableau.getCards().map((card) => card.id),
    );

    game.restartGame();

    expect(
      game.tableaus.map((tableau) => tableau.getCards().map((card) => card.id)),
    ).toEqual(before);
  });

  it("buries the low cards under Super Challenge as well", () => {
    const game = dealtGame(FreeCellVariant.SUPER_CHALLENGE);

    expect(buriedHigherUp(game)).toBe(0);
  });

  it("leaves FreeCell's own deal alone", () => {
    const game = dealtGame(FreeCellVariant.FREECELL);

    expect(buriedHigherUp(game)).toBeGreaterThan(0);
  });
});

describe("Challenge FreeCell columns", () => {
  it("build down in alternating colours", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);
    emptyBoard(game);
    relocate(game, "card-spades-10", game.tableaus[0]);
    relocate(game, "card-hearts-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-9", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("take any card into a space", () => {
    const game = dealtGame(FreeCellVariant.CHALLENGE);
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-9", game.tableaus[0].id)).toBe(
      true,
    );
  });
});

describe("Super Challenge FreeCell columns", () => {
  it("refuse anything but a King into a space", () => {
    const game = dealtGame(FreeCellVariant.SUPER_CHALLENGE);
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-9", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("take a King into a space", () => {
    const game = dealtGame(FreeCellVariant.SUPER_CHALLENGE);
    emptyBoard(game);
    relocate(game, "card-hearts-king", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-king", game.tableaus[0].id)).toBe(
      true,
    );
  });

  /**
   * Lays a run of `length` from the heart Jack down on column 1, a spade Queen
   * for it on column 0, and leaves four cells and three columns empty.
   */
  function runToQueen(game: FreeCellGame, length: number): void {
    emptyBoard(game);
    relocate(game, "card-spades-queen", game.tableaus[0]);
    const run = [
      "card-hearts-jack",
      "card-spades-10",
      "card-hearts-9",
      "card-spades-8",
      "card-hearts-7",
      "card-spades-6",
    ];
    for (const id of run.slice(0, length)) {
      relocate(game, id, game.tableaus[1]);
    }
    relocate(game, "card-diamonds-king", game.tableaus[2]);
    relocate(game, "card-clubs-king", game.tableaus[3]);
    relocate(game, "card-clubs-queen", game.tableaus[4]);
  }

  // Three empty columns would double a FreeCell supermove three times; here
  // they add nothing, and four free cells allow a run of five.
  it("move a run as long as the free cells allow, plus one", () => {
    const game = dealtGame(FreeCellVariant.SUPER_CHALLENGE);
    runToQueen(game, 5);

    expect(game.moveCardToPile("card-hearts-jack", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuse a run longer than that, however many columns are empty", () => {
    const game = dealtGame(FreeCellVariant.SUPER_CHALLENGE);
    runToQueen(game, 6);

    expect(game.moveCardToPile("card-hearts-jack", game.tableaus[0].id)).toBe(
      false,
    );
  });
});
