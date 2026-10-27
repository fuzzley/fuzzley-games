import { count } from "./format";

describe("count", () => {
  it("names one in the singular", () => {
    expect(count(1, "hint", "hints")).toBe("1 hint");
  });

  it("names none in the plural", () => {
    expect(count(0, "hint", "hints")).toBe("0 hints");
  });
});
