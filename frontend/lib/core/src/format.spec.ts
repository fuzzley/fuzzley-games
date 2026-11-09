import { count, formatPoints, tierWords } from "./format";

describe("count", () => {
  it("names one in the singular", () => {
    expect(count(1, "hint", "hints")).toBe("1 hint");
  });

  it("names none in the plural", () => {
    expect(count(0, "hint", "hints")).toBe("0 hints");
  });
});

describe("formatPoints", () => {
  it.each([
    [0, "0"],
    [950, "950"],
    [4250, "4,250"],
    [1234567, "1,234,567"],
  ])("writes %i points as %j", (points, written) => {
    expect(formatPoints(points)).toBe(written);
  });
});

describe("tierWords", () => {
  it("words a ladder from the least, though it is listed from the highest", () => {
    const tiers = [
      { from: 10, times: 3 },
      { from: 5, times: 2 },
    ];

    expect(tierWords(tiers, "bricks")).toBe(
      "×2 from 5 bricks, ×3 from 10 bricks",
    );
  });

  it("words a ladder of no tiers as nothing", () => {
    expect(tierWords([], "breaks")).toBe("");
  });
});
