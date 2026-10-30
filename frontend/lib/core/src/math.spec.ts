import { clamp } from "./math";

describe("clamp", () => {
  it.each([
    ["below the least", -2, 0],
    ["between them", 3, 3],
    ["above the most", 9, 5],
  ])("keeps a number %s between them", (_, value, kept) => {
    expect(clamp(value, 0, 5)).toBe(kept);
  });
});
