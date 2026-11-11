import { TestBed } from "@angular/core/testing";
import { LEVELS } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { GAME_LEVELS, PLAY_ROUND } from "./tokens";

describe("the game's tokens", () => {
  it("hand the game its own levels, but in specs", () => {
    expect(TestBed.inject(GAME_LEVELS)).toBe(LEVELS);
  });

  it("play each round through the rules, but in specs", () => {
    expect(TestBed.inject(PLAY_ROUND)).toBe(playRound);
  });
});
