import {
  KlondikeScoring,
  StandardScoringPolicy,
  VegasScoringPolicy,
  klondikeScoringPolicy,
} from "@/games/klondike/scoring_policy";
import { KlondikeRole } from "@/games/klondike/klondike_zones";

describe("StandardScoringPolicy", () => {
  let scoring: StandardScoringPolicy;

  beforeEach(() => {
    scoring = new StandardScoringPolicy();
  });

  describe("moveScore", () => {
    it("scores +5 for waste to tableau", () => {
      expect(scoring.moveScore(KlondikeRole.WASTE, KlondikeRole.TABLEAU)).toBe(
        5,
      );
    });

    it("scores +10 for waste to foundation", () => {
      expect(
        scoring.moveScore(KlondikeRole.WASTE, KlondikeRole.FOUNDATION),
      ).toBe(10);
    });

    it("scores +10 for tableau to foundation", () => {
      expect(
        scoring.moveScore(KlondikeRole.TABLEAU, KlondikeRole.FOUNDATION),
      ).toBe(10);
    });

    it("scores -15 for foundation to tableau", () => {
      expect(
        scoring.moveScore(KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU),
      ).toBe(-15);
    });

    it("scores 0 for an unscored move such as tableau to tableau", () => {
      expect(
        scoring.moveScore(KlondikeRole.TABLEAU, KlondikeRole.TABLEAU),
      ).toBe(0);
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

describe("VegasScoringPolicy", () => {
  let scoring: VegasScoringPolicy;

  beforeEach(() => {
    scoring = new VegasScoringPolicy();
  });

  it("starts $52 down, a dollar a card", () => {
    expect(scoring.initialScore()).toBe(-52);
  });

  it("pays $5 for a waste card to a foundation", () => {
    expect(scoring.moveScore(KlondikeRole.WASTE, KlondikeRole.FOUNDATION)).toBe(
      5,
    );
  });

  it("pays $5 for a column card to a foundation", () => {
    expect(
      scoring.moveScore(KlondikeRole.TABLEAU, KlondikeRole.FOUNDATION),
    ).toBe(5);
  });

  it("charges $5 for a card taken back off a foundation", () => {
    expect(
      scoring.moveScore(KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU),
    ).toBe(-5);
  });

  it("pays nothing for a waste card onto a column", () => {
    expect(scoring.moveScore(KlondikeRole.WASTE, KlondikeRole.TABLEAU)).toBe(0);
  });

  it("pays nothing for an Ace moved between foundations", () => {
    expect(
      scoring.moveScore(KlondikeRole.FOUNDATION, KlondikeRole.FOUNDATION),
    ).toBe(0);
  });

  it("gives no flip bonus", () => {
    expect(scoring.tableauFlipBonus()).toBe(0);
  });

  it("charges nothing for a recycle", () => {
    expect(scoring.recyclePenalty()).toBe(0);
  });

  it("allows one pass in Draw 1 and three in Draw 3", () => {
    expect([scoring.maxRecycles(1), scoring.maxRecycles(3)]).toEqual([0, 2]);
  });

  it("lets the score run below zero", () => {
    expect(scoring.clampScore(-57)).toBe(-57);
  });
});

describe("StandardScoringPolicy's limits", () => {
  it("recycles without limit", () => {
    expect(new StandardScoringPolicy().maxRecycles()).toBe(Infinity);
  });

  it("floors the score at zero", () => {
    expect(new StandardScoringPolicy().clampScore(-15)).toBe(0);
  });
});

describe("klondikeScoringPolicy", () => {
  it("returns the Vegas policy for Vegas scoring", () => {
    expect(klondikeScoringPolicy(KlondikeScoring.VEGAS)).toBeInstanceOf(
      VegasScoringPolicy,
    );
  });

  it("returns the standard policy otherwise", () => {
    expect(klondikeScoringPolicy(KlondikeScoring.STANDARD)).toBeInstanceOf(
      StandardScoringPolicy,
    );
  });
});
