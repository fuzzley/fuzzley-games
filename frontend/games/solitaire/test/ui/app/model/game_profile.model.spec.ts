import { describe, it, expect } from "vitest";
import {
  Difficulty,
  DifficultyByRule,
  difficultyFor,
  difficultyRange,
} from "@/ui/app/model/game_profile.model";

/** A difficulty the number of suits decides, as Spider's does. */
const BY_SUITS: DifficultyByRule = {
  optionId: "suitCount",
  byChoice: { 1: Difficulty.EASY, 2: Difficulty.MEDIUM, 4: Difficulty.HARD },
};

describe("difficultyRange", () => {
  it("spans a single step for a fixed rating", () => {
    expect(difficultyRange(Difficulty.MEDIUM)).toEqual([
      Difficulty.MEDIUM,
      Difficulty.MEDIUM,
    ]);
  });

  it("spans every choice of the deciding rule", () => {
    expect(difficultyRange(BY_SUITS)).toEqual([
      Difficulty.EASY,
      Difficulty.HARD,
    ]);
  });
});

describe("difficultyFor", () => {
  it("returns a fixed rating whatever the rules", () => {
    expect(difficultyFor(Difficulty.HARD, { suitCount: 1 })).toBe(
      Difficulty.HARD,
    );
  });

  it("returns the difficulty the chosen rule plays at", () => {
    expect(difficultyFor(BY_SUITS, { suitCount: 2 })).toBe(Difficulty.MEDIUM);
  });

  it("falls back to the easiest when the deciding rule is unset", () => {
    expect(difficultyFor(BY_SUITS, {})).toBe(Difficulty.EASY);
  });

  it("falls back to the easiest for a choice it does not rate", () => {
    expect(difficultyFor(BY_SUITS, { suitCount: 3 })).toBe(Difficulty.EASY);
  });
});
