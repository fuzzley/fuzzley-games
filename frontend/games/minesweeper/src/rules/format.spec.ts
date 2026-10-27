import { count } from "./format";

describe("count", () => {
  it("names one in the singular", () => {
    expect(count(1, "mine", "mines")).toBe("1 mine");
  });

  it("names none in the plural", () => {
    expect(count(0, "mine", "mines")).toBe("0 mines");
  });
});
