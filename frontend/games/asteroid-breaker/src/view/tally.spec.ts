import { tallyLines } from "./tally";

describe("tallyLines", () => {
  it("writes each part of a cleared wave's points on a line of its own, in the card's order", () => {
    const lines = tallyLines({
      rocks: 1240,
      chains: 380,
      strays: 600,
      cleared: 500,
      clean: 0,
    });

    expect(lines).toEqual([
      { label: "Rocks", points: "1,240" },
      { label: "Chains", points: "380" },
      { label: "Strays brought home", points: "600" },
      { label: "Wave cleared", points: "500" },
      { label: "No ship lost", points: "0" },
    ]);
  });
});
