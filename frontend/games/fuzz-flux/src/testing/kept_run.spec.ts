import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS } from "../rules/levels/levels";
import { readSavedGame } from "../rules/run/saved_game";
import { type KeptRun, keptRun } from "./kept_run";

/** The game's own rules. */
const RULES = { elements: ELEMENT_RULES, wind: WIND_RULE };

/** Three's company, level 1, on its deal 1, a move into its certificate, which the certificate's second clears. */
const KEPT: KeptRun = { level: 1, deal: 1, moves: [[34, 35]] };

describe("keptRun", () => {
  it("keeps a level dealt on one of its deals, each move made by the rules, which a page takes up", () => {
    const takenUp = readSavedGame(keptRun(LEVELS, RULES, KEPT), LEVELS, RULES);

    expect({
      level: takenUp?.level.number,
      deal: takenUp?.deal,
      moves: takenUp?.moves,
      outcome: takenUp?.game.outcome,
    }).toEqual({
      level: 1,
      deal: 1,
      moves: [{ from: 34, to: 35 }],
      outcome: "playing",
    });
  });

  it("keeps a level as dealt where no move is made", () => {
    expect(keptRun(LEVELS, RULES, { ...KEPT, moves: [] })).toEqual({
      level: "1",
      deal: 1,
      moves: [],
    });
  });

  it("throws for a level the game doesn't have", () => {
    expect(() => keptRun(LEVELS, RULES, { ...KEPT, level: 99 })).toThrow(
      "There is no level 99",
    );
  });

  it("throws for a deal not one of the level's own", () => {
    expect(() => keptRun(LEVELS, RULES, { ...KEPT, deal: 3 })).toThrow(
      "Level 1 has no deal 3.",
    );
  });

  it("throws for a move the rules refuse", () => {
    expect(() =>
      keptRun(LEVELS, RULES, { ...KEPT, moves: [...KEPT.moves, [1, 2]] }),
    ).toThrow("Move 2 of level 1, 1 to 2, is refused.");
  });

  it("throws for a move that ends the level, which no level in play has made", () => {
    expect(() =>
      keptRun(LEVELS, RULES, { ...KEPT, moves: [...KEPT.moves, [15, 16]] }),
    ).toThrow("Move 2 of level 1, 15 to 16, ends it: cleared.");
  });
});
