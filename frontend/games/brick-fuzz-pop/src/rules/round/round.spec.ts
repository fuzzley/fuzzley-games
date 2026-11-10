import { BORED } from "../tuning";
import { RULES, type RoundStart, playRound } from "./round";

describe("RULES", () => {
  it("bores a fuzzball at the tuning's distance", () => {
    expect(RULES.bored).toBe(BORED);
  });
});

describe("playRound", () => {
  it("throws until R6 writes it", () => {
    const start: RoundStart = {
      wall: { bricks: [], rows: 0, lowestRow: 5 },
      depth: 11,
      x: 4.5,
      crew: { friends: [] },
      boon: null,
    };

    expect(() => playRound(start, { aim: 328, charge: 0 }, "hot")).toThrow(
      "Not yet",
    );
  });
});
