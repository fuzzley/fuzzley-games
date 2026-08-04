import { describe, it, expect } from "vitest";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";
import {
  KlondikeRole,
  klondikeZoneSpecs,
} from "@/games/klondike/klondike_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

function newGame(variant: KlondikeVariant): KlondikeGame {
  const game = new KlondikeGame(undefined, undefined, undefined, variant);
  game.startNewGame();
  return game;
}

/** The columns of a board built by hand, with the run's landing card ready. */
function twoColumns(
  variant: KlondikeVariant,
  lower: string,
  upper: string,
): KlondikeGame {
  const game = newGame(variant);
  emptyBoard(game);
  relocate(game, lower, game.tableaus[0]);
  relocate(game, upper, game.tableaus[1]);
  return game;
}

describe("Klondike column builds, by variant", () => {
  /*
   * The same landing card put to all three rules. A black Nine onto a black Ten
   * separates them completely: Klondike wants the other colour, Whitehead wants
   * this one, and Thumb and Pouch wants anything but the same suit — which
   * clubs on spades satisfies.
   */
  it("refuses the same colour under Klondike", () => {
    const game = twoColumns(
      KlondikeVariant.KLONDIKE,
      "card-spades-10",
      "card-clubs-9",
    );

    expect(game.moveCardToPile("card-clubs-9", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("accepts the same colour in another suit under Whitehead", () => {
    const game = twoColumns(
      KlondikeVariant.WHITEHEAD,
      "card-spades-10",
      "card-clubs-9",
    );

    expect(game.moveCardToPile("card-clubs-9", game.tableaus[0].id)).toBe(true);
  });

  it("refuses the other colour under Whitehead", () => {
    const game = twoColumns(
      KlondikeVariant.WHITEHEAD,
      "card-spades-10",
      "card-hearts-9",
    );

    expect(game.moveCardToPile("card-hearts-9", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("accepts another suit of either colour under Thumb and Pouch", () => {
    const game = twoColumns(
      KlondikeVariant.THUMB_AND_POUCH,
      "card-spades-10",
      "card-clubs-9",
    );

    expect(game.moveCardToPile("card-clubs-9", game.tableaus[0].id)).toBe(true);
  });

  it("refuses only the same suit under Thumb and Pouch", () => {
    const game = twoColumns(
      KlondikeVariant.THUMB_AND_POUCH,
      "card-spades-10",
      "card-spades-9",
    );

    expect(game.moveCardToPile("card-spades-9", game.tableaus[0].id)).toBe(
      false,
    );
  });
});

describe("Klondike empty columns, by variant", () => {
  it("takes only a King under Klondike", () => {
    const game = newGame(KlondikeVariant.KLONDIKE);
    emptyBoard(game);
    relocate(game, "card-spades-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("takes any card under Whitehead", () => {
    const game = newGame(KlondikeVariant.WHITEHEAD);
    emptyBoard(game);
    relocate(game, "card-spades-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("takes any card under Thumb and Pouch", () => {
    const game = newGame(KlondikeVariant.THUMB_AND_POUCH);
    emptyBoard(game);
    relocate(game, "card-spades-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[0].id)).toBe(
      true,
    );
  });
});

describe("Klondike lifting, by variant", () => {
  /*
   * Klondike's laxity is the thing most easily lost by giving the family a
   * shared grab rule, so it is worth its own case: a broken pile can be dragged
   * as long as the card at the bottom of it fits where it lands.
   */
  it("carries a broken pile under Klondike", () => {
    const game = newGame(KlondikeVariant.KLONDIKE);
    emptyBoard(game);
    relocate(game, "card-spades-10", game.tableaus[0]);
    relocate(game, "card-hearts-2", game.tableaus[0]);
    relocate(game, "card-hearts-jack", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-10", game.tableaus[1].id)).toBe(
      true,
    );
  });

  it("refuses a broken pile under Whitehead, which lifts proper runs only", () => {
    const game = newGame(KlondikeVariant.WHITEHEAD);
    emptyBoard(game);
    relocate(game, "card-spades-10", game.tableaus[0]);
    relocate(game, "card-hearts-2", game.tableaus[0]);
    relocate(game, "card-clubs-jack", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-10", game.tableaus[1].id)).toBe(
      false,
    );
  });

  it("carries a same-colour run under Whitehead", () => {
    const game = newGame(KlondikeVariant.WHITEHEAD);
    emptyBoard(game);
    relocate(game, "card-spades-10", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.tableaus[0]);
    relocate(game, "card-clubs-jack", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-10", game.tableaus[1].id)).toBe(
      true,
    );
  });
});

describe("the Whitehead deal", () => {
  it("shows every card it puts on the columns", () => {
    const game = newGame(KlondikeVariant.WHITEHEAD);

    const hidden = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);
    expect(hidden).toEqual([]);
  });

  it("still deals the staircase, so only the shape of the knowledge changes", () => {
    const game = newGame(KlondikeVariant.WHITEHEAD);

    expect(game.tableaus.map((pile) => pile.size)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("still buries the stock, which is drawn from rather than read", () => {
    const game = newGame(KlondikeVariant.WHITEHEAD);

    expect(game.stock.getCards().every((card) => !card.faceUp)).toBe(true);
  });

  it("leaves Klondike's own deal hiding all but the column tops", () => {
    const game = newGame(KlondikeVariant.KLONDIKE);

    const faceUpCounts = game.tableaus.map(
      (pile) => pile.getCards().filter((card) => card.faceUp).length,
    );
    expect(faceUpCounts).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("klondikeZoneSpecs across variants", () => {
  it("memoizes each draw mode and variant pair separately", () => {
    const whitehead = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD);

    expect(whitehead).toBe(klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD));
  });

  it("does not hand a variant another variant's zones", () => {
    const klondike = klondikeZoneSpecs(3, KlondikeVariant.KLONDIKE);
    const whitehead = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD);

    expect(klondike).not.toBe(whitehead);
  });

  it("keeps the draw mode independent of the variant", () => {
    const drawOne = klondikeZoneSpecs(1, KlondikeVariant.WHITEHEAD);
    const drawThree = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD);

    expect(drawOne).not.toBe(drawThree);
  });

  it("shows a Whitehead column face up whatever its cards say", () => {
    const [tableau] = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD).filter(
      (zone) => zone.role === KlondikeRole.TABLEAU,
    );

    expect(tableau.face).toBe("always-up");
  });

  it("defaults to the original game when no variant is named", () => {
    expect(klondikeZoneSpecs(3)).toBe(
      klondikeZoneSpecs(3, KlondikeVariant.KLONDIKE),
    );
  });
});
