import { describe, it, expect } from "vitest";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { ZoneSpec } from "@/engine/tableau/zone";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";
import {
  KlondikeRole,
  klondikeZoneSpecs,
} from "@/games/klondike/klondike_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

function newGame(variant: KlondikeVariant): KlondikeGame {
  const game = new KlondikeGame({ variant });
  game.startNewGame();
  return game;
}

/** Returns the columns of a hand-built board, with the landing card ready. */
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
   * A club Nine onto a spade Ten separates the three rules: Klondike refuses
   * the same colour, which Whitehead wants and Thumb and Pouch allows.
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

describe("Saratoga", () => {
  it("shows every card it deals to the columns", () => {
    const game = newGame(KlondikeVariant.SARATOGA);

    const hidden = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);
    expect(hidden).toEqual([]);
  });

  it("still buries the stock", () => {
    const game = newGame(KlondikeVariant.SARATOGA);

    expect(game.stock.getCards().every((card) => !card.faceUp)).toBe(true);
  });

  it("builds down in alternating colours, as Klondike does", () => {
    const game = twoColumns(
      KlondikeVariant.SARATOGA,
      "card-spades-10",
      "card-hearts-9",
    );

    expect(game.moveCardToPile("card-hearts-9", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("takes only a King into an empty column", () => {
    const game = newGame(KlondikeVariant.SARATOGA);
    emptyBoard(game);
    relocate(game, "card-spades-9", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("refuses a broken pile, which an all-face-up deal would otherwise free", () => {
    const game = newGame(KlondikeVariant.SARATOGA);
    emptyBoard(game);
    relocate(game, "card-spades-10", game.tableaus[0]);
    relocate(game, "card-hearts-2", game.tableaus[0]);
    relocate(game, "card-hearts-jack", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-10", game.tableaus[1].id)).toBe(
      false,
    );
  });

  it("carries an alternating-colour run", () => {
    const game = newGame(KlondikeVariant.SARATOGA);
    emptyBoard(game);
    relocate(game, "card-spades-10", game.tableaus[0]);
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-hearts-jack", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-10", game.tableaus[1].id)).toBe(
      true,
    );
  });
});

describe("klondikeZoneSpecs across variants", () => {
  /** Returns the first zone of a role. */
  function zoneOf(zones: readonly ZoneSpec[], role: string): ZoneSpec {
    return zones.find((zone) => zone.role === role)!;
  }

  it("gives each variant its own column grab rule", () => {
    const klondike = klondikeZoneSpecs(3, KlondikeVariant.KLONDIKE);
    const whitehead = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD);

    expect([
      zoneOf(klondike, KlondikeRole.TABLEAU).grab.kind,
      zoneOf(whitehead, KlondikeRole.TABLEAU).grab.kind,
    ]).toEqual(["any-face-up", "run"]);
  });

  it("fans the waste by the draw mode whatever the variant", () => {
    const drawOne = klondikeZoneSpecs(1, KlondikeVariant.WHITEHEAD);
    const drawThree = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD);

    expect([
      zoneOf(drawOne, KlondikeRole.WASTE).layout,
      zoneOf(drawThree, KlondikeRole.WASTE).layout,
    ]).toMatchObject([{ maxVisible: 1 }, { maxVisible: 3 }]);
  });

  it("shows a Whitehead column face up whatever its cards say", () => {
    const [tableau] = klondikeZoneSpecs(3, KlondikeVariant.WHITEHEAD).filter(
      (zone) => zone.role === KlondikeRole.TABLEAU,
    );

    expect(tableau.face).toBe("always-up");
  });

  it("defaults to the original game when no variant is named", () => {
    const tableau = zoneOf(klondikeZoneSpecs(3), KlondikeRole.TABLEAU);

    expect(tableau).toMatchObject({
      face: "card",
      grab: { kind: "any-face-up" },
    });
  });
});
