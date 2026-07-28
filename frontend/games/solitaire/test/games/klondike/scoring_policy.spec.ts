import { ScoringPolicy } from "@/games/klondike/scoring_policy";
import { PileType } from "@/engine/core/card/card_pile";

describe("ScoringPolicy", () => {
  let scoring: ScoringPolicy;

  beforeEach(() => {
    scoring = new ScoringPolicy();
  });

  describe("moveScore", () => {
    it("scores +5 for waste to tableau", () => {
      expect(scoring.moveScore(PileType.WASTE, PileType.TABLEAU)).toBe(5);
    });

    it("scores +10 for waste to foundation", () => {
      expect(scoring.moveScore(PileType.WASTE, PileType.FOUNDATION)).toBe(10);
    });

    it("scores +10 for tableau to foundation", () => {
      expect(scoring.moveScore(PileType.TABLEAU, PileType.FOUNDATION)).toBe(10);
    });

    it("scores -15 for foundation to tableau", () => {
      expect(scoring.moveScore(PileType.FOUNDATION, PileType.TABLEAU)).toBe(
        -15,
      );
    });

    it("scores 0 for an unscored move such as tableau to tableau", () => {
      expect(scoring.moveScore(PileType.TABLEAU, PileType.TABLEAU)).toBe(0);
    });
  });

  describe("tableauFlipBonus", () => {
    it("awards +5 for exposing a tableau card", () => {
      expect(scoring.tableauFlipBonus()).toBe(5);
    });
  });

  describe("recyclePenalty", () => {
    it("does not penalize the first waste recycle in Draw 1", () => {
      expect(scoring.recyclePenalty(1, 1)).toBe(0);
    });

    it("penalizes 100 for the second waste recycle in Draw 1", () => {
      expect(scoring.recyclePenalty(1, 2)).toBe(100);
    });

    it("does not penalize the first three waste recycles in Draw 3", () => {
      expect(scoring.recyclePenalty(3, 3)).toBe(0);
    });

    it("penalizes 20 for the fourth waste recycle in Draw 3", () => {
      expect(scoring.recyclePenalty(3, 4)).toBe(20);
    });
  });
});
