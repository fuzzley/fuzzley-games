import { LANE_KEYS_A_TURN, SALTS } from "./draws";
import { SHUFFLE_TRIES } from "./tuning";

describe("SALTS", () => {
  it("salts each kind of draw apart from the others, the shuffle's every try among them", () => {
    const { shuffle, ...others } = SALTS;
    const tries = Array.from({ length: SHUFFLE_TRIES }, (_, n) => shuffle + n);

    const salts = [...Object.values(others), ...tries];

    expect(new Set(salts).size).toBe(salts.length);
  });
});

describe("LANE_KEYS_A_TURN", () => {
  // The design's largest board is 8 by 9, whose lanes, turned a quarter,
  // are its 9 rows.
  it("keys more lanes a turn than the largest board turned has", () => {
    expect(LANE_KEYS_A_TURN).toBeGreaterThan(9);
  });
});
