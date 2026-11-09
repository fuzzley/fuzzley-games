import { TestBed } from "@angular/core/testing";
import { GAME_RANDOM } from "./game_random";

describe("GAME_RANDOM", () => {
  it("draws from Math.random unless a spec provides a source", () => {
    expect(TestBed.inject(GAME_RANDOM)).toBe(Math.random);
  });
});
