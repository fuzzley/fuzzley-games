import { stepsBetween } from "./numbers";

describe("stepsBetween", () => {
  it("gives how much each number differs from the one before", () => {
    expect(stepsBetween([3, 5, 4])).toEqual([2, -1]);
  });

  it("gives no step for a single number", () => {
    expect(stepsBetween([7])).toEqual([]);
  });

  it("gives no step for no numbers", () => {
    expect(stepsBetween([])).toEqual([]);
  });
});
